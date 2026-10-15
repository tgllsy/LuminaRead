use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use thiserror::Error;

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Error)]
pub enum DomainError {
    #[error("书籍记录不存在: {0}")]
    BookNotFound(String),
    #[error("藏书馆不存在: {0}")]
    LibraryNotFound(String),
    #[error("对话记录不存在: {0}")]
    ConversationNotFound(String),
    #[error("不支持的电子书格式: {0}")]
    UnsupportedFormat(String),
    #[error("分片校验失败: 期望 {expected}, 实际 {actual}")]
    ChunkIndexMismatch { expected: i64, actual: i64 },
    #[error("参数校验失败: {0}")]
    ValidationError(String),
    #[error("实体冲突已存在: {0}")]
    Conflict(String),
}

#[derive(Debug, Error)]
pub enum InfraError {
    #[error("数据库持久化故障: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("存储 IO 异常: {0}")]
    Io(#[from] std::io::Error),
    #[error("文件解码或解析故障: {0}")]
    Parser(String),
    #[error("运行时任务调度挂起: {0}")]
    JoinError(#[from] tokio::task::JoinError),
    #[error("并发锁争用中毒")]
    LockPoisoned,
}

#[derive(Debug, Error)]
pub enum AppError {
    #[error(transparent)]
    Domain(#[from] DomainError),
    #[error(transparent)]
    Infra(#[from] InfraError),
    #[error("系统未预料异常: {0}")]
    Unexpected(#[from] anyhow::Error),
}

#[derive(Serialize)]
pub struct ErrorResponse {
    pub ok: bool,
    pub code: &'static str,
    pub message: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, user_message) = match &self {
            AppError::Domain(DomainError::BookNotFound(msg)) => {
                (StatusCode::NOT_FOUND, "BOOK_NOT_FOUND", msg.clone())
            }
            AppError::Domain(DomainError::LibraryNotFound(msg)) => {
                (StatusCode::NOT_FOUND, "LIBRARY_NOT_FOUND", msg.clone())
            }
            AppError::Domain(DomainError::ConversationNotFound(msg)) => {
                (StatusCode::NOT_FOUND, "CONVERSATION_NOT_FOUND", msg.clone())
            }
            AppError::Domain(DomainError::UnsupportedFormat(msg)) => {
                (StatusCode::BAD_REQUEST, "UNSUPPORTED_FORMAT", msg.clone())
            }
            AppError::Domain(DomainError::ChunkIndexMismatch { expected, actual }) => (
                StatusCode::BAD_REQUEST,
                "CHUNK_MISMATCH",
                format!("分片不匹配，预期 {expected}，实际 {actual}"),
            ),
            AppError::Domain(DomainError::ValidationError(msg)) => {
                (StatusCode::BAD_REQUEST, "VALIDATION_FAILED", msg.clone())
            }
            AppError::Domain(DomainError::Conflict(msg)) => {
                (StatusCode::CONFLICT, "ENTITY_CONFLICT", msg.clone())
            }
            AppError::Infra(err) => {
                tracing::error!(target: "infra_error", error = ?err, "基础设施层故障");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "INTERNAL_STORAGE_ERROR",
                    "数据存储服务暂时不可用，请稍后重试".to_string(),
                )
            }
            AppError::Unexpected(err) => {
                tracing::error!(target: "unexpected_error", error = ?err, "未捕获系统异常");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "INTERNAL_SERVER_ERROR",
                    "系统内部异常".to_string(),
                )
            }
        };

        (
            status,
            Json(ErrorResponse {
                ok: false,
                code,
                message: user_message,
            }),
        )
            .into_response()
    }
}
