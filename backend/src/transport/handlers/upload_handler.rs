use axum::{
    body::Bytes,
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use base64::Engine;
use serde::Deserialize;
use serde_json::Value;
use crate::error::{AppResult, DomainError};
use crate::transport::state::AppState;

#[derive(Deserialize)]
pub struct UploadPayload {
    pub filename: Option<String>,
    #[serde(alias = "contentBase64", alias = "content_base64", alias = "fileBase64")]
    pub file_base64: Option<String>,
    pub file_data: Option<String>,
    pub content: Option<String>,
    pub category: Option<String>,
    pub library_id: Option<String>,
    pub author: Option<String>,
}

pub async fn upload_book(
    State(state): State<AppState>,
    Json(payload): Json<UploadPayload>,
) -> AppResult<impl IntoResponse> {
    let filename = payload.filename.unwrap_or_else(|| "uploaded_book.txt".into());
    let raw_bytes = if let Some(b64) = payload.file_base64.or(payload.file_data) {
        base64::engine::general_purpose::STANDARD
            .decode(&b64)
            .map_err(|e| DomainError::ValidationError(format!("Base64 解码失败: {}", e)))?
    } else if let Some(content) = payload.content {
        content.into_bytes()
    } else {
        return Err(DomainError::ValidationError("缺少文件内容".into()).into());
    };

    let res = state.book_service.upload_book_raw(
        filename,
        raw_bytes,
        payload.author,
        payload.category,
        payload.library_id,
    ).await?;

    Ok((StatusCode::CREATED, Json(res)))
}

#[derive(Deserialize)]
pub struct UploadInitPayload {
    pub filename: Option<String>,
    #[serde(alias = "fileSize")]
    pub file_size: Option<i64>,
    pub category: Option<String>,
    #[serde(alias = "libraryId")]
    pub library_id: Option<String>,
    pub author: Option<String>,
}

pub async fn upload_init(
    State(state): State<AppState>,
    Json(payload): Json<UploadInitPayload>,
) -> AppResult<impl IntoResponse> {
    let filename = payload.filename.unwrap_or_else(|| "uploaded_book.txt".into());
    let file_size = payload.file_size.unwrap_or(0);
    let res = state.book_service.init_chunk_upload(
        filename,
        file_size,
        payload.author,
        payload.category,
        payload.library_id,
    ).await?;

    Ok((StatusCode::CREATED, Json(res)))
}

#[derive(Deserialize)]
pub struct UploadChunkQuery {
    #[serde(alias = "bookId")]
    pub book_id: Option<String>,
    #[serde(alias = "chunkIndex")]
    pub chunk_index: Option<i64>,
    #[serde(alias = "totalChunks")]
    pub total_chunks: Option<i64>,
}

pub async fn upload_chunk(
    State(state): State<AppState>,
    Query(query): Query<UploadChunkQuery>,
    headers: HeaderMap,
    body: Bytes,
) -> AppResult<Json<Value>> {
    let book_id = query.book_id
        .or_else(|| headers.get("x-book-id").and_then(|v| v.to_str().ok()).map(|s| s.to_string()))
        .ok_or_else(|| DomainError::ValidationError("缺少 book_id 参数".into()))?;

    let chunk_index = query.chunk_index
        .or_else(|| headers.get("x-chunk-index").and_then(|v| v.to_str().ok()).and_then(|s| s.parse().ok()))
        .unwrap_or(0);

    let total_chunks = query.total_chunks
        .or_else(|| headers.get("x-total-chunks").and_then(|v| v.to_str().ok()).and_then(|s| s.parse().ok()))
        .unwrap_or(1);

    let res = state.book_service.append_chunk(&book_id, chunk_index, total_chunks, body.to_vec()).await?;
    Ok(Json(res))
}

#[derive(Deserialize)]
pub struct UploadCompletePayload {
    #[serde(alias = "bookId")]
    pub book_id: Option<String>,
}

pub async fn upload_complete(
    State(state): State<AppState>,
    Json(payload): Json<UploadCompletePayload>,
) -> AppResult<Json<Value>> {
    let book_id = payload.book_id.ok_or_else(|| DomainError::ValidationError("缺少 bookId 参数".into()))?;
    let res = state.book_service.complete_upload(&book_id).await?;
    Ok(Json(res))
}

#[derive(Deserialize)]
pub struct UploadFailPayload {
    #[serde(alias = "bookId")]
    pub book_id: Option<String>,
    pub error: Option<String>,
}

pub async fn upload_fail(
    State(state): State<AppState>,
    Json(payload): Json<UploadFailPayload>,
) -> AppResult<Json<Value>> {
    let book_id = payload.book_id.unwrap_or_default();
    let error = payload.error.unwrap_or_else(|| "上传中断".into());
    state.book_service.fail_upload(&book_id, &error).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

