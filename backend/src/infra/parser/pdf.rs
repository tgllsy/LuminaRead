use flate2::read::{DeflateDecoder, ZlibDecoder};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Read;
use std::path::Path;
use std::process::Command;
use crate::infra::parser::epub::ParsedBook;
use crate::infra::parser::security::MAX_DECOMPRESSED_BYTES;

pub fn parse_pdf(file_path: &Path, default_title: &str, default_author: &str, covers_dir: &Path) -> Result<ParsedBook, String> {
    let mut raw_bytes = Vec::new();
    let mut f = File::open(file_path).map_err(|e| format!("Failed to read PDF: {}", e))?;
    f.read_to_end(&mut raw_bytes).map_err(|e| format!("Failed to read bytes: {}", e))?;

    let (info_title, info_author, info_pages) = extract_pdfinfo_meta(file_path, &raw_bytes);
    let title = info_title
        .filter(|t| !t.trim().is_empty() && !t.eq_ignore_ascii_case("untitled"))
        .unwrap_or_else(|| default_title.to_string());
    let author = info_author
        .filter(|a| !a.trim().is_empty() && !a.eq_ignore_ascii_case("unknown"))
        .unwrap_or_else(|| default_author.to_string());

    let mut page_texts = extract_pages_with_pdftotext(file_path);
    let has_non_empty_pdftotext = page_texts.iter().any(|p| !p.trim().is_empty());
    if !has_non_empty_pdftotext {
        let fallback_pages = extract_pages_from_pdf_streams(&raw_bytes);
        if fallback_pages.iter().any(|p| !p.trim().is_empty()) {
            page_texts = fallback_pages;
        }
    }

    let total_pages = page_texts.len().max(info_pages).max(1);
    if page_texts.len() < total_pages {
        page_texts.resize(total_pages, String::new());
    }

    let file_stem = file_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("doc");
    let images_by_page = extract_embedded_pdf_images(file_path, &raw_bytes, covers_dir, file_stem, total_pages);

    let mut chapters = Vec::new();
    let mut total_words = 0usize;
    let pages_per_chapter = if total_pages <= 12 { total_pages } else { 8 };

    let mut chunk_start = 0usize;
    let mut order = 0usize;
    while chunk_start < total_pages {
        let chunk_end = (chunk_start + pages_per_chapter).min(total_pages);
        let mut chapter_blocks = Vec::new();
        let mut detected_heading: Option<String> = None;

        for page_idx in chunk_start..chunk_end {
            let page_num = page_idx + 1;
            let clean_paras = normalize_pdf_page_paragraphs(&page_texts[page_idx]);

            if detected_heading.is_none() {
                if let Some(first_para) = clean_paras.first() {
                    if crate::infra::parser::security::is_chapter_heading(first_para) {
                        detected_heading = Some(first_para.clone());
                    }
                }
            }

            // Insert real embedded illustrations extracted from this page
            if let Some(imgs) = images_by_page.get(&page_idx) {
                for img_url in imgs {
                    chapter_blocks.push(format!("[[BOOK_IMAGE:{}]]", img_url));
                }
            }

            chapter_blocks.push(format!("[[PDF_PAGE:{}]]", page_num));
            if clean_paras.is_empty() {
                // Scanned / graphic page without text: render page canvas
                chapter_blocks.push(format!("《{}》第 {} 页版面内容。", title, page_num));
            } else {
                // Pure or mixed text page: flow paragraphs naturally
                for p in clean_paras {
                    total_words += p.chars().count();
                    chapter_blocks.push(p);
                }
            }
        }

        let ch_content = chapter_blocks.join("\n\n");
        let ch_wc = ch_content.chars().count();
        let ch_title = detected_heading.unwrap_or_else(|| {
            if total_pages == 1 {
                "第 1 页 · 全文".to_string()
            } else {
                format!("第 {}–{} 页", chunk_start + 1, chunk_end)
            }
        });

        chapters.push(serde_json::json!({
            "id": format!("ch_{}", order + 1),
            "title": ch_title,
            "content": ch_content,
            "wordCount": ch_wc,
            "order": order,
            "pageStart": chunk_start + 1,
            "pageEnd": chunk_end,
        }));
        order += 1;
        chunk_start = chunk_end;
    }

    if total_words == 0 {
        total_words = chapters
            .iter()
            .filter_map(|c| c.get("wordCount").and_then(|v| v.as_u64()))
            .sum::<u64>() as usize;
    }

    let mut cover_url = None;
    let _ = std::fs::create_dir_all(covers_dir);
    let cover_prefix_name = format!("cover_pdf_{}", chrono::Utc::now().timestamp_millis());
    let prefix = covers_dir.join(&cover_prefix_name);
    if let (Some(fp_str), Some(pref_str)) = (file_path.to_str(), prefix.to_str()) {
        if let Ok(out) = Command::new("pdftoppm")
            .args(["-jpeg", "-r", "150", "-f", "1", "-l", "1", "-singlefile", fp_str, pref_str])
            .output()
        {
            if out.status.success() {
                let candidate = covers_dir.join(format!("{}.jpg", cover_prefix_name));
                if candidate.exists() {
                    cover_url = Some(format!("/data/covers/{}.jpg", cover_prefix_name));
                }
            }
        }
    }

    Ok(ParsedBook {
        title,
        author,
        format: "pdf".to_string(),
        cover_url,
        isbn: None,
        publisher: Some("PDF文献".to_string()),
        description: Some(format!("PDF 文档（共 {} 页）", total_pages)),
        word_count: total_words,
        chapters,
    })
}

pub fn build_pdf_meta_json(book_id: &str, chapters: &[serde_json::Value]) -> serde_json::Value {
    let mut pages = Vec::new();
    for (ch_idx, ch) in chapters.iter().enumerate() {
        let content = ch.get("content").and_then(|v| v.as_str()).unwrap_or("");
        let mut cur_page_num: Option<usize> = None;
        let mut cur_paras: Vec<&str> = Vec::new();

        for para in content.split("\n\n") {
            let trimmed = para.trim();
            if let Some(num_str) = trimmed.strip_prefix("[[PDF_PAGE:").and_then(|s| s.strip_suffix("]]")) {
                if let Some(prev_num) = cur_page_num {
                    let page_text = cur_paras.join("\n\n");
                    pages.push(serde_json::json!({
                        "page_num": prev_num,
                        "chapter_index": ch_idx,
                        "text": page_text,
                        "char_count": page_text.chars().count(),
                        "has_image": true,
                    }));
                    cur_paras.clear();
                }
                cur_page_num = num_str.trim().parse::<usize>().ok();
            } else if !trimmed.is_empty() {
                cur_paras.push(trimmed);
            }
        }

        if let Some(last_num) = cur_page_num {
            let page_text = cur_paras.join("\n\n");
            pages.push(serde_json::json!({
                "page_num": last_num,
                "chapter_index": ch_idx,
                "text": page_text,
                "char_count": page_text.chars().count(),
                "has_image": true,
            }));
        }
    }

    if pages.is_empty() {
        let first_text = chapters
            .first()
            .and_then(|c| c.get("content"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        pages.push(serde_json::json!({
            "page_num": 1,
            "chapter_index": 0,
            "text": first_text,
            "char_count": first_text.chars().count(),
            "has_image": true,
        }));
    }

    serde_json::json!({
        "book_id": book_id,
        "page_count": pages.len(),
        "pages": pages,
    })
}

fn normalize_pdf_page_paragraphs(raw_page: &str) -> Vec<String> {
    let mut paras = Vec::new();
    let mut current = String::new();
    for line in raw_page.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            if !current.is_empty() {
                paras.push(current.clone());
                current.clear();
            }
            continue;
        }
        if current.is_empty() {
            current.push_str(trimmed);
        } else {
            let ends_sentence = current.ends_with('。')
                || current.ends_with('！')
                || current.ends_with('？')
                || current.ends_with('.')
                || current.ends_with('!')
                || current.ends_with('?')
                || current.ends_with('”')
                || current.ends_with('"')
                || crate::infra::parser::security::is_chapter_heading(trimmed);
            if ends_sentence && current.chars().count() >= 28 {
                paras.push(current.clone());
                current.clear();
                current.push_str(trimmed);
            } else {
                let last_ascii = current.chars().last().map(|c| c.is_ascii_alphanumeric()).unwrap_or(false);
                let first_ascii = trimmed.chars().next().map(|c| c.is_ascii_alphanumeric()).unwrap_or(false);
                if last_ascii && first_ascii {
                    current.push(' ');
                }
                current.push_str(trimmed);
            }
        }
    }
    if !current.is_empty() {
        paras.push(current);
    }
    paras
}

fn extract_pdfinfo_meta(file_path: &Path, raw_bytes: &[u8]) -> (Option<String>, Option<String>, usize) {
    let mut title = None;
    let mut author = None;
    let mut pages = 0usize;

    if let Ok(output) = Command::new("pdfinfo").arg(file_path).output() {
        if output.status.success() {
            let info_str = String::from_utf8_lossy(&output.stdout);
            for line in info_str.lines() {
                if let Some(rest) = line.strip_prefix("Title:") {
                    let t = rest.trim();
                    if !t.is_empty() {
                        title = Some(t.to_string());
                    }
                } else if let Some(rest) = line.strip_prefix("Author:") {
                    let a = rest.trim();
                    if !a.is_empty() {
                        author = Some(a.to_string());
                    }
                } else if let Some(rest) = line.strip_prefix("Pages:") {
                    if let Ok(n) = rest.trim().parse::<usize>() {
                        pages = n;
                    }
                }
            }
        }
    }

    if pages == 0 {
        let count_pattern = |needle: &[u8]| -> usize {
            raw_bytes.windows(needle.len()).filter(|w| *w == needle).count()
        };
        let count = count_pattern(b"/Type /Page").saturating_sub(count_pattern(b"/Type /Pages"));
        let compact_count = count_pattern(b"/Type/Page").saturating_sub(count_pattern(b"/Type/Pages"));
        pages = count.max(compact_count).max(1);
    }

    (title, author, pages)
}

pub fn extract_pages_with_pdftotext(file_path: &Path) -> Vec<String> {
    let output = match Command::new("pdftotext")
        .arg("-enc")
        .arg("UTF-8")
        .arg(file_path)
        .arg("-")
        .output()
    {
        Ok(out) if out.status.success() => out.stdout,
        _ => return Vec::new(),
    };

    let full_text = String::from_utf8_lossy(&output);
    let mut pages: Vec<String> = full_text.split('\x0c').map(|s| s.trim().to_string()).collect();
    if pages.len() > 1 && pages.last().map(|s| s.is_empty()).unwrap_or(false) {
        pages.pop();
    }
    pages
}

fn extract_pages_from_pdf_streams(raw_bytes: &[u8]) -> Vec<String> {
    let mut streams_text = Vec::new();
    let stream_tag = b"stream\n";
    let stream_tag_crlf = b"stream\r\n";
    let endstream_tag = b"endstream";

    let mut pos = 0usize;
    while pos < raw_bytes.len() {
        let stream_start = match (
            find_subslice(&raw_bytes[pos..], stream_tag).map(|p| (p, stream_tag.len())),
            find_subslice(&raw_bytes[pos..], stream_tag_crlf).map(|p| (p, stream_tag_crlf.len())),
        ) {
            (Some((p1, l1)), Some((p2, l2))) => {
                if p1 <= p2 {
                    pos + p1 + l1
                } else {
                    pos + p2 + l2
                }
            }
            (Some((p1, l1)), None) => pos + p1 + l1,
            (None, Some((p2, l2))) => pos + p2 + l2,
            (None, None) => break,
        };

        if let Some(stream_len) = find_subslice(&raw_bytes[stream_start..], endstream_tag) {
            let slice = &raw_bytes[stream_start..stream_start + stream_len];
            let decoded = decompress_pdf_stream(slice).unwrap_or_else(|| slice.to_vec());
            let dec_str = String::from_utf8_lossy(&decoded);
            let mut page_out = String::new();
            extract_pdf_tj_strings(&dec_str, &mut page_out);
            if !page_out.trim().is_empty() {
                streams_text.push(page_out.trim().to_string());
            }
            pos = stream_start + stream_len + endstream_tag.len();
        } else {
            break;
        }
    }

    streams_text
}

fn decompress_pdf_stream(mut data: &[u8]) -> Option<Vec<u8>> {
    while data.last() == Some(&b'\n') || data.last() == Some(&b'\r') {
        data = &data[..data.len() - 1];
    }
    let max_stream = MAX_DECOMPRESSED_BYTES.min(32 * 1024 * 1024);
    let mut out = Vec::new();
    if ZlibDecoder::new(data).take(max_stream).read_to_end(&mut out).is_ok() && !out.is_empty() {
        return Some(out);
    }
    out.clear();
    if DeflateDecoder::new(data).take(max_stream).read_to_end(&mut out).is_ok() && !out.is_empty() {
        return Some(out);
    }
    None
}

fn find_subslice(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack.windows(needle.len()).position(|w| w == needle)
}

fn extract_pdf_tj_strings(source: &str, out: &mut String) {
    let mut i = 0;
    let chars: Vec<char> = source.chars().collect();
    while i < chars.len() {
        if chars[i] == '(' {
            let mut j = i + 1;
            let mut str_val = String::new();
            while j < chars.len() && chars[j] != ')' {
                if chars[j] == '\\' && j + 1 < chars.len() {
                    j += 1;
                    match chars[j] {
                        'n' => str_val.push('\n'),
                        'r' => {}
                        't' => str_val.push(' '),
                        other => str_val.push(other),
                    }
                } else {
                    str_val.push(chars[j]);
                }
                j += 1;
            }
            if str_val.chars().all(|c| !c.is_control() || c == '\n' || c == '\t') && !str_val.trim().is_empty() {
                out.push_str(str_val.trim());
                out.push('\n');
            }
            i = j;
        }
        i += 1;
    }
}

fn extract_embedded_pdf_images(
    file_path: &Path,
    raw_bytes: &[u8],
    covers_dir: &Path,
    stem: &str,
    total_pages: usize,
) -> std::collections::HashMap<usize, Vec<String>> {
    let mut map: std::collections::HashMap<usize, Vec<String>> = std::collections::HashMap::new();
    let _ = std::fs::create_dir_all(covers_dir);

    let mut hasher = Sha256::new();
    hasher.update(&raw_bytes[..raw_bytes.len().min(65536)]);
    let short_hash = &hex::encode(hasher.finalize())[..8];
    let safe_stem: String = stem
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_')
        .take(24)
        .collect();
    let unique_stem = format!("{}_{}", if safe_stem.is_empty() { "doc" } else { &safe_stem }, short_hash);

    // 1. Try pdfimages CLI with -p (outputs page number in filename: prefix-page-num.ext)
    let prefix_name = format!("pdf_img_{}", unique_stem);
    let prefix = covers_dir.join(&prefix_name);
    if let (Some(fp_str), Some(pref_str)) = (file_path.to_str(), prefix.to_str()) {
        if let Ok(out) = Command::new("pdfimages")
            .args(["-png", "-j", "-p", fp_str, pref_str])
            .output()
        {
            if out.status.success() {
                if let Ok(entries) = std::fs::read_dir(covers_dir) {
                    let mut found = Vec::new();
                    let match_prefix = format!("{}-", prefix_name);
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if let Some(fname) = path.file_name().and_then(|s| s.to_str()) {
                            if fname.starts_with(&match_prefix) {
                                found.push(fname.to_string());
                            }
                        }
                    }
                    if !found.is_empty() {
                        found.sort();
                        let found_len = found.len();
                        for (idx, fname) in found.into_iter().enumerate() {
                            // Parse page number from `{prefix_name}-{page}-{seq}.{ext}`
                            let rest = fname.strip_prefix(&match_prefix).unwrap_or("");
                            let parsed_page = rest
                                .split('-')
                                .next()
                                .and_then(|s| s.parse::<usize>().ok())
                                .map(|p| p.saturating_sub(1));

                            let p_idx = match parsed_page {
                                Some(p) if total_pages > 0 => p.min(total_pages.saturating_sub(1)),
                                _ if total_pages > 0 && found_len > 0 => {
                                    ((idx * total_pages) / found_len).min(total_pages.saturating_sub(1))
                                }
                                _ => 0,
                            };
                            map.entry(p_idx).or_default().push(format!("/data/covers/{}", fname));
                        }
                        return map;
                    }
                }
            }
        }
    }

    // 2. Pure Rust fallback: scan stream chunks for JPEG SOI/EOI
    let stream_tag = b"stream\n";
    let stream_tag_crlf = b"stream\r\n";
    let endstream_tag = b"endstream";
    let jpeg_soi = [0xFF, 0xD8, 0xFF];
    let jpeg_eoi = [0xFF, 0xD9];

    let mut pos = 0usize;
    let mut img_count = 0usize;

    while pos < raw_bytes.len() && img_count < 100 {
        let stream_start = match (
            find_subslice(&raw_bytes[pos..], stream_tag).map(|p| (p, stream_tag.len())),
            find_subslice(&raw_bytes[pos..], stream_tag_crlf).map(|p| (p, stream_tag_crlf.len())),
        ) {
            (Some((p1, l1)), Some((p2, l2))) => {
                if p1 <= p2 { pos + p1 + l1 } else { pos + p2 + l2 }
            }
            (Some((p1, l1)), None) => pos + p1 + l1,
            (None, Some((p2, l2))) => pos + p2 + l2,
            (None, None) => break,
        };

        if let Some(stream_len) = find_subslice(&raw_bytes[stream_start..], endstream_tag) {
            let slice = &raw_bytes[stream_start..stream_start + stream_len];
            let maybe_jpeg: Option<Vec<u8>> = if slice.starts_with(&jpeg_soi) {
                Some(slice.to_vec())
            } else if let Some(decompressed) = decompress_pdf_stream(slice) {
                if decompressed.starts_with(&jpeg_soi) {
                    Some(decompressed)
                } else {
                    None
                }
            } else {
                None
            };

            if let Some(bytes) = maybe_jpeg {
                if let Some(eoi_pos) = find_subslice(&bytes, &jpeg_eoi) {
                    let valid_jpeg = &bytes[..eoi_pos + 2];
                    if valid_jpeg.len() >= 4096 {
                        img_count += 1;
                        let out_name = format!("pdf_img_{}_{}.jpg", unique_stem, img_count);
                        let out_path = covers_dir.join(&out_name);
                        if std::fs::write(&out_path, valid_jpeg).is_ok() {
                            let approx_page = if total_pages > 0 && !raw_bytes.is_empty() {
                                ((pos * total_pages) / raw_bytes.len()).min(total_pages.saturating_sub(1))
                            } else {
                                0
                            };
                            map.entry(approx_page).or_default().push(format!("/data/covers/{}", out_name));
                        }
                    }
                }
            }

            pos = stream_start + stream_len + endstream_tag.len();
        } else {
            break;
        }
    }

    map
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_pdf_meta_json_extracts_pages() {
        let chapters = vec![serde_json::json!({
            "id": "ch_1",
            "title": "第 1–2 页",
            "content": "[[PDF_PAGE:1]]\n\n第一页第一段。\n\n[[PDF_PAGE:2]]\n\n第二页第一段。",
            "wordCount": 20,
            "order": 0
        })];
        let meta = build_pdf_meta_json("book_123", &chapters);
        assert_eq!(meta["page_count"], 2);
        assert_eq!(meta["pages"][0]["page_num"], 1);
        assert_eq!(meta["pages"][0]["text"], "第一页第一段。");
        assert_eq!(meta["pages"][1]["page_num"], 2);
        assert_eq!(meta["pages"][1]["text"], "第二页第一段。");
    }
}
