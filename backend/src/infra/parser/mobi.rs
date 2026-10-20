use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::path::Path;
use crate::infra::parser::epub::ParsedBook;
use crate::infra::parser::html_converter::{html_to_reader_text, HtmlTagInfo};
use crate::infra::parser::palmdoc::{decompress_palmdoc_lz77, strip_mobi_trailing_data};
use crate::infra::parser::security::is_chapter_heading;

fn detect_mobi_image_ext(img: &[u8]) -> Option<&'static str> {
    if img.starts_with(&[0xff, 0xd8, 0xff]) {
        Some("jpg")
    } else if img.starts_with(&[0x89, 0x50, 0x4e, 0x47]) {
        Some("png")
    } else if img.starts_with(b"GIF8") {
        Some("gif")
    } else if img.len() >= 12 && &img[0..4] == b"RIFF" && &img[8..12] == b"WEBP" {
        Some("webp")
    } else {
        None
    }
}

pub fn parse_mobi(file_path: &Path, default_title: &str, default_author: &str, covers_dir: &Path) -> Result<ParsedBook, String> {
    let mut raw_bytes = Vec::new();
    let mut f = File::open(file_path).map_err(|e| format!("Failed to read MOBI: {}", e))?;
    f.read_to_end(&mut raw_bytes).map_err(|e| format!("Failed to read bytes: {}", e))?;

    if raw_bytes.len() < 78 {
        return Err("MOBI file too small".to_string());
    }

    let palm_type = &raw_bytes[60..68.min(raw_bytes.len())];
    let is_mobi_container = palm_type == b"BOOKMOBI" || palm_type == b"TEXtREAd";

    if !is_mobi_container {
        let raw_text = crate::infra::parser::security::decode_text_bytes(&raw_bytes);
        let reader_text = html_to_reader_text(&raw_text, |_| None);
        let total = reader_text.chars().count();
        return Ok(ParsedBook {
            title: default_title.to_string(),
            author: default_author.to_string(),
            format: "mobi".to_string(),
            cover_url: None,
            isbn: None,
            publisher: Some("PalmDB MOBI".to_string()),
            description: None,
            word_count: total,
            chapters: vec![serde_json::json!({
                "id": "ch_1",
                "title": "第一章",
                "content": reader_text.trim(),
                "wordCount": total,
                "order": 0,
            })],
        });
    }

    let num_records = u16::from_be_bytes([raw_bytes[76], raw_bytes[77]]) as usize;
    if num_records < 2 || 78 + num_records * 8 > raw_bytes.len() {
        return Err("Invalid MOBI record header".to_string());
    }

    let mut record_offsets = Vec::with_capacity(num_records);
    for i in 0..num_records {
        let start = 78 + i * 8;
        let off = u32::from_be_bytes([raw_bytes[start], raw_bytes[start + 1], raw_bytes[start + 2], raw_bytes[start + 3]]) as usize;
        record_offsets.push(off);
    }

    let mut records: Vec<&[u8]> = Vec::with_capacity(num_records);
    for i in 0..num_records {
        let start = record_offsets[i];
        let end = if i + 1 < num_records { record_offsets[i + 1] } else { raw_bytes.len() };
        if start <= end && end <= raw_bytes.len() {
            records.push(&raw_bytes[start..end]);
        } else {
            records.push(&[]);
        }
    }

    let rec0 = records[0];
    if rec0.len() < 16 {
        return Err("Invalid MOBI record 0".to_string());
    }

    let mut compression = u16::from_be_bytes([rec0[0], rec0[1]]);
    let mut text_record_count = (u16::from_be_bytes([rec0[8], rec0[9]]) as usize).min(records.len().saturating_sub(1));
    let has_mobi_magic = rec0.len() >= 24 && &rec0[16..20] == b"MOBI";
    let mobi_header_len = if has_mobi_magic { u32::from_be_bytes([rec0[20], rec0[21], rec0[22], rec0[23]]) as usize } else { 0 };
    let full_name_offset = if has_mobi_magic && rec0.len() >= 88 { u32::from_be_bytes([rec0[84], rec0[85], rec0[86], rec0[87]]) as usize } else { 0 };
    let full_name_len = if has_mobi_magic && rec0.len() >= 92 { u32::from_be_bytes([rec0[88], rec0[89], rec0[90], rec0[91]]) as usize } else { 0 };
    let first_image_index = if has_mobi_magic && rec0.len() >= 112 { u32::from_be_bytes([rec0[108], rec0[109], rec0[110], rec0[111]]) as usize } else { 0 };
    let exth_flags = if has_mobi_magic && rec0.len() >= 132 { u32::from_be_bytes([rec0[128], rec0[129], rec0[130], rec0[131]]) as usize } else { 0 };
    let mut extra_data_flags = if has_mobi_magic && mobi_header_len >= 228 && rec0.len() >= 16 + 228 {
        u16::from_be_bytes([rec0[16 + 226], rec0[16 + 227]]) as usize
    } else {
        0
    };

    let mut title = default_title.to_string();
    if full_name_offset > 0 && full_name_len > 0 && full_name_offset + full_name_len <= rec0.len() {
        let name_bytes = &rec0[full_name_offset..full_name_offset + full_name_len];
        let name_str = String::from_utf8_lossy(name_bytes).trim_end_matches('\0').trim().to_string();
        if !name_str.is_empty() {
            title = name_str;
        }
    }

    let mut author = default_author.to_string();
    let mut publisher = "PalmDB MOBI".to_string();
    let mut description = None;
    let mut isbn = None;
    let mut cover_offset = None;
    let mut kf8_boundary_rec = None;

    let exth_start = 16 + mobi_header_len;
    if has_mobi_magic && (exth_flags & 0x40 != 0) && exth_start + 12 <= rec0.len() && &rec0[exth_start..exth_start + 4] == b"EXTH" {
        let exth_count = u32::from_be_bytes([rec0[exth_start + 8], rec0[exth_start + 9], rec0[exth_start + 10], rec0[exth_start + 11]]) as usize;
        let mut pos = exth_start + 12;
        for _ in 0..exth_count {
            if pos + 8 > rec0.len() { break; }
            let r_type = u32::from_be_bytes([rec0[pos], rec0[pos + 1], rec0[pos + 2], rec0[pos + 3]]);
            let r_len = u32::from_be_bytes([rec0[pos + 4], rec0[pos + 5], rec0[pos + 6], rec0[pos + 7]]) as usize;
            if r_len < 8 || pos + r_len > rec0.len() { break; }
            let val = &rec0[pos + 8..pos + r_len];
            let val_str = String::from_utf8_lossy(val).trim_end_matches('\0').trim().to_string();
            match r_type {
                100 if author == "未知作者" || author.is_empty() => author = val_str,
                101 => publisher = val_str,
                103 => description = Some(val_str),
                104 => isbn = Some(val_str),
                121 if val.len() >= 4 => {
                    let b = u32::from_be_bytes([val[0], val[1], val[2], val[3]]) as usize;
                    if b > 0 && b < records.len() {
                        kf8_boundary_rec = Some(b);
                    }
                }
                201 if val.len() >= 4 => {
                    let off = u32::from_be_bytes([val[0], val[1], val[2], val[3]]) as usize;
                    if off != 0xffffffff { cover_offset = Some(off); }
                }
                503 if !val_str.is_empty() => title = val_str,
                _ => {}
            }
            pos += r_len;
        }
    }

    // --- 提取 MOBI 内嵌的所有真实插图 ---
    let mut image_map: HashMap<usize, String> = HashMap::new();
    let mut cover_url = None;

    let book_stem = file_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("book");
    let clean_stem: String = book_stem
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_' || *c == '-')
        .take(16)
        .collect();
    let prefix_stem = if clean_stem.is_empty() { "bk" } else { &clean_stem };

    if first_image_index > 0 && first_image_index < records.len() {
        let _ = std::fs::create_dir_all(covers_dir);
        let end_idx = records.len();
        for rec_idx in first_image_index..end_idx {
            let img = records[rec_idx];
            if img.len() < 32 {
                continue;
            }
            if let Some(ext) = detect_mobi_image_ext(img) {
                let mut hasher = Sha256::new();
                hasher.update(img);
                let hash_hex = hex::encode(hasher.finalize());
                let file_name = format!("mobi_img_{}_{}_rec{}.{}", prefix_stem, &hash_hex[..12], rec_idx, ext);
                let out_path = covers_dir.join(&file_name);
                if !out_path.exists() {
                    let _ = std::fs::write(&out_path, img);
                }
                let public_url = format!("/data/covers/{}", file_name);

                let one_based = rec_idx - first_image_index + 1;
                let zero_based = rec_idx - first_image_index;
                image_map.insert(one_based, public_url.clone());
                image_map.insert(zero_based, public_url.clone());

                if cover_url.is_none() {
                    if let Some(off) = cover_offset {
                        if off == zero_based || off == one_based {
                            cover_url = Some(public_url.clone());
                        }
                    }
                }
            }
        }
    }

    if cover_url.is_none() {
        if let Some(off) = cover_offset {
            if let Some(u) = image_map.get(&(off + 1)).or_else(|| image_map.get(&off)) {
                cover_url = Some(u.clone());
            }
        }
        if cover_url.is_none() {
            cover_url = image_map.get(&1).or_else(|| image_map.get(&0)).cloned();
        }
    }

    // --- KF8 (AZW3) 容器检测与文本抽取 ---
    let mut text_start_rec = 1;
    if let Some(b_idx) = kf8_boundary_rec {
        if b_idx < records.len() {
            let kf8_header = records[b_idx];
            if kf8_header.len() >= 24 && (&kf8_header[16..20] == b"KF8\0" || &kf8_header[16..20] == b"MOBI") {
                let kf8_comp = u16::from_be_bytes([kf8_header[0], kf8_header[1]]);
                let kf8_text_cnt = u16::from_be_bytes([kf8_header[8], kf8_header[9]]) as usize;
                let kf8_h_len = u32::from_be_bytes([kf8_header[20], kf8_header[21], kf8_header[22], kf8_header[23]]) as usize;
                let kf8_extra = if kf8_h_len >= 228 && kf8_header.len() >= 16 + 228 {
                    u16::from_be_bytes([kf8_header[16 + 226], kf8_header[16 + 227]]) as usize
                } else {
                    0
                };
                if kf8_text_cnt > 0 && b_idx + kf8_text_cnt < records.len() {
                    compression = kf8_comp;
                    text_record_count = kf8_text_cnt;
                    extra_data_flags = kf8_extra;
                    text_start_rec = b_idx + 1;
                }
            }
        }
    }

    let mut decompressed = Vec::new();
    for r in text_start_rec..(text_start_rec + text_record_count) {
        if r >= records.len() { break; }
        let stripped = strip_mobi_trailing_data(records[r], extra_data_flags);
        if compression == 2 {
            decompressed.extend_from_slice(&decompress_palmdoc_lz77(stripped));
        } else if compression == 1 {
            decompressed.extend_from_slice(stripped);
        }
    }

    let raw_html = crate::infra::parser::security::decode_text_bytes(&decompressed).replace('\0', "");

    // --- 高清渲染转换：将 HTML 转换为带插图与排版的 Reader 富文本 ---
    let reader_content = html_to_reader_text(&raw_html, |info: &HtmlTagInfo| -> Option<String> {
        if let Some(rec) = info.recindex {
            if let Ok(idx) = rec.parse::<usize>() {
                if let Some(u) = image_map.get(&idx) {
                    return Some(u.clone());
                }
            }
        }
        if let Some(src) = info.src {
            if let Some(sub) = src.strip_prefix("kindle:embed:").or_else(|| src.strip_prefix("kindle:flow:")) {
                let digits: String = sub.chars().take_while(|c| c.is_ascii_digit()).collect();
                if let Ok(idx) = digits.parse::<usize>() {
                    if let Some(u) = image_map.get(&idx) {
                        return Some(u.clone());
                    }
                }
            }
            let digits: String = src.chars().filter(|c| c.is_ascii_digit()).collect();
            if !digits.is_empty() {
                if let Ok(idx) = digits.parse::<usize>() {
                    if let Some(u) = image_map.get(&idx) {
                        return Some(u.clone());
                    }
                }
            }
        }
        None
    });

    let paras: Vec<&str> = reader_content.split("\n\n").map(|s| s.trim()).filter(|s| !s.is_empty()).collect();

    let is_heading_para = |p: &str| -> bool {
        let first_line = p.lines().next().unwrap_or("").trim();
        if first_line.starts_with("# ") || first_line.starts_with("## ") {
            return true;
        }
        is_chapter_heading(first_line)
    };

    let clean_heading_text = |p: &str| -> String {
        let first_line = p.lines().next().unwrap_or("").trim();
        if first_line.starts_with('#') {
            first_line.trim_start_matches('#').trim().to_string()
        } else {
            first_line.to_string()
        }
    };

    let mut chapters = Vec::new();
    let has_explicit_headings = paras.iter().filter(|p| is_heading_para(p)).count() >= 2;

    if has_explicit_headings {
        let mut cur_title = "第一部分".to_string();
        let mut cur_paras: Vec<&str> = Vec::new();
        let mut order = 0;

        for p in &paras {
            if is_heading_para(p) {
                if !cur_paras.is_empty() {
                    let content = cur_paras.join("\n\n");
                    let wc = content.chars().count();
                    chapters.push(serde_json::json!({
                        "id": format!("ch_{}", order + 1),
                        "title": cur_title,
                        "content": content,
                        "wordCount": wc,
                        "order": order,
                    }));
                    order += 1;
                    cur_paras.clear();
                }
                cur_title = clean_heading_text(p);
                // 若该段落除标题外还含有多行文字，保留后续行
                let lines: Vec<&str> = p.lines().skip(1).map(|l| l.trim()).filter(|l| !l.is_empty()).collect();
                if !lines.is_empty() {
                    cur_paras.push(p);
                }
            } else {
                cur_paras.push(*p);
            }
        }

        if !cur_paras.is_empty() {
            let content = cur_paras.join("\n\n");
            let wc = content.chars().count();
            chapters.push(serde_json::json!({
                "id": format!("ch_{}", order + 1),
                "title": cur_title,
                "content": content,
                "wordCount": wc,
                "order": order,
            }));
        }
    } else if !paras.is_empty() {
        let target_chunk_chars = 3500;
        let mut ch_idx = 1;
        let mut cur_chars = 0usize;
        let mut cur_paras = Vec::new();

        for p in &paras {
            let p_len = p.chars().count();
            if !cur_paras.is_empty() && cur_chars + p_len > target_chunk_chars {
                let content = cur_paras.join("\n\n");
                let wc = content.chars().count();
                chapters.push(serde_json::json!({
                    "id": format!("ch_{}", ch_idx),
                    "title": format!("第 {} 部分", ch_idx),
                    "content": content,
                    "wordCount": wc,
                    "order": ch_idx - 1,
                }));
                ch_idx += 1;
                cur_paras.clear();
                cur_chars = 0;
            }
            cur_paras.push(*p);
            cur_chars += p_len;
        }

        if !cur_paras.is_empty() {
            let content = cur_paras.join("\n\n");
            let wc = content.chars().count();
            let ch_title = if ch_idx == 1 { "正文".to_string() } else { format!("第 {} 部分", ch_idx) };
            chapters.push(serde_json::json!({
                "id": format!("ch_{}", ch_idx),
                "title": ch_title,
                "content": content,
                "wordCount": wc,
                "order": ch_idx - 1,
            }));
        }
    }

    if chapters.is_empty() {
        let dummy = if reader_content.is_empty() { format!("《{}》正文内容", title) } else { reader_content.clone() };
        let wc = dummy.chars().count();
        chapters.push(serde_json::json!({
            "id": "ch_1",
            "title": "正文",
            "content": dummy,
            "wordCount": wc,
            "order": 0,
        }));
    }

    let total_word_count = reader_content.chars().count();
    Ok(ParsedBook {
        title,
        author,
        format: "mobi".to_string(),
        cover_url,
        isbn,
        publisher: Some(publisher),
        description,
        word_count: total_word_count,
        chapters,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_mobi_with_real_book_if_present() {
        let mobi_path = Path::new("../data/books/时间简史.mobi");
        if !mobi_path.exists() {
            return;
        }
        let covers_dir = Path::new("../data/covers");
        let parsed = parse_mobi(mobi_path, "时间简史", "史蒂芬·霍金", covers_dir)
            .expect("Failed to parse 时间简史.mobi");

        assert!(parsed.title.contains("时间简史"), "Title should match");
        assert!(parsed.cover_url.is_some(), "Cover URL should be extracted");

        let ch_with_fig1 = parsed.chapters.iter().find(|ch| {
            let content = ch.get("content").and_then(|v| v.as_str()).unwrap_or("");
            content.contains("图1.1")
        });

        assert!(ch_with_fig1.is_some(), "Should find chapter with 图1.1");
        let content = ch_with_fig1.unwrap().get("content").and_then(|v| v.as_str()).unwrap();
        assert!(content.contains("[[BOOK_IMAGE:/data/covers/mobi_img_"), "Chapter should contain [[BOOK_IMAGE:...]] marker for Figure 1.1");
    }
}

