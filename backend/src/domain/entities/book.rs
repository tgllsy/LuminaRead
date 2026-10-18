use crate::error::{AppResult, DomainError};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BookFormat {
    Epub,
    Pdf,
    Txt,
    Md,
    Mobi,
    Azw3,
}

impl BookFormat {
    pub fn from_ext(ext: &str) -> AppResult<Self> {
        match ext.to_lowercase().as_str() {
            "epub" => Ok(Self::Epub),
            "pdf" => Ok(Self::Pdf),
            "txt" => Ok(Self::Txt),
            "md" | "markdown" => Ok(Self::Md),
            "mobi" | "prc" => Ok(Self::Mobi),
            "azw3" | "azw" => Ok(Self::Azw3),
            other => Err(DomainError::UnsupportedFormat(other.to_string()).into()),
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Epub => "epub",
            Self::Pdf => "pdf",
            Self::Txt => "txt",
            Self::Md => "md",
            Self::Mobi => "mobi",
            Self::Azw3 => "azw3",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BookStatus {
    Unread,
    Reading,
    Finished,
    Importing,
    Failed,
}

impl BookStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Unread => "unread",
            Self::Reading => "reading",
            Self::Finished => "finished",
            Self::Importing => "importing",
            Self::Failed => "failed",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "reading" => Self::Reading,
            "finished" => Self::Finished,
            "importing" => Self::Importing,
            "failed" | "error" => Self::Failed,
            _ => Self::Unread,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Book {
    pub id: String,
    pub title: String,
    pub author: String,
    pub cover_url: String,
    pub cover_color: String,
    pub isbn: String,
    pub publisher: String,
    pub publish_year: String,
    pub source_type: String,
    pub format: BookFormat,
    pub file_path: String,
    pub file_size: i64,
    pub word_count: i64,
    pub category: String,
    pub library_id: String,
    pub tags: Vec<String>,
    pub status: BookStatus,
    pub import_progress: i64,
    pub import_step: String,
    pub import_error: String,
    pub total_reading_seconds: i64,
    pub last_read_at: String,
    pub description: String,
    pub chapters_count: usize,
    pub created_at: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub progress: Option<crate::domain::entities::reader::ReadingProgress>,
}

impl Book {
    pub fn mark_as_reading(&mut self, now: String) {
        if self.status != BookStatus::Reading && self.status != BookStatus::Finished {
            self.status = BookStatus::Reading;
        }
        self.last_read_at = now;
    }

    pub fn record_reading_session(&mut self, additional_seconds: i64, percentage: f64) {
        self.total_reading_seconds = self.total_reading_seconds.saturating_add(additional_seconds);
        let clamped = percentage.max(0.0).min(100.0);
        let normalized = if clamped > 1.0 { clamped / 100.0 } else { clamped };
        if normalized >= 0.98 {
            self.status = BookStatus::Finished;
        } else if self.status == BookStatus::Finished {
            self.status = BookStatus::Reading;
        }
    }
}
