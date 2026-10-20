use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use std::path::PathBuf;
use tokio::io::{AsyncReadExt, AsyncSeekExt};
use serde_json::Value;
use crate::domain::entities::book::Book;
use crate::domain::traits::BookFilter;
use crate::error::AppResult;
use crate::infra::storage::sanitize_path;
use crate::services::traits::UpdateBookDto;
use crate::transport::state::AppState;

#[derive(serde::Deserialize)]
pub struct ListBooksQuery {
    pub library_id: Option<String>,
    pub status: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct ContentQuery {
    pub lite: Option<String>,
    pub chapter: Option<usize>,
}

#[derive(serde::Deserialize)]
pub struct ChapterQuery {
    pub bilingual: Option<String>,
}

pub async fn list_books(
    Query(q): Query<ListBooksQuery>,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let filter = BookFilter { library_id: q.library_id, status: q.status };
    let books = state.book_service.list_books(filter).await?;
    Ok(Json(serde_json::json!({ "books": books })))
}

pub async fn get_book(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> AppResult<Json<Book>> {
    let book = state.book_service.get_book_details(&id).await?;
    Ok(Json(book))
}

pub async fn update_book(
    Path(id): Path<String>,
    State(state): State<AppState>,
    Json(dto): Json<UpdateBookDto>,
) -> AppResult<Json<Book>> {
    let book = state.book_service.update_book(&id, dto).await?;
    Ok(Json(book))
}

pub async fn delete_book(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    state.book_service.delete_book(&id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

pub async fn get_book_content(
    Path(id): Path<String>,
    Query(q): Query<ContentQuery>,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let is_lite = q.lite.as_deref() == Some("1") || q.lite.as_deref() == Some("true");
    let content = state.book_service.get_book_content(&id, is_lite, q.chapter).await?;
    Ok(Json(content))
}

pub async fn get_book_chapter(
    Path((id, index)): Path<(String, usize)>,
    Query(q): Query<ChapterQuery>,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let bilingual = q.bilingual.as_deref() != Some("0");
    let chapter = state.book_service.get_book_chapter(&id, index, bilingual).await?;
    Ok(Json(chapter))
}

pub async fn get_pdf_meta(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let meta = state.book_service.get_pdf_meta(&id).await?;
    Ok(Json(meta))
}

pub async fn get_pdf_page(
    Path((id, page)): Path<(String, usize)>,
    State(state): State<AppState>,
) -> Response {
    if id.contains('/') || id.contains('\\') || id.contains("..") {
        return StatusCode::BAD_REQUEST.into_response();
    }

    match state.book_service.render_pdf_page_image(&id, page).await {
        Ok(Some(jpg_path)) => {
            if let Ok(img_bytes) = tokio::fs::read(&jpg_path).await {
                return (
                    StatusCode::OK,
                    [
                        (header::CONTENT_TYPE, "image/jpeg"),
                        (header::CACHE_CONTROL, "public, max-age=86400"),
                    ],
                    img_bytes,
                )
                    .into_response();
            }
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

pub async fn reparse_book(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let book = state.book_service.reparse_book(&id).await?;
    Ok(Json(serde_json::json!({ "ok": true, "book": book })))
}

pub async fn get_book_file(
    Path(id): Path<String>,
    headers: HeaderMap,
    State(state): State<AppState>,
) -> Response {
    if id.contains('/') || id.contains('\\') || id.contains("..") {
        return StatusCode::BAD_REQUEST.into_response();
    }

    let book = match state.book_service.get_book_details(&id).await {
        Ok(b) => b,
        Err(_) => return StatusCode::NOT_FOUND.into_response(),
    };

    if book.file_path.is_empty() {
        return StatusCode::NOT_FOUND.into_response();
    }

    let file_path = std::path::Path::new(&book.file_path);
    if !file_path.exists() {
        return StatusCode::NOT_FOUND.into_response();
    }

    let mut file = match tokio::fs::File::open(file_path).await {
        Ok(f) => f,
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };

    let metadata = match file.metadata().await {
        Ok(m) => m,
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };

    let total_len = metadata.len();
    let content_type = match book.format {
        crate::domain::entities::book::BookFormat::Pdf => "application/pdf",
        crate::domain::entities::book::BookFormat::Epub => "application/epub+zip",
        crate::domain::entities::book::BookFormat::Mobi => "application/x-mobipocket-ebook",
        crate::domain::entities::book::BookFormat::Azw3 => "application/vnd.amazon.ebook",
        crate::domain::entities::book::BookFormat::Txt | crate::domain::entities::book::BookFormat::Md => {
            "text/plain; charset=utf-8"
        }
    };

    // Support HTTP Range Requests (essential for PDF.js page streaming)
    if let Some(range_header) = headers.get(header::RANGE).and_then(|v| v.to_str().ok()) {
        if let Some(range_spec) = range_header.strip_prefix("bytes=") {
            let parts: Vec<&str> = range_spec.split('-').collect();
            let start = parts.first().and_then(|s| s.parse::<u64>().ok());
            let end = parts.get(1).and_then(|s| s.parse::<u64>().ok());

            let (range_start, range_end) = match (start, end) {
                (Some(s), Some(e)) if s <= e && s < total_len => (s, e.min(total_len - 1)),
                (Some(s), None) if s < total_len => (s, total_len - 1),
                (None, Some(suffix_len)) if suffix_len > 0 => {
                    let s = total_len.saturating_sub(suffix_len);
                    (s, total_len - 1)
                }
                _ => {
                    return (
                        StatusCode::RANGE_NOT_SATISFIABLE,
                        [(header::CONTENT_RANGE, format!("bytes */{}", total_len))],
                    )
                        .into_response();
                }
            };

            let chunk_len = range_end - range_start + 1;
            if (file.seek(std::io::SeekFrom::Start(range_start)).await).is_err() {
                return StatusCode::INTERNAL_SERVER_ERROR.into_response();
            }

            let stream = tokio_util::io::ReaderStream::new(file.take(chunk_len));
            let body = axum::body::Body::from_stream(stream);

            let chunk_str = chunk_len.to_string();
            let range_str = format!("bytes {}-{}/{}", range_start, range_end, total_len);

            let mut response = (StatusCode::PARTIAL_CONTENT, body).into_response();
            if let Ok(v) = content_type.parse() { response.headers_mut().insert(header::CONTENT_TYPE, v); }
            if let Ok(v) = "bytes".parse() { response.headers_mut().insert(header::ACCEPT_RANGES, v); }
            if let Ok(v) = chunk_str.parse() { response.headers_mut().insert(header::CONTENT_LENGTH, v); }
            if let Ok(v) = range_str.parse() { response.headers_mut().insert(header::CONTENT_RANGE, v); }
            if let Ok(v) = "public, max-age=86400".parse() { response.headers_mut().insert(header::CACHE_CONTROL, v); }

            return response;
        }
    }

    let stream = tokio_util::io::ReaderStream::new(file);
    let body = axum::body::Body::from_stream(stream);
    let total_str = total_len.to_string();

    let mut response = (StatusCode::OK, body).into_response();
    if let Ok(v) = content_type.parse() { response.headers_mut().insert(header::CONTENT_TYPE, v); }
    if let Ok(v) = "bytes".parse() { response.headers_mut().insert(header::ACCEPT_RANGES, v); }
    if let Ok(v) = total_str.parse() { response.headers_mut().insert(header::CONTENT_LENGTH, v); }
    if let Ok(v) = "public, max-age=86400".parse() { response.headers_mut().insert(header::CACHE_CONTROL, v); }

    response
}
