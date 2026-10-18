use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::Value;
use crate::domain::entities::conversation::AiConversation;
use crate::error::AppResult;
use crate::transport::state::AppState;

use crate::services::traits::CopilotRequestDto;

#[derive(Deserialize)]
pub struct ConvQuery {
    pub book_id: Option<String>,
    pub q: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateConvPayload {
    pub book_id: Option<String>,
    pub book_title: Option<String>,
    pub book_author: Option<String>,
    pub cover_color: Option<String>,
    pub chapter_index: Option<i64>,
    pub chapter_title: Option<String>,
    pub paragraph_index: Option<i64>,
    pub selected_text: Option<String>,
    pub mode: Option<String>,
    pub question: Option<String>,
    pub answer_title: Option<String>,
    pub answer_content: Option<String>,
    pub engine: Option<String>,
    pub follow_ups: Option<Value>,
    pub saved_highlight_id: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateConvPayload {
    pub answer_title: Option<String>,
    pub selected_text: Option<String>,
    pub chapter_title: Option<String>,
    pub question: Option<String>,
    pub answer_content: Option<String>,
    pub is_pinned: Option<Value>,
}

#[derive(Deserialize)]
pub struct NotesHubQuery {
    pub book_id: Option<String>,
}

pub async fn ai_copilot(
    State(state): State<AppState>,
    Json(payload): Json<CopilotRequestDto>,
) -> AppResult<Json<Value>> {
    let res = state.ai_service.copilot(payload).await?;
    Ok(Json(res))
}

pub async fn list_conversations(
    Query(query): Query<ConvQuery>,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let convs = state.ai_service.list_conversations(query.book_id.as_deref(), query.q.as_deref()).await?;
    let conv_list: Vec<Value> = convs.into_iter().map(|c| c.to_json()).collect();
    Ok(Json(serde_json::json!({ "conversations": conv_list })))
}

pub async fn create_conversation(
    State(state): State<AppState>,
    Json(p): Json<CreateConvPayload>,
) -> AppResult<impl IntoResponse> {
    let now = chrono::Local::now().to_rfc3339();
    let id = format!("conv_{}", chrono::Local::now().timestamp_millis());
    let mode = p.mode.clone().unwrap_or_else(|| {
        if p.question.as_deref().unwrap_or("").trim().is_empty() {
            "explain".into()
        } else {
            "custom".into()
        }
    });
    let ch_idx = p.chapter_index.unwrap_or(0).max(0) as usize;

    let mut answer_title = p.answer_title.unwrap_or_default();
    let mut answer_content = p.answer_content.unwrap_or_default();
    let mut engine = p.engine;
    let mut follow_ups_json = p.follow_ups.map(|v| v.to_string());

    if answer_content.trim().is_empty() {
        if let Ok(copilot_res) = state
            .ai_service
            .copilot(CopilotRequestDto {
                mode: mode.clone(),
                book_id: p.book_id.clone(),
                book_title: p.book_title.clone(),
                chapter_index: Some(ch_idx),
                current_chapter_index: Some(ch_idx),
                chapter_title: p.chapter_title.clone(),
                paragraph_index: Some(p.paragraph_index.unwrap_or(0).max(0) as usize),
                selected_text: p.selected_text.clone(),
                question: p.question.clone(),
                current_percentage: None,
                skip_log: Some(true),
                history: None,
            })
            .await
        {
            if answer_title.trim().is_empty() {
                answer_title = copilot_res
                    .get("title")
                    .and_then(|v| v.as_str())
                    .unwrap_or("AI 伴读深度解析")
                    .to_string();
            }
            answer_content = copilot_res
                .get("content")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            if engine.is_none() {
                engine = copilot_res
                    .get("engine")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
            }
            if follow_ups_json.is_none() {
                follow_ups_json = copilot_res.get("follow_ups").map(|v| v.to_string());
            }
        }
    }

    let conv = AiConversation {
        id,
        book_id: p.book_id,
        book_title: p.book_title.unwrap_or_default(),
        book_author: p.book_author,
        cover_color: p.cover_color,
        chapter_index: ch_idx as i64,
        chapter_title: p.chapter_title,
        paragraph_index: p.paragraph_index.unwrap_or(0),
        selected_text: p.selected_text,
        mode,
        question: p.question.unwrap_or_default(),
        answer_title,
        answer_content,
        engine,
        follow_ups_json,
        is_pinned: false,
        saved_highlight_id: p.saved_highlight_id,
        created_at: now.clone(),
        updated_at: now,
    };

    let created = state.ai_service.create_conversation(conv).await?;
    Ok((StatusCode::CREATED, Json(serde_json::json!({ "ok": true, "conversation": created.to_json() }))))
}

pub async fn update_conversation(
    Path(id): Path<String>,
    State(state): State<AppState>,
    Json(p): Json<UpdateConvPayload>,
) -> AppResult<Json<Value>> {
    let is_pinned_bool = p.is_pinned.and_then(|v| {
        if let Some(b) = v.as_bool() {
            Some(b)
        } else if let Some(i) = v.as_i64() {
            Some(i != 0)
        } else {
            None
        }
    });

    let fields = crate::services::traits::UpdateConvFields {
        answer_title: p.answer_title,
        selected_text: p.selected_text,
        chapter_title: p.chapter_title,
        question: p.question,
        answer_content: p.answer_content,
        is_pinned: is_pinned_bool,
    };

    let updated = state.ai_service.update_conversation(&id, fields).await?;
    Ok(Json(serde_json::json!({ "ok": true, "conversation": updated.to_json() })))
}

pub async fn delete_conversation(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    state.ai_service.delete_conversation(&id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

pub async fn get_notes_hub(
    Query(q): Query<NotesHubQuery>,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let hub = state.ai_service.get_notes_hub(q.book_id.as_deref()).await?;
    Ok(Json(hub))
}
