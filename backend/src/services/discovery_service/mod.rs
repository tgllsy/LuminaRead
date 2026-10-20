pub mod builder;
pub mod downloader;
pub mod http_client;
pub mod network;
pub mod providers;
pub mod sanitizer;
pub mod searcher;

pub use sanitizer::{to_simplified_chinese, to_traditional_chinese};

use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;

use crate::config::AppConfig;
use crate::domain::entities::source::{BookSource, DownloadTask};
use crate::domain::traits::{BookRepository, SearchRepository, SourceRepository};
use crate::error::AppResult;
use crate::infra::db::DbContext;
use crate::services::traits::DiscoveryService;

use downloader::execute_discover_download;
use network::{resolve_effective_proxy, test_source_connection};
use searcher::execute_discover_search;

pub struct DiscoveryServiceImpl {
    #[allow(dead_code)]
    db: DbContext,
    search_repo: Arc<dyn SearchRepository>,
    source_repo: Arc<dyn SourceRepository>,
    book_repo: Arc<dyn BookRepository>,
    config: AppConfig,
}

impl DiscoveryServiceImpl {
    pub fn new(
        db: DbContext,
        search_repo: Arc<dyn SearchRepository>,
        source_repo: Arc<dyn SourceRepository>,
        book_repo: Arc<dyn BookRepository>,
        config: AppConfig,
    ) -> Self {
        Self {
            db,
            search_repo,
            source_repo,
            book_repo,
            config,
        }
    }
}

#[async_trait]
impl DiscoveryService for DiscoveryServiceImpl {
    async fn search_all(&self, q: &str, book_id: Option<&str>, limit: usize) -> AppResult<Value> {
        self.search_repo.search(q, book_id, limit).await
    }

    async fn search_book(&self, book_id: &str, q: &str, limit: usize) -> AppResult<Value> {
        self.search_repo.search(q, Some(book_id), limit).await
    }

    async fn list_sources(&self) -> AppResult<Vec<BookSource>> {
        self.source_repo.list_sources().await
    }

    async fn update_source(
        &self,
        id: &str,
        name: Option<&str>,
        base_url: Option<&str>,
        proxy_url: Option<&str>,
        auth_config: Option<&str>,
        mirror_urls: Option<&str>,
        enabled: Option<i64>,
    ) -> AppResult<BookSource> {
        self.source_repo
            .update_source(id, name, base_url, proxy_url, auth_config, mirror_urls, enabled)
            .await
    }

    async fn test_connection(
        &self,
        source_id: Option<&str>,
        base_url: Option<&str>,
        proxy_url: Option<&str>,
    ) -> AppResult<Value> {
        test_source_connection(self.source_repo.as_ref(), source_id, base_url, proxy_url).await
    }

    async fn discover_search(
        &self,
        q: &str,
        lang: Option<&str>,
        src_id: Option<&str>,
        format: Option<&str>,
    ) -> AppResult<Value> {
        let proxy = resolve_effective_proxy(self.source_repo.as_ref(), None, src_id).await;
        Ok(execute_discover_search(q, lang, src_id, format, &proxy).await)
    }

    async fn discover_download(&self, task_dto: Value) -> AppResult<Value> {
        execute_discover_download(
            task_dto,
            &self.config.books_dir,
            &self.config.covers_dir,
            self.source_repo.as_ref(),
            self.book_repo.as_ref(),
        )
        .await
    }

    async fn discover_tasks(&self) -> AppResult<Vec<DownloadTask>> {
        self.source_repo.list_tasks().await
    }
}
