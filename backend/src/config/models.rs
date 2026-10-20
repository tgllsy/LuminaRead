use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

use super::parser::normalize_api_prefix;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EndpointsConfig {
    pub google_translate_url: String,
    pub mymemory_translate_url: String,
    pub youdao_translate_url: String,
    pub edge_tts_ws_url: String,
    pub google_tts_url: String,
    pub baidu_tts_url: String,
    pub youdao_tts_url: String,
    pub custom_tts_url: String,
    pub default_tts_voice: String,
    pub lifeos_api_url: String,
    pub zlib_url: String,
    pub annas_archive_url: String,
    pub gutenberg_url: String,
    pub openlibrary_url: String,
    pub archive_org_url: String,
    pub standard_opds_url: String,
    pub calibre_opds_url: String,
    pub wikisource_api_url: String,
    pub libgen_url: String,
}

impl Default for EndpointsConfig {
    fn default() -> Self {
        Self {
            google_translate_url: "https://clients5.google.com/translate_a/t".to_string(),
            mymemory_translate_url: "https://api.mymemory.translated.net/get".to_string(),
            youdao_translate_url: "https://fanyi.youdao.com/translate".to_string(),
            edge_tts_ws_url: "wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1".to_string(),
            google_tts_url: "https://translate.google.com/translate_tts".to_string(),
            baidu_tts_url: "https://fanyi.baidu.com/gettts".to_string(),
            youdao_tts_url: "https://dict.youdao.com/dictvoice".to_string(),
            custom_tts_url: String::new(),
            default_tts_voice: "zh-CN-XiaoxiaoNeural".to_string(),
            lifeos_api_url: std::env::var("LIFEOS_API_BASE").unwrap_or_default(),
            zlib_url: "https://z-library.sk".to_string(),
            annas_archive_url: "https://annas-archive.org".to_string(),
            gutenberg_url: "https://gutendex.com".to_string(),
            openlibrary_url: "https://openlibrary.org".to_string(),
            archive_org_url: "https://archive.org".to_string(),
            standard_opds_url: "https://standardebooks.org/opds".to_string(),
            calibre_opds_url: "https://opds.calibre-ebook.com".to_string(),
            wikisource_api_url: "https://zh.wikisource.org/w/api.php".to_string(),
            libgen_url: "https://libgen.li".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConfig {
    pub api_key: String,
    pub api_base_url: String,
    pub model: String,
    pub temperature: f32,
    pub max_tokens: usize,
}

impl Default for AiConfig {
    fn default() -> Self {
        Self {
            api_key: std::env::var("AI_API_KEY").unwrap_or_default(),
            api_base_url: std::env::var("AI_BASE_URL").unwrap_or_else(|_| "https://api.deepseek.com/v1".to_string()),
            model: std::env::var("AI_MODEL").unwrap_or_else(|_| "deepseek-v4-flash".to_string()),
            temperature: 0.7,
            max_tokens: 2048,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub config_file: PathBuf,
    pub host: String,
    pub port: u16,
    pub api_prefix: String,
    pub api_base_url: String,
    pub log_level: String,
    pub max_upload_mb: usize,
    pub max_upload_size: usize,
    pub prefer_external_dist: bool,
    pub root_dir: PathBuf,
    pub data_dir: PathBuf,
    pub dist_dir: PathBuf,
    pub books_dir: PathBuf,
    pub covers_dir: PathBuf,
    pub pdf_cache_dir: PathBuf,
    pub tts_cache_dir: PathBuf,
    pub db_path: PathBuf,
    pub proxy_url: String,
    pub connect_timeout_secs: u64,
    pub request_timeout_secs: u64,
    pub clean_cache_on_start: bool,
    pub reset_db_on_start: bool,
    pub endpoints: EndpointsConfig,
    pub ai: AiConfig,
}

impl AppConfig {
    pub fn default_resolved() -> Self {
        let cur = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        let root_dir = if let Ok(root_env) = std::env::var("ROOT_DIR") {
            PathBuf::from(root_env)
        } else if cur.file_name().and_then(|n| n.to_str()) == Some("backend")
            && cur
                .parent()
                .map(|p| p.join("data").exists() || p.join("config.toml").exists() || p.join("frontend").exists())
                .unwrap_or(false)
        {
            cur.parent().unwrap_or(&cur).to_path_buf()
        } else {
            cur
        };

        let data_dir = root_dir.join("data");
        let dist_dir = root_dir.join("frontend").join("dist");
        let books_dir = data_dir.join("books");
        let covers_dir = data_dir.join("covers");
        let pdf_cache_dir = data_dir.join("pdf_cache");
        let tts_cache_dir = data_dir.join("tts_cache");
        let db_path = data_dir.join("luminaread.db");
        let max_upload_mb = 100;

        Self {
            config_file: root_dir.join("config.toml"),
            host: "0.0.0.0".to_string(),
            port: 3456,
            api_prefix: "/api".to_string(),
            api_base_url: String::new(),
            log_level: "info".to_string(),
            max_upload_mb,
            max_upload_size: max_upload_mb * 1024 * 1024,
            prefer_external_dist: false,
            root_dir,
            data_dir,
            dist_dir,
            books_dir,
            covers_dir,
            pdf_cache_dir,
            tts_cache_dir,
            db_path,
            proxy_url: String::new(),
            connect_timeout_secs: 5,
            request_timeout_secs: 15,
            clean_cache_on_start: false,
            reset_db_on_start: false,
            endpoints: EndpointsConfig::default(),
            ai: AiConfig::default(),
        }
    }

    pub fn recompute_derived_paths(&mut self, explicit_db: Option<PathBuf>) {
        self.api_prefix = normalize_api_prefix(&self.api_prefix);
        self.max_upload_size = self.max_upload_mb.max(1) * 1024 * 1024;
        self.books_dir = self.data_dir.join("books");
        self.covers_dir = self.data_dir.join("covers");
        self.pdf_cache_dir = self.data_dir.join("pdf_cache");
        self.tts_cache_dir = self.data_dir.join("tts_cache");
        if let Some(db) = explicit_db {
            self.db_path = db;
        } else if self.db_path.as_os_str().is_empty()
            || self.db_path == Path::new("data/luminaread.db")
            || self.db_path.ends_with("luminaread.db")
        {
            self.db_path = self.data_dir.join("luminaread.db");
        }
    }

    pub fn remove_db_files(db_path: &Path) {
        let _ = std::fs::remove_file(db_path);
        let wal = PathBuf::from(format!("{}-wal", db_path.display()));
        let shm = PathBuf::from(format!("{}-shm", db_path.display()));
        let _ = std::fs::remove_file(wal);
        let _ = std::fs::remove_file(shm);
    }
}
