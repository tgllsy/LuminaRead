pub mod copilot_engine;
pub mod graph;
pub mod llm_client;
pub mod recap;
pub mod translation_engine;
pub mod translator;

pub use graph::extract_dynamic_character_graph;
pub use translation_engine::{is_mostly_english_text, sha256_hex, translate_text_real};
pub use translator::translate_chapter_paragraphs;

use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;

use crate::domain::entities::conversation::AiConversation;
use crate::domain::traits::{BookRepository, ConversationRepository};
use crate::error::AppResult;
use crate::infra::db::DbContext;
use crate::services::traits::{AiService, CopilotRequestDto, UpdateConvFields};

use copilot_engine::execute_copilot;

pub struct AiServiceImpl {
    db: DbContext,
    conv_repo: Arc<dyn ConversationRepository>,
    book_repo: Arc<dyn BookRepository>,
}

impl AiServiceImpl {
    pub fn new(
        db: DbContext,
        conv_repo: Arc<dyn ConversationRepository>,
        book_repo: Arc<dyn BookRepository>,
    ) -> Self {
        Self {
            db,
            conv_repo,
            book_repo,
        }
    }
}

#[async_trait]
impl AiService for AiServiceImpl {
    async fn copilot(&self, req: CopilotRequestDto) -> AppResult<Value> {
        execute_copilot(&self.db, self.book_repo.as_ref(), self.conv_repo.as_ref(), req).await
    }

    async fn list_conversations(
        &self,
        book_id: Option<&str>,
        q: Option<&str>,
    ) -> AppResult<Vec<AiConversation>> {
        self.conv_repo.list(book_id, q).await
    }

    async fn create_conversation(&self, conv: AiConversation) -> AppResult<AiConversation> {
        self.conv_repo.create(&conv).await?;
        Ok(conv)
    }

    async fn update_conversation(
        &self,
        id: &str,
        fields: UpdateConvFields,
    ) -> AppResult<AiConversation> {
        let mut conv = self
            .conv_repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| crate::error::DomainError::ConversationNotFound(id.to_string()))?;

        if let Some(t) = fields.answer_title {
            conv.answer_title = t;
        }
        if let Some(s) = fields.selected_text {
            conv.selected_text = Some(s);
        }
        if let Some(ct) = fields.chapter_title {
            conv.chapter_title = Some(ct);
        }
        if let Some(q) = fields.question {
            conv.question = q;
        }
        if let Some(a) = fields.answer_content {
            conv.answer_content = a;
        }
        if let Some(p) = fields.is_pinned {
            conv.is_pinned = p;
        }
        conv.updated_at = chrono::Local::now().to_rfc3339();

        self.conv_repo.update(&conv).await?;
        Ok(conv)
    }

    async fn update_pin(&self, id: &str, is_pinned: bool) -> AppResult<()> {
        self.conv_repo.update_pin(id, is_pinned).await
    }

    async fn delete_conversation(&self, id: &str) -> AppResult<()> {
        self.conv_repo.delete(id).await
    }

    async fn get_notes_hub(&self, book_id: Option<&str>) -> AppResult<Value> {
        self.conv_repo.get_notes_hub(book_id).await
    }
}
