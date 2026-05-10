use image::DynamicImage;
use std::f64::consts::{FRAC_1_SQRT_2, PI};

const SOF0: u8 = 0xC0;
const DHT: u8 = 0xC4;
const SOI: u8 = 0xD8;
const EOI: u8 = 0xD9;
const SOS: u8 = 0xDA;
const DQT: u8 = 0xDB;

#[rustfmt::skip]
const STD_LUMA_QTABLE: [u8; 64] = [
    16, 11, 10, 16,  24,  40,  51,  61,
    12, 12, 14, 19,  26,  58,  60,  55,
    14, 13, 16, 24,  40,  57,  69,  56,
    14, 17, 22, 29,  51,  87,  80,  62,
    18, 22, 37, 56,  68, 109, 103,  77,
    24, 35, 55, 64,  81, 104, 113,  92,
    49, 64, 78, 87, 103, 121, 120, 101,
    72, 92, 95, 98, 112, 100, 103,  99,
];

const STD_DC_CODE_LENGTHS: [u8; 16] = [
    0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
];
const STD_DC_VALUES: [u8; 12] = [
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B,
];

const STD_AC_CODE_LENGTHS: [u8; 16] = [
    0x00, 0x02, 0x01, 0x03, 0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
];
#[rustfmt::skip]
const STD_AC_VALUES: [u8; 162] = [
    0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07,
    0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08, 0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0,
    0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
    0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49,
    0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69,
    0x6A, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
    0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7,
    0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5,
    0xC6, 0xC7, 0xC8, 0xC9, 0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
    0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8,
    0xF9, 0xFA,
];

#[rustfmt::skip]
const ZIGZAG: [usize; 64] = [
     0,  1,  8, 16,  9,  2,  3, 10,
    17, 24, 32, 25, 18, 11,  4,  5,
    12, 19, 26, 33, 40, 48, 41, 34,
    27, 20, 13,  6,  7, 14, 21, 28,
    35, 42, 49, 56, 57, 50, 43, 36,
    29, 22, 15, 23, 30, 37, 44, 51,
    58, 59, 52, 45, 38, 31, 39, 46,
    53, 60, 61, 54, 47, 55, 62, 63,
];

pub fn encode_jpeg_bgra(
    image: &DynamicImage,
    has_alpha: bool,
    quality: u8,
) -> Result<Vec<u8>, String> {
    let rgba = image.to_rgba8();
    let width = u16::try_from(rgba.width()).map_err(|_| "BLP JPEG width exceeds 65535")?;
    let height = u16::try_from(rgba.height()).map_err(|_| "BLP JPEG height exceeds 65535")?;
    let qtable = scaled_quant_table(quality);
    let huff_dc = build_huffman_table(&STD_DC_CODE_LENGTHS, &STD_DC_VALUES);
    let huff_ac = build_huffman_table(&STD_AC_CODE_LENGTHS, &STD_AC_VALUES);

    let mut output = Vec::new();
    write_marker(&mut output, SOI);
    write_dqt(&mut output, &qtable);
    write_sof0(&mut output, width, height);
    write_dht(&mut output, 0, 0, &STD_DC_CODE_LENGTHS, &STD_DC_VALUES);
    write_dht(&mut output, 1, 0, &STD_AC_CODE_LENGTHS, &STD_AC_VALUES);
    write_sos(&mut output);

    let mut writer = BitWriter::new(output);
    let mut dc_prev = [0i32; 4];
    let mut block = [0u8; 64];
    let mut dct = [0i32; 64];

    for y in (0..rgba.height()).step_by(8) {
        for x in (0..rgba.width()).step_by(8) {
            for component in 0..4 {
                copy_bgra_block(&rgba, x, y, component, has_alpha, &mut block);
                forward_dct_quantize(&block, &qtable, &mut dct);
                dc_prev[component] =
                    writer.write_block(&dct, dc_prev[component], &huff_dc, &huff_ac)?;
            }
        }
    }

    let mut output = writer.finish()?;
    write_marker(&mut output, EOI);
    Ok(output)
}

fn copy_bgra_block(
    image: &image::RgbaImage,
    x: u32,
    y: u32,
    component: usize,
    has_alpha: bool,
    block: &mut [u8; 64],
) {
    for by in 0..8 {
        let sy = (y + by).min(image.height() - 1);
        for bx in 0..8 {
            let sx = (x + bx).min(image.width() - 1);
            let p = image.get_pixel(sx, sy);
            block[(by * 8 + bx) as usize] = match component {
                0 => p[2],
                1 => p[1],
                2 => p[0],
                _ if has_alpha => p[3],
                _ => 255,
            };
        }
    }
}

fn forward_dct_quantize(block: &[u8; 64], qtable: &[u8; 64], out: &mut [i32; 64]) {
    for v in 0..8 {
        for u in 0..8 {
            let mut sum = 0.0;
            for y in 0..8 {
                for x in 0..8 {
                    let sample = f64::from(block[y * 8 + x]) - 128.0;
                    let cx = (((2 * x + 1) as f64 * u as f64 * PI) / 16.0).cos();
                    let cy = (((2 * y + 1) as f64 * v as f64 * PI) / 16.0).cos();
                    sum += sample * cx * cy;
                }
            }
            let cu = if u == 0 { FRAC_1_SQRT_2 } else { 1.0 };
            let cv = if v == 0 { FRAC_1_SQRT_2 } else { 1.0 };
            let index = v * 8 + u;
            out[index] = (0.25 * cu * cv * sum / f64::from(qtable[index])).round() as i32;
        }
    }
}

fn scaled_quant_table(quality: u8) -> [u8; 64] {
    let quality = quality.clamp(1, 100) as u32;
    let scale = if quality < 50 {
        5000 / quality
    } else {
        200 - quality * 2
    };
    let mut table = [0u8; 64];
    for (index, value) in STD_LUMA_QTABLE.iter().enumerate() {
        let scaled = ((u32::from(*value) * scale + 50) / 100).clamp(1, 255);
        table[index] = scaled as u8;
    }
    table
}

fn build_huffman_table(lengths: &[u8; 16], values: &[u8]) -> [(u8, u16); 256] {
    let mut table = [(0u8, 0u16); 256];
    let mut code = 0u16;
    let mut value_index = 0usize;
    for (bit_index, count) in lengths.iter().enumerate() {
        let bit_len = (bit_index + 1) as u8;
        for _ in 0..*count {
            table[values[value_index] as usize] = (bit_len, code);
            code += 1;
            value_index += 1;
        }
        code <<= 1;
    }
    table
}

fn encode_coefficient(coefficient: i32) -> (u8, u16) {
    let mut magnitude = coefficient.unsigned_abs() as u16;
    let mut bits = 0u8;
    while magnitude > 0 {
        magnitude >>= 1;
        bits += 1;
    }
    let mask = (1u16 << bits) - 1;
    let value = if coefficient < 0 {
        (coefficient - 1) as u16 & mask
    } else {
        coefficient as u16 & mask
    };
    (bits, value)
}

fn write_marker(out: &mut Vec<u8>, marker: u8) {
    out.extend_from_slice(&[0xFF, marker]);
}

fn write_segment(out: &mut Vec<u8>, marker: u8, data: &[u8]) {
    write_marker(out, marker);
    out.extend_from_slice(&((data.len() as u16) + 2).to_be_bytes());
    out.extend_from_slice(data);
}

fn write_dqt(out: &mut Vec<u8>, qtable: &[u8; 64]) {
    let mut segment = Vec::with_capacity(65);
    segment.push(0);
    for &index in &ZIGZAG {
        segment.push(qtable[index]);
    }
    write_segment(out, DQT, &segment);
}

fn write_sof0(out: &mut Vec<u8>, width: u16, height: u16) {
    let mut segment = Vec::with_capacity(20);
    segment.push(8);
    segment.extend_from_slice(&height.to_be_bytes());
    segment.extend_from_slice(&width.to_be_bytes());
    segment.push(4);
    for id in 0..4u8 {
        segment.extend_from_slice(&[id, 0x11, 0]);
    }
    write_segment(out, SOF0, &segment);
}

fn write_dht(out: &mut Vec<u8>, class: u8, destination: u8, lengths: &[u8; 16], values: &[u8]) {
    let mut segment = Vec::with_capacity(17 + values.len());
    segment.push((class << 4) | destination);
    segment.extend_from_slice(lengths);
    segment.extend_from_slice(values);
    write_segment(out, DHT, &segment);
}

fn write_sos(out: &mut Vec<u8>) {
    let mut segment = Vec::with_capacity(14);
    segment.push(4);
    for id in 0..4u8 {
        segment.extend_from_slice(&[id, 0]);
    }
    segment.extend_from_slice(&[0, 63, 0]);
    write_segment(out, SOS, &segment);
}

struct BitWriter {
    output: Vec<u8>,
    accumulator: u32,
    bits: u8,
}

impl BitWriter {
    fn new(output: Vec<u8>) -> Self {
        Self {
            output,
            accumulator: 0,
            bits: 0,
        }
    }

    fn write_block(
        &mut self,
        block: &[i32; 64],
        prev_dc: i32,
        dc_table: &[(u8, u16); 256],
        ac_table: &[(u8, u16); 256],
    ) -> Result<i32, String> {
        let dc = block[0];
        let (size, value) = encode_coefficient(dc - prev_dc);
        self.huffman(size, dc_table)?;
        self.bits(value, size)?;

        let mut zero_run = 0u8;
        for &index in &ZIGZAG[1..] {
            let coefficient = block[index];
            if coefficient == 0 {
                zero_run += 1;
                continue;
            }
            while zero_run > 15 {
                self.huffman(0xF0, ac_table)?;
                zero_run -= 16;
            }
            let (size, value) = encode_coefficient(coefficient);
            self.huffman((zero_run << 4) | size, ac_table)?;
            self.bits(value, size)?;
            zero_run = 0;
        }
        if zero_run > 0 {
            self.huffman(0, ac_table)?;
        }
        Ok(dc)
    }

    fn huffman(&mut self, symbol: u8, table: &[(u8, u16); 256]) -> Result<(), String> {
        let (size, code) = table[symbol as usize];
        if size == 0 {
            return Err(format!("missing JPEG Huffman symbol {symbol}"));
        }
        self.bits(code, size)
    }

    fn bits(&mut self, bits: u16, size: u8) -> Result<(), String> {
        if size == 0 {
            return Ok(());
        }
        self.bits += size;
        self.accumulator |= u32::from(bits) << (32 - self.bits);
        while self.bits >= 8 {
            let byte = (self.accumulator >> 24) as u8;
            self.output.push(byte);
            if byte == 0xFF {
                self.output.push(0);
            }
            self.bits -= 8;
            self.accumulator <<= 8;
        }
        Ok(())
    }

    fn finish(mut self) -> Result<Vec<u8>, String> {
        self.bits(0x7F, 7)?;
        Ok(self.output)
    }
}
