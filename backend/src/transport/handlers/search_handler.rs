use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use serde_json::Value;
use crate::error::AppResult;
use crate::transport::state::AppState;

#[derive(Deserialize)]
pub struct SearchQuery {
    pub q: Option<String>,
    pub book_id: Option<String>,
    pub limit: Option<usize>,
}

pub async fn search_api(
    Query(query): Query<SearchQuery>,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let q = query.q.unwrap_or_default();
    let limit = query.limit.unwrap_or(60).clamp(1, 200);
    let book_id = query.book_id.as_deref().filter(|s| !s.is_empty() && *s != "all");
    let res = state.discovery_service.search_all(&q, book_id, limit).await?;
    Ok(Json(res))
}

pub async fn search_book_api(
    Path(id): Path<String>,
    Query(query): Query<SearchQuery>,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let q = query.q.unwrap_or_default();
    let limit = query.limit.unwrap_or(60).clamp(1, 200);
    let res = state.discovery_service.search_book(&id, &q, limit).await?;
    Ok(Json(res))
}
