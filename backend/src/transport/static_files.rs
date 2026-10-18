use axum::{
    extract::State,
    http::{header, HeaderMap, StatusCode, Uri},
    response::{IntoResponse, Response},
    Json,
};
use flate2::read::GzDecoder;
use std::fs;
use std::io::Read;
use crate::config::current_config;
use crate::infra::storage::{sanitize_path, serve_file_streaming, serve_file_streaming_with_cache};
use crate::transport::state::AppState;

include!(concat!(env!("OUT_DIR"), "/embedded_assets.rs"));

fn decode_asset_bytes(asset: &EmbeddedAsset) -> Vec<u8> {
    if !asset.is_gzipped {
        return asset.bytes.to_vec();
    }
    let mut decoder = GzDecoder::new(asset.bytes);
    let mut out = Vec::new();
    if decoder.read_to_end(&mut out).is_ok() {
        out
    } else {
        asset.bytes.to_vec()
    }
}

fn accepts_gzip(headers: &HeaderMap) -> bool {
    headers
        .get(header::ACCEPT_ENCODING)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.contains("gzip"))
        .unwrap_or(false)
}

fn serve_embedded_asset(asset: &'static EmbeddedAsset, headers: &HeaderMap, cache_ctrl: &'static str) -> Response {
    let is_media = asset.mime.starts_with("audio/") || asset.mime.starts_with("video/");
    if asset.is_gzipped && accepts_gzip(headers) && !is_media {
        return (
            StatusCode::OK,
            [
                (header::CONTENT_TYPE, asset.mime),
                (header::CONTENT_ENCODING, "gzip"),
                (header::VARY, "Accept-Encoding"),
                (header::CACHE_CONTROL, cache_ctrl),
            ],
            asset.bytes,
        )
            .into_response();
    }
    (
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, asset.mime),
            (header::CACHE_CONTROL, cache_ctrl),
        ],
        decode_asset_bytes(asset),
    )
        .into_response()
}

fn render_index_html_with_runtime_config(raw_html: &[u8]) -> Vec<u8> {
    let cfg = current_config();
    let Ok(html_str) = std::str::from_utf8(raw_html) else {
        return raw_html.to_vec();
    };
    let runtime_json = serde_json::json!({
        "apiPrefix": cfg.api_prefix,
        "apiBaseUrl": cfg.api_base_url,
    });
    let script_tag = format!(
        "<script>window.__LUMINAREAD_CONFIG__ = {};</script></head>",
        runtime_json
    );
    if html_str.contains("</head>") {
        html_str.replacen("</head>", &script_tag, 1).into_bytes()
    } else {
        raw_html.to_vec()
    }
}

pub async fn handle_api_not_found() -> Response {
    (
        StatusCode::NOT_FOUND,
        Json(serde_json::json!({ "error": "Not found" })),
    )
        .into_response()
}

pub async fn handle_service_worker(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Response {
    let cfg = current_config();
    if cfg.prefer_external_dist {
        let sw_path = if state.config.dist_dir.join("sw.js").exists() {
            state.config.dist_dir.join("sw.js")
        } else {
            state.config.root_dir.join("frontend").join("public").join("sw.js")
        };
        if sw_path.exists() {
            if let Ok(bytes) = fs::read(&sw_path) {
                return (
                    StatusCode::OK,
                    [
                        (header::CONTENT_TYPE, "application/javascript; charset=utf-8"),
                        (header::CACHE_CONTROL, "no-cache, no-store, must-revalidate"),
                    ],
                    bytes,
                )
                    .into_response();
            }
        }
    }

    if let Some(asset) = get_embedded_asset("sw.js") {
        return serve_embedded_asset(asset, &headers, "no-cache, no-store, must-revalidate");
    }

    StatusCode::NOT_FOUND.into_response()
}

pub async fn handle_static_and_spa(
    State(state): State<AppState>,
    headers: HeaderMap,
    uri: Uri,
) -> Response {
    let raw_path = uri.path();

    if raw_path.contains("..") || raw_path.contains("%5c") || raw_path.contains("%5C") {
        return StatusCode::NOT_FOUND.into_response();
    }

    let cfg = current_config();

    if raw_path.starts_with("/data/") {
        let relative = raw_path.trim_start_matches("/data/");
        let is_allowed_dir = relative.starts_with("covers/") || relative.starts_with("fonts/");
        let is_sensitive = relative.ends_with(".db")
            || relative.ends_with(".db-wal")
            || relative.ends_with(".db-shm")
            || relative.contains(".sqlite")
            || relative.starts_with("books/");

        if !is_allowed_dir || is_sensitive {
            return StatusCode::NOT_FOUND.into_response();
        }

        if let Some(safe_path) = sanitize_path(&cfg.data_dir, relative) {
            if safe_path.exists() && safe_path.is_file() {
                return serve_file_streaming(&safe_path, &headers).await;
            }
        }
        return StatusCode::NOT_FOUND.into_response();
    }

    let clean_rel = raw_path.trim_start_matches('/');
    let cache_ctrl = if clean_rel.starts_with("assets/") {
        "public, max-age=31536000, immutable"
    } else {
        "public, max-age=3600"
    };

    if cfg.prefer_external_dist && !clean_rel.is_empty() && clean_rel != "index.html" {
        if let Some(full_path) = sanitize_path(&cfg.dist_dir, clean_rel) {
            if full_path.exists() && full_path.is_file() {
                return serve_file_streaming_with_cache(&full_path, &headers, Some(cache_ctrl)).await;
            }
        }
    }

    if !clean_rel.is_empty() && clean_rel != "index.html" {
        if let Some(asset) = get_embedded_asset(clean_rel) {
            return serve_embedded_asset(asset, &headers, cache_ctrl);
        }

        if let Some(full_path) = sanitize_path(&state.config.dist_dir, clean_rel) {
            if full_path.exists() && full_path.is_file() {
                return serve_file_streaming_with_cache(&full_path, &headers, Some(cache_ctrl)).await;
            }
        }
    }

    if cfg.prefer_external_dist {
        let index_path = cfg.dist_dir.join("index.html");
        if index_path.exists() {
            if let Ok(bytes) = fs::read(&index_path) {
                return (
                    StatusCode::OK,
                    [
                        (header::CONTENT_TYPE, "text/html; charset=utf-8"),
                        (header::CACHE_CONTROL, "no-cache"),
                    ],
                    render_index_html_with_runtime_config(&bytes),
                )
                    .into_response();
            }
        }
    }

    if let Some(index_asset) = get_embedded_asset("index.html") {
        let raw_html = decode_asset_bytes(index_asset);
        return (
            StatusCode::OK,
            [
                (header::CONTENT_TYPE, "text/html; charset=utf-8"),
                (header::CACHE_CONTROL, "no-cache"),
            ],
            render_index_html_with_runtime_config(&raw_html),
        )
            .into_response();
    }

    let index_path = state.config.dist_dir.join("index.html");
    if index_path.exists() {
        if let Ok(bytes) = fs::read(&index_path) {
            return (
                StatusCode::OK,
                [
                    (header::CONTENT_TYPE, "text/html; charset=utf-8"),
                    (header::CACHE_CONTROL, "no-cache"),
                ],
                render_index_html_with_runtime_config(&bytes),
            )
                .into_response();
        }
    }

    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
        "<div id=\"root\"></div>",
    )
        .into_response()
}
