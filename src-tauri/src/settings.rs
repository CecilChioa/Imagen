use std::{fs, path::PathBuf};

use serde::{Deserialize, Serialize};

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
    #[serde(default = "default_schema_version")]
    pub schema_version: u32,
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
    #[serde(default = "default_blp_jpeg_alpha")]
    pub convert_blp_jpeg_alpha: bool,
    #[serde(default = "default_blp_jpeg_quality")]
    pub convert_blp_jpeg_quality: u8,
    #[serde(default = "default_blp_mipmap_count")]
    pub convert_blp_mipmap_count: u8,
    #[serde(default)]
    pub convert_blp_make_mipmaps: Option<bool>,
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
    pub compose_base_dir: String,
    #[serde(default)]
    pub compose_target_dir: String,
    #[serde(default)]
    pub history: Vec<GenerationResult>,
}

impl Default for Settings {
    fn default() -> Self {
        let profile = ApiProfile::default();
        Self {
            schema_version: default_schema_version(),
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
            convert_blp_jpeg_alpha: true,
            convert_blp_jpeg_quality: default_blp_jpeg_quality(),
            convert_blp_mipmap_count: default_blp_mipmap_count(),
            convert_blp_make_mipmaps: Some(true),
            convert_blp_filter: default_blp_filter(),
            convert_alpha_mode: default_alpha_mode(),
            convert_alpha_threshold: default_alpha_threshold(),
            convert_png_compression: default_png_compression(),
            convert_png_filter: default_png_filter(),
            compose_base_dir: String::new(),
            compose_target_dir: String::new(),
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

pub fn load_settings_file() -> Result<Settings, String> {
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

pub fn settings_file_exists() -> Result<bool, String> {
    Ok(settings_path()?.exists())
}

pub fn save_settings_file(settings: &Settings) -> Result<(), String> {
    let path = settings_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let text = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, text).map_err(|e| e.to_string())
}

fn settings_path() -> Result<PathBuf, String> {
    let base = dirs::home_dir().ok_or_else(|| "No config directory available".to_string())?;
    Ok(base.join(".imagen").join("settings.json"))
}

fn default_api_profiles() -> Vec<ApiProfile> {
    vec![ApiProfile::default()]
}

fn default_schema_version() -> u32 {
    1
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

pub(crate) fn default_blp_encoding() -> String {
    "jpeg".into()
}

pub(crate) fn default_blp_jpeg_alpha() -> bool {
    true
}

pub(crate) fn default_blp_jpeg_quality() -> u8 {
    50
}

pub(crate) fn default_blp_mipmap_count() -> u8 {
    16
}

pub(crate) fn default_blp_alpha_bits() -> u8 {
    8
}

pub(crate) fn default_true() -> bool {
    true
}

pub(crate) fn default_blp_filter() -> String {
    "nearest".into()
}

pub(crate) fn default_alpha_mode() -> String {
    "passthrough".into()
}

pub(crate) fn default_alpha_threshold() -> u8 {
    128
}

pub(crate) fn default_tga_bits() -> u8 {
    32
}

pub(crate) fn default_png_compression() -> String {
    "default".into()
}

pub(crate) fn default_png_filter() -> String {
    "adaptive".into()
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
        schema_version: default_schema_version(),
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
        convert_blp_jpeg_quality: defaults.convert_blp_jpeg_quality,
        convert_blp_mipmap_count: defaults.convert_blp_mipmap_count,
        convert_blp_make_mipmaps: defaults.convert_blp_make_mipmaps,
        convert_blp_filter: defaults.convert_blp_filter,
        convert_alpha_mode: defaults.convert_alpha_mode,
        convert_alpha_threshold: defaults.convert_alpha_threshold,
        convert_png_compression: defaults.convert_png_compression,
        convert_png_filter: defaults.convert_png_filter,
        compose_base_dir: defaults.compose_base_dir,
        compose_target_dir: defaults.compose_target_dir,
        history: Vec::new(),
    })
}
