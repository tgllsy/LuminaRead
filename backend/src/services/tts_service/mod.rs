pub mod dialogue;
pub mod edge_client;
pub mod engine;
pub mod sanitizer;
pub mod voices;

pub use dialogue::{parse_dialogue_segments, TtsRoleSegment};
pub use engine::synthesize_chunk_mp3;

use async_trait::async_trait;
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{Mutex, Notify};

use crate::config::AppConfig;
use crate::error::{AppResult, DomainError, InfraError};
use crate::infra::db::DbContext;
use crate::services::traits::TtsService;

use dialogue::resolve_dual_role_voices;
use edge_client::{get_silent_mp3_buffer, is_fake_stub_mp3, is_valid_mp3_buffer};
use engine::{record_or_touch_cache, synthesize_tasks};
use sanitizer::{has_speakable_content, sanitize_tts_text, split_text_into_tts_chunks};

pub struct TtsServiceImpl {
    db: DbContext,
    config: AppConfig,
    in_flight: Arc<Mutex<HashMap<String, Arc<Notify>>>>,
    http_client: reqwest::Client,
}

impl TtsServiceImpl {
    pub fn new(db: DbContext, config: AppConfig) -> Self {
        let http_client = reqwest::Client::builder()
            .pool_idle_timeout(std::time::Duration::from_secs(90))
            .pool_max_idle_per_host(32)
            .tcp_nodelay(true)
            .connect_timeout(std::time::Duration::from_secs(5))
            .build()
            .unwrap_or_default();
        Self {
            db,
            config,
            in_flight: Arc::new(Mutex::new(HashMap::new())),
            http_client,
        }
    }

    async fn handle_silent_fallback(&self, voice_name: &str) -> AppResult<Value> {
        let silent_buf = get_silent_mp3_buffer();
        let silent_hash = "silent_guard_v1";
        let mp3_path = self.config.tts_cache_dir.join(format!("{}.mp3", silent_hash));
        if !mp3_path.exists() {
            let _ = tokio::fs::write(&mp3_path, &silent_buf).await;
        }
        Ok(serde_json::json!({
            "ok": true,
            "audio_url": format!("/api/tts/audio/{}", silent_hash),
            "file_path": mp3_path.to_string_lossy(),
            "audio_bytes": silent_buf.len(),
            "file_size": silent_buf.len(),
            "duration_ms": 150,
            "duration_estimate_sec": 0.2,
            "voice": voice_name,
            "engine": "silent-guard",
            "cached": true,
            "cache_key": silent_hash,
        }))
    }
}

#[async_trait]
impl TtsService for TtsServiceImpl {
    async fn speak(&self, text: &str, voice: Option<&str>) -> AppResult<Value> {
        if let Some(v) = voice {
            if v.starts_with("drama-") {
                return self.speak_dual_role(text, Some(v), None).await;
            }
        }

        let normalized = sanitize_tts_text(text);
        let live_cfg = crate::config::current_config();
        let default_v = live_cfg.endpoints.default_tts_voice.as_str();
        let voice_name = voice
            .filter(|v| !v.trim().is_empty())
            .unwrap_or(if default_v.is_empty() { "zh-CN-XiaoxiaoNeural" } else { default_v });

        if normalized.is_empty() || !has_speakable_content(&normalized) {
            return self.handle_silent_fallback(voice_name).await;
        }

        let rate_pct = "+0%";
        let pitch_hz = match voice_name {
            "cloud-lidan-chat" => "-3Hz",
            "cloud-doubao-cancan" => "+1Hz",
            _ => "+0Hz",
        };

        let mut hasher = Sha256::new();
        hasher.update(normalized.as_bytes());
        let text_hash = hex::encode(hasher.finalize());

        let mut key_hasher = Sha256::new();
        key_hasher.update(format!("v2|{}|{}|{}|{}", voice_name, rate_pct, pitch_hz, text_hash).as_bytes());
        let cache_key = hex::encode(key_hasher.finalize());
        let mp3_path = self.config.tts_cache_dir.join(format!("{}.mp3", cache_key));

        if mp3_path.exists() && is_fake_stub_mp3(&mp3_path).await {
            let _ = tokio::fs::remove_file(&mp3_path).await;
        }

        let was_cached = mp3_path.exists();
        let mut is_cached = was_cached;
        let mut engine_used = "edge-neural".to_string();

        if !is_cached {
            let (is_primary, notify) = {
                let mut guard = self.in_flight.lock().await;
                if let Some(existing) = guard.get(&cache_key) {
                    (false, existing.clone())
                } else {
                    let n = Arc::new(Notify::new());
                    guard.insert(cache_key.clone(), n.clone());
                    (true, n)
                }
            };

            if !is_primary {
                notify.notified().await;
                is_cached = mp3_path.exists();
            } else {
                let chunks = split_text_into_tts_chunks(&normalized, 180);
                let tasks: Vec<(&str, &str)> = chunks.iter().map(|c| (c.as_str(), voice_name)).collect();

                let synth_res = synthesize_tasks(&self.http_client, &tasks).await;
                let save_res: AppResult<()> = if let Some((combined, eng)) = synth_res {
                    tokio::fs::write(&mp3_path, &combined).await.map_err(InfraError::Io)?;
                    is_cached = true;
                    engine_used = eng;
                    Ok(())
                } else {
                    Err(DomainError::ValidationError("TTS 在线语音合成失败，请稍后重试".into()).into())
                };

                let mut guard = self.in_flight.lock().await;
                guard.remove(&cache_key);
                notify.notify_waiters();

                save_res?;
            }
        }

        let meta = tokio::fs::metadata(&mp3_path).await.map_err(InfraError::Io)?;
        let file_size = meta.len() as i64;
        let char_count = normalized.chars().count();
        let duration_ms = (char_count as f64 / 3.8 * 1000.0).round() as i64;
        let duration_sec = (duration_ms as f64 / 1000.0 * 10.0).round() / 10.0;

        record_or_touch_cache(
            &self.db, &cache_key, voice_name, rate_pct, pitch_hz, &text_hash,
            &normalized, &mp3_path, file_size, duration_ms, &engine_used, was_cached,
        ).await;

        Ok(serde_json::json!({
            "ok": true,
            "audio_url": format!("/api/tts/audio/{}", cache_key),
            "file_path": mp3_path.to_string_lossy(),
            "audio_bytes": file_size,
            "file_size": file_size,
            "duration_ms": duration_ms,
            "duration_estimate_sec": duration_sec,
            "voice": voice_name,
            "engine": engine_used,
            "cached": is_cached,
            "cache_key": cache_key,
        }))
    }

    async fn speak_dual_role(
        &self,
        text: &str,
        narrator_voice: Option<&str>,
        dialogue_voice: Option<&str>,
    ) -> AppResult<Value> {
        let (n_voice, d_voice) = resolve_dual_role_voices(narrator_voice, dialogue_voice);
        let normalized = sanitize_tts_text(text);
        if normalized.is_empty() || !has_speakable_content(&normalized) {
            return self.handle_silent_fallback(n_voice).await;
        }

        let segments = parse_dialogue_segments(&normalized);
        let mut hasher = Sha256::new();
        hasher.update(normalized.as_bytes());
        let text_hash = hex::encode(hasher.finalize());

        let mut key_hasher = Sha256::new();
        key_hasher.update(format!("dual|{}|{}|{}", n_voice, d_voice, text_hash).as_bytes());
        let cache_key = hex::encode(key_hasher.finalize());
        let mp3_path = self.config.tts_cache_dir.join(format!("{}.mp3", cache_key));

        if mp3_path.exists() && is_fake_stub_mp3(&mp3_path).await {
            let _ = tokio::fs::remove_file(&mp3_path).await;
        }

        let was_cached = mp3_path.exists();
        let mut is_cached = was_cached;
        let mut engine_used = "edge-neural".to_string();

        if !is_cached {
            let (is_primary, notify) = {
                let mut guard = self.in_flight.lock().await;
                if let Some(existing) = guard.get(&cache_key) {
                    (false, existing.clone())
                } else {
                    let n = Arc::new(Notify::new());
                    guard.insert(cache_key.clone(), n.clone());
                    (true, n)
                }
            };

            if !is_primary {
                notify.notified().await;
                is_cached = mp3_path.exists();
            } else {
                let mut tasks: Vec<(&str, &str)> = Vec::new();
                let mut chunk_holder: Vec<Vec<String>> = Vec::new();

                for seg in &segments {
                    let _ = if seg.is_dialogue { d_voice } else { n_voice };
                    let chunks = split_text_into_tts_chunks(&seg.text, 180);
                    chunk_holder.push(chunks);
                }
                for (idx, seg) in segments.iter().enumerate() {
                    let v = if seg.is_dialogue { d_voice } else { n_voice };
                    for c in &chunk_holder[idx] {
                        tasks.push((c.as_str(), v));
                    }
                }

                let synth_res = synthesize_tasks(&self.http_client, &tasks).await;
                let save_res: AppResult<()> = if let Some((combined, eng)) = synth_res {
                    tokio::fs::write(&mp3_path, &combined).await.map_err(InfraError::Io)?;
                    is_cached = true;
                    engine_used = eng;
                    Ok(())
                } else {
                    Err(DomainError::ValidationError("双角色剧场模式合成失败".into()).into())
                };

                let mut guard = self.in_flight.lock().await;
                guard.remove(&cache_key);
                notify.notify_waiters();

                save_res?;
            }
        }

        let meta = tokio::fs::metadata(&mp3_path).await.map_err(InfraError::Io)?;
        let file_size = meta.len() as i64;
        let duration_ms = (normalized.chars().count() as f64 / 3.8 * 1000.0).round() as i64;

        record_or_touch_cache(
            &self.db, &cache_key, &format!("dual:{}:{}", n_voice, d_voice),
            "+0%", "+0Hz", &text_hash, &normalized, &mp3_path, file_size, duration_ms, &engine_used, was_cached,
        ).await;

        Ok(serde_json::json!({
            "ok": true,
            "audio_url": format!("/api/tts/audio/{}", cache_key),
            "file_path": mp3_path.to_string_lossy(),
            "audio_bytes": file_size,
            "file_size": file_size,
            "duration_ms": duration_ms,
            "duration_estimate_sec": (duration_ms as f64 / 1000.0 * 10.0).round() / 10.0,
            "voice": format!("dual:{}:{}", n_voice, d_voice),
            "engine": engine_used,
            "cached": is_cached,
            "cache_key": cache_key,
        }))
    }

    async fn get_audio(&self, hash: &str) -> AppResult<Option<PathBuf>> {
        let clean = hash.trim();
        if clean.is_empty()
            || clean.len() > 128
            || !clean.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
        {
            return Ok(None);
        }
        let p = self.config.tts_cache_dir.join(format!("{}.mp3", clean));
        if p.exists() && !is_fake_stub_mp3(&p).await {
            Ok(Some(p))
        } else {
            Ok(None)
        }
    }

    fn list_voices(&self) -> Value {
        voices::get_preset_voices()
    }

    fn get_config(&self) -> Value {
        let cfg = crate::config::current_config();
        let active = if !cfg.endpoints.custom_tts_url.trim().is_empty() {
            "custom"
        } else {
            "edge-neural"
        };
        serde_json::json!({
            "active_provider": active,
            "edge_enabled": !cfg.endpoints.edge_tts_ws_url.trim().is_empty(),
            "custom_endpoint": cfg.endpoints.custom_tts_url,
            "default_voice": cfg.endpoints.default_tts_voice,
            "edge_tts_ws_url": cfg.endpoints.edge_tts_ws_url,
            "google_tts_url": cfg.endpoints.google_tts_url,
            "baidu_tts_url": cfg.endpoints.baidu_tts_url,
            "youdao_tts_url": cfg.endpoints.youdao_tts_url,
        })
    }

    fn update_config(&self, val: Value) -> AppResult<()> {
        let mut patch = serde_json::Map::new();
        if let Some(ep) = val.get("custom_endpoint").or_else(|| val.get("custom_tts_url")).and_then(|v| v.as_str()) {
            patch.insert("custom_tts_url".to_string(), Value::String(ep.to_string()));
        }
        if let Some(v) = val.get("default_voice").or_else(|| val.get("default_tts_voice")).and_then(|v| v.as_str()) {
            patch.insert("default_tts_voice".to_string(), Value::String(v.to_string()));
        }
        if !patch.is_empty() {
            let _ = crate::config::update_global_config(&Value::Object(patch));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_tts_text() {
        let input = "“你好，世界！”（12）^1^ *加粗*";
        let cleaned = sanitize_tts_text(input);
        assert_eq!(cleaned, "你好，世界！ 加粗");
    }

    #[test]
    fn test_parse_dialogue_segments() {
        let text = "小明说：“今天天气真好。”然后他走了。";
        let segs = parse_dialogue_segments(text);
        assert_eq!(segs.len(), 3);
        assert!(!segs[0].is_dialogue);
        assert!(segs[1].is_dialogue);
        assert!(!segs[2].is_dialogue);
    }
}
