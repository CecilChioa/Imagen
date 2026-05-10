use std::{fs, path::Path, time::Duration};

use base64::Engine;
use chrono::Local;
use uuid::Uuid;

use crate::settings::{GeneratedImage, GenerationResult, Settings};

pub async fn generate_image(settings: Settings) -> Result<GenerationResult, String> {
    let profile = settings
        .api_profiles
        .iter()
        .find(|profile| profile.id == settings.active_api_profile_id)
        .or_else(|| settings.api_profiles.first())
        .ok_or_else(|| "No API profile configured".to_string())?;

    if profile.api_key.trim().is_empty() {
        return Err("Missing API key".into());
    }
    if profile.api_base_url.trim().is_empty() {
        return Err("Missing API base URL".into());
    }
    if profile.model.trim().is_empty() {
        return Err("Missing model".into());
    }
    if settings.positive_prompt.trim().is_empty() {
        return Err("Prompt is empty".into());
    }

    let client = image_api_client()?;
    let final_prompt = build_prompt(&settings.positive_prompt, &settings.negative_prompt);
    let is_edit = !settings.reference_image_path.trim().is_empty();
    let endpoint = if is_edit {
        image_edit_endpoint(&profile.api_base_url)
    } else {
        image_generation_endpoint(&profile.api_base_url)
    };
    let request_log = serde_json::json!({
      "mode": if is_edit { "edit" } else { "generation" },
      "endpoint": endpoint,
      "model": profile.model,
      "prompt": final_prompt,
      "positive_prompt": settings.positive_prompt,
      "negative_prompt": settings.negative_prompt,
      "size": settings.size,
      "quality": settings.quality,
      "output_format": settings.output_format,
      "n": settings.n,
      "content_type": settings.content_type,
      "style_preset": settings.style_preset,
      "reference_image_path": settings.reference_image_path,
      "mask_image_path": settings.mask_image_path,
    });

    let response = if !is_edit {
        client
            .post(endpoint)
            .bearer_auth(&profile.api_key)
            .json(&serde_json::json!({
              "model": profile.model,
              "prompt": final_prompt,
              "size": settings.size,
              "quality": settings.quality,
              "output_format": settings.output_format,
              "n": settings.n,
            }))
            .send()
            .await
            .map_err(|e| e.to_string())?
    } else {
        let mut form = reqwest::multipart::Form::new()
            .text("model", profile.model.clone())
            .text("prompt", final_prompt.clone())
            .text("size", settings.size.clone())
            .text("quality", settings.quality.clone())
            .text("output_format", settings.output_format.clone())
            .text("n", settings.n.to_string());

        form = form.part(
            "image",
            multipart_file_part(&settings.reference_image_path)?,
        );
        if !settings.mask_image_path.trim().is_empty() {
            form = form.part("mask", multipart_file_part(&settings.mask_image_path)?);
        }

        client
            .post(endpoint)
            .bearer_auth(&profile.api_key)
            .multipart(form)
            .send()
            .await
            .map_err(|e| e.to_string())?
    };

    let status = response.status();
    let text = response.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("API error {}: {}", status, text));
    }

    let payload: serde_json::Value = serde_json::from_str(&text).map_err(|e| {
        format!(
            "API response is not valid JSON: {}. HTTP status: {}. Response preview: {}",
            e,
            status,
            response_preview(&text)
        )
    })?;
    let data = payload
        .get("data")
        .and_then(|v| v.as_array())
        .ok_or_else(|| format!("Unexpected response: {}", text))?;

    let task_id = Uuid::new_v4().to_string();
    let mut outputs = Vec::new();
    for item in data.iter() {
        let bytes = if let Some(b64) = item.get("b64_json").and_then(|v| v.as_str()) {
            base64::engine::general_purpose::STANDARD
                .decode(b64)
                .map_err(|e| e.to_string())?
        } else if let Some(url) = item.get("url").and_then(|v| v.as_str()) {
            let bytes = client
                .get(url)
                .send()
                .await
                .map_err(|e| e.to_string())?
                .bytes()
                .await
                .map_err(|e| e.to_string())?;
            bytes.to_vec()
        } else {
            return Err(format!("No image payload in response: {}", text));
        };

        outputs.push(GeneratedImage {
            path: None,
            format: settings.output_format.clone(),
            data_url: format!(
                "{}{}",
                data_url_prefix(&settings.output_format),
                base64::engine::general_purpose::STANDARD.encode(bytes)
            ),
        });
    }

    Ok(GenerationResult {
        id: task_id,
        created_at: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        prompt: final_prompt,
        status: "success".into(),
        outputs,
        error: None,
        request: request_log,
        response: sanitize_response_payload(payload),
    })
}

fn image_api_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(20))
        .timeout(Duration::from_secs(180))
        .build()
        .map_err(|e| e.to_string())
}

fn image_generation_endpoint(base_url: &str) -> String {
    let base = base_url.trim().trim_end_matches('/');
    if base.ends_with("/images/generations") {
        base.to_string()
    } else {
        format!("{}/images/generations", base)
    }
}

fn image_edit_endpoint(base_url: &str) -> String {
    let base = base_url.trim().trim_end_matches('/');
    if base.ends_with("/images/edits") {
        base.to_string()
    } else {
        format!("{}/images/edits", base)
    }
}

fn build_prompt(positive_prompt: &str, negative_prompt: &str) -> String {
    let positive = positive_prompt.trim();
    let negative = negative_prompt.trim();
    if negative.is_empty() {
        positive.to_string()
    } else {
        format!(
            "{}\n\nAvoid these elements or qualities: {}",
            positive, negative
        )
    }
}

fn multipart_file_part(path: &str) -> Result<reqwest::multipart::Part, String> {
    let path = Path::new(path);
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("image.png")
        .to_string();
    reqwest::multipart::Part::bytes(bytes)
        .file_name(file_name)
        .mime_str(mime_for_path(path))
        .map_err(|e| e.to_string())
}

fn mime_for_path(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_lowercase()
        .as_str()
    {
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        _ => "image/png",
    }
}

fn data_url_prefix(format: &str) -> &'static str {
    match format {
        "jpeg" => "data:image/jpeg;base64,",
        "webp" => "data:image/webp;base64,",
        _ => "data:image/png;base64,",
    }
}

fn sanitize_response_payload(mut payload: serde_json::Value) -> serde_json::Value {
    if let Some(data) = payload
        .get_mut("data")
        .and_then(|value| value.as_array_mut())
    {
        for item in data {
            if let Some(b64) = item.get_mut("b64_json") {
                if let Some(text) = b64.as_str() {
                    *b64 =
                        serde_json::Value::String(format!("<base64 image, {} chars>", text.len()));
                }
            }
            if let Some(url) = item.get_mut("url") {
                if let Some(text) = url.as_str() {
                    *url = serde_json::Value::String(format!("<image url, {} chars>", text.len()));
                }
            }
        }
    }
    payload
}

fn response_preview(text: &str) -> String {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return "<empty response>".into();
    }
    let preview: String = trimmed.chars().take(500).collect();
    if trimmed.chars().count() > 500 {
        format!("{}...", preview)
    } else {
        preview
    }
}
