use std::collections::{HashMap, HashSet};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use serde_json::Value;

use super::builder::build_curated_discovery_catalog;
use super::providers::internet_archive::search_internet_archive_live;
use super::providers::opds_and_wikisource::{search_chinese_wikisource_live, search_gutenberg_opds_live};
use super::providers::shadow_library::search_shadow_library_live;
use super::sanitizer::{matches_language_filter, normalize_for_match, score_book_relevance};

static SEARCH_CACHE: OnceLock<Mutex<HashMap<String, (Instant, Vec<Value>)>>> = OnceLock::new();

fn get_search_cache() -> &'static Mutex<HashMap<String, (Instant, Vec<Value>)>> {
    SEARCH_CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

fn check_search_cache(cache_key: &str, is_empty_query: bool) -> Option<Vec<Value>> {
    let guard = get_search_cache().lock().ok()?;
    let (ts, cached_items) = guard.get(cache_key)?;
    let ttl = if is_empty_query {
        Duration::from_secs(600)
    } else {
        Duration::from_secs(180)
    };
    if ts.elapsed() < ttl && !cached_items.is_empty() {
        Some(cached_items.clone())
    } else {
        None
    }
}

fn update_search_cache(cache_key: String, items: Vec<Value>) {
    if items.is_empty() {
        return;
    }
    if let Ok(mut guard) = get_search_cache().lock() {
        guard.insert(cache_key, (Instant::now(), items));
    }
}

async fn fetch_live_providers(
    query: &str,
    src_type: &str,
    fmt_filter: &str,
    lang_filter: &str,
    proxy: &str,
) -> Vec<Value> {
    if query.is_empty() {
        return Vec::new();
    }
    let (shadow_res, ia_res, pg_res, ws_res) = tokio::join!(
        search_shadow_library_live(query, src_type, fmt_filter, lang_filter, proxy),
        search_internet_archive_live(query, src_type, fmt_filter, lang_filter, proxy),
        search_gutenberg_opds_live(query, fmt_filter, lang_filter, proxy),
        search_chinese_wikisource_live(query, src_type, fmt_filter, lang_filter, proxy),
    );

    let mut merged = Vec::new();
    let mut seen_ids = HashSet::new();
    for list in [shadow_res, ia_res, pg_res, ws_res] {
        for item in list {
            let rid = item.get("remote_id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            if !rid.is_empty() && seen_ids.insert(rid) {
                merged.push(item);
            }
        }
    }
    merged
}

fn append_curated_catalog(
    merged: &mut Vec<Value>,
    seen_ids: &mut HashSet<String>,
    query_clean: &str,
    src_type: &str,
    fmt_filter: &str,
    lang_filter: &str,
) {
    let norm_q = normalize_for_match(query_clean);
    for item in build_curated_discovery_catalog() {
        let item_stype = item.get("source_type").and_then(|v| v.as_str()).unwrap_or("");
        let item_lang = item.get("language").and_then(|v| v.as_str()).unwrap_or("zh");
        let item_fmt = item.get("format").and_then(|v| v.as_str()).unwrap_or("epub");

        if src_type != "all" && item_stype != src_type {
            continue;
        }
        if !matches_language_filter(item_lang, lang_filter) {
            continue;
        }
        if fmt_filter != "all" && !fmt_filter.is_empty() && item_fmt != fmt_filter {
            continue;
        }
        if !norm_q.is_empty() {
            let t = item.get("title").and_then(|v| v.as_str()).unwrap_or("");
            let a = item.get("author").and_then(|v| v.as_str()).unwrap_or("");
            let c = item.get("category").and_then(|v| v.as_str()).unwrap_or("");
            let hay = normalize_for_match(&format!("{} {} {}", t, a, c));
            if !hay.contains(&norm_q) {
                continue;
            }
        }
        let rid = item.get("remote_id").and_then(|v| v.as_str()).unwrap_or("").to_string();
        if !rid.is_empty() && seen_ids.insert(rid) {
            merged.push(item);
        }
    }
}

pub async fn execute_discover_search(
    q: &str,
    lang: Option<&str>,
    src_id: Option<&str>,
    format: Option<&str>,
    proxy: &str,
) -> Value {
    let query_clean = q.trim();
    let lang_filter = lang.unwrap_or("all").trim().to_lowercase();
    let raw_src = src_id.unwrap_or("all").trim().to_lowercase();
    let src_type = match raw_src.as_str() {
        "zlib-official" | "zlibrary" => "zlibrary",
        "annas-archive" | "annas_archive" => "annas_archive",
        "gutenberg-direct" | "gutenberg" => "gutenberg",
        "openlibrary-direct" | "archive-direct" | "openlibrary" => "openlibrary",
        "standard-opds" | "calibre-opds" | "opds" => "opds",
        _ => "all",
    };
    let fmt_filter = format.unwrap_or("all").trim().to_lowercase();

    let effective_query = if !query_clean.is_empty() {
        query_clean.to_string()
    } else if lang_filter == "en" || src_type == "gutenberg" {
        "classic".to_string()
    } else if src_type == "opds" {
        "史记".to_string()
    } else {
        String::new()
    };

    let cache_key = format!("{}___{}___{}___{}", query_clean, src_type, fmt_filter, lang_filter);
    if let Some(results) = check_search_cache(&cache_key, query_clean.is_empty()) {
        return serde_json::json!({
            "ok": true, "query": query_clean, "source": src_id.unwrap_or("all"), "count": results.len(), "results": results,
        });
    }

    let mut merged = fetch_live_providers(&effective_query, src_type, &fmt_filter, &lang_filter, proxy).await;
    let mut seen_ids: HashSet<String> = merged.iter()
        .filter_map(|v| v.get("remote_id").and_then(|r| r.as_str()).map(|s| s.to_string()))
        .collect();

    append_curated_catalog(&mut merged, &mut seen_ids, query_clean, src_type, &fmt_filter, &lang_filter);

    if !query_clean.is_empty() {
        merged.sort_by(|a, b| score_book_relevance(b, query_clean).cmp(&score_book_relevance(a, query_clean)));
    }
    merged.truncate(50);
    update_search_cache(cache_key, merged.clone());

    serde_json::json!({
        "ok": true,
        "query": query_clean,
        "source": src_id.unwrap_or("all"),
        "count": merged.len(),
        "results": merged,
    })
}
