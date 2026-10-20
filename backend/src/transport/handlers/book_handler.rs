use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
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
    let filter = BookFilter { library_id: q.library_id };
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
    // Sanitize book ID to prevent URL-encoded path traversal (%2e%2e%2f)
    if id.contains('/') || id.contains('\\') || id.contains("..") || sanitize_path(&state.config.pdf_cache_dir, &id).is_none() {
        return StatusCode::BAD_REQUEST.into_response();
    }

    let book_dir = state.config.pdf_cache_dir.join(&id);
    let _ = tokio::fs::create_dir_all(&book_dir).await;
    let jpg_path = book_dir.join(format!("page_{}.jpg", page));

    if !jpg_path.exists() {
        if let Ok(book) = state.book_service.get_book_details(&id).await {
            if !book.file_path.is_empty() && std::path::Path::new(&book.file_path).exists() {
                let prefix = book_dir.join(format!("page_{}", page));
                if let Some(prefix_str) = prefix.to_str() {
                    let _ = tokio::process::Command::new("pdftoppm")
                        .args([
                            "-jpeg",
                            "-r",
                            "150",
                            "-f",
                            &page.to_string(),
                            "-l",
                            &page.to_string(),
                            "-singlefile",
                            &book.file_path,
                            prefix_str,
                        ])
                        .output()
                        .await;
                }
            }
        }
    }

    if jpg_path.exists() {
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
    }

    let page_info = state.book_service.get_pdf_page(&id, page).await.unwrap_or_else(|_| {
        serde_json::json!({
            "title": "PDF 文档",
            "page": page,
            "total_pages": 1,
            "text": ""
        })
    });
    let title = page_info.get("title").and_then(|v| v.as_str()).unwrap_or("PDF 文档");
    let total_pages = page_info.get("total_pages").and_then(|v| v.as_i64()).unwrap_or(1);
    let text = page_info.get("text").and_then(|v| v.as_str()).unwrap_or("");
    let svg_bytes = render_pdf_page_svg(title, page, total_pages as usize, text);

    (
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "image/svg+xml; charset=utf-8"),
            (header::CACHE_CONTROL, "public, max-age=3600"),
        ],
        svg_bytes,
    )
        .into_response()
}

fn xml_escape(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

fn render_pdf_page_svg(title: &str, page: usize, total_pages: usize, text: &str) -> Vec<u8> {
    let mut wrapped_lines: Vec<String> = Vec::new();
    for para in text.lines() {
        let trimmed = para.trim();
        if trimmed.is_empty() {
            if !wrapped_lines.last().map(|s| s.is_empty()).unwrap_or(true) {
                wrapped_lines.push(String::new());
            }
            continue;
        }
        let chars: Vec<char> = trimmed.chars().collect();
        let mut idx = 0;
        while idx < chars.len() {
            let end = (idx + 34).min(chars.len());
            let line_str: String = chars[idx..end].iter().collect();
            wrapped_lines.push(line_str);
            idx = end;
            if wrapped_lines.len() >= 28 {
                break;
            }
        }
        if wrapped_lines.len() >= 28 {
            break;
        }
    }

    let mut text_nodes = String::new();
    let mut y = 135;
    for line in wrapped_lines {
        if line.is_empty() {
            y += 14;
            continue;
        }
        text_nodes.push_str(&format!(
            r##"<text x="64" y="{}" font-family="system-ui, -apple-system, 'Noto Serif SC', serif" font-size="18" fill="#1e293b">{}</text>"##,
            y,
            xml_escape(&line)
        ));
        y += 30;
    }

    if text_nodes.trim().is_empty() {
        text_nodes = r##"<rect x="200" y="480" width="400" height="100" rx="16" fill="#f1f5f9" stroke="#cbd5e1" stroke-dasharray="4 4"/>
  <text x="400" y="528" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#475569">原版影印扫描页面</text>
  <text x="400" y="556" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" fill="#94a3b8">请在阅读器中开启【原版书页】高保真浏览</text>"##.to_string();
    }

    let safe_title = xml_escape(title);
    let svg = format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1120" viewBox="0 0 800 1120">
  <rect width="800" height="1120" fill="#ffffff"/>
  <rect x="24" y="24" width="752" height="1072" rx="8" fill="#fcfaf5" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="64" y="68" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#64748b">{safe_title}</text>
  <text x="736" y="68" text-anchor="end" font-family="monospace" font-size="13" fill="#94a3b8">Page {page} / {total_pages}</text>
  <line x1="64" y1="84" x2="736" y2="84" stroke="#e2e8f0" stroke-width="1"/>
  {text_nodes}
  <text x="400" y="1064" text-anchor="middle" font-family="monospace" font-size="13" fill="#94a3b8">— {page} —</text>
</svg>"##
    );
    svg.into_bytes()
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
