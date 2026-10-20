use serde_json::Value;
use std::collections::HashSet;

use super::super::http_client::{find_between, http_fetch_text};
use super::super::sanitizer::{
    matches_language_filter, normalize_for_match, pick_cover_color,
    strip_promotional_parentheticals, strip_xml_tags, to_simplified_chinese, url_encode,
};

fn parse_shadow_table_row(
    tr: &str,
    clean_q: &str,
    norm_terms: &[String],
    format_filter: &str,
    lang_filter: &str,
    source_type: &str,
) -> Option<Value> {
    let md5 = match find_between(tr, "ads.php?md5=", "\"") {
        Some(m) if m.len() >= 32 && m[..32].chars().all(|c| c.is_ascii_hexdigit()) => m[..32].to_lowercase(),
        _ => return None,
    };

    let mut tds = Vec::new();
    for td_chunk in tr.split("<td").skip(1) {
        if let Some(gt) = td_chunk.find('>') {
            if let Some(end_td) = td_chunk[gt + 1..].find("</td>") {
                tds.push(&td_chunk[gt + 1..gt + 1 + end_td]);
            }
        }
    }
    if tds.len() < 8 {
        return None;
    }

    let raw_ext = strip_xml_tags(tds[7]).to_lowercase();
    if !matches!(raw_ext.as_str(), "epub" | "pdf" | "mobi" | "azw3" | "txt") {
        return None;
    }
    let detected_fmt = if raw_ext == "azw3" { "mobi".to_string() } else { raw_ext.clone() };
    if format_filter != "all" && !format_filter.is_empty() && detected_fmt != format_filter {
        return None;
    }

    let mut raw_title = String::new();
    if let Some(ed_pos) = tds[0].find("edition.php?id=") {
        if let Some(gt) = tds[0][ed_pos..].find('>') {
            let start = ed_pos + gt + 1;
            if let Some(end_a) = tds[0][start..].find("</a>") {
                raw_title = strip_xml_tags(&tds[0][start..start + end_a]);
            }
        }
    }
    let series = find_between(tds[0], "<b>", "</b>").map(strip_xml_tags).unwrap_or_default();
    if raw_title.is_empty() && !series.is_empty() {
        raw_title = series.clone();
    }
    if raw_title.is_empty() {
        return None;
    }

    let has_hangul = raw_title.chars().any(|c| ('\u{ac00}'..='\u{d7af}').contains(&c));
    if (has_hangul || raw_title.contains("朝鲜文") || raw_title.contains("蒙文") || raw_title.contains("藏文")) && !clean_q.contains("朝鲜文") {
        return None;
    }

    let mut clean_title = strip_promotional_parentheticals(&raw_title);
    if clean_title.is_empty() {
        clean_title = raw_title.chars().take(60).collect();
    }

    let mut raw_author = strip_xml_tags(tds[1]).replace("(Author)", "").trim().trim_matches('&').trim().to_string();
    if raw_author.is_empty() || raw_author == "coll." || raw_author.starts_with("b~c@") {
        raw_author = "馆藏作者".to_string();
    }

    let norm_haystack = normalize_for_match(&format!("{} {} {}", clean_title, series, raw_author));
    if !norm_terms.is_empty() && !norm_terms.iter().all(|t| norm_haystack.contains(t)) {
        return None;
    }

    let mut raw_pub = strip_xml_tags(tds[2]);
    if raw_pub.starts_with("b~c@") || raw_pub.eq_ignore_ascii_case("coay.com") {
        raw_pub.clear();
    }
    let raw_year: String = strip_xml_tags(tds[3]).chars().filter(|c| c.is_ascii_digit()).take(4).collect();
    let raw_lang = strip_xml_tags(tds[4]);
    let has_cjk = clean_title.chars().chain(raw_author.chars()).any(|c| ('\u{4e00}'..='\u{9fff}').contains(&c));
    let item_lang = if has_cjk || raw_lang.to_lowercase().contains("chi") || raw_lang.to_lowercase().contains("zh") { "zh-CN" } else { "en" };
    if !matches_language_filter(item_lang, lang_filter) {
        return None;
    }

    let raw_size = {
        let s = strip_xml_tags(tds[6]).replace("kB", "KB");
        if s.is_empty() { "1.5 MB".to_string() } else { s }
    };

    let item_source_type = if source_type == "zlibrary" { "zlibrary" } else { "annas_archive" };
    let item_source_id = if item_source_type == "zlibrary" { "zlib-official" } else { "annas-archive" };
    let source_badge = if item_source_type == "zlibrary" { "Z-Library 实时检索" } else { "Anna's Archive 索引直连" };

    Some(serde_json::json!({
        "remote_id": format!("md5:{}", md5),
        "libgen_md5": md5,
        "source_id": item_source_id,
        "source_type": item_source_type,
        "title": clean_title,
        "author": raw_author,
        "publisher": if raw_pub.is_empty() { source_badge.to_string() } else { raw_pub.clone() },
        "year": if raw_year.is_empty() { "馆藏版".to_string() } else { raw_year },
        "isbn": "",
        "format": detected_fmt,
        "file_size": raw_size,
        "language": item_lang,
        "cover_url": "",
        "cover_color": pick_cover_color(&md5),
        "md5": md5,
        "category": if series.is_empty() { "全网实时检索".to_string() } else { series },
        "tags": [source_badge, raw_ext.to_uppercase(), if raw_pub.is_empty() { "精校全本".to_string() } else { raw_pub.chars().take(12).collect() }],
        "description": format!("《{}》（作者：{}），文件格式 {}（{}），支持一键流式拉取原始全本入库。", clean_title, raw_author, raw_ext.to_uppercase(), raw_size)
    }))
}

pub async fn search_shadow_library_live(
    query: &str,
    source_type: &str,
    format_filter: &str,
    lang_filter: &str,
    proxy: &str,
) -> Vec<Value> {
    let clean_q: String = query
        .replace(['《', '》', '"', '\'', '“', '”', '‘', '’'], " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    if clean_q.is_empty() || !matches!(source_type, "all" | "zlibrary" | "annas_archive") {
        return Vec::new();
    }

    let simp_q = to_simplified_chinese(&clean_q);
    let norm_terms: Vec<String> = simp_q
        .split_whitespace()
        .map(normalize_for_match)
        .filter(|s| !s.is_empty())
        .collect();

    let url = format!("https://libgen.li/index.php?req={}&res=25", url_encode(&clean_q));
    let html = match http_fetch_text(&url, proxy, 5).await {
        Some(h) if h.len() > 1500 && !h.contains("<title>Welcome to nginx!</title>") => h,
        _ => return Vec::new(),
    };

    let mut items = Vec::new();
    let mut seen_md5 = HashSet::new();

    for tr_part in html.split("<tr").skip(3) {
        let tr = match tr_part.find("</tr>") {
            Some(end) => &tr_part[..end],
            None => continue,
        };
        if let Some(item) = parse_shadow_table_row(tr, &clean_q, &norm_terms, format_filter, lang_filter, source_type) {
            let md5 = item["md5"].as_str().unwrap_or("").to_string();
            if seen_md5.insert(md5) {
                items.push(item);
                if items.len() >= 30 {
                    break;
                }
            }
        }
    }

    items
}

pub async fn resolve_libgen_download_url(md5: &str, proxy: &str) -> Option<String> {
    let clean_md5 = md5.trim_start_matches("md5:").trim().to_lowercase();
    if clean_md5.len() != 32 || !clean_md5.chars().all(|c| c.is_ascii_hexdigit()) {
        return None;
    }

    for base in ["https://libgen.li", "https://libgen.vg"] {
        let ads_url = format!("{}/ads.php?md5={}", base, clean_md5);
        if let Some(html) = http_fetch_text(&ads_url, proxy, 8).await {
            if let Some(pos) = html.find("get.php?md5=") {
                if let Some(end_q) = html[pos..].find('"') {
                    let rel = html[pos..pos + end_q].replace("&amp;", "&");
                    if rel.contains("key=") {
                        return Some(format!("{}/{}", base, rel.trim_start_matches('/')));
                    }
                }
            }
        }
    }
    None
}
