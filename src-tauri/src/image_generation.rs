use std::{fs, future::Future, path::Path, time::Duration};

use base64::Engine;
use chrono::Local;
use uuid::Uuid;

use crate::{
    settings::{ApiProfile, GeneratedImage, GenerationResult, Settings},
    CancelRegistry,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ApiProvider {
    OpenAiCompatible,
    GeminiNative,
}

impl ApiProvider {
    fn from_profile(profile: &ApiProfile) -> Self {
        if profile.provider.trim().eq_ignore_ascii_case("gemini_native") {
            Self::GeminiNative
        } else {
            Self::OpenAiCompatible
        }
    }
}

pub const CANCELLED_ERROR_CODE: &str = "ERR_CANCELLED";

pub async fn generate_image(
    settings: Settings,
    cancellation_id: String,
    cancel_registry: &CancelRegistry,
) -> Result<GenerationResult, String> {
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

    let client = image_api_client(settings.timeout_sec)?;
    let cancellation = cancel_registry.register(&cancellation_id);
    let _cancellation_guard = CancellationGuard {
        cancellation_id,
        cancel_registry,
    };
    let final_prompt = build_prompt(&settings.positive_prompt, &settings.negative_prompt);
    let provider = ApiProvider::from_profile(profile);
    let is_edit = !settings.reference_image_path.trim().is_empty();
    let endpoint = match provider {
        ApiProvider::OpenAiCompatible => {
            if is_edit {
                image_edit_endpoint(&profile.api_base_url)
            } else {
                image_generation_endpoint(&profile.api_base_url)
            }
        }
        ApiProvider::GeminiNative => gemini_generation_endpoint(&profile.api_base_url, profile),
    };

    let request_log = serde_json::json!({
      "provider": profile.provider,
      "api_version": profile.api_version,
      "mode": if is_edit { "edit" } else { "generation" },
      "endpoint": endpoint,
      "model": profile.model,
      "prompt": final_prompt,
      "api_key": if profile.api_key.trim().is_empty() { "" } else { "<redacted>" },
      "positive_prompt": settings.positive_prompt,
      "negative_prompt": settings.negative_prompt,
      "size": settings.size,
      "quality": settings.quality,
      "output_format": settings.output_format,
      "output_compression": settings.output_compression,
      "moderation": settings.moderation,
      "background": settings.background,
      "timeout_sec": settings.timeout_sec,
      "n": settings.n,
      "content_type": settings.content_type,
      "style_preset": settings.style_preset,
      "reference_image_path": settings.reference_image_path,
      "mask_image_path": settings.mask_image_path,
    });

    let response = match provider {
        ApiProvider::OpenAiCompatible => {
            if !is_edit {
                await_or_cancel(
                    &cancellation,
                    client
                        .post(&endpoint)
                        .bearer_auth(&profile.api_key)
                        .header(reqwest::header::ACCEPT_ENCODING, "identity")
                        .json(&serde_json::json!({
                          "model": profile.model,
                          "prompt": final_prompt,
                          "size": settings.size,
                          "quality": settings.quality,
                          "output_format": settings.output_format,
                          "output_compression": settings.output_compression,
                          "moderation": settings.moderation,
                          "background": settings.background,
                          "n": settings.n,
                        }))
                        .send(),
                )
                .await?
            } else {
                let mut form = reqwest::multipart::Form::new()
                    .text("model", profile.model.clone())
                    .text("prompt", final_prompt.clone())
                    .text("size", settings.size.clone())
                    .text("quality", settings.quality.clone())
                    .text("output_format", settings.output_format.clone())
                    .text("output_compression", settings.output_compression.to_string())
                    .text("moderation", settings.moderation.clone())
                    .text("background", settings.background.clone())
                    .text("n", settings.n.to_string());

                form = form.part(
                    "image",
                    multipart_file_part(&settings.reference_image_path)?,
                );
                if !settings.mask_image_path.trim().is_empty() {
                    form = form.part("mask", multipart_file_part(&settings.mask_image_path)?);
                }

                await_or_cancel(
                    &cancellation,
                    client
                        .post(&endpoint)
                        .bearer_auth(&profile.api_key)
                        .header(reqwest::header::ACCEPT_ENCODING, "identity")
                        .multipart(form)
                        .send(),
                )
                .await?
            }
        }
        ApiProvider::GeminiNative => {
            let body = gemini_request_body(&settings, &final_prompt)?;
            await_or_cancel(
                &cancellation,
                client
                    .post(&endpoint)
                    .header(reqwest::header::ACCEPT_ENCODING, "identity")
                    .header(reqwest::header::CONTENT_TYPE, "application/json")
                    .header("x-goog-api-key", profile.api_key.trim())
                    .json(&body)
                    .send(),
            )
            .await?
        }
    };

    let status = response.status();
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();
    let body = await_or_cancel(&cancellation, response.bytes())
        .await
        .map_err(|error| {
            if error == CANCELLED_ERROR_CODE {
                error
            } else {
                format!(
                    "response_body_decode_failed: {}. http_status: {}. endpoint: {}. content_type: {}",
                    error, status, endpoint, content_type
                )
            }
        })?;

    if !status.is_success() {
        let body_preview = response_preview_bytes(&body);
        let body_text_preview = String::from_utf8(body.to_vec())
            .ok()
            .map(|value| response_preview(&value))
            .unwrap_or_else(|| "<non-utf8>".into());
        return Err(format!(
            "api_http_error: status={}. endpoint={}. content_type={}. body_hex_preview={}. body_text_preview={}",
            status, endpoint, content_type, body_preview, body_text_preview
        ));
    }

    if is_image_content_type(&content_type) || is_likely_image_bytes(&body) {
        let format = detect_image_format(&content_type, &body).unwrap_or_else(|| settings.output_format.clone());
        let data_url = format!(
            "{}{}",
            data_url_prefix(&format),
            base64::engine::general_purpose::STANDARD.encode(body.as_ref())
        );

        return Ok(GenerationResult {
            id: Uuid::new_v4().to_string(),
            created_at: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            prompt: final_prompt,
            status: "success".into(),
            outputs: vec![GeneratedImage {
                path: None,
                format,
                data_url,
            }],
            error: None,
            request: request_log,
            response: serde_json::json!({
                "mode": "binary-image",
                "content_type": content_type,
                "bytes": body.len(),
            }),
        });
    }

    let text = String::from_utf8(body.to_vec()).map_err(|e| {
        format!(
            "response_utf8_decode_failed: {}. http_status: {}. endpoint: {}. content_type: {}. body_hex_preview: {}",
            e,
            status,
            endpoint,
            content_type,
            response_preview_bytes(&body)
        )
    })?;

    let payload: serde_json::Value = serde_json::from_str(&text).map_err(|e| {
        format!(
            "response_json_parse_failed: {}. http_status: {}. endpoint: {}. content_type: {}. body_text_preview: {}",
            e,
            status,
            endpoint,
            content_type,
            response_preview(&text)
        )
    })?;

    let outputs = match provider {
        ApiProvider::OpenAiCompatible => {
            extract_openai_outputs(&payload, &client, &cancellation, &settings).await?
        }
        ApiProvider::GeminiNative => extract_gemini_outputs(&payload)?,
    };

    Ok(GenerationResult {
        id: Uuid::new_v4().to_string(),
        created_at: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        prompt: final_prompt,
        status: "success".into(),
        outputs,
        error: None,
        request: request_log,
        response: sanitize_response_payload(payload),
    })
}

fn image_api_client(timeout_sec: u32) -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(20))
        .timeout(Duration::from_secs(timeout_sec.max(10) as u64))
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

fn gemini_generation_endpoint(base_url: &str, profile: &ApiProfile) -> String {
    let mut base = base_url.trim().trim_end_matches('/').to_string();
    if !base.ends_with("/models") {
        base = format!("{}/models", base);
    }

    let model = profile.model.trim();
    format!("{}/{}:generateContent", base, model)
}

fn gemini_request_body(
    settings: &Settings,
    prompt: &str,
) -> Result<serde_json::Value, String> {
    let mut parts = vec![serde_json::json!({ "text": prompt })];

    if !settings.reference_image_path.trim().is_empty() {
        let (mime, data) = inline_image_data(&settings.reference_image_path)?;
        parts.push(serde_json::json!({
            "inlineData": {
                "mimeType": mime,
                "data": data
            }
        }));
    }

    if !settings.mask_image_path.trim().is_empty() {
        let (mime, data) = inline_image_data(&settings.mask_image_path)?;
        parts.push(serde_json::json!({
            "inlineData": {
                "mimeType": mime,
                "data": data
            }
        }));
    }

    let response_mime_type = match settings.output_format.as_str() {
        "jpeg" | "jpg" => "image/jpeg",
        "webp" => "image/webp",
        _ => "image/png",
    };

    let mut response_schema = serde_json::json!({
        "type": "object",
        "properties": {
            "image": {
                "type": "string",
                "description": "base64 encoded image bytes"
            }
        },
        "required": ["image"]
    });

    if settings.n > 1 {
        response_schema = serde_json::json!({
            "type": "object",
            "properties": {
                "images": {
                    "type": "array",
                    "items": { "type": "string" },
                    "description": "base64 encoded image bytes"
                }
            },
            "required": ["images"]
        });
    }

    Ok(serde_json::json!({
        "contents": [
            {
                "role": "user",
                "parts": parts,
            }
        ],
        "generationConfig": {
            "temperature": 0.8,
            "responseMimeType": "application/json",
            "responseSchema": response_schema,
            "candidateCount": settings.n,
            "maxOutputTokens": 8192,
        },
        "safetySettings": [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": if settings.moderation == "low" { "BLOCK_NONE" } else { "BLOCK_ONLY_HIGH" }
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": if settings.moderation == "low" { "BLOCK_NONE" } else { "BLOCK_ONLY_HIGH" }
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": if settings.moderation == "low" { "BLOCK_NONE" } else { "BLOCK_ONLY_HIGH" }
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": if settings.moderation == "low" { "BLOCK_NONE" } else { "BLOCK_ONLY_HIGH" }
            }
        ],
        "_imagen": {
            "size": settings.size,
            "quality": settings.quality,
            "outputFormat": settings.output_format,
            "outputCompression": settings.output_compression,
            "background": settings.background,
            "timeoutSec": settings.timeout_sec,
            "responseMimeType": response_mime_type
        }
    }))
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

fn inline_image_data(path: &str) -> Result<(String, String), String> {
    let path = Path::new(path);
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    Ok((
        mime_for_path(path).to_string(),
        base64::engine::general_purpose::STANDARD.encode(bytes),
    ))
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

async fn extract_openai_outputs(
    payload: &serde_json::Value,
    client: &reqwest::Client,
    cancellation: &tokio::sync::watch::Receiver<bool>,
    settings: &Settings,
) -> Result<Vec<GeneratedImage>, String> {
    let data = payload
        .get("data")
        .and_then(|v| v.as_array())
        .ok_or_else(|| format!("openai_payload_invalid: missing data array. payload={}", payload))?;

    if data.is_empty() {
        return Err(format!("openai_payload_empty_data: payload={}", payload));
    }

    let mut outputs = Vec::new();
    for (index, item) in data.iter().enumerate() {
        let bytes = if let Some(b64) = item.get("b64_json").and_then(|v| v.as_str()) {
            base64::engine::general_purpose::STANDARD
                .decode(b64)
                .map_err(|e| format!("openai_b64_decode_failed[index={}]: {}", index, e))?
        } else if let Some(url) = item.get("url").and_then(|v| v.as_str()) {
            let url_response = await_or_cancel(cancellation, client.get(url).send())
                .await
                .map_err(|e| format!("openai_url_fetch_failed[index={}]: {}", index, e))?;
            let bytes = await_or_cancel(cancellation, url_response.bytes())
                .await
                .map_err(|e| format!("openai_url_body_decode_failed[index={}]: {}", index, e))?;
            bytes.to_vec()
        } else {
            continue;
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

    if outputs.is_empty() {
        return Err(format!(
            "openai_payload_no_supported_image_fields: expected b64_json or url in data entries. payload={}",
            payload
        ));
    }

    Ok(outputs)
}

fn extract_gemini_outputs(payload: &serde_json::Value) -> Result<Vec<GeneratedImage>, String> {
    let candidates = payload
        .get("candidates")
        .and_then(|value| value.as_array())
        .ok_or_else(|| format!("gemini_payload_invalid: missing candidates array. payload={}", payload))?;

    if candidates.is_empty() {
        return Err(format!("gemini_payload_empty_candidates: payload={}", payload));
    }

    let mut outputs = Vec::new();

    for (candidate_index, candidate) in candidates.iter().enumerate() {
        if let Some(parts) = candidate
            .get("content")
            .and_then(|content| content.get("parts"))
            .and_then(|parts| parts.as_array())
        {
            for part in parts {
                if let Some(inline_data) = part.get("inlineData") {
                    let mime = inline_data
                        .get("mimeType")
                        .and_then(|value| value.as_str())
                        .unwrap_or("image/png");
                    if let Some(data) = inline_data.get("data").and_then(|value| value.as_str()) {
                        let format = output_format_from_mime(mime).to_string();
                        outputs.push(GeneratedImage {
                            path: None,
                            format,
                            data_url: format!("data:{};base64,{}", mime, data),
                        });
                    }
                }

                if let Some(text) = part.get("text").and_then(|value| value.as_str()) {
                    if let Ok(value) = serde_json::from_str::<serde_json::Value>(text) {
                        if let Some(image) = value.get("image").and_then(|v| v.as_str()) {
                            outputs.push(GeneratedImage {
                                path: None,
                                format: "png".into(),
                                data_url: format!("data:image/png;base64,{}", image),
                            });
                        }
                        if let Some(images) = value.get("images").and_then(|v| v.as_array()) {
                            for image in images {
                                if let Some(data) = image.as_str() {
                                    outputs.push(GeneratedImage {
                                        path: None,
                                        format: "png".into(),
                                        data_url: format!("data:image/png;base64,{}", data),
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        if let Some(parts) = candidate.get("output").and_then(|output| output.as_array()) {
            for part in parts {
                let mime = part
                    .get("mimeType")
                    .and_then(|value| value.as_str())
                    .unwrap_or("image/png");
                if let Some(data) = part.get("bytesBase64Encoded").and_then(|value| value.as_str()) {
                    let format = output_format_from_mime(mime).to_string();
                    outputs.push(GeneratedImage {
                        path: None,
                        format,
                        data_url: format!("data:{};base64,{}", mime, data),
                    });
                }
            }
        }

        if candidate
            .get("finishReason")
            .and_then(|value| value.as_str())
            .is_some_and(|reason| reason.eq_ignore_ascii_case("SAFETY"))
        {
            return Err(format!(
                "gemini_candidate_blocked_by_safety[index={}]: payload={}",
                candidate_index, payload
            ));
        }
    }

    if outputs.is_empty() {
        return Err(format!(
            "gemini_payload_no_image_data: expected inlineData/text.image/text.images/output.bytesBase64Encoded. payload={}",
            payload
        ));
    }

    Ok(outputs)
}

fn output_format_from_mime(mime: &str) -> &'static str {
    let lower = mime.to_ascii_lowercase();
    if lower.contains("jpeg") {
        "jpeg"
    } else if lower.contains("webp") {
        "webp"
    } else {
        "png"
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

    if let Some(candidates) = payload
        .get_mut("candidates")
        .and_then(|value| value.as_array_mut())
    {
        for candidate in candidates {
            if let Some(parts) = candidate
                .get_mut("content")
                .and_then(|content| content.get_mut("parts"))
                .and_then(|parts| parts.as_array_mut())
            {
                for part in parts {
                    if let Some(inline_data) = part.get_mut("inlineData") {
                        if let Some(data) = inline_data.get_mut("data") {
                            if let Some(text) = data.as_str() {
                                *data = serde_json::Value::String(format!("<base64 image, {} chars>", text.len()));
                            }
                        }
                    }
                }
            }
        }
    }

    payload
}

struct CancellationGuard<'a> {
    cancellation_id: String,
    cancel_registry: &'a CancelRegistry,
}

impl Drop for CancellationGuard<'_> {
    fn drop(&mut self) {
        self.cancel_registry.release(&self.cancellation_id);
    }
}

async fn await_or_cancel<T, E>(
    cancellation: &tokio::sync::watch::Receiver<bool>,
    fut: impl Future<Output = Result<T, E>>,
) -> Result<T, String>
where
    E: ToString,
{
    if *cancellation.borrow() {
        return Err(CANCELLED_ERROR_CODE.into());
    }

    let mut cancellation = cancellation.clone();
    tokio::select! {
        result = fut => result.map_err(|e| e.to_string()),
        _ = cancellation.changed() => Err(CANCELLED_ERROR_CODE.into()),
    }
}

fn is_image_content_type(content_type: &str) -> bool {
    content_type.to_ascii_lowercase().starts_with("image/")
}

fn is_likely_image_bytes(body: &[u8]) -> bool {
    body.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A])
        || body.starts_with(&[0xFF, 0xD8, 0xFF])
        || body.starts_with(b"RIFF")
}

fn detect_image_format(content_type: &str, body: &[u8]) -> Option<String> {
    let normalized = content_type.to_ascii_lowercase();
    if normalized.contains("image/png")
        || body.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A])
    {
        return Some("png".into());
    }
    if normalized.contains("image/jpeg") || body.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return Some("jpeg".into());
    }
    if normalized.contains("image/webp") || body.starts_with(b"RIFF") {
        return Some("webp".into());
    }
    None
}

fn response_preview_bytes(body: &[u8]) -> String {
    if body.is_empty() {
        return "<empty response>".into();
    }

    let max = body.len().min(120);
    let mut preview = String::new();
    for (index, byte) in body[..max].iter().enumerate() {
        use std::fmt::Write as _;
        let _ = write!(preview, "{:02x}", byte);
        if index + 1 < max {
            preview.push(' ');
        }
    }

    if body.len() > max {
        format!("len={} bytes, hex={} ...", body.len(), preview)
    } else {
        format!("len={} bytes, hex={}", body.len(), preview)
    }
}

fn response_preview(text: &str) -> String {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return "<empty response>".into();
    }
    let total_chars = trimmed.chars().count();
    let preview: String = trimmed.chars().take(500).collect();
    if total_chars > 500 {
        format!("len={} chars, text={}...", total_chars, preview)
    } else {
        format!("len={} chars, text={}", total_chars, preview)
    }
}
