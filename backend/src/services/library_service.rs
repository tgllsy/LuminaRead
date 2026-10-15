use async_trait::async_trait;
use std::sync::Arc;
use crate::domain::entities::library::ReadingLibrary;
use crate::domain::traits::LibraryRepository;
use crate::error::AppResult;
use crate::services::traits::LibraryService;

pub struct LibraryServiceImpl {
    repo: Arc<dyn LibraryRepository>,
}

impl LibraryServiceImpl {
    pub fn new(repo: Arc<dyn LibraryRepository>, _config: crate::config::AppConfig) -> Self {
        Self { repo }
    }
}

#[async_trait]
impl LibraryService for LibraryServiceImpl {
    async fn list(&self) -> AppResult<Vec<ReadingLibrary>> {
        self.repo.list().await
    }

    async fn create(&self, name: String, icon: String, color: String, desc: Option<String>) -> AppResult<ReadingLibrary> {
        let id = format!("lib_{}", chrono::Local::now().timestamp_millis());
        let lib = ReadingLibrary {
            id,
            name,
            icon,
            color,
            description: desc,
            sort_order: 0,
            created_at: chrono::Local::now().to_rfc3339(),
            book_count: 0,
        };
        self.repo.create(&lib).await?;
        Ok(lib)
    }

    async fn update(&self, id: &str, name: String, icon: String, color: String, desc: Option<String>) -> AppResult<ReadingLibrary> {
        self.repo.update(id, &name, &icon, &color, desc.as_deref()).await?;
        let list = self.repo.list().await?;
        list.into_iter().find(|l| l.id == id).ok_or_else(|| {
            crate::error::DomainError::ValidationError(format!("藏书阁不存在: {id}")).into()
        })
    }

    async fn delete(&self, id: &str) -> AppResult<()> {
        if id == "lib-default" {
            return Err(crate::error::DomainError::ValidationError("默认藏书馆禁止删除".into()).into());
        }
        self.repo.delete(id).await
    }
}
