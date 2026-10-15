use std::sync::Arc;
use crate::config::AppConfig;
use crate::domain::traits::*;
use crate::infra::db::*;
use crate::services::*;

#[derive(Clone)]
pub struct AppState {
    pub book_service: Arc<dyn BookService>,
    pub reader_service: Arc<dyn ReaderService>,
    pub library_service: Arc<dyn LibraryService>,
    pub ai_service: Arc<dyn AiService>,
    pub tts_service: Arc<dyn TtsService>,
    pub discovery_service: Arc<dyn DiscoveryService>,
    pub config: AppConfig,
}

impl AppState {
    pub fn new(db: DbContext, config: AppConfig) -> Self {
        let book_repo: Arc<dyn BookRepository> = Arc::new(SqliteBookRepository::new(db.clone()));
        let reader_repo: Arc<dyn ReaderRepository> = Arc::new(SqliteReaderRepository::new(db.clone()));
        let library_repo: Arc<dyn LibraryRepository> = Arc::new(SqliteLibraryRepository::new(db.clone()));
        let conv_repo: Arc<dyn ConversationRepository> = Arc::new(SqliteConversationRepository::new(db.clone()));
        let source_repo: Arc<dyn SourceRepository> = Arc::new(SqliteSourceRepository::new(db.clone()));
        let search_repo: Arc<dyn SearchRepository> = Arc::new(SqliteSearchRepository::new(db.clone()));

        let book_service = Arc::new(BookServiceImpl::new(db.clone(), Arc::clone(&book_repo), Arc::clone(&reader_repo), config.clone()));
        let reader_service = Arc::new(ReaderServiceImpl::new(Arc::clone(&reader_repo), Arc::clone(&book_repo)));
        let library_service = Arc::new(LibraryServiceImpl::new(Arc::clone(&library_repo), config.clone()));
        let ai_service = Arc::new(AiServiceImpl::new(db.clone(), Arc::clone(&conv_repo), Arc::clone(&book_repo)));
        let tts_service = Arc::new(TtsServiceImpl::new(db.clone(), config.clone()));
        let discovery_service = Arc::new(DiscoveryServiceImpl::new(db, Arc::clone(&search_repo), Arc::clone(&source_repo), Arc::clone(&book_repo), config.clone()));

        Self {
            book_service,
            reader_service,
            library_service,
            ai_service,
            tts_service,
            discovery_service,
            config,
        }
    }
}
