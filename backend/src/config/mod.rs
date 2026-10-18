use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{OnceLock, RwLock};

static GLOBAL_CONFIG: OnceLock<RwLock<AppConfig>> = OnceLock::new();

pub fn current_config() -> AppConfig {
    if let Some(lock) = GLOBAL_CONFIG.get() {
        if let Ok(guard) = lock.read() {
            return guard.clone();
        }
    }
    AppConfig::default_resolved()
}

pub fn set_global_config(cfg: AppConfig) {
    if let Some(lock) = GLOBAL_CONFIG.get() {
        if let Ok(mut guard) = lock.write() {
            *guard = cfg;
        }
    } else {
        let _ = GLOBAL_CONFIG.set(RwLock::new(cfg));
    }
}

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
            cur.parent().unwrap().to_path_buf()
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

    pub fn load() -> Self {
        let mut cfg = Self::default_resolved();
        let args: Vec<String> = std::env::args().collect();

        // 1. Pre-scan CLI args for --help, --version, --config, --init-config
        let mut explicit_config_path: Option<PathBuf> = None;
        let mut init_config_target: Option<PathBuf> = None;
        let mut print_config_only = false;

        let mut i = 1;
        while i < args.len() {
            let arg = args[i].as_str();
            match arg {
                "-h" | "--help" => {
                    Self::print_help();
                    std::process::exit(0);
                }
                "-V" | "--version" => {
                    println!("LuminaRead (阅境) v{} — 单文件静态链接生产版 (内嵌前端静态资源)", env!("CARGO_PKG_VERSION"));
                    std::process::exit(0);
                }
                "--print-config" => {
                    print_config_only = true;
                }
                "--init-config" => {
                    if i + 1 < args.len() && !args[i + 1].starts_with('-') {
                        init_config_target = Some(PathBuf::from(&args[i + 1]));
                        i += 1;
                    } else {
                        init_config_target = Some(PathBuf::from("config.toml"));
                    }
                }
                "-c" | "--config" => {
                    if i + 1 < args.len() {
                        explicit_config_path = Some(PathBuf::from(&args[i + 1]));
                        i += 1;
                    }
                }
                _ if arg.starts_with("--config=") => {
                    explicit_config_path = Some(PathBuf::from(arg.trim_start_matches("--config=")));
                }
                _ if arg.starts_with("--init-config=") => {
                    init_config_target = Some(PathBuf::from(arg.trim_start_matches("--init-config=")));
                }
                _ => {}
            }
            i += 1;
        }

        if let Some(target) = init_config_target {
            if let Err(e) = cfg.save_to_toml(&target) {
                eprintln!("生成配置文件失败 ({}): {}", target.display(), e);
                std::process::exit(1);
            }
            println!("已生成默认配置文件: {}", target.display());
            std::process::exit(0);
        }

        // 2. Locate and load config file (explicit -> env -> ./config.toml -> <exe_dir>/config.toml)
        let candidate_paths = if let Some(p) = explicit_config_path {
            vec![p]
        } else if let Ok(env_cfg) = std::env::var("LUMINAREAD_CONFIG").or_else(|_| std::env::var("CONFIG_FILE")) {
            vec![PathBuf::from(env_cfg)]
        } else {
            let mut v = vec![
                cfg.root_dir.join("config.toml"),
                cfg.root_dir.join("luminaread.toml"),
                cfg.root_dir.join("config.json"),
            ];
            if let Ok(exe) = std::env::current_exe() {
                if let Some(exe_dir) = exe.parent() {
                    v.push(exe_dir.join("config.toml"));
                    v.push(exe_dir.join("luminaread.toml"));
                }
            }
            v
        };

        let mut loaded_from_file = false;
        for path in &candidate_paths {
            if path.exists() && path.is_file() {
                cfg.config_file = path.clone();
                if let Ok(content) = std::fs::read_to_string(path) {
                    cfg.apply_file_content(&content);
                    loaded_from_file = true;
                }
                break;
            }
        }

        // Auto-generate default config.toml if none exists yet
        if !loaded_from_file {
            let default_path = cfg.root_dir.join("config.toml");
            let _ = cfg.save_to_toml(&default_path);
            cfg.config_file = default_path;
        }

        // 3. Apply environment variable overrides
        cfg.apply_env_overrides();

        // 4. Apply CLI argument overrides (highest priority)
        let mut custom_db_path: Option<PathBuf> = None;
        let mut custom_data_dir: Option<PathBuf> = None;
        let mut custom_dist_dir: Option<PathBuf> = None;

        let mut j = 1;
        while j < args.len() {
            let arg = args[j].as_str();
            let next_val = |idx: &mut usize| -> Option<String> {
                if *idx + 1 < args.len() {
                    *idx += 1;
                    Some(args[*idx].clone())
                } else {
                    None
                }
            };

            let (key, val_opt): (&str, Option<String>) = if let Some((k, v)) = arg.split_once('=') {
                (k, Some(v.to_string()))
            } else {
                (arg, None)
            };

            match key {
                "-H" | "--host" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        cfg.host = v;
                    }
                }
                "-p" | "--port" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        if let Ok(port) = v.parse::<u16>() {
                            cfg.port = port;
                        }
                    }
                }
                "-b" | "--bind" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        if let Some((h, p_str)) = v.rsplit_once(':') {
                            if !h.is_empty() {
                                cfg.host = h.to_string();
                            }
                            if let Ok(port) = p_str.parse::<u16>() {
                                cfg.port = port;
                            }
                        } else if let Ok(port) = v.parse::<u16>() {
                            cfg.port = port;
                        } else {
                            cfg.host = v;
                        }
                    }
                }
                "--api-prefix" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        cfg.api_prefix = normalize_api_prefix(&v);
                    }
                }
                "--api-base-url" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        cfg.api_base_url = v.trim_end_matches('/').to_string();
                    }
                }
                "-d" | "--data-dir" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        custom_data_dir = Some(PathBuf::from(v));
                    }
                }
                "--db-path" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        custom_db_path = Some(PathBuf::from(v));
                    }
                }
                "--dist-dir" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        custom_dist_dir = Some(PathBuf::from(v));
                        cfg.prefer_external_dist = true;
                    }
                }
                "--prefer-external-dist" => {
                    cfg.prefer_external_dist = val_opt
                        .map(|v| parse_bool(&v))
                        .unwrap_or(true);
                }
                "--proxy" | "--proxy-url" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        cfg.proxy_url = if v.eq_ignore_ascii_case("none") || v.eq_ignore_ascii_case("off") {
                            String::new()
                        } else {
                            v
                        };
                    }
                }
                "--google-translate-url" | "--translate-endpoint" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        cfg.endpoints.google_translate_url = v;
                    }
                }
                "--mymemory-translate-url" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        cfg.endpoints.mymemory_translate_url = v;
                    }
                }
                "--youdao-translate-url" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        cfg.endpoints.youdao_translate_url = v;
                    }
                }
                "--edge-tts-url" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        cfg.endpoints.edge_tts_ws_url = v;
                    }
                }
                "--google-tts-url" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        cfg.endpoints.google_tts_url = v;
                    }
                }
                "--baidu-tts-url" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        cfg.endpoints.baidu_tts_url = v;
                    }
                }
                "--youdao-tts-url" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        cfg.endpoints.youdao_tts_url = v;
                    }
                }
                "--tts-endpoint" | "--custom-tts-url" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        cfg.endpoints.custom_tts_url = v;
                    }
                }
                "--default-voice" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        cfg.endpoints.default_tts_voice = v;
                    }
                }
                "--lifeos-endpoint" | "--lifeos-api-url" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        cfg.endpoints.lifeos_api_url = v;
                    }
                }
                "--zlib-url" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        cfg.endpoints.zlib_url = v;
                    }
                }
                "--annas-url" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        cfg.endpoints.annas_archive_url = v;
                    }
                }
                "--gutenberg-url" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        cfg.endpoints.gutenberg_url = v;
                    }
                }
                "--openlibrary-url" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        cfg.endpoints.openlibrary_url = v;
                    }
                }
                "--archive-url" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        cfg.endpoints.archive_org_url = v;
                    }
                }
                "--max-upload-mb" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        if let Ok(mb) = v.parse::<usize>() {
                            cfg.max_upload_mb = mb.max(1);
                        }
                    }
                }
                "--log-level" => {
                    if let Some(v) = val_opt.or_else(|| next_val(&mut j)) {
                        cfg.log_level = v;
                    }
                }
                "--clean-cache" | "--clear-cache" => {
                    cfg.clean_cache_on_start = true;
                }
                "--reset-db" | "--clean-db" => {
                    cfg.reset_db_on_start = true;
                }
                _ => {}
            }
            j += 1;
        }

        if let Some(d) = custom_data_dir {
            cfg.data_dir = d;
        }
        if let Some(dist) = custom_dist_dir {
            cfg.dist_dir = dist;
        }

        cfg.recompute_derived_paths(custom_db_path);

        if print_config_only {
            println!("{}", cfg.to_toml_string());
            std::process::exit(0);
        }

        // Cleanup any legacy trash cache directory if present
        let trash_dir = cfg.data_dir.join(".trash_pdf_cache");
        if trash_dir.exists() {
            let _ = std::fs::remove_dir_all(&trash_dir);
        }

        if cfg.reset_db_on_start {
            Self::remove_db_files(&cfg.db_path);
        }

        if cfg.clean_cache_on_start {
            let _ = std::fs::remove_dir_all(&cfg.pdf_cache_dir);
            let _ = std::fs::remove_dir_all(&cfg.tts_cache_dir);
        }

        for dir in [&cfg.books_dir, &cfg.covers_dir, &cfg.pdf_cache_dir, &cfg.tts_cache_dir] {
            let _ = std::fs::create_dir_all(dir);
        }

        set_global_config(cfg.clone());
        cfg
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

    fn apply_env_overrides(&mut self) {
        if let Ok(h) = std::env::var("HOST") {
            if !h.trim().is_empty() {
                self.host = h;
            }
        }
        if let Ok(p) = std::env::var("PORT") {
            if let Ok(port) = p.parse::<u16>() {
                self.port = port;
            }
        }
        if let Ok(ap) = std::env::var("API_PREFIX") {
            if !ap.trim().is_empty() {
                self.api_prefix = normalize_api_prefix(&ap);
            }
        }
        if let Ok(ab) = std::env::var("API_BASE_URL") {
            self.api_base_url = ab.trim_end_matches('/').to_string();
        }
        if let Ok(data_env) = std::env::var("DATA_DIR") {
            if !data_env.trim().is_empty() {
                self.data_dir = PathBuf::from(data_env);
            }
        }
        if let Ok(db_env) = std::env::var("DB_PATH") {
            if !db_env.trim().is_empty() {
                self.db_path = PathBuf::from(db_env);
            }
        }
        if let Ok(dist_env) = std::env::var("DIST_DIR") {
            if !dist_env.trim().is_empty() {
                self.dist_dir = PathBuf::from(dist_env);
                self.prefer_external_dist = true;
            }
        }
        if let Ok(proxy) = std::env::var("HTTPS_PROXY")
            .or_else(|_| std::env::var("HTTP_PROXY"))
            .or_else(|_| std::env::var("https_proxy"))
            .or_else(|_| std::env::var("http_proxy"))
        {
            if !proxy.trim().is_empty() {
                self.proxy_url = proxy.trim().to_string();
            }
        }
        if let Ok(lifeos) = std::env::var("LIFEOS_API_BASE") {
            if !lifeos.trim().is_empty() {
                self.endpoints.lifeos_api_url = lifeos.trim().to_string();
            }
        }
        if let Ok(mb) = std::env::var("MAX_UPLOAD_MB") {
            if let Ok(v) = mb.parse::<usize>() {
                self.max_upload_mb = v.max(1);
            }
        }
    }

    fn apply_file_content(&mut self, content: &str) {
        let trimmed = content.trim();
        if trimmed.is_empty() {
            return;
        }
        // Support JSON config files
        if trimmed.starts_with('{') {
            if let Ok(val) = serde_json::from_str::<Value>(trimmed) {
                self.apply_json_patch(&val);
                return;
            }
        }
        // Parse TOML / INI style config
        let kv = parse_simple_toml(trimmed);
        let mut explicit_db: Option<PathBuf> = None;

        for (k, v) in kv {
            let key = k.as_str();
            match key {
                "host" | "server.host" => self.host = v,
                "port" | "server.port" => {
                    if let Ok(p) = v.parse::<u16>() {
                        self.port = p;
                    }
                }
                "api_prefix" | "server.api_prefix" => self.api_prefix = normalize_api_prefix(&v),
                "api_base_url" | "server.api_base_url" => self.api_base_url = v.trim_end_matches('/').to_string(),
                "log_level" | "server.log_level" => self.log_level = v,
                "max_upload_mb" | "server.max_upload_mb" => {
                    if let Ok(mb) = v.parse::<usize>() {
                        self.max_upload_mb = mb.max(1);
                    }
                }
                "prefer_external_dist" | "server.prefer_external_dist" => {
                    self.prefer_external_dist = parse_bool(&v);
                }
                "data_dir" | "storage.data_dir" => {
                    if !v.is_empty() {
                        let p = PathBuf::from(&v);
                        self.data_dir = if p.is_absolute() || self.root_dir == Path::new(".") {
                            p
                        } else {
                            self.root_dir.join(p)
                        };
                    }
                }
                "db_path" | "storage.db_path" => {
                    if !v.is_empty() {
                        explicit_db = Some(PathBuf::from(v));
                    }
                }
                "dist_dir" | "storage.dist_dir" => {
                    if !v.is_empty() {
                        self.dist_dir = PathBuf::from(v);
                    }
                }
                "proxy_url" | "network.proxy_url" => self.proxy_url = v,
                "connect_timeout_secs" | "network.connect_timeout_secs" => {
                    if let Ok(secs) = v.parse::<u64>() {
                        self.connect_timeout_secs = secs.max(1);
                    }
                }
                "request_timeout_secs" | "network.request_timeout_secs" => {
                    if let Ok(secs) = v.parse::<u64>() {
                        self.request_timeout_secs = secs.max(1);
                    }
                }
                "google_translate_url" | "endpoints.google_translate_url" => self.endpoints.google_translate_url = v,
                "mymemory_translate_url" | "endpoints.mymemory_translate_url" => self.endpoints.mymemory_translate_url = v,
                "youdao_translate_url" | "endpoints.youdao_translate_url" => self.endpoints.youdao_translate_url = v,
                "edge_tts_ws_url" | "endpoints.edge_tts_ws_url" => self.endpoints.edge_tts_ws_url = v,
                "google_tts_url" | "endpoints.google_tts_url" => self.endpoints.google_tts_url = v,
                "baidu_tts_url" | "endpoints.baidu_tts_url" => self.endpoints.baidu_tts_url = v,
                "youdao_tts_url" | "endpoints.youdao_tts_url" => self.endpoints.youdao_tts_url = v,
                "custom_tts_url" | "endpoints.custom_tts_url" => self.endpoints.custom_tts_url = v,
                "default_tts_voice" | "endpoints.default_tts_voice" => self.endpoints.default_tts_voice = v,
                "lifeos_api_url" | "endpoints.lifeos_api_url" => self.endpoints.lifeos_api_url = v,
                "zlib_url" | "endpoints.zlib_url" => self.endpoints.zlib_url = v,
                "annas_archive_url" | "endpoints.annas_archive_url" => self.endpoints.annas_archive_url = v,
                "gutenberg_url" | "endpoints.gutenberg_url" => self.endpoints.gutenberg_url = v,
                "openlibrary_url" | "endpoints.openlibrary_url" => self.endpoints.openlibrary_url = v,
                "archive_org_url" | "endpoints.archive_org_url" => self.endpoints.archive_org_url = v,
                "standard_opds_url" | "endpoints.standard_opds_url" => self.endpoints.standard_opds_url = v,
                "calibre_opds_url" | "endpoints.calibre_opds_url" => self.endpoints.calibre_opds_url = v,
                "wikisource_api_url" | "endpoints.wikisource_api_url" => self.endpoints.wikisource_api_url = v,
                "libgen_url" | "endpoints.libgen_url" => self.endpoints.libgen_url = v,
                "ai_api_key" | "ai.api_key" => self.ai.api_key = v,
                "ai_base_url" | "ai.api_base_url" => self.ai.api_base_url = v.trim_end_matches('/').to_string(),
                "ai_model" | "ai.model" => self.ai.model = v,
                "ai_temperature" | "ai.temperature" => {
                    if let Ok(temp) = v.parse::<f32>() {
                        self.ai.temperature = temp;
                    }
                }
                "ai_max_tokens" | "ai.max_tokens" => {
                    if let Ok(tok) = v.parse::<usize>() {
                        self.ai.max_tokens = tok;
                    }
                }
                _ => {}
            }
        }
        self.recompute_derived_paths(explicit_db);
    }

    pub fn apply_json_patch(&mut self, patch: &Value) {
        let get_str = |obj: &Value, key: &str| obj.get(key).and_then(|v| v.as_str()).map(|s| s.to_string());
        let get_u64 = |obj: &Value, key: &str| obj.get(key).and_then(|v| v.as_u64());
        let _get_bool = |obj: &Value, key: &str| obj.get(key).and_then(|v| v.as_bool());

        let srv = patch.get("server").unwrap_or(patch);
        if let Some(v) = get_str(srv, "host") { self.host = v; }
        if let Some(v) = get_u64(srv, "port") { self.port = v as u16; }
        if let Some(v) = get_str(srv, "api_prefix") { self.api_prefix = normalize_api_prefix(&v); }
        if let Some(v) = get_str(srv, "api_base_url") { self.api_base_url = v.trim_end_matches('/').to_string(); }
        if let Some(v) = get_str(srv, "log_level") { self.log_level = v; }
        if let Some(v) = get_u64(srv, "max_upload_mb") { self.max_upload_mb = (v as usize).max(1); }
        // Security (SEC-01): Do not allow unauthenticated runtime HTTP JSON patches to repoint
        // host filesystem directories (data_dir, db_path, dist_dir) or enable external root static serving.
        let explicit_db: Option<PathBuf> = None;

        let net = patch.get("network").unwrap_or(patch);
        if let Some(v) = get_str(net, "proxy_url") { self.proxy_url = v; }
        if let Some(v) = get_u64(net, "connect_timeout_secs") { self.connect_timeout_secs = v.max(1); }
        if let Some(v) = get_u64(net, "request_timeout_secs") { self.request_timeout_secs = v.max(1); }

        let ep = patch.get("endpoints").unwrap_or(patch);
        if let Some(v) = get_str(ep, "google_translate_url") { self.endpoints.google_translate_url = v; }
        if let Some(v) = get_str(ep, "mymemory_translate_url") { self.endpoints.mymemory_translate_url = v; }
        if let Some(v) = get_str(ep, "youdao_translate_url") { self.endpoints.youdao_translate_url = v; }
        if let Some(v) = get_str(ep, "edge_tts_ws_url") { self.endpoints.edge_tts_ws_url = v; }
        if let Some(v) = get_str(ep, "google_tts_url") { self.endpoints.google_tts_url = v; }
        if let Some(v) = get_str(ep, "baidu_tts_url") { self.endpoints.baidu_tts_url = v; }
        if let Some(v) = get_str(ep, "youdao_tts_url") { self.endpoints.youdao_tts_url = v; }
        if let Some(v) = get_str(ep, "custom_tts_url") { self.endpoints.custom_tts_url = v; }
        if let Some(v) = get_str(ep, "default_tts_voice") { self.endpoints.default_tts_voice = v; }
        if let Some(v) = get_str(ep, "lifeos_api_url") { self.endpoints.lifeos_api_url = v; }
        if let Some(v) = get_str(ep, "zlib_url") { self.endpoints.zlib_url = v; }
        if let Some(v) = get_str(ep, "annas_archive_url") { self.endpoints.annas_archive_url = v; }
        if let Some(v) = get_str(ep, "gutenberg_url") { self.endpoints.gutenberg_url = v; }
        if let Some(v) = get_str(ep, "openlibrary_url") { self.endpoints.openlibrary_url = v; }
        if let Some(v) = get_str(ep, "archive_org_url") { self.endpoints.archive_org_url = v; }
        if let Some(v) = get_str(ep, "standard_opds_url") { self.endpoints.standard_opds_url = v; }
        if let Some(v) = get_str(ep, "calibre_opds_url") { self.endpoints.calibre_opds_url = v; }
        if let Some(v) = get_str(ep, "wikisource_api_url") { self.endpoints.wikisource_api_url = v; }
        if let Some(v) = get_str(ep, "libgen_url") { self.endpoints.libgen_url = v; }

        let ai = patch.get("ai").unwrap_or(patch);
        if let Some(v) = get_str(ai, "api_key") { self.ai.api_key = v; }
        if let Some(v) = get_str(ai, "api_base_url") { self.ai.api_base_url = v.trim_end_matches('/').to_string(); }
        if let Some(v) = get_str(ai, "model") { self.ai.model = v; }
        if let Some(v) = ai.get("temperature").and_then(|v| v.as_f64()) { self.ai.temperature = v as f32; }
        if let Some(v) = ai.get("max_tokens").and_then(|v| v.as_u64()) { self.ai.max_tokens = v as usize; }

        self.recompute_derived_paths(explicit_db);
    }

    pub fn to_toml_string(&self) -> String {
        format!(
r#"# ============================================================================
# LuminaRead (阅境) 生产环境配置文件
# 启动方式: ./luminaread -c config.toml (默认自动加载当前目录或程序同级 config.toml)
# 查看命令行参数: ./luminaread --help
# ============================================================================

[server]
# 监听网卡地址 (0.0.0.0 允许局域网/远程访问，127.0.0.1 仅限本机访问)
host = "{host}"
# 监听端口
port = {port}
# 后端 HTTP API 路由前缀 (默认 "/api"，可修改为如 "/v1/api")
api_prefix = "{api_prefix}"
# 前端请求后端的基准 URL (默认留空表示同源访问，前后端分离时可填如 "http://127.0.0.1:3456")
api_base_url = "{api_base_url}"
# 日志级别: trace | debug | info | warn | error
log_level = "{log_level}"
# 单次最大上传文件体积限制 (单位: MB)
max_upload_mb = {max_upload_mb}
# 是否优先读取外部 dist_dir 静态目录 (false = 默认使用编译内嵌的前端静态资源)
prefer_external_dist = {prefer_external_dist}

[storage]
# 数据存储根目录
data_dir = "{data_dir}"
# SQLite 数据库文件路径 (留空则默认使用 <data_dir>/luminaread.db)
db_path = "{db_path}"
# 外部前端静态文件目录 (仅当 prefer_external_dist = true 时生效)
dist_dir = "{dist_dir}"

[network]
# 外部请求 HTTP/HTTPS 代理接口地址 (用于 Google 翻译、外网书源检索等，无需代理可设为空 "")
proxy_url = "{proxy_url}"
# 网络连接超时时间 (秒)
connect_timeout_secs = {connect_timeout_secs}
# 请求最大超时时间 (秒)
request_timeout_secs = {request_timeout_secs}

[endpoints]
# --- 翻译服务接口 ---
google_translate_url = "{google_translate_url}"
mymemory_translate_url = "{mymemory_translate_url}"
youdao_translate_url = "{youdao_translate_url}"

# --- TTS 语音合成服务接口 ---
edge_tts_ws_url = "{edge_tts_ws_url}"
google_tts_url = "{google_tts_url}"
baidu_tts_url = "{baidu_tts_url}"
youdao_tts_url = "{youdao_tts_url}"
custom_tts_url = "{custom_tts_url}"
default_tts_voice = "{default_tts_voice}"

# --- 外部知识库联动接口 ---
lifeos_api_url = "{lifeos_api_url}"

# --- 开放书源检索接口 ---
zlib_url = "{zlib_url}"
annas_archive_url = "{annas_archive_url}"
gutenberg_url = "{gutenberg_url}"
openlibrary_url = "{openlibrary_url}"
archive_org_url = "{archive_org_url}"
standard_opds_url = "{standard_opds_url}"
calibre_opds_url = "{calibre_opds_url}"
wikisource_api_url = "{wikisource_api_url}"
libgen_url = "{libgen_url}"

[ai]
# DeepSeek / OpenAI 兼容 API 配置 (真实大模型伴读推演)
api_key = "{ai_api_key}"
api_base_url = "{ai_base_url}"
model = "{ai_model}"
temperature = {ai_temperature}
max_tokens = {ai_max_tokens}
"#,
            host = self.host,
            port = self.port,
            api_prefix = self.api_prefix,
            api_base_url = self.api_base_url,
            log_level = self.log_level,
            max_upload_mb = self.max_upload_mb,
            prefer_external_dist = self.prefer_external_dist,
            data_dir = escape_toml_str(&self.data_dir.to_string_lossy()),
            db_path = escape_toml_str(&self.db_path.to_string_lossy()),
            dist_dir = escape_toml_str(&self.dist_dir.to_string_lossy()),
            proxy_url = escape_toml_str(&self.proxy_url),
            connect_timeout_secs = self.connect_timeout_secs,
            request_timeout_secs = self.request_timeout_secs,
            google_translate_url = self.endpoints.google_translate_url,
            mymemory_translate_url = self.endpoints.mymemory_translate_url,
            youdao_translate_url = self.endpoints.youdao_translate_url,
            edge_tts_ws_url = self.endpoints.edge_tts_ws_url,
            google_tts_url = self.endpoints.google_tts_url,
            baidu_tts_url = self.endpoints.baidu_tts_url,
            youdao_tts_url = self.endpoints.youdao_tts_url,
            custom_tts_url = self.endpoints.custom_tts_url,
            default_tts_voice = self.endpoints.default_tts_voice,
            lifeos_api_url = self.endpoints.lifeos_api_url,
            zlib_url = self.endpoints.zlib_url,
            annas_archive_url = self.endpoints.annas_archive_url,
            gutenberg_url = self.endpoints.gutenberg_url,
            openlibrary_url = self.endpoints.openlibrary_url,
            archive_org_url = self.endpoints.archive_org_url,
            standard_opds_url = self.endpoints.standard_opds_url,
            calibre_opds_url = self.endpoints.calibre_opds_url,
            wikisource_api_url = self.endpoints.wikisource_api_url,
            libgen_url = self.endpoints.libgen_url,
            ai_api_key = escape_toml_str(&self.ai.api_key),
            ai_base_url = escape_toml_str(&self.ai.api_base_url),
            ai_model = escape_toml_str(&self.ai.model),
            ai_temperature = self.ai.temperature,
            ai_max_tokens = self.ai.max_tokens,
        )
    }

    pub fn save_to_toml(&self, path: &Path) -> std::io::Result<()> {
        if let Some(parent) = path.parent() {
            if !parent.as_os_str().is_empty() {
                std::fs::create_dir_all(parent).ok();
            }
        }
        std::fs::write(path, self.to_toml_string())
    }

    pub fn print_help() {
        println!(
r#"LuminaRead (阅境) v{version} — 单二进制静态链接生产程序 (内嵌前端资源)

用法 (USAGE):
    ./luminaread [OPTIONS]

核心选项 (CORE OPTIONS):
    -c, --config <FILE>              指定配置文件路径 (默认自动加载 ./config.toml)
        --init-config [FILE]         生成带完整注释的默认配置文件 (默认 ./config.toml) 并退出
        --print-config               打印当前生效的完整配置内容并退出
    -H, --host <HOST>                监听网卡地址 (默认: 0.0.0.0)
    -p, --port <PORT>                监听端口 (默认: 3456)
    -b, --bind <HOST:PORT>           直接指定监听地址与端口 (例如: 0.0.0.0:8080)
        --api-prefix <PREFIX>        修改后端 HTTP API 路由前缀 (默认: /api)
        --api-base-url <URL>         修改前端请求后端的基准地址 (默认同源)
    -d, --data-dir <DIR>             数据存储目录 (默认: ./data)
        --db-path <FILE>             SQLite 数据库文件路径 (默认: <data-dir>/luminaread.db)
        --dist-dir <DIR>             指定外部前端静态目录覆盖内置前端资源
        --max-upload-mb <MB>         最大单次上传文件大小 MB (默认: 100)
        --log-level <LEVEL>          日志级别: trace | debug | info | warn | error (默认: info)

接口与网络配置参数 (INTERFACE & ENDPOINT OPTIONS):
        --proxy <URL>                设置外部请求 HTTP/HTTPS 代理 (传 "none" 禁用代理)
        --translate-endpoint <URL>   修改主翻译服务接口 URL
        --mymemory-translate-url <U> 修改 MyMemory 备用翻译接口 URL
        --youdao-translate-url <URL> 修改有道翻译接口 URL
        --edge-tts-url <URL>         修改微软 Edge Neural TTS WebSocket 接口 URL
        --google-tts-url <URL>       修改 Google TTS 备用接口 URL
        --baidu-tts-url <URL>        修改百度 TTS 备用接口 URL
        --youdao-tts-url <URL>       修改有道 TTS 备用接口 URL
        --tts-endpoint <URL>         设置自定义 TTS 语音合成服务接口 URL
        --default-voice <VOICE>      设置默认 TTS 朗读音色 (默认: zh-CN-XiaoxiaoNeural)
        --lifeos-endpoint <URL>      修改 LifeOS 导出联动接口 URL
        --zlib-url <URL>             修改 Z-Library 默认书源接口 URL
        --annas-url <URL>            修改 Anna's Archive 默认书源接口 URL
        --gutenberg-url <URL>        修改 Project Gutenberg 默认书源接口 URL
        --openlibrary-url <URL>      修改 OpenLibrary 默认书源接口 URL
        --archive-url <URL>          修改 Internet Archive 默认书源接口 URL

数据与缓存清理选项 (MAINTENANCE OPTIONS):
        --clean-cache                启动前清理所有缓存目录 (pdf_cache, tts_cache)
        --reset-db                   启动前删除旧数据库并重新初始化表结构
    -h, --help                       显示此帮助信息
    -V, --version                    显示版本信息
"#,
            version = env!("CARGO_PKG_VERSION")
        );
    }
}

pub fn update_global_config(patch: &Value) -> Result<AppConfig, String> {
    let mut cfg = current_config();
    cfg.apply_json_patch(patch);
    if let Err(e) = cfg.save_to_toml(&cfg.config_file) {
        tracing::warn!("持久化配置文件失败 ({}): {}", cfg.config_file.display(), e);
    }
    set_global_config(cfg.clone());
    Ok(cfg)
}

fn normalize_api_prefix(raw: &str) -> String {
    let t = raw.trim().trim_end_matches('/');
    if t.is_empty() || t == "/" {
        "/api".to_string()
    } else if t.starts_with('/') {
        t.to_string()
    } else {
        format!("/{}", t)
    }
}

fn parse_bool(s: &str) -> bool {
    matches!(
        s.trim().to_ascii_lowercase().as_str(),
        "true" | "1" | "yes" | "on"
    )
}

fn parse_simple_toml(content: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    let mut section = String::new();

    for raw_line in content.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') || line.starts_with(';') {
            continue;
        }
        if line.starts_with('[') && line.ends_with(']') {
            section = line[1..line.len() - 1].trim().to_string();
            continue;
        }
        if let Some((raw_k, raw_v)) = line.split_once('=') {
            let key = raw_k.trim();
            if key.is_empty() {
                continue;
            }
            let val = clean_toml_value(raw_v);
            if !section.is_empty() {
                map.insert(format!("{}.{}", section, key), val);
            } else {
                map.insert(key.to_string(), val);
            }
        }
    }
    map
}

fn escape_toml_str(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

fn clean_toml_value(raw: &str) -> String {
    let t = raw.trim();
    if let Some(stripped) = t.strip_prefix('"') {
        let mut out = String::new();
        let mut escaped = false;
        for ch in stripped.chars() {
            if escaped {
                out.push(ch);
                escaped = false;
            } else if ch == '\\' {
                escaped = true;
            } else if ch == '"' {
                return out;
            } else {
                out.push(ch);
            }
        }
        return out;
    }
    if let Some(stripped) = t.strip_prefix('\'') {
        if let Some(end_quote) = stripped.find('\'') {
            return stripped[..end_quote].to_string();
        }
    }
    // Strip inline comment for unquoted values
    let without_comment = t.split('#').next().unwrap_or(t).trim();
    without_comment.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_toml_section_isolation() {
        let toml_str = r#"
[server]
host = "0.0.0.0"
port = 3456
api_base_url = ""

[ai]
api_key = "sk-test"
api_base_url = "https://api.deepseek.com/v1"
model = "deepseek-v4-flash"
"#;
        let mut cfg = AppConfig::default_resolved();
        cfg.apply_file_content(toml_str);

        assert_eq!(cfg.api_base_url, "");
        assert_eq!(cfg.ai.api_base_url, "https://api.deepseek.com/v1");
        assert_eq!(cfg.ai.api_key, "sk-test");
    }
}
