use std::{
  fs,
  io::Write,
  path::{Path, PathBuf},
  process::Command,
  time::{SystemTime, UNIX_EPOCH},
};

use base64::Engine;
use chrono::Local;
use image::{
  codecs::{
    png::{CompressionType as PngCompressionType, FilterType as PngFilterType, PngEncoder},
    tga::TgaEncoder,
  },
  ColorType, ImageEncoder,
};
use image_blp::{
  convert::{image_to_blp, blp_to_image, AlphaBits, BlpOldFormat, BlpTarget, FilterType},
  encode::save_blp,
  parser::load_blp,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiProfile {
  pub id: String,
  pub name: String,
  pub api_key: String,
  pub api_base_url: String,
  pub model: String,
}

impl Default for ApiProfile {
  fn default() -> Self {
    Self {
      id: "default".into(),
      name: "默认 API".into(),
      api_key: String::new(),
      api_base_url: "https://api.openai.com/v1".into(),
      model: "gpt-image-2".into(),
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
  #[serde(default = "default_api_profiles")]
  pub api_profiles: Vec<ApiProfile>,
  #[serde(default = "default_active_api_profile_id")]
  pub active_api_profile_id: String,
  #[serde(default = "default_output_dir")]
  pub output_dir: String,
  #[serde(default = "default_size")]
  pub size: String,
  #[serde(default = "default_quality")]
  pub quality: String,
  #[serde(default = "default_output_format")]
  pub output_format: String,
  #[serde(default)]
  pub remove_background: bool,
  #[serde(default = "default_count")]
  pub n: u32,
  #[serde(default)]
  pub positive_prompt: String,
  #[serde(default)]
  pub negative_prompt: String,
  #[serde(default)]
  pub positive_prompt_library: Vec<String>,
  #[serde(default)]
  pub negative_prompt_library: Vec<String>,
  #[serde(default)]
  pub style_preset: String,
  #[serde(default = "default_content_type")]
  pub content_type: String,
  #[serde(default)]
  pub reference_library_dir: String,
  #[serde(default)]
  pub reference_image_path: String,
  #[serde(default)]
  pub mask_image_path: String,
  #[serde(default)]
  pub convert_source_dir: String,
  #[serde(default)]
  pub convert_target_dir: String,
  #[serde(default = "default_convert_source_formats")]
  pub convert_source_formats: Vec<String>,
  #[serde(default = "default_convert_target_format")]
  pub convert_target_format: String,
  #[serde(default = "default_true")]
  pub convert_recursive: bool,
  #[serde(default = "default_true")]
  pub convert_keep_structure: bool,
  #[serde(default = "default_tga_bits")]
  pub convert_tga_bits: u8,
  #[serde(default = "default_true")]
  pub convert_tga_rle: bool,
  #[serde(default = "default_blp_encoding")]
  pub convert_blp_encoding: String,
  #[serde(default = "default_blp_alpha_bits")]
  pub convert_blp_alpha_bits: u8,
  #[serde(default)]
  pub convert_blp_jpeg_alpha: bool,
  #[serde(default = "default_true")]
  pub convert_blp_make_mipmaps: bool,
  #[serde(default = "default_blp_filter")]
  pub convert_blp_filter: String,
  #[serde(default = "default_alpha_mode")]
  pub convert_alpha_mode: String,
  #[serde(default = "default_alpha_threshold")]
  pub convert_alpha_threshold: u8,
  #[serde(default = "default_png_compression")]
  pub convert_png_compression: String,
  #[serde(default = "default_png_filter")]
  pub convert_png_filter: String,
  #[serde(default)]
  pub history: Vec<GenerationResult>,
}

impl Default for Settings {
  fn default() -> Self {
    let profile = ApiProfile::default();
    Self {
      api_profiles: vec![profile.clone()],
      active_api_profile_id: profile.id,
      output_dir: "outputs".into(),
      size: "1024x1024".into(),
      quality: "medium".into(),
      output_format: "png".into(),
      remove_background: false,
      n: 1,
      positive_prompt: String::new(),
      negative_prompt: String::new(),
      positive_prompt_library: Vec::new(),
      negative_prompt_library: Vec::new(),
      style_preset: "none".into(),
      content_type: "icon".into(),
      reference_library_dir: String::new(),
      reference_image_path: String::new(),
      mask_image_path: String::new(),
      convert_source_dir: String::new(),
      convert_target_dir: String::new(),
      convert_source_formats: default_convert_source_formats(),
      convert_target_format: default_convert_target_format(),
      convert_recursive: true,
      convert_keep_structure: true,
      convert_tga_bits: default_tga_bits(),
      convert_tga_rle: true,
      convert_blp_encoding: default_blp_encoding(),
      convert_blp_alpha_bits: default_blp_alpha_bits(),
      convert_blp_jpeg_alpha: false,
      convert_blp_make_mipmaps: true,
      convert_blp_filter: default_blp_filter(),
      convert_alpha_mode: default_alpha_mode(),
      convert_alpha_threshold: default_alpha_threshold(),
      convert_png_compression: default_png_compression(),
      convert_png_filter: default_png_filter(),
      history: Vec::new(),
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedImage {
  pub path: Option<String>,
  pub format: String,
  pub data_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationResult {
  pub id: String,
  pub created_at: String,
  pub prompt: String,
  pub status: String,
  pub outputs: Vec<GeneratedImage>,
  pub error: Option<String>,
  pub request: serde_json::Value,
  pub response: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveImageRequest {
  pub settings: Settings,
  pub data_url: String,
  pub width: u32,
  pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchConvertRequest {
  pub source_dir: String,
  pub target_dir: String,
  pub source_formats: Vec<String>,
  pub target_format: String,
  pub recursive: bool,
  pub keep_structure: bool,
  #[serde(default = "default_blp_encoding")]
  pub blp_encoding: String,
  #[serde(default = "default_blp_alpha_bits")]
  pub blp_alpha_bits: u8,
  #[serde(default)]
  pub blp_jpeg_alpha: bool,
  #[serde(default = "default_true")]
  pub blp_make_mipmaps: bool,
  #[serde(default = "default_blp_filter")]
  pub blp_filter: String,
  #[serde(default = "default_alpha_mode")]
  pub alpha_mode: String,
  #[serde(default = "default_alpha_threshold")]
  pub alpha_threshold: u8,
  #[serde(default = "default_tga_bits")]
  pub tga_bits: u8,
  #[serde(default = "default_true")]
  pub tga_rle: bool,
  #[serde(default = "default_png_compression")]
  pub png_compression: String,
  #[serde(default = "default_png_filter")]
  pub png_filter: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchConvertResult {
  pub total: usize,
  pub converted: usize,
  pub failed: usize,
  pub errors: Vec<String>,
}

#[tauri::command]
fn load_settings() -> Result<Settings, String> {
  let path = settings_path()?;
  if !path.exists() {
    return Ok(Settings::default());
  }
  let text = fs::read_to_string(path).map_err(|e| e.to_string())?;
  let value: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
  if value.get("apiProfiles").is_some() {
    serde_json::from_value(value).map_err(|e| e.to_string())
  } else {
    migrate_legacy_settings(value)
  }
}

#[tauri::command]
fn settings_exists() -> Result<bool, String> {
  Ok(settings_path()?.exists())
}

#[tauri::command]
fn save_settings(settings: Settings) -> Result<(), String> {
  let path = settings_path()?;
  if let Some(parent) = path.parent() {
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
  }
  let text = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
  fs::write(path, text).map_err(|e| e.to_string())
}

#[tauri::command]
fn pick_random_reference_image(directory: String) -> Result<String, String> {
  let dir = PathBuf::from(directory);
  if !dir.is_dir() {
    return Err("参考图库文件夹不存在".into());
  }

  let mut images = Vec::new();
  for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
    let path = entry.map_err(|e| e.to_string())?.path();
    if path.is_file() && is_supported_image(&path) {
      images.push(path);
    }
  }

  if images.is_empty() {
    return Err("参考图库中没有可用图片".into());
  }

  let seed = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map_err(|e| e.to_string())?
    .as_nanos() as usize;
  let index = seed % images.len();
  Ok(images[index].to_string_lossy().to_string())
}

#[tauri::command]
fn read_image_data_url(path: String) -> Result<String, String> {
  let path = PathBuf::from(path);
  if !path.is_file() {
    return Err("图片文件不存在".into());
  }
  if !is_supported_image(&path) {
    return Err("不支持的图片格式".into());
  }
  let bytes = fs::read(&path).map_err(|e| e.to_string())?;
  let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
  Ok(format!("data:{};base64,{}", mime_for_path(&path), encoded))
}

#[tauri::command]
fn open_api_signup_url(provider: Option<String>) -> Result<(), String> {
  let url = match provider.as_deref().unwrap_or("pptokens") {
    "pptokens" => "https://www.pptoken.org/?promo=AFFNV",
    "aifast" => "https://aifast.site/register?aff=6fbi",
    "yunwu" => "https://yunwu.ai/register?aff=3QLV",
    _ => return Err("Unknown API provider".into()),
  };
  open_external_url(url)
}

#[tauri::command]
fn open_qq_group_url() -> Result<(), String> {
  open_external_url("https://qm.qq.com/q/b6UzYJ5Ghi")
}

fn open_external_url(url: &str) -> Result<(), String> {
  #[cfg(target_os = "windows")]
  {
    Command::new("cmd")
      .args(["/C", "start", "", url])
      .spawn()
      .map_err(|e| e.to_string())?;
  }
  #[cfg(target_os = "macos")]
  {
    Command::new("open")
      .arg(url)
      .spawn()
      .map_err(|e| e.to_string())?;
  }
  #[cfg(all(unix, not(target_os = "macos")))]
  {
    Command::new("xdg-open")
      .arg(url)
      .spawn()
      .map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[tauri::command]
async fn generate_image(settings: Settings) -> Result<GenerationResult, String> {
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

  let client = reqwest::Client::new();
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

  let payload: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
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

pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      settings_exists,
      load_settings,
      save_settings,
      pick_random_reference_image,
      read_image_data_url,
      open_api_signup_url,
      open_qq_group_url,
      generate_image,
      save_generated_image,
      batch_convert_images
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
fn save_generated_image(request: SaveImageRequest) -> Result<String, String> {
  if (request.width == 0) != (request.height == 0) {
    return Err("Invalid save size".into());
  }

  let bytes = data_url_to_bytes(&request.data_url)?;
  let image = image::load_from_memory(&bytes).map_err(|e| e.to_string())?;
  let mut resized = if request.width == 0 && request.height == 0 {
    image
  } else {
    image.resize_exact(
      request.width,
      request.height,
      image::imageops::FilterType::Lanczos3,
    )
  };
  if request.settings.remove_background {
    resized = remove_background_to_transparent(resized);
  }

  let day_dir = output_root(&request.settings)?.join(Local::now().format("%Y-%m-%d").to_string());
  fs::create_dir_all(&day_dir).map_err(|e| e.to_string())?;

  let ext = match request.settings.output_format.as_str() {
    _ if request.settings.remove_background => "png",
    "jpeg" => "jpg",
    "webp" => "webp",
    _ => "png",
  };
  let path = day_dir.join(format!("{}.{}", Uuid::new_v4(), ext));
  resized.save(&path).map_err(|e| e.to_string())?;
  Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn batch_convert_images(request: BatchConvertRequest) -> Result<BatchConvertResult, String> {
  let source_root = PathBuf::from(request.source_dir.trim());
  let target_root = PathBuf::from(request.target_dir.trim());
  if !source_root.is_dir() {
    return Err("源文件夹不存在".into());
  }
  if request.source_formats.is_empty() {
    return Err("请至少选择一个源格式".into());
  }
  let target_format = request.target_format.trim().to_lowercase();
  if !matches!(target_format.as_str(), "png" | "tga" | "blp") {
    return Err("目标格式仅支持 png/tga/blp".into());
  }

  let source_formats: Vec<String> = request
    .source_formats
    .iter()
    .map(|f| f.trim().to_lowercase())
    .collect();

  fs::create_dir_all(&target_root).map_err(|e| e.to_string())?;

  let mut files = Vec::new();
  collect_source_files(&source_root, request.recursive, &source_formats, &mut files)?;

  let mut converted = 0usize;
  let mut failed = 0usize;
  let mut errors = Vec::new();

  for file in &files {
    let relative = file.strip_prefix(&source_root).unwrap_or(file);
    let out_parent = if request.keep_structure {
      target_root.join(relative.parent().unwrap_or_else(|| Path::new("")))
    } else {
      target_root.clone()
    };
    if let Err(e) = fs::create_dir_all(&out_parent) {
      failed += 1;
      errors.push(format!("创建输出目录失败 {}: {}", out_parent.to_string_lossy(), e));
      continue;
    }
    let stem = file.file_stem().and_then(|s| s.to_str()).unwrap_or("output");
    let out_path = out_parent.join(format!("{}.{}", stem, target_format));

    match convert_one_image(file, &out_path, &target_format, &request) {
      Ok(_) => converted += 1,
      Err(e) => {
        failed += 1;
        errors.push(format!("{} -> {} 失败: {}", file.to_string_lossy(), out_path.to_string_lossy(), e));
      }
    }
  }

  Ok(BatchConvertResult {
    total: files.len(),
    converted,
    failed,
    errors,
  })
}

fn collect_source_files(
  root: &Path,
  recursive: bool,
  formats: &[String],
  out: &mut Vec<PathBuf>,
) -> Result<(), String> {
  for entry in fs::read_dir(root).map_err(|e| e.to_string())? {
    let path = entry.map_err(|e| e.to_string())?.path();
    if path.is_dir() {
      if recursive {
        collect_source_files(&path, recursive, formats, out)?;
      }
      continue;
    }
    let ext = path
      .extension()
      .and_then(|v| v.to_str())
      .unwrap_or_default()
      .to_lowercase();
    if formats.iter().any(|f| f == &ext) {
      out.push(path);
    }
  }
  Ok(())
}

fn convert_one_image(
  input: &Path,
  output: &Path,
  target_format: &str,
  request: &BatchConvertRequest,
) -> Result<(), String> {
  let src_ext = input
    .extension()
    .and_then(|v| v.to_str())
    .unwrap_or_default()
    .to_lowercase();

  let mut image = if src_ext == "blp" {
    let blp = load_blp(input).map_err(|e| e.to_string())?;
    blp_to_image(&blp, 0).map_err(|e| e.to_string())?
  } else {
    image::open(input).map_err(|e| e.to_string())?
  };
  image = apply_alpha_mode(image, &request.alpha_mode, request.alpha_threshold);

  if target_format == "blp" {
    let encoding = request.blp_encoding.to_lowercase();
    // War3 BLP1 Raw1 palette can appear with swapped R/B channels when produced
    // by generic pipelines; pre-swap fixes in-game/icon preview colors.
    if encoding == "raw1" {
      image = swap_red_blue_channels(image);
    }
    let target = match encoding.as_str() {
      "jpeg" => BlpTarget::Blp1(BlpOldFormat::Jpeg {
        has_alpha: request.blp_jpeg_alpha,
      }),
      _ => BlpTarget::Blp1(BlpOldFormat::Raw1 {
        alpha_bits: map_alpha_bits(request.blp_alpha_bits),
      }),
    };
    let blp = image_to_blp(
      image,
      request.blp_make_mipmaps,
      target,
      map_filter_type(&request.blp_filter),
    )
    .map_err(|e| e.to_string())?;
    save_blp(&blp, output).map_err(|e| e.to_string())
  } else if target_format == "tga" {
    save_tga_with_options(&image, output, request.tga_bits, request.tga_rle)
  } else {
    save_png_with_options(&image, output, &request.png_compression, &request.png_filter)
  }
}

fn save_tga_with_options(
  image: &image::DynamicImage,
  output: &Path,
  bits: u8,
  rle: bool,
) -> Result<(), String> {
  match bits {
    16 => save_tga16(image, output, rle),
    24 => {
      let rgb = image.to_rgb8();
      let file = fs::File::create(output).map_err(|e| e.to_string())?;
      let encoder = TgaEncoder::new(file);
      let encoder = if rle { encoder } else { encoder.disable_rle() };
      encoder
        .encode(&rgb, rgb.width(), rgb.height(), ColorType::Rgb8)
        .map_err(|e| e.to_string())
    }
    _ => {
      let rgba = image.to_rgba8();
      let file = fs::File::create(output).map_err(|e| e.to_string())?;
      let encoder = TgaEncoder::new(file);
      let encoder = if rle { encoder } else { encoder.disable_rle() };
      encoder
        .encode(&rgba, rgba.width(), rgba.height(), ColorType::Rgba8)
        .map_err(|e| e.to_string())
    }
  }
}

fn save_tga16(image: &image::DynamicImage, output: &Path, rle: bool) -> Result<(), String> {
  let rgba = image.to_rgba8();
  let width = u16::try_from(rgba.width()).map_err(|_| "TGA width exceeds 65535".to_string())?;
  let height = u16::try_from(rgba.height()).map_err(|_| "TGA height exceeds 65535".to_string())?;
  let mut pixels = Vec::with_capacity(rgba.len() / 2);
  for pixel in rgba.pixels() {
    let r = (pixel[0] >> 3) as u16;
    let g = (pixel[1] >> 3) as u16;
    let b = (pixel[2] >> 3) as u16;
    let a = if pixel[3] >= 128 { 1u16 } else { 0u16 };
    let value = (a << 15) | (r << 10) | (g << 5) | b;
    pixels.extend_from_slice(&value.to_le_bytes());
  }

  let mut file = fs::File::create(output).map_err(|e| e.to_string())?;
  let mut header = [0u8; 18];
  header[2] = if rle { 10 } else { 2 };
  header[12..14].copy_from_slice(&width.to_le_bytes());
  header[14..16].copy_from_slice(&height.to_le_bytes());
  header[16] = 16;
  header[17] = 0x20 | 1;
  file.write_all(&header).map_err(|e| e.to_string())?;
  if rle {
    write_tga_rle_packets(&mut file, &pixels, 2)
  } else {
    file.write_all(&pixels).map_err(|e| e.to_string())
  }
}

fn save_png_with_options(
  image: &image::DynamicImage,
  output: &Path,
  compression: &str,
  filter: &str,
) -> Result<(), String> {
  let rgba = image.to_rgba8();
  let file = fs::File::create(output).map_err(|e| e.to_string())?;
  let encoder = PngEncoder::new_with_quality(
    file,
    map_png_compression(compression),
    map_png_filter(filter),
  );
  encoder
    .write_image(
      &rgba,
      rgba.width(),
      rgba.height(),
      ColorType::Rgba8,
    )
    .map_err(|e| e.to_string())
}

fn write_tga_rle_packets<W: Write>(
  writer: &mut W,
  bytes: &[u8],
  bytes_per_pixel: usize,
) -> Result<(), String> {
  let pixel_count = bytes.len() / bytes_per_pixel;
  let mut i = 0usize;
  while i < pixel_count {
    let current = pixel_slice(bytes, bytes_per_pixel, i);
    let mut run_len = 1usize;
    while i + run_len < pixel_count
      && run_len < 128
      && pixel_slice(bytes, bytes_per_pixel, i + run_len) == current
    {
      run_len += 1;
    }

    if run_len >= 2 {
      writer
        .write_all(&[0x80 | ((run_len - 1) as u8)])
        .map_err(|e| e.to_string())?;
      writer.write_all(current).map_err(|e| e.to_string())?;
      i += run_len;
      continue;
    }

    let raw_start = i;
    i += 1;
    while i < pixel_count {
      let pixel = pixel_slice(bytes, bytes_per_pixel, i);
      let mut next_run = 1usize;
      while i + next_run < pixel_count
        && next_run < 128
        && pixel_slice(bytes, bytes_per_pixel, i + next_run) == pixel
      {
        next_run += 1;
      }
      if next_run >= 2 || i - raw_start >= 128 {
        break;
      }
      i += 1;
    }

    let raw_len = i - raw_start;
    writer
      .write_all(&[((raw_len - 1) as u8)])
      .map_err(|e| e.to_string())?;
    writer
      .write_all(&bytes[raw_start * bytes_per_pixel..i * bytes_per_pixel])
      .map_err(|e| e.to_string())?;
  }
  Ok(())
}

fn pixel_slice(bytes: &[u8], bytes_per_pixel: usize, index: usize) -> &[u8] {
  &bytes[index * bytes_per_pixel..(index + 1) * bytes_per_pixel]
}

fn swap_red_blue_channels(image: image::DynamicImage) -> image::DynamicImage {
  let mut rgba = image.to_rgba8();
  for pixel in rgba.pixels_mut() {
    let r = pixel[0];
    pixel[0] = pixel[2];
    pixel[2] = r;
  }
  image::DynamicImage::ImageRgba8(rgba)
}

fn apply_alpha_mode(
  image: image::DynamicImage,
  mode: &str,
  threshold: u8,
) -> image::DynamicImage {
  match mode.to_lowercase().as_str() {
    "unpremultiply" => {
      let mut rgba = image.to_rgba8();
      for pixel in rgba.pixels_mut() {
        let a = pixel[3];
        if a == 0 {
          continue;
        }
        let af = a as f32 / 255.0;
        pixel[0] = ((pixel[0] as f32 / af).clamp(0.0, 255.0)) as u8;
        pixel[1] = ((pixel[1] as f32 / af).clamp(0.0, 255.0)) as u8;
        pixel[2] = ((pixel[2] as f32 / af).clamp(0.0, 255.0)) as u8;
      }
      image::DynamicImage::ImageRgba8(rgba)
    }
    "threshold" => {
      let mut rgba = image.to_rgba8();
      for pixel in rgba.pixels_mut() {
        pixel[3] = if pixel[3] < threshold { 0 } else { 255 };
      }
      image::DynamicImage::ImageRgba8(rgba)
    }
    _ => image,
  }
}

fn map_alpha_bits(bits: u8) -> AlphaBits {
  match bits {
    0 => AlphaBits::NoAlpha,
    1 => AlphaBits::Bit1,
    4 => AlphaBits::Bit4,
    _ => AlphaBits::Bit8,
  }
}

fn map_filter_type(value: &str) -> FilterType {
  match value.to_lowercase().as_str() {
    "triangle" => FilterType::Triangle,
    "catmullrom" => FilterType::CatmullRom,
    "gaussian" => FilterType::Gaussian,
    "lanczos3" => FilterType::Lanczos3,
    _ => FilterType::Nearest,
  }
}

fn default_blp_encoding() -> String {
  "raw1".into()
}

fn default_blp_alpha_bits() -> u8 {
  8
}

fn default_true() -> bool {
  true
}

fn default_blp_filter() -> String {
  "nearest".into()
}

fn default_alpha_mode() -> String {
  "passthrough".into()
}

fn default_alpha_threshold() -> u8 {
  128
}

fn default_tga_bits() -> u8 {
  32
}

fn default_png_compression() -> String {
  "default".into()
}

fn default_png_filter() -> String {
  "adaptive".into()
}

fn map_png_compression(value: &str) -> PngCompressionType {
  match value.to_lowercase().as_str() {
    "fast" => PngCompressionType::Fast,
    "best" => PngCompressionType::Best,
    _ => PngCompressionType::Default,
  }
}

fn map_png_filter(value: &str) -> PngFilterType {
  match value.to_lowercase().as_str() {
    "none" => PngFilterType::NoFilter,
    "sub" => PngFilterType::Sub,
    "up" => PngFilterType::Up,
    "avg" => PngFilterType::Avg,
    "paeth" => PngFilterType::Paeth,
    _ => PngFilterType::Adaptive,
  }
}

fn settings_path() -> Result<PathBuf, String> {
  let base = dirs::home_dir()
    .ok_or_else(|| "No config directory available".to_string())?;
  Ok(base.join(".imagen").join("settings.json"))
}

fn output_root(settings: &Settings) -> Result<PathBuf, String> {
  let root = Path::new(&settings.output_dir);
  if root.is_absolute() {
    Ok(root.to_path_buf())
  } else {
    Ok(std::env::current_dir()
      .map_err(|e| e.to_string())?
      .join(root))
  }
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

fn is_supported_image(path: &Path) -> bool {
  matches!(
    path
      .extension()
      .and_then(|value| value.to_str())
      .unwrap_or_default()
      .to_lowercase()
      .as_str(),
    "png" | "jpg" | "jpeg" | "webp"
  )
}

fn remove_background_to_transparent(image: image::DynamicImage) -> image::DynamicImage {
  let mut rgba = image.to_rgba8();
  let width = rgba.width();
  let height = rgba.height();
  if width == 0 || height == 0 {
    return image::DynamicImage::ImageRgba8(rgba);
  }

  let width_usize = width as usize;
  let height_usize = height as usize;
  let len = width_usize * height_usize;
  let bg = estimate_edge_background_color(&rgba);
  let mut background = vec![false; len];
  let mut queue = std::collections::VecDeque::new();

  for x in 0..width {
    push_background_seed(&rgba, &mut background, &mut queue, x, 0, width, bg);
    push_background_seed(&rgba, &mut background, &mut queue, x, height - 1, width, bg);
  }
  for y in 0..height {
    push_background_seed(&rgba, &mut background, &mut queue, 0, y, width, bg);
    push_background_seed(&rgba, &mut background, &mut queue, width - 1, y, width, bg);
  }

  while let Some((x, y)) = queue.pop_front() {
    let neighbors = [
      (x.wrapping_sub(1), y, x > 0),
      (x + 1, y, x + 1 < width),
      (x, y.wrapping_sub(1), y > 0),
      (x, y + 1, y + 1 < height),
    ];
    for (nx, ny, valid) in neighbors {
      if !valid {
        continue;
      }
      let index = (ny as usize * width_usize) + nx as usize;
      if !background[index] && is_background_like(rgba.get_pixel(nx, ny).0, bg, 62.0) {
        background[index] = true;
        queue.push_back((nx, ny));
      }
    }
  }

  let mut feather_alpha = vec![255u8; len];
  for y in 0..height {
    for x in 0..width {
      let index = (y as usize * width_usize) + x as usize;
      if background[index] {
        feather_alpha[index] = 0;
        continue;
      }

      let mut min_bg_distance = 4u32;
      for dy in -3i32..=3 {
        for dx in -3i32..=3 {
          if dx == 0 && dy == 0 {
            continue;
          }
          let nx = x as i32 + dx;
          let ny = y as i32 + dy;
          if nx < 0 || ny < 0 || nx >= width as i32 || ny >= height as i32 {
            continue;
          }
          let nindex = (ny as usize * width_usize) + nx as usize;
          if background[nindex] {
            let distance = dx.unsigned_abs().max(dy.unsigned_abs());
            min_bg_distance = min_bg_distance.min(distance);
          }
        }
      }

      feather_alpha[index] = match min_bg_distance {
        1 => 150,
        2 => 218,
        _ => 255,
      };
    }
  }

  for y in 0..height {
    for x in 0..width {
      let index = (y as usize * width_usize) + x as usize;
      let alpha = feather_alpha[index];
      let pixel = rgba.get_pixel_mut(x, y);
      if alpha == 0 {
        pixel[3] = 0;
      } else if alpha < 255 {
        let factor = alpha as f32 / 255.0;
        for channel in 0..3 {
          let foreground = (pixel[channel] as f32 - (1.0 - factor) * bg[channel] as f32) / factor;
          pixel[channel] = foreground.clamp(0.0, 255.0) as u8;
        }
        pixel[3] = pixel[3].min(alpha);
      }
    }
  }

  image::DynamicImage::ImageRgba8(rgba)
}

fn estimate_edge_background_color(image: &image::RgbaImage) -> [u8; 3] {
  let width = image.width();
  let height = image.height();
  let mut samples = Vec::new();
  let step_x = (width / 32).max(1);
  let step_y = (height / 32).max(1);

  for x in (0..width).step_by(step_x as usize) {
    samples.push(image.get_pixel(x, 0).0);
    samples.push(image.get_pixel(x, height - 1).0);
  }
  for y in (0..height).step_by(step_y as usize) {
    samples.push(image.get_pixel(0, y).0);
    samples.push(image.get_pixel(width - 1, y).0);
  }

  samples.sort_by_key(|p| p[0] as u16 + p[1] as u16 + p[2] as u16);
  let mid = samples.len() / 2;
  [samples[mid][0], samples[mid][1], samples[mid][2]]
}

fn push_background_seed(
  image: &image::RgbaImage,
  background: &mut [bool],
  queue: &mut std::collections::VecDeque<(u32, u32)>,
  x: u32,
  y: u32,
  width: u32,
  bg: [u8; 3],
) {
  let index = (y as usize * width as usize) + x as usize;
  if !background[index] && is_background_like(image.get_pixel(x, y).0, bg, 62.0) {
    background[index] = true;
    queue.push_back((x, y));
  }
}

fn is_background_like(pixel: [u8; 4], bg: [u8; 3], threshold: f32) -> bool {
  let dr = pixel[0] as i32 - bg[0] as i32;
  let dg = pixel[1] as i32 - bg[1] as i32;
  let db = pixel[2] as i32 - bg[2] as i32;
  ((dr * dr + dg * dg + db * db) as f32).sqrt() <= threshold
}

fn data_url_prefix(format: &str) -> &'static str {
  match format {
    "jpeg" => "data:image/jpeg;base64,",
    "webp" => "data:image/webp;base64,",
    _ => "data:image/png;base64,",
  }
}

fn data_url_to_bytes(data_url: &str) -> Result<Vec<u8>, String> {
  let (_, b64) = data_url
    .split_once(',')
    .ok_or_else(|| "Invalid image data URL".to_string())?;
  base64::engine::general_purpose::STANDARD
    .decode(b64)
    .map_err(|e| e.to_string())
}

fn sanitize_response_payload(mut payload: serde_json::Value) -> serde_json::Value {
  if let Some(data) = payload.get_mut("data").and_then(|value| value.as_array_mut()) {
    for item in data {
      if let Some(b64) = item.get_mut("b64_json") {
        if let Some(text) = b64.as_str() {
          *b64 = serde_json::Value::String(format!("<base64 image, {} chars>", text.len()));
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

fn default_api_profiles() -> Vec<ApiProfile> {
  vec![ApiProfile::default()]
}

fn default_active_api_profile_id() -> String {
  ApiProfile::default().id
}

fn default_output_dir() -> String {
  "outputs".into()
}

fn default_size() -> String {
  "1024x1024".into()
}

fn default_quality() -> String {
  "medium".into()
}

fn default_output_format() -> String {
  "png".into()
}

fn default_count() -> u32 {
  1
}

fn default_content_type() -> String {
  "icon".into()
}

fn default_convert_source_formats() -> Vec<String> {
  vec!["png".into()]
}

fn default_convert_target_format() -> String {
  "blp".into()
}

fn migrate_legacy_settings(value: serde_json::Value) -> Result<Settings, String> {
  let defaults = Settings::default();
  let profile = ApiProfile {
    id: "default".into(),
    name: "默认 API".into(),
    api_key: value
      .get("apiKey")
      .and_then(|v| v.as_str())
      .unwrap_or_default()
      .to_string(),
    api_base_url: value
      .get("apiBaseUrl")
      .and_then(|v| v.as_str())
      .unwrap_or("https://api.openai.com/v1")
      .to_string(),
    model: value
      .get("model")
      .and_then(|v| v.as_str())
      .unwrap_or("gpt-image-2")
      .to_string(),
  };

  Ok(Settings {
    api_profiles: vec![profile.clone()],
    active_api_profile_id: profile.id,
    output_dir: value
      .get("outputDir")
      .and_then(|v| v.as_str())
      .unwrap_or(&defaults.output_dir)
      .to_string(),
    size: value
      .get("size")
      .and_then(|v| v.as_str())
      .unwrap_or(&defaults.size)
      .to_string(),
    quality: value
      .get("quality")
      .and_then(|v| v.as_str())
      .unwrap_or(&defaults.quality)
      .to_string(),
    output_format: value
      .get("outputFormat")
      .and_then(|v| v.as_str())
      .unwrap_or(&defaults.output_format)
      .to_string(),
    remove_background: value
      .get("removeBackground")
      .and_then(|v| v.as_bool())
      .unwrap_or(false),
    n: value
      .get("n")
      .and_then(|v| v.as_u64())
      .map(|v| v as u32)
      .unwrap_or(defaults.n),
    positive_prompt: value
      .get("prompt")
      .or_else(|| value.get("positivePrompt"))
      .and_then(|v| v.as_str())
      .unwrap_or_default()
      .to_string(),
    negative_prompt: value
      .get("negativePrompt")
      .and_then(|v| v.as_str())
      .unwrap_or_default()
      .to_string(),
    positive_prompt_library: Vec::new(),
    negative_prompt_library: Vec::new(),
    style_preset: "none".into(),
    content_type: "icon".into(),
    reference_library_dir: String::new(),
    reference_image_path: value
      .get("referenceImagePath")
      .and_then(|v| v.as_str())
      .unwrap_or_default()
      .to_string(),
    mask_image_path: value
      .get("maskImagePath")
      .and_then(|v| v.as_str())
      .unwrap_or_default()
      .to_string(),
    convert_source_dir: defaults.convert_source_dir,
    convert_target_dir: defaults.convert_target_dir,
    convert_source_formats: defaults.convert_source_formats,
    convert_target_format: defaults.convert_target_format,
    convert_recursive: defaults.convert_recursive,
    convert_keep_structure: defaults.convert_keep_structure,
    convert_tga_bits: defaults.convert_tga_bits,
    convert_tga_rle: defaults.convert_tga_rle,
    convert_blp_encoding: defaults.convert_blp_encoding,
    convert_blp_alpha_bits: defaults.convert_blp_alpha_bits,
    convert_blp_jpeg_alpha: defaults.convert_blp_jpeg_alpha,
    convert_blp_make_mipmaps: defaults.convert_blp_make_mipmaps,
    convert_blp_filter: defaults.convert_blp_filter,
    convert_alpha_mode: defaults.convert_alpha_mode,
    convert_alpha_threshold: defaults.convert_alpha_threshold,
    convert_png_compression: defaults.convert_png_compression,
    convert_png_filter: defaults.convert_png_filter,
    history: Vec::new(),
  })
}
