use serde_json::Value;

use super::super::http_client::http_fetch_text;
use super::super::sanitizer::{
    format_bytes, matches_language_filter, normalize_for_match, pick_cover_color,
    sha256_short, strip_promotional_parentheticals, strip_xml_tags,
    to_simplified_chinese, to_traditional_chinese, url_encode,
};

pub fn build_solr_and_clause(s: &str) -> String {
    let clean: String = s.chars().filter(|c| !c.is_whitespace()).collect();
    let has_cjk = clean.chars().any(|c| ('\u{4e00}'..='\u{9fff}').contains(&c));
    if has_cjk && clean.chars().count() >= 2 {
        clean.chars().map(|c| c.to_string()).collect::<Vec<_>>().join(" AND ")
    } else {
        s.to_string()
    }
}

fn parse_ia_doc(
    doc: &Value,
    clean_q: &str,
    norm_terms: &[String],
    format_filter: &str,
    lang_filter: &str,
    source_type: &str,
) -> Option<Value> {
    let id = doc.get("identifier").and_then(|v| v.as_str()).unwrap_or("").trim();
    if id.is_empty() {
        return None;
    }
    let raw_title = match doc.get("title") {
        Some(Value::Array(arr)) => arr.first().and_then(|v| v.as_str()).unwrap_or(id),
        Some(Value::String(s)) => s.as_str(),
        _ => id,
    };
    let raw_author = match doc.get("creator") {
        Some(Value::Array(arr)) => arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>().join(", "),
        Some(Value::String(s)) => s.clone(),
        _ => "馆藏作者".to_string(),
    };

    let clean_title = strip_promotional_parentheticals(raw_title);
    let norm_haystack = normalize_for_match(&format!("{} {}", clean_title, raw_author));
    if !norm_terms.is_empty() && !norm_terms.iter().all(|t| norm_haystack.contains(t)) {
        return None;
    }

    let has_hangul = raw_title.chars().any(|c| ('\u{ac00}'..='\u{d7af}').contains(&c));
    if (has_hangul || raw_title.contains("朝鲜文") || raw_title.contains("蒙文") || raw_title.contains("藏文"))
        && !clean_q.contains("朝鲜文")
    {
        return None;
    }

    let formats: Vec<String> = doc
        .get("format")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|x| x.as_str().map(|s| s.to_lowercase())).collect())
        .unwrap_or_default();

    let detected_fmt = if formats.iter().any(|f| f.contains("epub")) {
        "epub"
    } else if formats.iter().any(|f| f.contains("pdf")) {
        "pdf"
    } else if formats.iter().any(|f| f.contains("text") || f.contains("txt")) {
        "txt"
    } else {
        "epub"
    };

    if format_filter != "all" && !format_filter.is_empty() && detected_fmt != format_filter {
        return None;
    }

    let has_cjk = clean_title.chars().chain(raw_author.chars()).any(|c| ('\u{4e00}'..='\u{9fff}').contains(&c));
    let norm_lang = if has_cjk { "zh-CN" } else { "en" };
    if !matches_language_filter(norm_lang, lang_filter) {
        return None;
    }

    let (item_source_type, item_source_id, source_badge) = match source_type {
        "zlibrary" => ("zlibrary", "zlib-official", "Z-Library 馆藏镜像"),
        "annas_archive" => ("annas_archive", "annas-archive", "Anna's Archive 全文索引"),
        _ => ("openlibrary", "openlibrary-direct", "Internet Archive 开放书库"),
    };

    let raw_size = doc
        .get("item_size")
        .and_then(|v| v.as_u64().or_else(|| v.as_str().and_then(|s| s.parse().ok())))
        .map(|n| (n / 3).clamp(120_000, 28 * 1024 * 1024))
        .unwrap_or(1_850_000);

    let desc = match doc.get("description") {
        Some(Value::Array(arr)) => arr.first().and_then(|v| v.as_str()).unwrap_or(""),
        Some(Value::String(s)) => s.as_str(),
        _ => "",
    };
    let clean_desc: String = strip_xml_tags(desc).chars().take(200).collect();

    Some(serde_json::json!({
        "remote_id": format!("ia:{}", id),
        "ia_identifier": id,
        "source_id": item_source_id,
        "source_type": item_source_type,
        "title": clean_title,
        "author": raw_author,
        "publisher": source_badge,
        "year": doc.get("year").and_then(|v| v.as_str().map(|s| s.to_string()).or_else(|| v.as_i64().map(|n| n.to_string()))).unwrap_or_else(|| "馆藏版".into()),
        "isbn": format!("IA-{}", id.chars().take(16).collect::<String>()),
        "format": detected_fmt,
        "file_size": format_bytes(raw_size),
        "language": norm_lang,
        "cover_url": format!("https://archive.org/services/img/{}", url_encode(id)),
        "cover_color": pick_cover_color(id),
        "md5": sha256_short(id),
        "category": "全网全文检索",
        "tags": [source_badge, detected_fmt.to_uppercase(), format!("馆藏 {}", id.chars().take(10).collect::<String>())],
        "description": if clean_desc.is_empty() {
            format!("来自 Internet Archive 全球数字书库 ({}) 的完整版电子书，支持一键下载原始 {} 全文并自动解析章节。", id, detected_fmt.to_uppercase())
        } else {
            clean_desc
        }
    }))
}

pub async fn search_internet_archive_live(
    query: &str,
    source_type: &str,
    format_filter: &str,
    lang_filter: &str,
    proxy: &str,
) -> Vec<Value> {
    let clean_q: String = query
        .replace(['《', '》', '"', '\'', '“', '”', '‘', '’', '(', ')', '（', '）'], " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    if clean_q.is_empty() || !matches!(source_type, "all" | "zlibrary" | "annas_archive" | "openlibrary") {
        return Vec::new();
    }

    let simp_q = to_simplified_chinese(&clean_q);
    let trad_q = to_traditional_chinese(&clean_q);
    let norm_terms: Vec<String> = simp_q.split_whitespace().map(normalize_for_match).filter(|s| !s.is_empty()).collect();

    let simp_and = build_solr_and_clause(&simp_q);
    let trad_and = build_solr_and_clause(&trad_q);
    let mut clauses = vec![format!("title:({})^25", simp_and), format!("creator:({})^10", simp_and)];
    if trad_q != simp_q {
        clauses.push(format!("title:({})^25", trad_and));
        clauses.push(format!("creator:({})^10", trad_and));
    }

    let q_expr = format!(
        "mediatype:texts AND -identifier:ChinaXiv* AND -identifier:manuallib* AND -identifier:manualzilla* AND -identifier:0*.cn AND -identifier:NPWK* AND -identifier:NPKSE* AND -identifier:NPTKP* AND ({})",
        clauses.join(" OR ")
    );
    let url = format!(
        "https://archive.org/advancedsearch.php?q={}&fl[]=identifier,title,creator,year,format,downloads,item_size,language,description,publisher&rows=30&page=1&output=json",
        url_encode(&q_expr)
    );

    let Some(json_text) = http_fetch_text(&url, proxy, 5).await else { return Vec::new(); };
    let Ok(data) = serde_json::from_str::<Value>(&json_text) else { return Vec::new(); };
    let Some(docs) = data.get("response").and_then(|r| r.get("docs")).and_then(|d| d.as_array()) else { return Vec::new(); };

    let mut items = Vec::new();
    for doc in docs {
        if let Some(item) = parse_ia_doc(doc, &clean_q, &norm_terms, format_filter, lang_filter, source_type) {
            items.push(item);
            if items.len() >= 20 { break; }
        }
    }
    items
}

pub async fn resolve_internet_archive_download_url(
    ia_id: &str,
    preferred_fmt: &str,
    target_title: &str,
    proxy: &str,
) -> Option<(String, String)> {
    let clean_id = ia_id.trim_start_matches("ia:").trim();
    if clean_id.is_empty() {
        return None;
    }
    let meta_url = format!("https://archive.org/metadata/{}/files", url_encode(clean_id));
    let json_text = http_fetch_text(&meta_url, proxy, 8).await?;
    let data: Value = serde_json::from_str(&json_text).ok()?;
    let files = data.get("result")?.as_array()?;

    let mut valid_files: Vec<(&str, &str)> = Vec::new();
    for f in files {
        let name = f.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let lower = name.to_lowercase();
        if lower.ends_with("_meta.xml")
            || lower.ends_with("_files.xml")
            || lower.ends_with("_marc.xml")
            || lower.ends_with("_lcp.epub")
            || lower.contains("encrypted")
            || lower.ends_with(".torrent")
            || lower.ends_with(".sqlite")
        {
            continue;
        }
        if lower.ends_with(".epub") || lower.ends_with(".pdf") || lower.ends_with(".txt") || lower.ends_with(".mobi") {
            let source = f.get("source").and_then(|v| v.as_str()).unwrap_or("");
            valid_files.push((name, source));
        }
    }
    if valid_files.is_empty() {
        return None;
    }

    let norm_target = normalize_for_match(target_title.split(['（', '(', '·']).next().unwrap_or(target_title));
    let title_matched: Vec<(&str, &str)> = if norm_target.chars().count() >= 2 {
        valid_files.iter().copied().filter(|(n, _)| normalize_for_match(n).contains(&norm_target)).collect()
    } else {
        Vec::new()
    };
    let pool = if !title_matched.is_empty() { &title_matched } else { &valid_files };

    let pick = |ext: &str, orig_only: bool| -> Option<&str> {
        pool.iter()
            .find(|(n, s)| (!orig_only || *s == "original") && n.to_lowercase().ends_with(ext))
            .or_else(|| {
                valid_files
                    .iter()
                    .find(|(n, s)| (!orig_only || *s == "original") && n.to_lowercase().ends_with(ext))
            })
            .map(|(n, _)| *n)
    };

    let chosen_name = (if preferred_fmt == "txt" { pick(".txt", true) } else { None })
        .or_else(|| if preferred_fmt == "pdf" { pick(".pdf", true) } else { None })
        .or_else(|| pick(".epub", true))
        .or_else(|| pick(".epub", false))
        .or_else(|| pick(".txt", true))
        .or_else(|| pick(".pdf", true))
        .or_else(|| pick(".txt", false))
        .or_else(|| pick(".pdf", false))
        .or_else(|| pick(".mobi", false))?;

    let lower_chosen = chosen_name.to_lowercase();
    let actual_fmt = if lower_chosen.ends_with(".epub") {
        "epub"
    } else if lower_chosen.ends_with(".pdf") {
        "pdf"
    } else if lower_chosen.ends_with(".mobi") {
        "mobi"
    } else {
        "txt"
    };

    let encoded_path = chosen_name.split('/').map(url_encode).collect::<Vec<_>>().join("/");
    Some((format!("https://archive.org/download/{}/{}", url_encode(clean_id), encoded_path), actual_fmt.to_string()))
}
