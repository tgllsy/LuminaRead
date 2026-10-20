use axum::{
    extract::DefaultBodyLimit,
    http::header,
    routing::{delete, get, post, put},
    Router,
};
use tower_http::compression::predicate::{DefaultPredicate, NotForContentType, Predicate};
use tower_http::compression::CompressionLayer;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use crate::transport::handlers::*;
use crate::transport::state::AppState;
use crate::transport::static_files::{handle_api_not_found, handle_service_worker, handle_static_and_spa};

pub fn build_router(state: AppState) -> Router {
    let api_routes = Router::new()
        // Health & Stats
        .route("/health", get(get_health))
        .route("/stats/overview", get(get_stats_overview))
        .route("/stats/session", post(record_session))
        .route("/admin/reload", post(admin_reload))
        .route("/admin/reparse-all", post(admin_reparse_all))
        .route("/config", get(get_system_config).put(update_system_config).post(update_system_config))
        .route("/admin/clear-cache", post(clear_system_cache))
        // Books
        .route("/books", get(list_books))
        .route("/books/:id", get(get_book).put(update_book).delete(delete_book))
        .route("/books/:id/reparse", post(reparse_book))
        .route("/books/:id/file", get(get_book_file))
        .route("/books/:id/content", get(get_book_content))
        .route("/books/:id/chapters/:index", get(get_book_chapter))
        .route("/books/:id/pdf-meta", get(get_pdf_meta))
        .route("/books/:id/pdf-page/:page", get(get_pdf_page))
        .route("/books/:id/progress", put(update_progress))
        .route("/books/:id/highlights", get(list_book_highlights).post(create_highlight))
        .route("/books/:id/bookmarks", get(list_book_bookmarks).post(create_bookmark))
        .route("/books/:id/search", get(search_book_api))
        // Uploads
        .route("/books/upload", post(upload_book))
        .route("/books/upload/init", post(upload_init))
        .route("/books/upload/chunk", post(upload_chunk))
        .route("/books/upload/complete", post(upload_complete))
        .route("/books/upload/fail", post(upload_fail).layer(DefaultBodyLimit::max(5 * 1024 * 1024)))
        // Search
        .route("/search", get(search_api))
        // Sources & Discovery
        .route("/sources", get(list_sources))
        .route("/sources/test", post(test_source_connection))
        .route("/sources/:id", put(update_source))
        .route("/discover/search", get(discover_search))
        .route("/discover/download", post(discover_download))
        .route("/discover/tasks", get(discover_tasks))
        // Highlights & Bookmarks
        .route("/highlights", get(list_highlights))
        .route("/highlights/daily-review", get(get_daily_review))
        .route("/highlights/:id", put(update_highlight).delete(delete_highlight))
        .route("/bookmarks/:id", delete(delete_bookmark))
        // Libraries
        .route("/libraries", get(list_libraries).post(create_library))
        .route("/libraries/:id", put(update_library).delete(delete_library))
        // AI Copilot & Conversations
        .route("/ai/copilot", post(ai_copilot))
        .route("/ai/conversations", get(list_conversations).post(create_conversation))
        .route("/ai/conversations/:id", put(update_conversation).delete(delete_conversation))
        .route("/notes/hub", get(get_notes_hub))
        // Export
        .route("/export/markdown/:id", get(export_markdown))
        .route("/export/lifeos", post(export_lifeos))
        // TTS
        .route("/tts/voices", get(list_tts_voices))
        .route("/tts/speak", get(tts_speak_get).post(tts_speak))
        .route("/tts/audio/:hash", get(tts_audio))
        .route("/tts/providers", get(get_tts_providers).post(update_tts_providers))
        .route("/tts/config", get(get_tts_config).post(update_tts_providers))
        .fallback(handle_api_not_found);

    let max_body = state.config.max_upload_size;
    let custom_prefix = state.config.api_prefix.clone();

    let mut router = Router::new().nest("/api", api_routes.clone());
    if custom_prefix != "/api" && custom_prefix.starts_with('/') {
        router = router.nest(&custom_prefix, api_routes);
    }

    let cors = CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods(tower_http::cors::Any)
        .allow_headers(tower_http::cors::Any)
        .expose_headers([
            header::ACCEPT_RANGES,
            header::CONTENT_RANGE,
            header::CONTENT_LENGTH,
            header::CONTENT_TYPE,
        ]);

    let compression_predicate = DefaultPredicate::new()
        .and(NotForContentType::const_new("audio/"))
        .and(NotForContentType::const_new("video/"))
        .and(NotForContentType::const_new("application/pdf"));

    router
        .route("/sw.js", get(handle_service_worker))
        .fallback(handle_static_and_spa)
        .layer(DefaultBodyLimit::max(max_body))
        .layer(CompressionLayer::new().gzip(true).compress_when(compression_predicate))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
