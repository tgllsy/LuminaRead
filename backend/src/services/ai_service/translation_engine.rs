use serde_json::Value;
use sha2::{Digest, Sha256};
use std::sync::OnceLock;

use crate::infra::db::DbContext;

pub fn sha256_hex(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    hex::encode(hasher.finalize())
}

pub fn is_mostly_english_text(text: &str) -> bool {
    let sample: String = text.trim().chars().take(160).collect();
    if sample.is_empty() {
        return false;
    }
    let latin = sample.chars().filter(|c| c.is_ascii_alphabetic()).count();
    let cjk = sample
        .chars()
        .filter(|c| ('\u{4e00}'..='\u{9fff}').contains(c))
        .count();
    latin > cjk * 2 && latin > 3
}

static TRANSLATE_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

fn get_translate_client() -> &'static reqwest::Client {
    TRANSLATE_CLIENT.get_or_init(|| {
        let cfg = crate::config::current_config();
        let env_proxy = cfg.proxy_url.trim().to_string();
        let mut builder = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(6))
            .connect_timeout(std::time::Duration::from_secs(3))
            .pool_idle_timeout(std::time::Duration::from_secs(90))
            .pool_max_idle_per_host(16)
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0");
        if !env_proxy.is_empty() {
            if let Ok(p) = reqwest::Proxy::all(&env_proxy) {
                builder = builder.proxy(p);
            }
        }
        builder.build().unwrap_or_else(|_| reqwest::Client::new())
    })
}

pub fn is_valid_cached_translation(trans: &str) -> bool {
    let t = trans.trim();
    !t.is_empty()
        && !t.starts_with("（参考译文）")
        && !t.starts_with("(Reference translation)")
        && !t.starts_with("[Translation temporarily")
        && !t.starts_with("[当前网络暂无法")
}

async fn call_google_clients5_translate(text: &str, target_lang: &str) -> Option<String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return None;
    }
    let cfg = crate::config::current_config();
    let endpoint = cfg.endpoints.google_translate_url.trim();
    if endpoint.is_empty() {
        return None;
    }

    let client = get_translate_client();
    let resp = client
        .get(endpoint)
        .query(&[
            ("client", "dict-chrome-ex"),
            ("sl", "auto"),
            ("tl", target_lang),
            ("q", trimmed),
        ])
        .send()
        .await
        .ok()?;
    if !resp.status().is_success() {
        return None;
    }
    let val: Value = resp.json().await.ok()?;

    let arr = val.as_array()?;
    let first = arr.first()?;
    let trans_str = if let Some(s) = first.as_str() {
        s.trim().to_string()
    } else if let Some(inner) = first.as_array() {
        inner.first().and_then(|v| v.as_str()).unwrap_or("").trim().to_string()
    } else {
        String::new()
    };
    if trans_str.is_empty() || trans_str.starts_with("<!DOCTYPE") || trans_str.starts_with("<html") {
        None
    } else {
        Some(trans_str)
    }
}

async fn call_mymemory_translate(text: &str, target_lang: &str) -> Option<String> {
    let trimmed = text.trim();
    if trimmed.is_empty() || trimmed.chars().count() > 450 {
        return None;
    }
    let cfg = crate::config::current_config();
    let endpoint = cfg.endpoints.mymemory_translate_url.trim();
    if endpoint.is_empty() {
        return None;
    }
    let langpair = if target_lang == "en" { "zh-CN|en" } else { "en|zh-CN" };
    let client = get_translate_client();

    let val: Value = client
        .get(endpoint)
        .query(&[("langpair", &langpair), ("q", &trimmed)])
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;

    let trans = val
        .get("responseData")
        .and_then(|r| r.get("translatedText"))
        .and_then(|v| v.as_str())?
        .trim()
        .to_string();
    if trans.is_empty() || trans.contains("MYMEMORY WARNING") {
        None
    } else {
        Some(trans)
    }
}

async fn call_youdao_translate(text: &str) -> Option<String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return None;
    }
    let cfg = crate::config::current_config();
    let endpoint = cfg.endpoints.youdao_translate_url.trim();
    if endpoint.is_empty() {
        return None;
    }

    let client = get_translate_client();
    let val: Value = client
        .get(endpoint)
        .query(&[("doctype", "json"), ("type", "AUTO"), ("i", trimmed)])
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;

    if val.get("errorCode").and_then(|v| v.as_i64()) != Some(0) {
        return None;
    }

    let outer = val.get("translateResult")?.as_array()?;
    let mut lines = Vec::with_capacity(outer.len());
    for line_arr in outer {
        if let Some(segs) = line_arr.as_array() {
            let mut line_str = String::new();
            for seg in segs {
                if let Some(tgt) = seg.get("tgt").and_then(|v| v.as_str()) {
                    line_str.push_str(tgt);
                }
            }
            lines.push(line_str);
        }
    }
    let joined = lines.join("\n").trim().to_string();
    if joined.is_empty() {
        None
    } else {
        Some(joined)
    }
}

pub async fn translate_live_batch(text: &str, target_lang: &str) -> Option<String> {
    if let Some(res) = call_google_clients5_translate(text, target_lang).await {
        return Some(res);
    }
    if let Some(res) = call_mymemory_translate(text, target_lang).await {
        return Some(res);
    }
    if let Some(res) = call_youdao_translate(text).await {
        return Some(res);
    }
    None
}

pub async fn translate_text_real(db: &DbContext, text: &str, target_lang: Option<&str>) -> String {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    let is_en = is_mostly_english_text(trimmed);
    let tl = target_lang.unwrap_or(if is_en { "zh-CN" } else { "en" }).to_string();
    let hash = sha256_hex(&format!("{}:{}", tl, trimmed));

    let cached = db
        .interact({
            let h = hash.clone();
            move |conn| {
                Ok(conn
                    .query_row(
                        "SELECT translated_text FROM translation_cache WHERE source_hash = ?",
                        rusqlite::params![h],
                        |r| r.get::<_, String>(0),
                    )
                    .ok())
            }
        })
        .await
        .ok()
        .flatten();

    if let Some(c) = cached {
        if is_valid_cached_translation(&c) {
            return c;
        }
    }

    if let Some(live) = translate_live_batch(trimmed, &tl).await {
        let src_owned = trimmed.to_string();
        let tl_owned = tl.clone();
        let live_owned = live.clone();
        let now_str = chrono::Utc::now().to_rfc3339();
        let _ = db
            .interact(move |conn| {
                let _ = conn.execute(
                    "INSERT OR REPLACE INTO translation_cache (source_hash, source_text, target_lang, translated_text, created_at)
                     VALUES (?, ?, ?, ?, ?)",
                    rusqlite::params![hash, src_owned, tl_owned, live_owned, now_str],
                );
                Ok(())
            })
            .await;
        return live;
    }

    trimmed.to_string()
}
