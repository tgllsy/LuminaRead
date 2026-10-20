use std::path::Path;

use crate::infra::db::DbContext;

use super::dialogue::map_to_edge_voice;
use super::edge_client::{is_valid_mp3_buffer, synthesize_via_edge_tts};

pub async fn record_or_touch_cache(
    db: &DbContext,
    cache_key: &str,
    voice_label: &str,
    rate_pct: &str,
    pitch_hz: &str,
    text_hash: &str,
    normalized: &str,
    mp3_path: &Path,
    file_size: i64,
    duration_ms: i64,
    engine_used: &str,
    was_cached: bool,
) {
    let ck_db = cache_key.to_string();
    let vn_db = voice_label.to_string();
    let rp_db = rate_pct.to_string();
    let ph_db = pitch_hz.to_string();
    let th_db = text_hash.to_string();
    let preview: String = normalized.chars().take(80).collect();
    let fp_db = mp3_path.to_string_lossy().to_string();
    let eng_db = engine_used.to_string();
    let now_str = chrono::Utc::now().to_rfc3339();

    let _ = db
        .interact(move |conn| {
            if was_cached {
                let _ = conn.execute(
                    "UPDATE tts_audio_cache SET hit_count = hit_count + 1, last_accessed_at = ? WHERE cache_key = ?",
                    rusqlite::params![now_str, ck_db],
                );
            } else {
                let _ = conn.execute(
                    "INSERT OR REPLACE INTO tts_audio_cache (
                        cache_key, voice, rate, pitch, text_hash, text_preview,
                        file_path, file_size, duration_ms, engine, hit_count, created_at, last_accessed_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)",
                    rusqlite::params![
                        ck_db, vn_db, rp_db, ph_db, th_db, preview,
                        fp_db, file_size, duration_ms, eng_db, now_str, now_str
                    ],
                );
            }
            Ok(())
        })
        .await;
}

pub async fn synthesize_chunk_mp3(
    chunk: &str,
    voice: &str,
    client: Option<&reqwest::Client>,
) -> Option<(Vec<u8>, &'static str)> {
    let cfg = crate::config::current_config();
    let (edge_voice, pitch, rate) = map_to_edge_voice(voice);

    let custom_ep = cfg.endpoints.custom_tts_url.trim();
    if !custom_ep.is_empty() {
        let fallback_client;
        let c = match client {
            Some(cl) => cl,
            None => {
                fallback_client = reqwest::Client::builder()
                    .timeout(std::time::Duration::from_secs(6))
                    .connect_timeout(std::time::Duration::from_secs(3))
                    .build()
                    .unwrap_or_default();
                &fallback_client
            }
        };
        if let Ok(resp) = c.get(custom_ep).query(&[("text", chunk), ("voice", voice)]).send().await {
            if resp.status().is_success() {
                if let Ok(bytes) = resp.bytes().await {
                    if is_valid_mp3_buffer(&bytes) {
                        return Some((bytes.to_vec(), "custom-tts"));
                    }
                }
            }
        }
    }

    if let Some(buf) = synthesize_via_edge_tts(chunk, edge_voice, pitch, rate).await {
        return Some((buf, "edge-neural"));
    }
    tokio::time::sleep(std::time::Duration::from_millis(150)).await;
    if let Some(buf) = synthesize_via_edge_tts(chunk, edge_voice, pitch, rate).await {
        return Some((buf, "edge-neural"));
    }
    None
}

pub async fn synthesize_tasks(
    http_client: &reqwest::Client,
    tasks: &[(&str, &str)],
) -> Option<(Vec<u8>, String)> {
    let mut combined_mp3 = Vec::new();
    let mut engine_used = "edge-neural".to_string();

    for batch in tasks.chunks(6) {
        let batch_futs = batch.iter().map(|(chunk, voice)| {
            synthesize_chunk_mp3(chunk, voice, Some(http_client))
        });
        let batch_results = futures_util::future::join_all(batch_futs).await;
        for res in batch_results {
            if let Some((buf, eng)) = res {
                combined_mp3.extend_from_slice(&buf);
                engine_used = eng.to_string();
            } else {
                return None;
            }
        }
    }

    if is_valid_mp3_buffer(&combined_mp3) {
        Some((combined_mp3, engine_used))
    } else {
        None
    }
}
