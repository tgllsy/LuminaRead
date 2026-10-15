use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::Value;
use crate::error::AppResult;
use crate::transport::state::AppState;

#[derive(Deserialize)]
pub struct UpdateSourcePayload {
    pub name: Option<String>,
    pub base_url: Option<String>,
    pub enabled: Option<Value>,
    pub proxy_url: Option<String>,
    pub auth_config: Option<Value>,
    pub mirror_urls: Option<Value>,
}

#[derive(Deserialize)]
pub struct DiscoverSearchParams {
    pub q: Option<String>,
    pub source: Option<String>,
    pub source_id: Option<String>,
    pub lang: Option<String>,
    pub format: Option<String>,
}

fn mask_auth_config(auth: &mut Value) {
    if let Value::Object(map) = auth {
        for (k, v) in map.iter_mut() {
            let lower = k.to_lowercase();
            if lower.contains("pass") || lower.contains("secret") || lower.contains("token") || lower.contains("key") {
                if let Value::String(s) = v {
                    if !s.is_empty() {
                        *v = Value::String("******".to_string());
                    }
                }
            }
        }
    }
}

fn merge_unmasked_auth_config(new_auth: &mut Value, old_auth: &Value) {
    if let (Value::Object(new_map), Value::Object(old_map)) = (new_auth, old_auth) {
        for (k, v) in new_map.iter_mut() {
            if let Value::String(s) = v {
                if s == "******" {
                    if let Some(old_val) = old_map.get(k) {
                        *v = old_val.clone();
                    }
                }
            }
        }
    }
}

pub async fn list_sources(
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let sources = state.discovery_service.list_sources().await?;
    let list: Vec<Value> = sources.iter().map(|s| {
        let mut auth_val: Value = serde_json::from_str(&s.auth_config.clone().unwrap_or_default()).unwrap_or_else(|_| serde_json::json!({}));
        mask_auth_config(&mut auth_val);
        let mirror_val: Value = serde_json::from_str(&s.mirror_urls.clone().unwrap_or_default()).unwrap_or_else(|_| serde_json::json!([]));
        serde_json::json!({
            "id": s.id,
            "source_type": s.source_type,
            "name": s.name,
            "description": s.description,
            "base_url": s.base_url,
            "mirror_urls": mirror_val,
            "auth_config": auth_val,
            "proxy_url": s.proxy_url,
            "enabled": s.enabled == 1,
            "priority": s.priority,
            "last_test_ms": s.last_test_ms,
            "last_test_status": s.last_test_status,
            "updated_at": s.updated_at,
        })
    }).collect();
    Ok(Json(serde_json::json!({ "sources": list })))
}

#[derive(Deserialize, Default)]
pub struct TestSourcePayload {
    pub source_id: Option<String>,
    pub base_url: Option<String>,
    pub proxy_url: Option<String>,
}

pub async fn update_source(
    Path(id): Path<String>,
    State(state): State<AppState>,
    Json(payload): Json<UpdateSourcePayload>,
) -> AppResult<Json<Value>> {
    let enabled_i64 = payload.enabled.as_ref().map(|v| {
        if v.as_bool() == Some(true) || v.as_i64() == Some(1) { 1 } else { 0 }
    });

    let auth_str = if let Some(mut new_auth) = payload.auth_config {
        let mut has_masked = false;
        if let Value::Object(ref map) = new_auth {
            for v in map.values() {
                if let Value::String(s) = v {
                    if s == "******" {
                        has_masked = true;
                        break;
                    }
                }
            }
        }

        if has_masked {
            if let Ok(sources) = state.discovery_service.list_sources().await {
                if let Some(existing) = sources.iter().find(|s| s.id == id) {
                    let old_auth: Value = serde_json::from_str(&existing.auth_config.clone().unwrap_or_default()).unwrap_or_else(|_| serde_json::json!({}));
                    merge_unmasked_auth_config(&mut new_auth, &old_auth);
                }
            }
        }
        Some(new_auth.to_string())
    } else {
        None
    };

    let mirror_str = payload.mirror_urls.as_ref().map(|v| v.to_string());

    let updated = state.discovery_service.update_source(
        &id,
        payload.name.as_deref(),
        payload.base_url.as_deref(),
        payload.proxy_url.as_deref(),
        auth_str.as_deref(),
        mirror_str.as_deref(),
        enabled_i64,
    ).await?;

    let mut auth_val: Value = serde_json::from_str(&updated.auth_config.clone().unwrap_or_default()).unwrap_or_else(|_| serde_json::json!({}));
    mask_auth_config(&mut auth_val);
    let mirror_val: Value = serde_json::from_str(&updated.mirror_urls.clone().unwrap_or_default()).unwrap_or_else(|_| serde_json::json!([]));

    Ok(Json(serde_json::json!({
        "ok": true,
        "source": {
            "id": updated.id,
            "source_type": updated.source_type,
            "name": updated.name,
            "description": updated.description,
            "base_url": updated.base_url,
            "mirror_urls": mirror_val,
            "auth_config": auth_val,
            "proxy_url": updated.proxy_url,
            "enabled": updated.enabled == 1,
            "priority": updated.priority,
            "last_test_ms": updated.last_test_ms,
            "last_test_status": updated.last_test_status,
            "updated_at": updated.updated_at,
        }
    })))
}

pub async fn test_source_connection(
    State(state): State<AppState>,
    payload: Option<Json<TestSourcePayload>>,
) -> AppResult<Json<Value>> {
    let p = payload.map(|j| j.0).unwrap_or_default();
    let res = state
        .discovery_service
        .test_connection(
            p.source_id.as_deref(),
            p.base_url.as_deref(),
            p.proxy_url.as_deref(),
        )
        .await?;
    Ok(Json(res))
}

pub async fn discover_search(
    Query(query): Query<DiscoverSearchParams>,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let q = query.q.unwrap_or_default();
    let src = query.source.as_deref().or(query.source_id.as_deref());
    let res = state
        .discovery_service
        .discover_search(&q, query.lang.as_deref(), src, query.format.as_deref())
        .await?;
    Ok(Json(res))
}

pub async fn discover_download(
    State(state): State<AppState>,
    Json(payload): Json<Value>,
) -> AppResult<(StatusCode, Json<Value>)> {
    let res = state.discovery_service.discover_download(payload).await?;
    Ok((StatusCode::CREATED, Json(res)))
}

pub async fn discover_tasks(
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let tasks = state.discovery_service.discover_tasks().await?;
    let list: Vec<Value> = tasks
        .into_iter()
        .map(|t| {
            serde_json::json!({
                "id": t.id,
                "source_id": t.source_id,
                "source_type": t.source_type,
                "remote_id": t.remote_id,
                "title": t.title,
                "book_title": t.title,
                "author": t.author,
                "format": t.format.unwrap_or_else(|| "epub".into()),
                "file_size": t.file_size,
                "cover_url": t.cover_url,
                "cover_color": t.cover_color,
                "download_url": t.download_url,
                "status": t.status,
                "progress": t.progress,
                "error_message": t.error_message,
                "book_id": t.book_id,
                "local_book_id": t.book_id,
                "created_at": t.created_at,
                "updated_at": t.updated_at,
            })
        })
        .collect();
    Ok(Json(serde_json::json!({ "tasks": list })))
}
