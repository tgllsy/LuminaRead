use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::io::Read;
use std::path::Path;
use crate::infra::parser::html_converter::{html_to_reader_text, HtmlTagInfo};
use crate::infra::parser::security::{strip_html_tags, MAX_DECOMPRESSED_BYTES};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ParsedBook {
    pub title: String,
    pub author: String,
    pub format: String,
    pub cover_url: Option<String>,
    pub isbn: Option<String>,
    pub publisher: Option<String>,
    pub description: Option<String>,
    pub word_count: usize,
    pub chapters: Vec<serde_json::Value>,
}

fn detect_image_ext(path: &str, bytes: &[u8]) -> &'static str {
    if bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
        return "png";
    }
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return "jpg";
    }
    if bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        return "webp";
    }
    if bytes.starts_with(b"GIF8") {
        return "gif";
    }
    if bytes.starts_with(b"<?xml") || bytes.starts_with(b"<svg") {
        return "svg";
    }
    let lower = path.to_lowercase();
    if lower.ends_with(".png") {
        "png"
    } else if lower.ends_with(".webp") {
        "webp"
    } else if lower.ends_with(".gif") {
        "gif"
    } else if lower.ends_with(".svg") {
        "svg"
    } else {
        "jpg"
    }
}

fn is_image_entry(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.ends_with(".jpg")
        || lower.ends_with(".jpeg")
        || lower.ends_with(".png")
        || lower.ends_with(".webp")
        || lower.ends_with(".gif")
        || lower.ends_with(".svg")
        || lower.ends_with(".bmp")
}

pub fn parse_epub(file_path: &Path, default_title: &str, default_author: &str, covers_dir: &Path) -> Result<ParsedBook, String> {
    let f = File::open(file_path).map_err(|e| format!("Failed to open EPUB: {}", e))?;
    let mut zip = zip::ZipArchive::new(f).map_err(|e| format!("Invalid EPUB zip: {}", e))?;

    let mut title = default_title.to_string();
    let mut author = default_author.to_string();
    let mut description = String::new();
    let mut cover_url = None;

    let _ = std::fs::create_dir_all(covers_dir);

    // --- 1. 深度提取 EPUB 压缩包内的所有插图资源 ---
    let mut image_map: HashMap<String, String> = HashMap::new();
    let mut all_zip_names = HashSet::new();
    let mut lower_to_actual = HashMap::new();

    for i in 0..zip.len() {
        if let Ok(mut entry) = zip.by_index(i) {
            let name = entry.name().to_string();
            all_zip_names.insert(name.clone());
            lower_to_actual.insert(name.to_lowercase(), name.clone());

            if is_image_entry(&name) {
                let mut buf = Vec::new();
                if std::io::Read::take(&mut entry, 35 * 1024 * 1024).read_to_end(&mut buf).is_ok() && buf.len() > 16 {
                    let ext = detect_image_ext(&name, &buf);
                    let mut hasher = Sha256::new();
                    hasher.update(&buf);
                    let hash_hex = hex::encode(hasher.finalize());
                    let base_leaf = name.split('/').last().unwrap_or("image");
                    let clean_leaf: String = base_leaf
                        .chars()
                        .filter(|c| c.is_ascii_alphanumeric() || *c == '_' || *c == '-')
                        .collect();
                    let file_name = format!("epub_img_{}_{}.{}", &hash_hex[..12], if clean_leaf.is_empty() { "fig" } else { &clean_leaf }, ext);
                    let out_path = covers_dir.join(&file_name);
                    if !out_path.exists() {
                        let _ = std::fs::write(&out_path, &buf);
                    }
                    let pub_url = format!("/data/covers/{}", file_name);

                    // 建立全路径、相对路径和文件名别名索引
                    image_map.insert(name.clone(), pub_url.clone());
                    image_map.insert(name.to_lowercase(), pub_url.clone());
                    if let Some(leaf) = name.split('/').last() {
                        image_map.insert(leaf.to_string(), pub_url.clone());
                        image_map.insert(leaf.to_lowercase(), pub_url.clone());
                    }
                }
            }
        }
    }

    // --- 2. 解析 META-INF/container.xml 定位 OPF 路径 ---
    let mut opf_path = String::new();
    if let Ok(mut container_file) = zip.by_name("META-INF/container.xml") {
        let mut container_xml = String::new();
        if std::io::Read::take(&mut container_file, 2 * 1024 * 1024).read_to_string(&mut container_xml).is_ok() {
            if let Some(fp) = extract_attr(&container_xml, "full-path") {
                opf_path = normalize_zip_path("", &fp);
            }
        }
    }
    if opf_path.is_empty() {
        for name in all_zip_names.iter() {
            if name.to_lowercase().ends_with(".opf") {
                opf_path = name.clone();
                break;
            }
        }
    }

    let mut opf_dir = String::new();
    let mut spine_entries: Vec<String> = Vec::new();
    let mut opf_cover_path: Option<String> = None;
    let mut ncx_path: Option<String> = None;
    let mut nav_path: Option<String> = None;

    if !opf_path.is_empty() {
        if let Some(slash_idx) = opf_path.rfind('/') {
            opf_dir = opf_path[..=slash_idx].to_string();
        }
        if let Ok(mut opf_file) = zip.by_name(&opf_path) {
            let mut opf_content = String::new();
            if std::io::Read::take(&mut opf_file, 10 * 1024 * 1024).read_to_string(&mut opf_content).is_ok() {
                if let Some(t) = extract_tag_content(&opf_content, "dc:title") {
                    let clean_t = strip_html_tags(&t);
                    if !clean_t.trim().is_empty() {
                        title = clean_t.trim().to_string();
                    }
                }
                if let Some(a) = extract_tag_content(&opf_content, "dc:creator") {
                    let clean_a = strip_html_tags(&a);
                    if !clean_a.trim().is_empty() {
                        author = clean_a.trim().to_string();
                    }
                }
                if let Some(d) = extract_tag_content(&opf_content, "dc:description") {
                    description = strip_html_tags(&d).trim().to_string();
                }
                let (parsed_spine, parsed_cover, parsed_ncx, parsed_nav) = parse_opf_details(&opf_content, &opf_dir);
                spine_entries = parsed_spine;
                opf_cover_path = parsed_cover;
                ncx_path = parsed_ncx;
                nav_path = parsed_nav;
            }
        }
    }

    // --- 3. 确定封面 URL ---
    if let Some(ref cpath) = opf_cover_path {
        if let Some(u) = image_map.get(cpath).or_else(|| image_map.get(&cpath.to_lowercase())) {
            cover_url = Some(u.clone());
        }
    }
    if cover_url.is_none() {
        for (k, v) in image_map.iter() {
            if k.to_lowercase().contains("cover") {
                cover_url = Some(v.clone());
                break;
            }
        }
    }
    if cover_url.is_none() {
        cover_url = image_map.values().next().cloned();
    }

    // --- 4. 解析目录（EPUB 3 NAV + EPUB 2 NCX 互补增强）---
    let mut toc_titles = HashMap::new();

    if let Some(ref nav_rel) = nav_path {
        let resolved_nav = if all_zip_names.contains(nav_rel) {
            Some(nav_rel.clone())
        } else {
            lower_to_actual.get(&nav_rel.to_lowercase()).cloned()
        };
        if let Some(actual_nav) = resolved_nav {
            let n_dir = actual_nav.rfind('/').map(|i| &actual_nav[..=i]).unwrap_or("");
            if let Ok(mut n_file) = zip.by_name(&actual_nav) {
                let mut n_raw = Vec::new();
                if std::io::Read::take(&mut n_file, 10 * 1024 * 1024).read_to_end(&mut n_raw).is_ok() {
                    let n_str = crate::infra::parser::security::decode_text_bytes(&n_raw);
                    let nav_map = parse_nav_titles(&n_str, n_dir);
                    toc_titles.extend(nav_map);
                }
            }
        }
    }

    if let Some(ref ncx_rel) = ncx_path {
        let resolved_ncx = if all_zip_names.contains(ncx_rel) {
            Some(ncx_rel.clone())
        } else {
            lower_to_actual.get(&ncx_rel.to_lowercase()).cloned()
        };
        if let Some(actual_ncx) = resolved_ncx {
            let ncx_dir = actual_ncx.rfind('/').map(|i| &actual_ncx[..=i]).unwrap_or("");
            if let Ok(mut ncx_file) = zip.by_name(&actual_ncx) {
                let mut ncx_raw = Vec::new();
                if std::io::Read::take(&mut ncx_file, 10 * 1024 * 1024).read_to_end(&mut ncx_raw).is_ok() {
                    let ncx_str = crate::infra::parser::security::decode_text_bytes(&nccx_raw_ref(&ncx_raw));
                    let ncx_map = parse_ncx_titles(&ncx_str, ncx_dir);
                    for (k, v) in ncx_map {
                        toc_titles.entry(k).or_insert(v);
                    }
                }
            }
        }
    }

    // --- 5. 处理章节 Spine 列表 ---
    let mut fallback_entries = Vec::new();
    for name in all_zip_names.iter() {
        let lower = name.to_lowercase();
        if (lower.ends_with(".xhtml") || lower.ends_with(".html") || lower.ends_with(".htm"))
            && !lower.contains("cover")
            && !lower.contains("toc.ncx")
            && !lower.contains("nav.")
        {
            fallback_entries.push(name.clone());
        }
    }

    let valid_spine: Vec<String> = spine_entries
        .into_iter()
        .filter_map(|p| {
            if all_zip_names.contains(&p) {
                Some(p)
            } else {
                lower_to_actual.get(&p.to_lowercase()).cloned()
            }
        })
        .collect();

    let chapter_entries = if !valid_spine.is_empty() {
        valid_spine
    } else {
        fallback_entries.sort();
        fallback_entries
    };

    let mut chapters = Vec::new();
    let mut total_words = 0;
    let mut total_decompressed_bytes: u64 = 0;

    for ch_name in chapter_entries.iter() {
        if total_decompressed_bytes >= MAX_DECOMPRESSED_BYTES {
            break;
        }
        let remaining_budget = MAX_DECOMPRESSED_BYTES.saturating_sub(total_decompressed_bytes);
        if let Ok(mut ch_file) = zip.by_name(ch_name) {
            let mut raw = Vec::new();
            if std::io::Read::take(&mut ch_file, remaining_budget.min(25 * 1024 * 1024))
                .read_to_end(&mut raw)
                .is_ok()
            {
                total_decompressed_bytes += raw.len() as u64;
                let html = crate::infra::parser::security::decode_text_bytes(&raw);
                let ch_dir = ch_name.rfind('/').map(|i| &ch_name[..=i]).unwrap_or("");

                // 使用增强型 Reader HTML 转换引擎保留插图、标题与排版语义
                let text = html_to_reader_text(&html, |info: &HtmlTagInfo| -> Option<String> {
                    let src_candidate = info.src.or(info.xlink_href).or(info.href);
                    if let Some(src) = src_candidate {
                        if src.starts_with("data:image/") {
                            if let Some(comma_pos) = src.find(',') {
                                let payload = &src[comma_pos + 1..];
                                if let Ok(bytes) = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, payload) {
                                    let mut hasher = Sha256::new();
                                    hasher.update(&bytes);
                                    let h = hex::encode(hasher.finalize());
                                    let fname = format!("epub_b64_{}.png", &h[..12]);
                                    let p = covers_dir.join(&fname);
                                    let _ = std::fs::write(&p, &bytes);
                                    return Some(format!("/data/covers/{}", fname));
                                }
                            }
                        }

                        let norm = normalize_zip_path(ch_dir, src);
                        if let Some(u) = image_map.get(&norm).or_else(|| image_map.get(&norm.to_lowercase())) {
                            return Some(u.clone());
                        }
                        if let Some(leaf) = norm.split('/').last() {
                            if let Some(u) = image_map.get(leaf).or_else(|| image_map.get(&leaf.to_lowercase())) {
                                return Some(u.clone());
                            }
                        }
                    }
                    None
                });

                let word_count = text.trim().chars().count();
                let has_images = text.contains("[[BOOK_IMAGE:");

                if word_count > 5 || has_images {
                    let toc_title = toc_titles.get(ch_name).cloned();
                    let heading_title = extract_tag_content(&html, "h1")
                        .or_else(|| extract_tag_content(&html, "h2"))
                        .or_else(|| extract_tag_content(&html, "h3"))
                        .map(|s| strip_html_tags(&s))
                        .filter(|s| is_usable_chapter_title(s, &title));
                    let html_doc_title = extract_tag_content(&html, "title")
                        .map(|s| strip_html_tags(&s))
                        .filter(|s| is_usable_chapter_title(s, &title));

                    let candidate_title = heading_title
                        .or(toc_title)
                        .or(html_doc_title)
                        .unwrap_or_default();
                    let trimmed_cand = candidate_title.trim();

                    if !has_images && is_boilerplate_spine_item(trimmed_cand, &text, word_count) {
                        continue;
                    }

                    let order = chapters.len();
                    let final_ch_title = if trimmed_cand.is_empty()
                        || (trimmed_cand == "正文" && order == 0 && word_count > 1500)
                    {
                        format!("第 {} 章", order + 1)
                    } else {
                        trimmed_cand.to_string()
                    };

                    total_words += word_count;

                    chapters.push(serde_json::json!({
                        "id": format!("ch_{}", order + 1),
                        "title": final_ch_title,
                        "content": text,
                        "wordCount": word_count,
                        "order": order,
                    }));
                }
            }
        }
    }

    if chapters.is_empty() {
        let dummy_text = format!("《{}》全本内容。\n\n作者：{}", title, author);
        total_words = dummy_text.chars().count();
        chapters.push(serde_json::json!({
            "id": "ch_1",
            "title": "第一章",
            "content": dummy_text,
            "wordCount": total_words,
            "order": 0,
        }));
    }

    Ok(ParsedBook {
        title,
        author,
        format: "epub".to_string(),
        cover_url,
        isbn: None,
        publisher: Some("本地私有书库".to_string()),
        description: if description.is_empty() { None } else { Some(description) },
        word_count: total_words,
        chapters,
    })
}

#[inline]
fn nccx_raw_ref(v: &[u8]) -> &[u8] {
    v
}

fn is_usable_chapter_title(candidate: &str, book_title: &str) -> bool {
    let t = candidate.trim();
    if t.is_empty() || t.chars().count() > 80 {
        return false;
    }
    let lower = t.to_lowercase();
    if matches!(lower.as_str(), "unknown" | "untitled" | "chapter" | "index" | "body") {
        return false;
    }
    if t == book_title.trim() {
        return false;
    }
    true
}

fn is_boilerplate_spine_item(title: &str, text: &str, word_count: usize) -> bool {
    let t = title.trim();
    if t.contains("读累了记得休息")
        || t.contains("制作信息")
        || t.contains("电子书制作")
        || (word_count < 300 && text.contains("读累了记得休息"))
    {
        return true;
    }
    if word_count < 180
        && matches!(
            t,
            "扉页" | "目录" | "书名" | "书名页" | "封面" | "版权" | "版权页" | "版权信息" | "Table of Contents" | "Cover" | "Title Page"
        )
    {
        return true;
    }
    if word_count < 600 && (t == "版权" || t == "版权页" || t == "版权信息") {
        return true;
    }
    false
}

pub fn normalize_zip_path(base_dir: &str, href: &str) -> String {
    let without_frag = href.split('#').next().unwrap_or(href).split('?').next().unwrap_or(href);
    let decoded = percent_decode(without_frag).replace('\\', "/");
    let combined = if decoded.starts_with('/') {
        decoded.trim_start_matches('/').to_string()
    } else if base_dir.is_empty() {
        decoded
    } else if base_dir.ends_with('/') {
        format!("{}{}", base_dir, decoded)
    } else {
        format!("{}/{}", base_dir, decoded)
    }
    ;

    let mut stack: Vec<&str> = Vec::new();
    for part in combined.split('/') {
        match part {
            "" | "." => {}
            ".." => {
                stack.pop();
            }
            seg => stack.push(seg),
        }
    }
    stack.join("/")
}

fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(h), Some(l)) = ( (bytes[i + 1] as char).to_digit(16), (bytes[i + 2] as char).to_digit(16) ) {
                out.push(((h << 4) | l) as u8);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

pub fn extract_tag_content(xml: &str, tag: &str) -> Option<String> {
    let open_pat = format!("<{}", tag);
    let close_pat = format!("</{}>", tag);
    let start_idx = xml.find(&open_pat)?;
    let after_open = start_idx + open_pat.len();
    let first_ch = xml[after_open..].chars().next()?;
    if first_ch != '>' && !first_ch.is_whitespace() {
        return None;
    }
    let content_start = xml[start_idx..].find('>')? + start_idx + 1;
    let end_idx = xml[content_start..].find(&close_pat)? + content_start;
    Some(xml[content_start..end_idx].to_string())
}

fn extract_attr(tag_str: &str, attr: &str) -> Option<String> {
    for quote in ['"', '\''] {
        let pat = format!("{}={}", attr, quote);
        if let Some(pos) = tag_str.find(&pat) {
            let start = pos + pat.len();
            if let Some(end) = tag_str[start..].find(quote) {
                return Some(tag_str[start..start + end].to_string());
            }
        }
    }
    None
}

fn parse_opf_details(opf: &str, opf_dir: &str) -> (Vec<String>, Option<String>, Option<String>, Option<String>) {
    let mut manifest = HashMap::new();
    let mut cover_id: Option<String> = None;
    let mut cover_path: Option<String> = None;
    let mut ncx_path: Option<String> = None;
    let mut nav_path: Option<String> = None;

    let mut m_pos = 0;
    while let Some(idx) = opf[m_pos..].find("<meta ") {
        let start = m_pos + idx;
        if let Some(end) = opf[start..].find('>') {
            let tag = &opf[start..start + end + 1];
            if extract_attr(tag, "name").as_deref() == Some("cover") {
                cover_id = extract_attr(tag, "content");
            }
            m_pos = start + end + 1;
        } else {
            break;
        }
    }

    let mut pos = 0;
    while let Some(idx) = opf[pos..].find("<item ") {
        let start = pos + idx;
        if let Some(end) = opf[start..].find('>') {
            let tag = &opf[start..start + end + 1];
            if let (Some(id), Some(href)) = (extract_attr(tag, "id"), extract_attr(tag, "href")) {
                let full_path = normalize_zip_path(opf_dir, &href);
                let props = extract_attr(tag, "properties").unwrap_or_default();
                let media_type = extract_attr(tag, "media-type").unwrap_or_default();
                if props.contains("cover-image") || cover_id.as_deref() == Some(id.as_str()) {
                    cover_path = Some(full_path.clone());
                }
                if media_type.contains("dtbncx") || full_path.to_lowercase().ends_with(".ncx") {
                    ncx_path = Some(full_path.clone());
                }
                if props.contains("nav") || id.to_lowercase() == "nav" || full_path.to_lowercase().ends_with("nav.xhtml") {
                    nav_path = Some(full_path.clone());
                }
                manifest.insert(id, full_path);
            }
            pos = start + end + 1;
        } else {
            break;
        }
    }

    let mut spine = Vec::new();
    let mut s_pos = 0;
    while let Some(idx) = opf[s_pos..].find("<itemref ") {
        let start = s_pos + idx;
        if let Some(end) = opf[start..].find('>') {
            let tag = &opf[start..start + end + 1];
            if let Some(idref) = extract_attr(tag, "idref") {
                if let Some(path) = manifest.get(&idref) {
                    let lower = path.to_lowercase();
                    if (lower.ends_with(".xhtml") || lower.ends_with(".html") || lower.ends_with(".htm"))
                        && !lower.contains("cover")
                    {
                        spine.push(path.clone());
                    }
                }
            }
            s_pos = start + end + 1;
        } else {
            break;
        }
    }
    (spine, cover_path, ncx_path, nav_path)
}

pub fn parse_nav_titles(nav_html: &str, nav_dir: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    let mut pos = 0;
    while let Some(idx) = nav_html[pos..].find("<a ") {
        let start = pos + idx;
        if let Some(end) = nav_html[start..].find('>') {
            let a_tag = &nav_html[start..start + end + 1];
            if let Some(close_idx) = nav_html[start + end + 1..].find("</a>") {
                let inner = &nav_html[start + end + 1..start + end + 1 + close_idx];
                let title = strip_html_tags(inner).trim().to_string();
                if let Some(href) = extract_attr(a_tag, "href") {
                    let norm = normalize_zip_path(nav_dir, &href);
                    if !title.is_empty() && !map.contains_key(&norm) {
                        map.insert(norm, title);
                    }
                }
            }
            pos = start + end + 1;
        } else {
            break;
        }
    }
    map
}

pub fn parse_ncx_titles(ncx: &str, ncx_dir: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    let mut pos = 0;
    while let Some(idx) = ncx[pos..].find("<navPoint") {
        let start = pos + idx;
        let next_point = ncx[start + 9..].find("<navPoint").map(|i| start + 9 + i);
        let close_point = ncx[start..].find("</navPoint>").map(|i| start + i);
        let segment_end = match (next_point, close_point) {
            (Some(a), Some(b)) => a.min(b),
            (Some(a), None) => a,
            (None, Some(b)) => b,
            (None, None) => ncx.len(),
        };
        let segment = &ncx[start..segment_end];
        if let Some(text) = extract_tag_content(segment, "text") {
            let clean_title = strip_html_tags(&text).trim().to_string();
            if let Some(c_idx) = segment.find("<content ") {
                if let Some(c_end) = segment[c_idx..].find('>') {
                    let c_tag = &segment[c_idx..c_idx + c_end + 1];
                    if let Some(src) = extract_attr(c_tag, "src") {
                        let norm_path = normalize_zip_path(ncx_dir, &src);
                        if !clean_title.is_empty() && !map.contains_key(&norm_path) {
                            map.insert(norm_path, clean_title);
                        }
                    }
                }
            }
        }
        pos = start + 9;
    }
    map
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_zip_path_and_ncx() {
        assert_eq!(
            normalize_zip_path("OEBPS/content/", "../Text/chapter%201.xhtml#sec1"),
            "OEBPS/Text/chapter 1.xhtml"
        );
        let ncx = r#"
            <ncx>
              <navMap>
                <navPoint id="np1" playOrder="1">
                  <navLabel><text>第一章 序幕</text></navLabel>
                  <content src="Text/ch01.xhtml#top"/>
                </navPoint>
              </navMap>
            </ncx>
        "#;
        let titles = parse_ncx_titles(ncx, "OEBPS/");
        assert_eq!(titles.get("OEBPS/Text/ch01.xhtml").map(|s| s.as_str()), Some("第一章 序幕"));
    }

    #[test]
    fn test_parse_epub_with_embedded_images() {
        use std::io::Write;
        let temp_dir = std::env::temp_dir().join(format!("epub_test_{}", chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)));
        let _ = std::fs::create_dir_all(&temp_dir);
        let epub_path = temp_dir.join("test.epub");
        let covers_dir = temp_dir.join("covers");

        {
            let file = File::create(&epub_path).unwrap();
            let mut zip = zip::ZipWriter::new(file);
            let options = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);

            zip.start_file("mimetype", options).unwrap();
            zip.write_all(b"application/epub+zip").unwrap();

            zip.start_file("META-INF/container.xml", options).unwrap();
            zip.write_all(r#"<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>"#.as_bytes()).unwrap();

            zip.start_file("OEBPS/content.opf", options).unwrap();
            zip.write_all(r#"<?xml version="1.0"?><package version="2.0"><metadata><dc:title>宇宙漫游</dc:title><dc:creator>爱因斯坦</dc:creator><meta name="cover" content="cover_img"/></metadata><manifest><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="cover_img" href="images/cover.jpg" media-type="image/jpeg"/><item id="ch1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/></manifest><spine toc="ncx"><itemref idref="ch1"/></spine></package>"#.as_bytes()).unwrap();

            zip.start_file("OEBPS/toc.ncx", options).unwrap();
            zip.write_all(r#"<?xml version="1.0"?><ncx><navMap><navPoint id="np1"><navLabel><text>第一章 相对论与时空</text></navLabel><content src="text/ch1.xhtml"/></navPoint></navMap></ncx>"#.as_bytes()).unwrap();

            zip.start_file("OEBPS/images/cover.jpg", options).unwrap();
            zip.write_all(&[0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00]).unwrap();

            zip.start_file("OEBPS/images/figure1.png", options).unwrap();
            zip.write_all(&[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01]).unwrap();

            zip.start_file("OEBPS/text/ch1.xhtml", options).unwrap();
            zip.write_all(r#"<?xml version="1.0"?><html><head><title>时空图景</title></head><body><h1>第一章 相对论与时空</h1><p>时空并不是平坦的，它由于质量而弯曲。</p><p><img src="../images/figure1.png" alt="图1.1 时空弯曲示意图"/></p><p>图1.1 时空弯曲示意图：大质量天体导致空间下陷凹曲。</p></body></html>"#.as_bytes()).unwrap();

            zip.finish().unwrap();
        }

        let parsed = parse_epub(&epub_path, "宇宙漫游", "爱因斯坦", &covers_dir).expect("EPUB parse should succeed");
        assert_eq!(parsed.title, "宇宙漫游");
        assert_eq!(parsed.author, "爱因斯坦");
        assert!(parsed.cover_url.is_some());
        assert_eq!(parsed.chapters.len(), 1);

        let content = parsed.chapters[0]["content"].as_str().unwrap();
        assert!(content.contains("[[BOOK_IMAGE:/data/covers/epub_img_"));
        assert!(content.contains("图1.1 时空弯曲示意图"));
        assert!(content.contains("# 第一章 相对论与时空"));

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
