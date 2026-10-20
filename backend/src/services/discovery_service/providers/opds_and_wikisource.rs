use serde_json::Value;

use super::super::http_client::{find_between, http_fetch_text};
use super::super::sanitizer::{
    format_bytes, matches_language_filter, normalize_for_match, pick_cover_color,
    sha256_short, strip_xml_tags, to_traditional_chinese, url_encode,
};

pub async fn search_gutenberg_opds_live(
    query: &str,
    format_filter: &str,
    lang_filter: &str,
    proxy: &str,
) -> Vec<Value> {
    let clean_q = query.replace(['《', '》', '"', '\''], "").trim().to_string();
    if clean_q.is_empty() || !matches!(format_filter, "all" | "" | "epub" | "txt") {
        return Vec::new();
    }

    let url = format!("https://www.gutenberg.org/ebooks/search.opds/?query={}", url_encode(&clean_q));
    let Some(xml) = http_fetch_text(&url, proxy, 5).await else { return Vec::new(); };

    let mut results = Vec::new();
    for entry_part in xml.split("<entry>").skip(1) {
        let entry = match entry_part.find("</entry>") {
            Some(end) => &entry_part[..end],
            None => continue,
        };
        let ebook_id = match find_between(entry, "/ebooks/", "\"").or_else(|| find_between(entry, "/ebooks/", "<")) {
            Some(s) => {
                let digits: String = s.chars().take_while(|c| c.is_ascii_digit()).collect();
                if digits.is_empty() { continue; } else { digits }
            }
            None => continue,
        };

        let title = find_between(entry, "<title>", "</title>")
            .or_else(|| find_between(entry, "<title type=\"text\">", "</title>"))
            .map(strip_xml_tags)
            .unwrap_or_else(|| format!("Gutenberg #{}", ebook_id));
        let author = find_between(entry, "<content type=\"text\">", "</content>")
            .or_else(|| find_between(entry, "<name>", "</name>"))
            .map(strip_xml_tags)
            .unwrap_or_else(|| "Project Gutenberg".to_string());

        let has_cjk = title.chars().chain(author.chars()).any(|c| ('\u{4e00}'..='\u{9fff}').contains(&c));
        let item_lang = if has_cjk { "zh-CN" } else { "en" };
        if !matches_language_filter(item_lang, lang_filter) {
            continue;
        }

        let target_fmt = if format_filter == "txt" { "txt" } else { "epub" };
        let dl_url = if target_fmt == "txt" {
            format!("https://www.gutenberg.org/ebooks/{}.txt.utf-8", ebook_id)
        } else {
            format!("https://www.gutenberg.org/ebooks/{}.epub.noimages", ebook_id)
        };

        results.push(serde_json::json!({
            "remote_id": format!("gutenberg:{}", ebook_id),
            "source_id": "gutenberg-direct",
            "source_type": "gutenberg",
            "title": title,
            "author": author,
            "publisher": "Project Gutenberg",
            "year": "公版原著",
            "isbn": format!("PG-{}", ebook_id),
            "format": target_fmt,
            "file_size": "540 KB",
            "language": item_lang,
            "cover_url": format!("https://www.gutenberg.org/cache/epub/{}/pg{}.cover.medium.jpg", ebook_id, ebook_id),
            "cover_color": pick_cover_color(&format!("pg:{}", ebook_id)),
            "download_url": dl_url,
            "md5": sha256_short(&format!("pg:{}", ebook_id)),
            "category": "公版经典",
            "tags": ["Project Gutenberg 实时直连", format!("PG #{}", ebook_id), target_fmt.to_uppercase()],
            "description": format!("Project Gutenberg 全球公版书库实时检索结果 (#{} · {})，支持一键直接拉取完整原版 {}。", ebook_id, author, target_fmt.to_uppercase()),
        }));

        if results.len() >= 15 { break; }
    }
    results
}

pub async fn search_chinese_wikisource_live(
    query: &str,
    source_type: &str,
    format_filter: &str,
    lang_filter: &str,
    proxy: &str,
) -> Vec<Value> {
    let clean_q = query.replace(['《', '》', '"', '\''], "").trim().to_string();
    if clean_q.is_empty() || lang_filter == "en" || !matches!(source_type, "all" | "opds") || !matches!(format_filter, "all" | "" | "epub" | "txt") {
        return Vec::new();
    }
    let norm_q = normalize_for_match(&clean_q);
    if norm_q.is_empty() { return Vec::new(); }

    let url = format!("https://zh.wikisource.org/w/api.php?action=query&list=search&srsearch={}&srlimit=15&format=json", url_encode(&format!("intitle:{}", clean_q)));
    let Some(json_text) = http_fetch_text(&url, proxy, 5).await else { return Vec::new(); };
    let Ok(data) = serde_json::from_str::<Value>(&json_text) else { return Vec::new(); };
    let Some(hits) = data.get("query").and_then(|q| q.get("search")).and_then(|s| s.as_array()) else { return Vec::new(); };

    let noise_keywords = [
        "判决书", "裁定书", "决定书", "起诉书", "通知书", "公报", "决议",
        "社论", "致辞", "代表大会", "工作报告", "记者问", "新闻",
    ];

    let mut results = Vec::new();
    for hit in hits {
        let raw_title = hit.get("title").and_then(|v| v.as_str()).unwrap_or("").trim();
        if raw_title.is_empty() || noise_keywords.iter().any(|kw| raw_title.contains(kw)) { continue; }
        if !clean_q.contains('/') && raw_title.contains('/') { continue; }
        let norm_title = normalize_for_match(raw_title);
        if !norm_title.contains(&norm_q) && !norm_q.contains(&norm_title) { continue; }

        let page_id = hit.get("pageid").and_then(|v| v.as_i64()).unwrap_or(0);
        let word_count = hit.get("wordcount").and_then(|v| v.as_u64()).unwrap_or(3000);
        let snippet = strip_xml_tags(hit.get("snippet").and_then(|v| v.as_str()).unwrap_or(""));
        let fmt = if format_filter == "txt" { "txt" } else { "epub" };

        results.push(serde_json::json!({
            "remote_id": format!("wikisource:{}:{}", page_id, raw_title),
            "wikisource_title": raw_title,
            "source_id": "standard-opds",
            "source_type": "opds",
            "title": raw_title,
            "author": "维基文库古籍/公版原典",
            "publisher": "Wikisource 中文维基文库",
            "year": "典藏善本",
            "isbn": format!("WS-{}", page_id),
            "format": fmt,
            "file_size": format_bytes((word_count * 6).max(45_000)),
            "language": "zh-CN",
            "cover_url": "",
            "cover_color": "#065f46",
            "md5": sha256_short(&format!("ws:{}", page_id)),
            "category": "中文典籍与文献",
            "tags": ["维基文库全文直连", "精校原文", fmt.to_uppercase()],
            "description": if snippet.is_empty() {
                format!("来自中文维基文库（Wikisource）的《{}》精校全文，支持一键打包生成标准 EPUB/TXT 入库。", raw_title)
            } else {
                format!("原文摘录：{}…", snippet)
            }
        }));

        if results.len() >= 10 { break; }
    }
    results
}

async fn fetch_wikisource_extract(title: &str, proxy: &str) -> Option<Value> {
    for candidate in [title.to_string(), to_traditional_chinese(title)] {
        let url = format!(
            "https://zh.wikisource.org/w/api.php?action=query&redirects=1&prop=extracts|links&explaintext=1&pllimit=50&titles={}&format=json",
            url_encode(&candidate)
        );
        if let Some(txt) = http_fetch_text(&url, proxy, 6).await {
            if let Ok(val) = serde_json::from_str::<Value>(&txt) {
                if let Some(pages) = val.get("query").and_then(|q| q.get("pages")).and_then(|p| p.as_object()) {
                    for (pid, page_obj) in pages {
                        if pid != "-1" {
                            return Some(page_obj.clone());
                        }
                    }
                }
            }
        }
    }
    None
}

pub async fn fetch_wikisource_full_book(page_title: &str, proxy: &str) -> Option<Vec<Value>> {
    let clean_title = page_title.trim();
    if clean_title.is_empty() { return None; }

    let main_page = fetch_wikisource_extract(clean_title, proxy).await?;
    let resolved_title = main_page.get("title").and_then(|v| v.as_str()).unwrap_or(clean_title).to_string();
    let main_extract = main_page.get("extract").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();

    let mut sub_links: Vec<String> = Vec::new();
    if let Some(links) = main_page.get("links").and_then(|v| v.as_array()) {
        for link in links {
            if let Some(lt) = link.get("title").and_then(|v| v.as_str()) {
                if lt.starts_with(&format!("{}/", resolved_title)) || lt.starts_with(&format!("{}/", clean_title)) {
                    sub_links.push(lt.to_string());
                }
            }
        }
    }
    sub_links.truncate(20);

    let mut chapters = Vec::new();
    if main_extract.chars().count() > 120 {
        let wc = main_extract.chars().count();
        chapters.push(serde_json::json!({
            "id": format!("ch_{}", chapters.len() + 1),
            "title": if !sub_links.is_empty() { format!("{} · 导读与总目", clean_title) } else { clean_title.to_string() },
            "content": main_extract,
            "wordCount": wc,
            "order": chapters.len(),
        }));
    }

    for sub_title in sub_links {
        if let Some(sp) = fetch_wikisource_extract(&sub_title, proxy).await {
            let ext = sp.get("extract").and_then(|v| v.as_str()).unwrap_or("").trim();
            if ext.chars().count() > 40 {
                let short_t = sub_title.trim_start_matches(&format!("{}/", resolved_title)).trim_start_matches(&format!("{}/", clean_title)).to_string();
                let wc = ext.chars().count();
                let order = chapters.len();
                chapters.push(serde_json::json!({
                    "id": format!("ch_{}", order + 1),
                    "title": if short_t.is_empty() { sub_title } else { short_t },
                    "content": ext,
                    "wordCount": wc,
                    "order": order,
                }));
            }
        }
    }

    if chapters.is_empty() && !main_extract.is_empty() {
        let wc = main_extract.chars().count();
        chapters.push(serde_json::json!({
            "id": "ch_1", "title": clean_title, "content": main_extract, "wordCount": wc, "order": 0,
        }));
    }

    if chapters.is_empty() { None } else { Some(chapters) }
}
