use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::Value;
use crate::error::AppResult;
use crate::services::traits::{CreateBookmarkDto, CreateHighlightDto, UpdateProgressDto};
use crate::transport::state::AppState;

#[derive(Deserialize)]
pub struct HighlightQuery {
    pub book_id: Option<String>,
    pub has_note: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateHighlightPayload {
    pub color: Option<String>,
    pub note: Option<String>,
    pub style_type: Option<String>,
}

pub async fn update_progress(
    Path(id): Path<String>,
    State(state): State<AppState>,
    Json(dto): Json<UpdateProgressDto>,
) -> AppResult<Json<Value>> {
    let p = state.reader_service.sync_progress(&id, dto).await?;
    Ok(Json(serde_json::json!({ "ok": true, "progress": p })))
}

pub async fn list_highlights(
    Query(q): Query<HighlightQuery>,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let has_note = q.has_note.as_deref().and_then(|v| match v {
        "true" | "1" => Some(true),
        "false" | "0" => Some(false),
        _ => None,
    });
    let items = state.reader_service.list_highlights(q.book_id.as_deref(), has_note).await?;
    Ok(Json(serde_json::json!({ "highlights": items })))
}

pub async fn get_daily_review(
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let items = state.reader_service.get_daily_review().await?;
    Ok(Json(serde_json::json!({ "highlights": items })))
}

pub async fn create_highlight(
    Path(id): Path<String>,
    State(state): State<AppState>,
    Json(mut dto): Json<CreateHighlightDto>,
) -> AppResult<impl IntoResponse> {
    if dto.book_id.is_empty() {
        dto.book_id = id;
    }
    let hl = state.reader_service.create_highlight(dto).await?;
    Ok((StatusCode::CREATED, Json(serde_json::json!({ "ok": true, "highlight": hl }))))
}

pub async fn update_highlight(
    Path(id): Path<String>,
    State(state): State<AppState>,
    Json(p): Json<UpdateHighlightPayload>,
) -> AppResult<Json<Value>> {
    // Pass empty string when color is omitted so existing color in DB is preserved
    let color = p.color.unwrap_or_default();
    let hl = state.reader_service.update_highlight(&id, &color, p.style_type.as_deref(), p.note.as_deref()).await?;
    Ok(Json(serde_json::json!({ "ok": true, "highlight": hl })))
}

pub async fn delete_highlight(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    state.reader_service.delete_highlight(&id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

pub async fn list_bookmarks(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let items = state.reader_service.list_bookmarks(&id).await?;
    Ok(Json(serde_json::json!({ "bookmarks": items })))
}

pub async fn create_bookmark(
    Path(id): Path<String>,
    State(state): State<AppState>,
    Json(mut dto): Json<CreateBookmarkDto>,
) -> AppResult<impl IntoResponse> {
    if dto.book_id.is_empty() {
        dto.book_id = id;
    }
    let bm = state.reader_service.create_bookmark(dto).await?;
    Ok((StatusCode::CREATED, Json(serde_json::json!({ "ok": true, "bookmark": bm }))))
}

pub async fn delete_bookmark(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    state.reader_service.delete_bookmark(&id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

pub async fn list_book_highlights(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let items = state.reader_service.list_highlights(Some(&id), None).await?;
    Ok(Json(serde_json::json!({ "highlights": items })))
}

pub async fn list_book_bookmarks(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let items = state.reader_service.list_bookmarks(&id).await?;
    Ok(Json(serde_json::json!({ "bookmarks": items })))
}
