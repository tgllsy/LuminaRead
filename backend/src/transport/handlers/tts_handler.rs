use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde::Deserialize;
use serde_json::Value;
use crate::error::AppResult;
use crate::infra::storage::{serve_file_streaming, serve_file_streaming_with_cache};
use crate::transport::state::AppState;

#[derive(Deserialize)]
pub struct TtsSpeakPayload {
    pub text: Option<String>,
    pub voice: Option<String>,
    pub dialogue_voice: Option<String>,
    pub rate: Option<f64>,
    pub format: Option<String>,
}

#[derive(Deserialize)]
pub struct TtsSpeakGetParams {
    pub text: Option<String>,
    pub voice: Option<String>,
    pub dialogue_voice: Option<String>,
    pub rate: Option<f64>,
    pub format: Option<String>,
}

pub async fn list_tts_voices(
    State(state): State<AppState>,
) -> Json<Value> {
    let voices = state.tts_service.list_voices();
    let cfg = crate::config::current_config();
    let (cached_clips, total_size_bytes) = state
        .db
        .interact(|conn| {
            let mut stmt = conn.prepare("SELECT COUNT(*), COALESCE(SUM(file_size), 0) FROM tts_audio_cache")?;
            let (count, size): (i64, i64) = stmt.query_row([], |r| Ok((r.get(0)?, r.get(1)?)))?;
            Ok((count.max(0) as u64, size.max(0) as u64))
        })
        .await
        .unwrap_or((0, 0));
    Json(serde_json::json!({
        "ok": true,
        "default_voice": cfg.endpoints.default_tts_voice,
        "voices": voices,
        "providers_config": state.tts_service.get_config(),
        "cache_stats": {
            "cached_clips": cached_clips,
            "total_size_bytes": total_size_bytes,
            "total_hits": cached_clips,
        }
    }))
}

async fn build_tts_speak_response(
    state: &AppState,
    headers: &HeaderMap,
    res: Value,
    format_param: Option<&str>,
) -> Response {
    let accept = headers
        .get(header::ACCEPT)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let wants_json = format_param == Some("json")
        || (accept.contains("application/json") && !accept.contains("audio/mpeg") && !accept.contains("*/*"));

    if wants_json {
        return Json(res).into_response();
    }

    let cache_key = res.get("cache_key").and_then(|v| v.as_str()).unwrap_or("");
    if let Ok(Some(path)) = state.tts_service.get_audio(cache_key).await {
        let mut resp = serve_file_streaming_with_cache(&path, headers, Some("public, max-age=31536000, immutable")).await;
        let h = resp.headers_mut();
        let is_cached = res.get("cached").and_then(|v| v.as_bool()).unwrap_or(false);
        let duration_ms = res.get("duration_ms").and_then(|v| v.as_i64()).unwrap_or(5000);
        let engine = res.get("engine").and_then(|v| v.as_str()).unwrap_or("edge-neural");
        let voice = res.get("voice").and_then(|v| v.as_str()).unwrap_or("zh-CN-XiaoxiaoNeural");

        h.insert(
            "X-TTS-Cache",
            HeaderValue::from_static(if is_cached { "HIT" } else { "MISS" }),
        );
        if let Ok(v) = HeaderValue::from_str(cache_key) {
            h.insert("X-TTS-Cache-Key", v);
        }
        if let Ok(v) = HeaderValue::from_str(&format!("\"{}\"", cache_key)) {
            h.insert(header::ETAG, v);
        }
        if let Ok(v) = HeaderValue::from_str(voice) {
            h.insert("X-TTS-Voice", v);
        }
        if let Ok(v) = HeaderValue::from_str(engine) {
            h.insert("X-TTS-Engine", v);
        }
        if let Ok(v) = HeaderValue::from_str(&duration_ms.to_string()) {
            h.insert("X-TTS-Duration-Ms", v);
        }
        h.insert(
            header::ACCESS_CONTROL_EXPOSE_HEADERS,
            HeaderValue::from_static(
                "X-TTS-Cache, X-TTS-Cache-Key, X-TTS-Voice, X-TTS-Engine, X-TTS-Duration-Ms, ETag",
            ),
        );
        return resp;
    }

    Json(res).into_response()
}

pub async fn tts_speak(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<TtsSpeakPayload>,
) -> AppResult<Response> {
    let text = payload.text.unwrap_or_default();
    if text.trim().is_empty() {
        return Err(crate::error::DomainError::ValidationError("朗读文本不能为空".into()).into());
    }
    let res = if payload.dialogue_voice.is_some()
        || payload.voice.as_deref().map(|v| v.starts_with("drama-")).unwrap_or(false)
    {
        state
            .tts_service
            .speak_dual_role(
                &text,
                payload.voice.as_deref(),
                payload.dialogue_voice.as_deref(),
            )
            .await?
    } else {
        state.tts_service.speak(&text, payload.voice.as_deref()).await?
    };
    Ok(build_tts_speak_response(&state, &headers, res, payload.format.as_deref()).await)
}

pub async fn tts_speak_get(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<TtsSpeakGetParams>,
) -> AppResult<Response> {
    let text = params.text.unwrap_or_default();
    if text.trim().is_empty() {
        return Err(crate::error::DomainError::ValidationError("朗读文本不能为空".into()).into());
    }
    let res = if params.dialogue_voice.is_some()
        || params.voice.as_deref().map(|v| v.starts_with("drama-")).unwrap_or(false)
    {
        state
            .tts_service
            .speak_dual_role(
                &text,
                params.voice.as_deref(),
                params.dialogue_voice.as_deref(),
            )
            .await?
    } else {
        state.tts_service.speak(&text, params.voice.as_deref()).await?
    };
    Ok(build_tts_speak_response(&state, &headers, res, params.format.as_deref()).await)
}

pub async fn tts_audio(
    Path(hash): Path<String>,
    headers: HeaderMap,
    State(state): State<AppState>,
) -> Response {
    if let Ok(Some(path)) = state.tts_service.get_audio(&hash).await {
        serve_file_streaming_with_cache(&path, &headers, Some("public, max-age=31536000, immutable")).await
    } else {
        StatusCode::NOT_FOUND.into_response()
    }
}

pub async fn get_tts_config(
    State(state): State<AppState>,
) -> Json<Value> {
    Json(state.tts_service.get_config())
}

pub async fn get_tts_providers(
    State(_state): State<AppState>,
) -> Json<Value> {
    Json(serde_json::json!({
        "providers": [
            { "id": "edge", "name": "Edge TTS", "enabled": true },
            { "id": "local", "name": "Local Synthesizer", "enabled": true }
        ]
    }))
}

pub async fn update_tts_providers(
    State(state): State<AppState>,
    Json(p): Json<Value>,
) -> AppResult<Json<Value>> {
    state.tts_service.update_config(p)?;
    Ok(Json(serde_json::json!({ "ok": true })))
}
