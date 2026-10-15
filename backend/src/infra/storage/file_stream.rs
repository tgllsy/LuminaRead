use axum::{
    body::Body,
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
};
use std::path::{Path, PathBuf};
use tokio::fs::File;
use tokio::io::{AsyncReadExt, AsyncSeekExt, SeekFrom};
use tokio_util::io::ReaderStream;

pub fn sanitize_path(base: &Path, relative: &str) -> Option<PathBuf> {
    let clean = relative.replace('\\', "/");
    let mut out = base.to_path_buf();
    for seg in clean.split('/') {
        if seg.is_empty() || seg == "." {
            continue;
        }
        if seg == ".." {
            return None; // Traversal attempt rejected
        }
        out.push(seg);
    }
    Some(out)
}

pub fn guess_mime_type(path: &Path) -> &'static str {
    match path.extension().and_then(|s| s.to_str()).unwrap_or("").to_lowercase().as_str() {
        "html" | "htm" => "text/html; charset=utf-8",
        "js" | "mjs" => "application/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "json" => "application/json; charset=utf-8",
        "pdf" => "application/pdf",
        "epub" => "application/epub+zip",
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        "ico" => "image/x-icon",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        "otf" => "font/otf",
        "mp3" => "audio/mpeg",
        "txt" => "text/plain; charset=utf-8",
        "md" => "text/markdown; charset=utf-8",
        "apk" => "application/vnd.android.package-archive",
        _ => "application/octet-stream",
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum RangeResult {
    None,
    Satisfiable(u64, u64),
    Unsatisfiable,
}

pub fn parse_range_header(range_str: &str, total_size: u64) -> RangeResult {
    let clean = range_str.trim();
    if !clean.starts_with("bytes=") {
        return RangeResult::None;
    }
    let val = &clean[6..];

    if let Some(suffix_str) = val.strip_prefix('-') {
        if let Ok(suffix) = suffix_str.parse::<u64>() {
            if suffix == 0 {
                return RangeResult::Unsatisfiable;
            }
            let start = total_size.saturating_sub(suffix);
            let end = total_size.saturating_sub(1);
            return RangeResult::Satisfiable(start, end);
        }
        return RangeResult::None;
    }

    let parts: Vec<&str> = val.split('-').collect();
    if parts.len() != 2 {
        return RangeResult::None;
    }

    let start: u64 = match parts[0].parse() {
        Ok(s) => s,
        Err(_) => return RangeResult::None,
    };

    if start >= total_size {
        return RangeResult::Unsatisfiable;
    }

    let mut end: u64 = if parts[1].is_empty() {
        total_size.saturating_sub(1)
    } else {
        match parts[1].parse() {
            Ok(e) => e,
            Err(_) => return RangeResult::None,
        }
    };

    if end >= total_size {
        end = total_size.saturating_sub(1);
    }

    if start <= end {
        RangeResult::Satisfiable(start, end)
    } else {
        RangeResult::Unsatisfiable
    }
}

pub async fn serve_file_streaming(path: &Path, headers: &HeaderMap) -> Response {
    serve_file_streaming_with_cache(path, headers, None).await
}

pub async fn serve_file_streaming_with_cache(
    path: &Path,
    headers: &HeaderMap,
    cache_control: Option<&str>,
) -> Response {
    let mut file = match File::open(path).await {
        Ok(f) => f,
        Err(_) => return StatusCode::NOT_FOUND.into_response(),
    };

    let total_size = match file.metadata().await {
        Ok(m) => m.len(),
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };

    let mime_type = guess_mime_type(path);

    if let Some(range_val) = headers.get(header::RANGE).and_then(|v| v.to_str().ok()) {
        match parse_range_header(range_val, total_size) {
            RangeResult::Satisfiable(start, end) => {
                let length = end - start + 1;
                if file.seek(SeekFrom::Start(start)).await.is_ok() {
                    let take_file = file.take(length);
                    let stream = ReaderStream::with_capacity(take_file, 64 * 1024);
                    let body = Body::from_stream(stream);

                    let mut resp_headers = HeaderMap::new();
                    resp_headers.insert(header::CONTENT_TYPE, HeaderValue::from_static(mime_type));
                    if let Ok(cr) = HeaderValue::from_str(&format!("bytes {}-{}/{}", start, end, total_size)) {
                        resp_headers.insert(header::CONTENT_RANGE, cr);
                    }
                    resp_headers.insert(header::ACCEPT_RANGES, HeaderValue::from_static("bytes"));
                    resp_headers.insert(header::CONTENT_LENGTH, length.into());
                    if let Some(cc) = cache_control {
                        if let Ok(val) = HeaderValue::from_str(cc) {
                            resp_headers.insert(header::CACHE_CONTROL, val);
                        }
                    }

                    return (StatusCode::PARTIAL_CONTENT, resp_headers, body).into_response();
                }
            }
            RangeResult::Unsatisfiable => {
                let mut resp_headers = HeaderMap::new();
                if let Ok(cr) = HeaderValue::from_str(&format!("bytes */{}", total_size)) {
                    resp_headers.insert(header::CONTENT_RANGE, cr);
                }
                resp_headers.insert(header::ACCEPT_RANGES, HeaderValue::from_static("bytes"));
                return (StatusCode::RANGE_NOT_SATISFIABLE, resp_headers).into_response();
            }
            RangeResult::None => {}
        }
    }

    let stream = ReaderStream::with_capacity(file, 64 * 1024);
    let body = Body::from_stream(stream);

    let mut resp_headers = HeaderMap::new();
    resp_headers.insert(header::CONTENT_TYPE, HeaderValue::from_static(mime_type));
    resp_headers.insert(header::ACCEPT_RANGES, HeaderValue::from_static("bytes"));
    resp_headers.insert(header::CONTENT_LENGTH, total_size.into());
    if let Some(cc) = cache_control {
        if let Ok(val) = HeaderValue::from_str(cc) {
            resp_headers.insert(header::CACHE_CONTROL, val);
        }
    }

    (StatusCode::OK, resp_headers, body).into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_path_sanitization_blocks_traversal() {
        let base = PathBuf::from("/data");
        assert!(sanitize_path(&base, "../package.json").is_none());
        assert!(sanitize_path(&base, "..\\package.json").is_none());
        assert!(sanitize_path(&base, "books/test.epub").is_some());
    }

    #[test]
    fn test_parse_range_header() {
        let total = 1000;
        assert_eq!(parse_range_header("bytes=0-15", total), RangeResult::Satisfiable(0, 15));
        assert_eq!(parse_range_header("bytes=100-", total), RangeResult::Satisfiable(100, 999));
        assert_eq!(parse_range_header("bytes=-500", total), RangeResult::Satisfiable(500, 999));
        assert_eq!(parse_range_header("bytes=500-400", total), RangeResult::Unsatisfiable);
        assert_eq!(parse_range_header("bytes=2000-", total), RangeResult::Unsatisfiable);
    }
}
