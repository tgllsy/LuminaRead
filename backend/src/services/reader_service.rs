use async_trait::async_trait;
use chrono::Local;
use std::sync::Arc;
use crate::domain::entities::reader::{Bookmark, Highlight, ReadingProgress};
use crate::domain::traits::{BookRepository, ReaderRepository};
use crate::error::{AppResult, DomainError};
use crate::services::traits::{CreateBookmarkDto, CreateHighlightDto, ReaderService, UpdateProgressDto};

pub struct ReaderServiceImpl {
    reader_repo: Arc<dyn ReaderRepository>,
    book_repo: Arc<dyn BookRepository>,
}

impl ReaderServiceImpl {
    pub fn new(reader_repo: Arc<dyn ReaderRepository>, book_repo: Arc<dyn BookRepository>) -> Self {
        Self { reader_repo, book_repo }
    }
}

#[async_trait]
impl ReaderService for ReaderServiceImpl {
    async fn sync_progress(&self, id: &str, dto: UpdateProgressDto) -> AppResult<ReadingProgress> {
        let mut book = self.book_repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::BookNotFound(id.to_string()))?;

        let now = Local::now().to_rfc3339();
        book.mark_as_reading(now.clone());
        if let Some(secs) = dto.duration_seconds {
            book.record_reading_session(secs, dto.percentage);
        }

        let progress = ReadingProgress {
            book_id: id.to_string(),
            chapter_index: dto.chapter_index,
            scroll_offset: dto.scroll_offset,
            cfi: dto.cfi,
            percentage: dto.percentage,
            device_name: Some("Web-Reader".into()),
            updated_at: now,
        };

        self.reader_repo.save_progress(&progress).await?;
        self.book_repo
            .update_reading_state(&book.id, book.status.as_str(), &book.last_read_at, book.total_reading_seconds)
            .await?;
        Ok(progress)
    }

    async fn list_highlights(&self, book_id: Option<&str>, has_note: Option<bool>) -> AppResult<Vec<Highlight>> {
        self.reader_repo.list_highlights(book_id, has_note).await
    }

    async fn get_daily_review(&self) -> AppResult<Vec<Highlight>> {
        self.reader_repo.get_daily_review().await
    }

    async fn create_highlight(&self, mut dto: CreateHighlightDto) -> AppResult<Highlight> {
        let now = Local::now().to_rfc3339();
        let id = format!("hl_{}_{}", Local::now().timestamp_millis(), dto.paragraph_index.unwrap_or(0));
        
        let book_id = dto.book_id.clone();
        let mut book_title = None;
        if let Ok(Some(b)) = self.book_repo.find_by_id(&book_id).await {
            book_title = Some(b.title.clone());
        }

        // Only auto-resolve location when chapter_index < 0 or paragraph_index is missing with an empty chapter_title
        let needs_location_probe = dto.chapter_index < 0
            || (dto.paragraph_index.is_none() && dto.chapter_title.as_deref().unwrap_or("").trim().is_empty());

        if needs_location_probe && !dto.selected_text.trim().is_empty() {
            let text = dto.selected_text.trim().to_string();
            let probe = if text.chars().count() > 30 {
                text.chars().take(30).collect::<String>()
            } else {
                text.clone()
            };
            if let Ok(Some((ch_idx, ch_title, p_idx, b_title))) = self.reader_repo.resolve_paragraph_location(&book_id, &probe).await {
                dto.chapter_index = ch_idx as i64;
                dto.chapter_title = Some(ch_title);
                dto.paragraph_index = Some(p_idx as i64);
                if b_title.is_some() {
                    book_title = b_title;
                }
            }
        }

        let h = Highlight {
            id,
            book_id: dto.book_id,
            chapter_index: dto.chapter_index.max(0),
            chapter_title: dto.chapter_title.unwrap_or_default(),
            selected_text: dto.selected_text,
            paragraph_index: dto.paragraph_index.unwrap_or(0),
            start_offset: dto.start_offset.unwrap_or(0),
            end_offset: dto.end_offset.unwrap_or(0),
            cfi_range: dto.cfi_range,
            style_type: dto.style_type.unwrap_or_else(|| "highlight".into()),
            color: dto.color.unwrap_or_else(|| "yellow".into()),
            note: dto.note,
            created_at: now.clone(),
            updated_at: now,
            book_title,
        };
        self.reader_repo.create_highlight(&h).await?;
        Ok(h)
    }

    async fn update_highlight(&self, id: &str, color: &str, style_type: Option<&str>, note: Option<&str>) -> AppResult<Highlight> {
        self.reader_repo.update_highlight(id, color, style_type, note).await?.ok_or_else(|| {
            DomainError::ValidationError(format!("划线不存在: {id}")).into()
        })
    }

    async fn delete_highlight(&self, id: &str) -> AppResult<()> {
        self.reader_repo.delete_highlight(id).await
    }

    async fn list_bookmarks(&self, book_id: &str) -> AppResult<Vec<Bookmark>> {
        self.reader_repo.list_bookmarks(book_id).await
    }

    async fn create_bookmark(&self, dto: CreateBookmarkDto) -> AppResult<Bookmark> {
        let now = Local::now().to_rfc3339();
        let id = format!("bm_{}_{}", Local::now().timestamp_millis(), dto.chapter_index);
        let b = Bookmark {
            id,
            book_id: dto.book_id,
            chapter_index: dto.chapter_index,
            chapter_title: dto.chapter_title.unwrap_or_default(),
            snippet: dto.snippet,
            percentage: dto.percentage.unwrap_or(0.0),
            scroll_offset: dto.scroll_offset.unwrap_or(0.0),
            created_at: now,
        };
        self.reader_repo.create_bookmark(&b).await?;
        Ok(b)
    }

    async fn delete_bookmark(&self, id: &str) -> AppResult<()> {
        self.reader_repo.delete_bookmark(id).await
    }
}
