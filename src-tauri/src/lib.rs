use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};

mod image_generation;
mod image_ops;
mod settings;
mod war3_jpeg;

use base64::Engine;
use chrono::Local;
use image_ops::{BatchComposeRequest, BatchComposeResult, BatchConvertRequest, BatchConvertResult};
use serde::{Deserialize, Serialize};
use settings::{GenerationResult, Settings};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveImageRequest {
    pub settings: Settings,
    pub data_url: String,
    pub width: u32,
    pub height: u32,
}

#[tauri::command]
fn load_settings() -> Result<Settings, String> {
    settings::load_settings_file()
}

#[tauri::command]
fn settings_exists() -> Result<bool, String> {
    settings::settings_file_exists()
}

#[tauri::command]
fn save_settings(settings: Settings) -> Result<(), String> {
    settings::save_settings_file(&settings)
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
    image_generation::generate_image(settings).await
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
            batch_convert_images,
            batch_compose_images
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
async fn batch_convert_images(request: BatchConvertRequest) -> Result<BatchConvertResult, String> {
    image_ops::batch_convert_images(request).await
}

#[tauri::command]
async fn batch_compose_images(request: BatchComposeRequest) -> Result<BatchComposeResult, String> {
    image_ops::batch_compose_images(request).await
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
        path.extension()
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
                    let foreground =
                        (pixel[channel] as f32 - (1.0 - factor) * bg[channel] as f32) / factor;
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

fn data_url_to_bytes(data_url: &str) -> Result<Vec<u8>, String> {
    let (_, b64) = data_url
        .split_once(',')
        .ok_or_else(|| "Invalid image data URL".to_string())?;
    base64::engine::general_purpose::STANDARD
        .decode(b64)
        .map_err(|e| e.to_string())
}
