use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::Value;
use crate::error::AppResult;
use crate::transport::state::AppState;

#[derive(Deserialize)]
pub struct LibraryPayload {
    pub name: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub description: Option<String>,
}

pub async fn list_libraries(
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let libs = state.library_service.list().await?;
    Ok(Json(serde_json::json!({ "libraries": libs })))
}

pub async fn create_library(
    State(state): State<AppState>,
    Json(p): Json<LibraryPayload>,
) -> AppResult<impl IntoResponse> {
    let name = p.name.unwrap_or_else(|| "新藏书阁".into());
    let icon = p.icon.unwrap_or_else(|| "📚".into());
    let color = p.color.unwrap_or_else(|| "#2563eb".into());
    let lib = state.library_service.create(name, icon, color, p.description).await?;
    Ok((StatusCode::CREATED, Json(serde_json::json!({ "ok": true, "library": lib }))))
}

pub async fn update_library(
    Path(id): Path<String>,
    State(state): State<AppState>,
    Json(p): Json<LibraryPayload>,
) -> AppResult<Json<Value>> {
    let name = p.name.unwrap_or_else(|| "藏书阁".into());
    let icon = p.icon.unwrap_or_else(|| "📚".into());
    let color = p.color.unwrap_or_else(|| "#2563eb".into());
    let lib = state.library_service.update(&id, name, icon, color, p.description).await?;
    Ok(Json(serde_json::json!({ "ok": true, "library": lib })))
}

pub async fn delete_library(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    state.library_service.delete(&id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}
