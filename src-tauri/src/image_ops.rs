use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};

use image::{
    codecs::{
        png::{CompressionType as PngCompressionType, FilterType as PngFilterType, PngEncoder},
        tga::TgaEncoder,
    },
    ColorType, ImageEncoder,
};
use image_blp::{
    convert::{blp_to_image, image_to_blp, AlphaBits, BlpOldFormat, BlpTarget, FilterType},
    encode::save_blp,
    parser::load_blp,
    types::{BlpContent, BlpFlags, BlpVersion},
};
use serde::{Deserialize, Serialize};

use crate::{settings, war3_jpeg};
use settings::{
    default_alpha_mode, default_alpha_threshold, default_blp_alpha_bits, default_blp_encoding,
    default_blp_filter, default_blp_jpeg_alpha, default_blp_jpeg_quality, default_blp_mipmap_count,
    default_png_compression, default_png_filter, default_tga_bits, default_true,
};

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
    #[serde(default = "default_blp_jpeg_alpha")]
    pub blp_jpeg_alpha: bool,
    #[serde(default = "default_blp_jpeg_quality")]
    pub blp_jpeg_quality: u8,
    #[serde(default = "default_blp_mipmap_count")]
    pub blp_mipmap_count: u8,
    #[serde(default)]
    pub blp_make_mipmaps: Option<bool>,
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
pub struct BatchComposeRequest {
    pub base_dir: String,
    #[serde(default)]
    pub lower_overlay_path: String,
    #[serde(default)]
    pub upper_overlay_path: String,
    pub target_dir: String,
    pub recursive: bool,
    pub keep_structure: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchConvertResult {
    pub total: usize,
    pub converted: usize,
    pub failed: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchComposeResult {
    pub total: usize,
    pub composed: usize,
    pub failed: usize,
    pub errors: Vec<String>,
}

pub async fn batch_convert_images(
    request: BatchConvertRequest,
) -> Result<BatchConvertResult, String> {
    tauri::async_runtime::spawn_blocking(move || batch_convert_images_blocking(request))
        .await
        .map_err(|e| e.to_string())?
}

pub async fn batch_compose_images(
    request: BatchComposeRequest,
) -> Result<BatchComposeResult, String> {
    tauri::async_runtime::spawn_blocking(move || batch_compose_images_blocking(request))
        .await
        .map_err(|e| e.to_string())?
}

fn batch_convert_images_blocking(
    request: BatchConvertRequest,
) -> Result<BatchConvertResult, String> {
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
            errors.push(format!(
                "创建输出目录失败 {}: {}",
                out_parent.to_string_lossy(),
                e
            ));
            continue;
        }
        let stem = file
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("output");
        let out_path = out_parent.join(format!("{}.{}", stem, target_format));

        match convert_one_image(file, &out_path, &target_format, &request) {
            Ok(_) => converted += 1,
            Err(e) => {
                failed += 1;
                errors.push(format!(
                    "{} -> {} 失败: {}",
                    file.to_string_lossy(),
                    out_path.to_string_lossy(),
                    e
                ));
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

fn batch_compose_images_blocking(
    request: BatchComposeRequest,
) -> Result<BatchComposeResult, String> {
    let base_root = PathBuf::from(request.base_dir.trim());
    let lower_overlay_path = request.lower_overlay_path.trim();
    let upper_overlay_path = request.upper_overlay_path.trim();
    let lower_overlay = if lower_overlay_path.is_empty() {
        None
    } else {
        Some(PathBuf::from(lower_overlay_path))
    };
    let upper_overlay = if upper_overlay_path.is_empty() {
        None
    } else {
        Some(PathBuf::from(upper_overlay_path))
    };
    let target_root = PathBuf::from(request.target_dir.trim());
    if !base_root.is_dir() {
        return Err("原图文件夹不存在".into());
    }
    if lower_overlay.is_none() && upper_overlay.is_none() {
        return Err("请至少选择一张叠加图片".into());
    }
    if lower_overlay.as_ref().is_some_and(|path| !path.is_file()) {
        return Err("下层叠加图片不存在".into());
    }
    if upper_overlay.as_ref().is_some_and(|path| !path.is_file()) {
        return Err("上层叠加图片不存在".into());
    }

    fs::create_dir_all(&target_root).map_err(|e| e.to_string())?;

    let mut base_files = Vec::new();
    collect_source_files(
        &base_root,
        request.recursive,
        &[
            "png".into(),
            "jpg".into(),
            "jpeg".into(),
            "webp".into(),
            "bmp".into(),
            "tga".into(),
            "blp".into(),
        ],
        &mut base_files,
    )?;

    let mut composed = 0usize;
    let mut failed = 0usize;
    let mut errors = Vec::new();

    for base_file in &base_files {
        let relative = base_file.strip_prefix(&base_root).unwrap_or(base_file);

        let out_parent = if request.keep_structure {
            target_root.join(relative.parent().unwrap_or_else(|| Path::new("")))
        } else {
            target_root.clone()
        };
        if let Err(e) = fs::create_dir_all(&out_parent) {
            failed += 1;
            errors.push(format!(
                "创建输出目录失败 {}: {}",
                out_parent.to_string_lossy(),
                e
            ));
            continue;
        }

        let stem = relative
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("output");
        let out_path = out_parent.join(format!("{}.png", stem));

        match compose_one_image(
            base_file,
            lower_overlay.as_deref(),
            upper_overlay.as_deref(),
            &out_path,
        ) {
            Ok(_) => composed += 1,
            Err(e) => {
                failed += 1;
                errors.push(format!(
                    "{} -> {} 失败: {}",
                    base_file.to_string_lossy(),
                    out_path.to_string_lossy(),
                    e
                ));
            }
        }
    }

    Ok(BatchComposeResult {
        total: base_files.len(),
        composed,
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
        if encoding == "jpeg" {
            return save_war3_jpeg_blp1(
                image,
                output,
                request.blp_jpeg_alpha,
                request.blp_jpeg_quality,
                effective_mipmap_count(request.blp_mipmap_count, request.blp_make_mipmaps),
                &request.blp_filter,
            );
        }
        image = swap_red_blue_channels(image);
        let target = BlpTarget::Blp1(BlpOldFormat::Raw1 {
            alpha_bits: map_alpha_bits(request.blp_alpha_bits),
        });
        let mipmap_count =
            effective_mipmap_count(request.blp_mipmap_count, request.blp_make_mipmaps);
        let mut blp = image_to_blp(
            image,
            mipmap_count > 1,
            target,
            map_filter_type(&request.blp_filter),
        )
        .map_err(|e| e.to_string())?;
        truncate_blp_mipmaps(&mut blp, mipmap_count);
        save_blp(&blp, output).map_err(|e| e.to_string())
    } else if target_format == "tga" {
        save_tga_with_options(&image, output, request.tga_bits, request.tga_rle)
    } else {
        save_png_with_options(
            &image,
            output,
            &request.png_compression,
            &request.png_filter,
        )
    }
}

fn compose_one_image(
    base_path: &Path,
    lower_overlay_path: Option<&Path>,
    upper_overlay_path: Option<&Path>,
    output: &Path,
) -> Result<(), String> {
    let base = open_image_any(base_path)?;
    let lower_overlay = lower_overlay_path.map(open_image_any).transpose()?;
    let upper_overlay = upper_overlay_path.map(open_image_any).transpose()?;
    let width = [
        Some(base.width()),
        lower_overlay.as_ref().map(image::DynamicImage::width),
        upper_overlay.as_ref().map(image::DynamicImage::width),
    ]
    .into_iter()
    .flatten()
    .max()
    .unwrap_or(0);
    let height = [
        Some(base.height()),
        lower_overlay.as_ref().map(image::DynamicImage::height),
        upper_overlay.as_ref().map(image::DynamicImage::height),
    ]
    .into_iter()
    .flatten()
    .max()
    .unwrap_or(0);

    let base_rgba = base.to_rgba8();
    let lower_overlay_rgba = lower_overlay.map(|image| image.to_rgba8());
    let upper_overlay_rgba = upper_overlay.map(|image| image.to_rgba8());
    let mut canvas = image::RgbaImage::new(width, height);

    if let Some(overlay) = lower_overlay_rgba.as_ref() {
        image::imageops::overlay(&mut canvas, overlay, 0, 0);
    }
    image::imageops::overlay(&mut canvas, &base_rgba, 0, 0);
    if let Some(overlay) = upper_overlay_rgba.as_ref() {
        image::imageops::overlay(&mut canvas, overlay, 0, 0);
    }

    save_png_with_options(
        &image::DynamicImage::ImageRgba8(canvas),
        output,
        "default",
        "adaptive",
    )
}

fn open_image_any(path: &Path) -> Result<image::DynamicImage, String> {
    let ext = path
        .extension()
        .and_then(|v| v.to_str())
        .unwrap_or_default()
        .to_lowercase();
    if ext == "blp" {
        let blp = load_blp(path).map_err(|e| e.to_string())?;
        blp_to_image(&blp, 0).map_err(|e| e.to_string())
    } else {
        image::open(path).map_err(|e| e.to_string())
    }
}

fn effective_mipmap_count(count: u8, legacy_make_mipmaps: Option<bool>) -> u8 {
    if let Some(false) = legacy_make_mipmaps {
        return 1;
    }
    count.clamp(1, 16)
}

fn truncate_blp_mipmaps(blp: &mut image_blp::types::BlpImage, mipmap_count: u8) {
    let count = usize::from(mipmap_count.clamp(1, 16));
    match &mut blp.content {
        BlpContent::Raw1(content) => content.images.truncate(count),
        BlpContent::Raw3(content) => content.images.truncate(count),
        BlpContent::Jpeg(content) => content.images.truncate(count),
        BlpContent::Dxt1(content) | BlpContent::Dxt3(content) | BlpContent::Dxt5(content) => {
            content.images.truncate(count);
        }
    }

    let has_mipmaps = if blp.image_count() > 1 { 1 } else { 0 };
    match &mut blp.header.flags {
        BlpFlags::Old {
            has_mipmaps: value, ..
        } => *value = has_mipmaps,
        BlpFlags::Blp2 {
            has_mipmaps: value, ..
        } => *value = has_mipmaps as u8,
    }
    if blp.header.version != BlpVersion::Blp0 {
        blp.header.mipmap_locator = match &blp.content {
            BlpContent::Raw1(content) => content.mipmap_locator(blp.header.version),
            BlpContent::Raw3(content) => content.mipmap_locator(blp.header.version),
            BlpContent::Jpeg(content) => content.mipmap_locator(blp.header.version),
            BlpContent::Dxt1(content) | BlpContent::Dxt3(content) | BlpContent::Dxt5(content) => {
                content.mipmap_locator(blp.header.version)
            }
        };
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

fn save_war3_jpeg_blp1(
    image: image::DynamicImage,
    output: &Path,
    has_alpha: bool,
    quality: u8,
    mipmap_count: u8,
    filter: &str,
) -> Result<(), String> {
    let width = image.width();
    let height = image.height();
    if width == 0 || height == 0 {
        return Err("Image dimensions must be greater than zero".to_string());
    }

    const BLP1_JPEG_HEADER_SIZE: usize = 4;
    let jpeg_quality = quality.clamp(1, 100);
    let max_mipmaps = usize::from(mipmap_count.clamp(1, 16));

    let mut images = Vec::new();
    let mut current = image;
    loop {
        images.push(war3_jpeg::encode_jpeg_bgra(
            &current,
            has_alpha,
            jpeg_quality,
        )?);
        if images.len() >= max_mipmaps || (current.width() == 1 && current.height() == 1) {
            break;
        }
        let next_width = (current.width() >> 1).max(1);
        let next_height = (current.height() >> 1).max(1);
        current = current.resize_exact(next_width, next_height, map_image_filter(filter));
    }

    let jpeg_header = images
        .first()
        .and_then(|bytes| bytes.get(..BLP1_JPEG_HEADER_SIZE))
        .ok_or_else(|| "BLP JPEG data is too small".to_string())?
        .to_vec();

    let mut offsets = [0u32; 16];
    let mut sizes = [0u32; 16];
    let mut cursor = (156 + 4 + BLP1_JPEG_HEADER_SIZE) as u32;
    for (index, bytes) in images.iter().enumerate() {
        if !bytes.starts_with(&jpeg_header) {
            return Err("BLP JPEG mipmaps do not share the expected header".to_string());
        }
        offsets[index] = cursor;
        sizes[index] = u32::try_from(bytes.len() - BLP1_JPEG_HEADER_SIZE)
            .map_err(|_| "BLP mipmap is too large".to_string())?;
        cursor = cursor
            .checked_add(sizes[index])
            .ok_or_else(|| "BLP file is too large".to_string())?;
    }

    let mut bytes = Vec::with_capacity(cursor as usize);
    bytes.extend_from_slice(b"BLP1");
    write_u32_le(&mut bytes, 0);
    write_u32_le(&mut bytes, 8);
    write_u32_le(&mut bytes, width);
    write_u32_le(&mut bytes, height);
    write_u32_le(&mut bytes, 4);
    write_u32_le(&mut bytes, if images.len() > 1 { 1 } else { 0 });
    for offset in offsets {
        write_u32_le(&mut bytes, offset);
    }
    for size in sizes {
        write_u32_le(&mut bytes, size);
    }
    write_u32_le(&mut bytes, BLP1_JPEG_HEADER_SIZE as u32);
    bytes.extend_from_slice(&jpeg_header);
    for mipmap in images {
        bytes.extend_from_slice(&mipmap[BLP1_JPEG_HEADER_SIZE..]);
    }

    fs::write(output, bytes).map_err(|e| e.to_string())
}

fn write_u32_le(output: &mut Vec<u8>, value: u32) {
    output.extend_from_slice(&value.to_le_bytes());
}

fn save_tga16(image: &image::DynamicImage, output: &Path, rle: bool) -> Result<(), String> {
    let rgba = image.to_rgba8();
    let width = u16::try_from(rgba.width()).map_err(|_| "TGA width exceeds 65535".to_string())?;
    let height =
        u16::try_from(rgba.height()).map_err(|_| "TGA height exceeds 65535".to_string())?;
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
        .write_image(&rgba, rgba.width(), rgba.height(), ColorType::Rgba8)
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

fn apply_alpha_mode(image: image::DynamicImage, mode: &str, threshold: u8) -> image::DynamicImage {
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

fn map_image_filter(value: &str) -> image::imageops::FilterType {
    match value.to_lowercase().as_str() {
        "triangle" => image::imageops::FilterType::Triangle,
        "catmullrom" => image::imageops::FilterType::CatmullRom,
        "gaussian" => image::imageops::FilterType::Gaussian,
        "lanczos3" => image::imageops::FilterType::Lanczos3,
        _ => image::imageops::FilterType::Nearest,
    }
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
