pub mod cli;
pub mod models;
pub mod parser;
pub mod serializer;

pub use models::{AiConfig, AppConfig, EndpointsConfig};
pub use serializer::to_toml_string;

use std::path::PathBuf;
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

pub fn update_global_config(patch: &serde_json::Value) -> Result<AppConfig, String> {
    let mut cfg = current_config();
    cfg.apply_json_patch(patch);
    if let Err(e) = cfg.save_to_toml(&cfg.config_file) {
        tracing::warn!("持久化配置文件失败 ({}): {}", cfg.config_file.display(), e);
    }
    set_global_config(cfg.clone());
    Ok(cfg)
}

impl AppConfig {
    pub fn load() -> Self {
        let mut cfg = Self::default_resolved();
        let args: Vec<String> = std::env::args().collect();

        let (explicit_config_path, print_config_only) = match cli::handle_early_cli_flags(&args, &cfg) {
            Some(cli::CliActionResult::ExitSuccess) => std::process::exit(0),
            Some(cli::CliActionResult::ExitError(err)) => {
                eprintln!("{}", err);
                std::process::exit(1);
            }
            Some(cli::CliActionResult::Continue { explicit_config, print_config_only, .. }) => {
                (explicit_config, print_config_only)
            }
            None => (None, false),
        };

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
                    serializer::apply_file_content(&mut cfg, &content);
                    loaded_from_file = true;
                }
                break;
            }
        }

        if !loaded_from_file {
            let default_path = cfg.root_dir.join("config.toml");
            let _ = serializer::save_to_toml(&cfg, &default_path);
            cfg.config_file = default_path;
        }

        serializer::apply_env_overrides(&mut cfg);

        let mut custom_data_dir = None;
        let mut custom_dist_dir = None;
        let mut custom_db_path = None;
        cli::apply_cli_overrides(&mut cfg, &args, &mut custom_data_dir, &mut custom_dist_dir, &mut custom_db_path);

        if let Some(d) = custom_data_dir { cfg.data_dir = d; }
        if let Some(dist) = custom_dist_dir { cfg.dist_dir = dist; }
        cfg.recompute_derived_paths(custom_db_path);

        if print_config_only {
            println!("{}", serializer::to_toml_string(&cfg));
            std::process::exit(0);
        }

        let trash_dir = cfg.data_dir.join(".trash_pdf_cache");
        if trash_dir.exists() { let _ = std::fs::remove_dir_all(&trash_dir); }
        if cfg.reset_db_on_start { Self::remove_db_files(&cfg.db_path); }
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

    pub fn to_toml_string(&self) -> String {
        serializer::to_toml_string(self)
    }

    pub fn save_to_toml(&self, path: &std::path::Path) -> std::io::Result<()> {
        serializer::save_to_toml(self, path)
    }

    pub fn apply_file_content(&mut self, content: &str) {
        serializer::apply_file_content(self, content);
    }

    pub fn apply_json_patch(&mut self, patch: &serde_json::Value) {
        serializer::apply_json_patch(self, patch);
    }
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
