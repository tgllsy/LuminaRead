use serde_json::Value;
use std::path::{Path, PathBuf};

use super::models::AppConfig;
use super::parser::{escape_toml_str, normalize_api_prefix, parse_bool, parse_simple_toml};

pub fn apply_env_overrides(cfg: &mut AppConfig) {
    if let Ok(h) = std::env::var("HOST") {
        if !h.trim().is_empty() { cfg.host = h; }
    }
    if let Ok(p) = std::env::var("PORT") {
        if let Ok(port) = p.parse::<u16>() { cfg.port = port; }
    }
    if let Ok(ap) = std::env::var("API_PREFIX") {
        if !ap.trim().is_empty() { cfg.api_prefix = normalize_api_prefix(&ap); }
    }
    if let Ok(ab) = std::env::var("API_BASE_URL") {
        cfg.api_base_url = ab.trim_end_matches('/').to_string();
    }
    if let Ok(data_env) = std::env::var("DATA_DIR") {
        if !data_env.trim().is_empty() { cfg.data_dir = PathBuf::from(data_env); }
    }
    if let Ok(db_env) = std::env::var("DB_PATH") {
        if !db_env.trim().is_empty() { cfg.db_path = PathBuf::from(db_env); }
    }
    if let Ok(dist_env) = std::env::var("DIST_DIR") {
        if !dist_env.trim().is_empty() {
            cfg.dist_dir = PathBuf::from(dist_env);
            cfg.prefer_external_dist = true;
        }
    }
    if let Ok(proxy) = std::env::var("HTTPS_PROXY")
        .or_else(|_| std::env::var("HTTP_PROXY"))
        .or_else(|_| std::env::var("https_proxy"))
        .or_else(|_| std::env::var("http_proxy"))
    {
        if !proxy.trim().is_empty() { cfg.proxy_url = proxy.trim().to_string(); }
    }
    if let Ok(lifeos) = std::env::var("LIFEOS_API_BASE") {
        if !lifeos.trim().is_empty() { cfg.endpoints.lifeos_api_url = lifeos.trim().to_string(); }
    }
    if let Ok(mb) = std::env::var("MAX_UPLOAD_MB") {
        if let Ok(v) = mb.parse::<usize>() { cfg.max_upload_mb = v.max(1); }
    }
}

pub fn apply_file_content(cfg: &mut AppConfig, content: &str) {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return;
    }
    if trimmed.starts_with('{') {
        if let Ok(val) = serde_json::from_str::<Value>(trimmed) {
            apply_json_patch(cfg, &val);
            return;
        }
    }
    let kv = parse_simple_toml(trimmed);
    let mut explicit_db: Option<PathBuf> = None;

    for (k, v) in kv {
        match k.as_str() {
            "host" | "server.host" => cfg.host = v,
            "port" | "server.port" => { if let Ok(p) = v.parse::<u16>() { cfg.port = p; } }
            "api_prefix" | "server.api_prefix" => cfg.api_prefix = normalize_api_prefix(&v),
            "api_base_url" | "server.api_base_url" => cfg.api_base_url = v.trim_end_matches('/').to_string(),
            "log_level" | "server.log_level" => cfg.log_level = v,
            "max_upload_mb" | "server.max_upload_mb" => { if let Ok(mb) = v.parse::<usize>() { cfg.max_upload_mb = mb.max(1); } }
            "prefer_external_dist" | "server.prefer_external_dist" => cfg.prefer_external_dist = parse_bool(&v),
            "data_dir" | "storage.data_dir" => {
                if !v.is_empty() {
                    let p = PathBuf::from(&v);
                    cfg.data_dir = if p.is_absolute() || cfg.root_dir == Path::new(".") { p } else { cfg.root_dir.join(p) };
                }
            }
            "db_path" | "storage.db_path" => { if !v.is_empty() { explicit_db = Some(PathBuf::from(v)); } }
            "dist_dir" | "storage.dist_dir" => { if !v.is_empty() { cfg.dist_dir = PathBuf::from(v); } }
            "proxy_url" | "network.proxy_url" => cfg.proxy_url = v,
            "connect_timeout_secs" | "network.connect_timeout_secs" => { if let Ok(secs) = v.parse::<u64>() { cfg.connect_timeout_secs = secs.max(1); } }
            "request_timeout_secs" | "network.request_timeout_secs" => { if let Ok(secs) = v.parse::<u64>() { cfg.request_timeout_secs = secs.max(1); } }
            "google_translate_url" | "endpoints.google_translate_url" => cfg.endpoints.google_translate_url = v,
            "mymemory_translate_url" | "endpoints.mymemory_translate_url" => cfg.endpoints.mymemory_translate_url = v,
            "youdao_translate_url" | "endpoints.youdao_translate_url" => cfg.endpoints.youdao_translate_url = v,
            "edge_tts_ws_url" | "endpoints.edge_tts_ws_url" => cfg.endpoints.edge_tts_ws_url = v,
            "google_tts_url" | "endpoints.google_tts_url" => cfg.endpoints.google_tts_url = v,
            "baidu_tts_url" | "endpoints.baidu_tts_url" => cfg.endpoints.baidu_tts_url = v,
            "youdao_tts_url" | "endpoints.youdao_tts_url" => cfg.endpoints.youdao_tts_url = v,
            "custom_tts_url" | "endpoints.custom_tts_url" => cfg.endpoints.custom_tts_url = v,
            "default_tts_voice" | "endpoints.default_tts_voice" => cfg.endpoints.default_tts_voice = v,
            "lifeos_api_url" | "endpoints.lifeos_api_url" => cfg.endpoints.lifeos_api_url = v,
            "zlib_url" | "endpoints.zlib_url" => cfg.endpoints.zlib_url = v,
            "annas_archive_url" | "endpoints.annas_archive_url" => cfg.endpoints.annas_archive_url = v,
            "gutenberg_url" | "endpoints.gutenberg_url" => cfg.endpoints.gutenberg_url = v,
            "openlibrary_url" | "endpoints.openlibrary_url" => cfg.endpoints.openlibrary_url = v,
            "archive_org_url" | "endpoints.archive_org_url" => cfg.endpoints.archive_org_url = v,
            "standard_opds_url" | "endpoints.standard_opds_url" => cfg.endpoints.standard_opds_url = v,
            "calibre_opds_url" | "endpoints.calibre_opds_url" => cfg.endpoints.calibre_opds_url = v,
            "wikisource_api_url" | "endpoints.wikisource_api_url" => cfg.endpoints.wikisource_api_url = v,
            "libgen_url" | "endpoints.libgen_url" => cfg.endpoints.libgen_url = v,
            "ai_api_key" | "ai.api_key" => cfg.ai.api_key = v,
            "ai_base_url" | "ai.api_base_url" => cfg.ai.api_base_url = v.trim_end_matches('/').to_string(),
            "ai_model" | "ai.model" => cfg.ai.model = v,
            "ai_temperature" | "ai.temperature" => { if let Ok(temp) = v.parse::<f32>() { cfg.ai.temperature = temp; } }
            "ai_max_tokens" | "ai.max_tokens" => { if let Ok(tok) = v.parse::<usize>() { cfg.ai.max_tokens = tok; } }
            _ => {}
        }
    }
    cfg.recompute_derived_paths(explicit_db);
}

pub fn apply_json_patch(cfg: &mut AppConfig, patch: &Value) {
    let get_str = |obj: &Value, key: &str| obj.get(key).and_then(|v| v.as_str()).map(|s| s.to_string());
    let get_u64 = |obj: &Value, key: &str| obj.get(key).and_then(|v| v.as_u64());

    let srv = patch.get("server").unwrap_or(patch);
    if let Some(v) = get_str(srv, "host") { cfg.host = v; }
    if let Some(v) = get_u64(srv, "port") { cfg.port = v as u16; }
    if let Some(v) = get_str(srv, "api_prefix") { cfg.api_prefix = normalize_api_prefix(&v); }
    if let Some(v) = get_str(srv, "api_base_url") { cfg.api_base_url = v.trim_end_matches('/').to_string(); }
    if let Some(v) = get_str(srv, "log_level") { cfg.log_level = v; }
    if let Some(v) = get_u64(srv, "max_upload_mb") { cfg.max_upload_mb = (v as usize).max(1); }

    let net = patch.get("network").unwrap_or(patch);
    if let Some(v) = get_str(net, "proxy_url") { cfg.proxy_url = v; }
    if let Some(v) = get_u64(net, "connect_timeout_secs") { cfg.connect_timeout_secs = v.max(1); }
    if let Some(v) = get_u64(net, "request_timeout_secs") { cfg.request_timeout_secs = v.max(1); }

    let ep = patch.get("endpoints").unwrap_or(patch);
    if let Some(v) = get_str(ep, "google_translate_url") { cfg.endpoints.google_translate_url = v; }
    if let Some(v) = get_str(ep, "mymemory_translate_url") { cfg.endpoints.mymemory_translate_url = v; }
    if let Some(v) = get_str(ep, "youdao_translate_url") { cfg.endpoints.youdao_translate_url = v; }
    if let Some(v) = get_str(ep, "edge_tts_ws_url") { cfg.endpoints.edge_tts_ws_url = v; }
    if let Some(v) = get_str(ep, "google_tts_url") { cfg.endpoints.google_tts_url = v; }
    if let Some(v) = get_str(ep, "baidu_tts_url") { cfg.endpoints.baidu_tts_url = v; }
    if let Some(v) = get_str(ep, "youdao_tts_url") { cfg.endpoints.youdao_tts_url = v; }
    if let Some(v) = get_str(ep, "custom_tts_url") { cfg.endpoints.custom_tts_url = v; }
    if let Some(v) = get_str(ep, "default_tts_voice") { cfg.endpoints.default_tts_voice = v; }
    if let Some(v) = get_str(ep, "lifeos_api_url") { cfg.endpoints.lifeos_api_url = v; }
    if let Some(v) = get_str(ep, "zlib_url") { cfg.endpoints.zlib_url = v; }
    if let Some(v) = get_str(ep, "annas_archive_url") { cfg.endpoints.annas_archive_url = v; }
    if let Some(v) = get_str(ep, "gutenberg_url") { cfg.endpoints.gutenberg_url = v; }
    if let Some(v) = get_str(ep, "openlibrary_url") { cfg.endpoints.openlibrary_url = v; }
    if let Some(v) = get_str(ep, "archive_org_url") { cfg.endpoints.archive_org_url = v; }
    if let Some(v) = get_str(ep, "standard_opds_url") { cfg.endpoints.standard_opds_url = v; }
    if let Some(v) = get_str(ep, "calibre_opds_url") { cfg.endpoints.calibre_opds_url = v; }
    if let Some(v) = get_str(ep, "wikisource_api_url") { cfg.endpoints.wikisource_api_url = v; }
    if let Some(v) = get_str(ep, "libgen_url") { cfg.endpoints.libgen_url = v; }

    let ai = patch.get("ai").unwrap_or(patch);
    if let Some(v) = get_str(ai, "api_key") { if v != "******" { cfg.ai.api_key = v; } }
    if let Some(v) = get_str(ai, "api_base_url") { cfg.ai.api_base_url = v.trim_end_matches('/').to_string(); }
    if let Some(v) = get_str(ai, "model") { cfg.ai.model = v; }
    if let Some(v) = ai.get("temperature").and_then(|v| v.as_f64()) { cfg.ai.temperature = v as f32; }
    if let Some(v) = ai.get("max_tokens").and_then(|v| v.as_u64()) { cfg.ai.max_tokens = v as usize; }

    cfg.recompute_derived_paths(None);
}

pub fn to_toml_string(cfg: &AppConfig) -> String {
    format!(
r#"# ============================================================================
# LuminaRead (阅境) 生产环境配置文件
# ============================================================================

[server]
host = "{host}"
port = {port}
api_prefix = "{api_prefix}"
api_base_url = "{api_base_url}"
log_level = "{log_level}"
max_upload_mb = {max_upload_mb}
prefer_external_dist = {prefer_external_dist}

[storage]
data_dir = "{data_dir}"
db_path = "{db_path}"
dist_dir = "{dist_dir}"

[network]
proxy_url = "{proxy_url}"
connect_timeout_secs = {connect_timeout_secs}
request_timeout_secs = {request_timeout_secs}

[endpoints]
google_translate_url = "{google_translate_url}"
mymemory_translate_url = "{mymemory_translate_url}"
youdao_translate_url = "{youdao_translate_url}"
edge_tts_ws_url = "{edge_tts_ws_url}"
google_tts_url = "{google_tts_url}"
baidu_tts_url = "{baidu_tts_url}"
youdao_tts_url = "{youdao_tts_url}"
custom_tts_url = "{custom_tts_url}"
default_tts_voice = "{default_tts_voice}"
lifeos_api_url = "{lifeos_api_url}"
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
api_key = "{ai_api_key}"
api_base_url = "{ai_base_url}"
model = "{ai_model}"
temperature = {ai_temperature}
max_tokens = {ai_max_tokens}
"#,
        host = cfg.host,
        port = cfg.port,
        api_prefix = cfg.api_prefix,
        api_base_url = cfg.api_base_url,
        log_level = cfg.log_level,
        max_upload_mb = cfg.max_upload_mb,
        prefer_external_dist = cfg.prefer_external_dist,
        data_dir = escape_toml_str(&cfg.data_dir.to_string_lossy()),
        db_path = escape_toml_str(&cfg.db_path.to_string_lossy()),
        dist_dir = escape_toml_str(&cfg.dist_dir.to_string_lossy()),
        proxy_url = escape_toml_str(&cfg.proxy_url),
        connect_timeout_secs = cfg.connect_timeout_secs,
        request_timeout_secs = cfg.request_timeout_secs,
        google_translate_url = cfg.endpoints.google_translate_url,
        mymemory_translate_url = cfg.endpoints.mymemory_translate_url,
        youdao_translate_url = cfg.endpoints.youdao_translate_url,
        edge_tts_ws_url = cfg.endpoints.edge_tts_ws_url,
        google_tts_url = cfg.endpoints.google_tts_url,
        baidu_tts_url = cfg.endpoints.baidu_tts_url,
        youdao_tts_url = cfg.endpoints.youdao_tts_url,
        custom_tts_url = cfg.endpoints.custom_tts_url,
        default_tts_voice = cfg.endpoints.default_tts_voice,
        lifeos_api_url = cfg.endpoints.lifeos_api_url,
        zlib_url = cfg.endpoints.zlib_url,
        annas_archive_url = cfg.endpoints.annas_archive_url,
        gutenberg_url = cfg.endpoints.gutenberg_url,
        openlibrary_url = cfg.endpoints.openlibrary_url,
        archive_org_url = cfg.endpoints.archive_org_url,
        standard_opds_url = cfg.endpoints.standard_opds_url,
        calibre_opds_url = cfg.endpoints.calibre_opds_url,
        wikisource_api_url = cfg.endpoints.wikisource_api_url,
        libgen_url = cfg.endpoints.libgen_url,
        ai_api_key = escape_toml_str(&cfg.ai.api_key),
        ai_base_url = escape_toml_str(&cfg.ai.api_base_url),
        ai_model = escape_toml_str(&cfg.ai.model),
        ai_temperature = cfg.ai.temperature,
        ai_max_tokens = cfg.ai.max_tokens,
    )
}

pub fn save_to_toml(cfg: &AppConfig, path: &Path) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).ok();
        }
    }
    std::fs::write(path, to_toml_string(cfg))
}
