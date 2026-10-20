use std::path::PathBuf;

use super::models::AppConfig;
use super::parser::{normalize_api_prefix, parse_bool};

pub enum CliActionResult {
    Continue {
        explicit_config: Option<PathBuf>,
        custom_data_dir: Option<PathBuf>,
        custom_dist_dir: Option<PathBuf>,
        custom_db_path: Option<PathBuf>,
        print_config_only: bool,
    },
    ExitSuccess,
    ExitError(String),
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

pub fn handle_early_cli_flags(args: &[String], cfg: &AppConfig) -> Option<CliActionResult> {
    let mut i = 1;
    let mut explicit_config_path: Option<PathBuf> = None;
    let mut init_config_target: Option<PathBuf> = None;
    let mut print_config_only = false;

    while i < args.len() {
        let arg = args[i].as_str();
        match arg {
            "-h" | "--help" => {
                print_help();
                return Some(CliActionResult::ExitSuccess);
            }
            "-V" | "--version" => {
                println!("LuminaRead (阅境) v{} — 单文件静态链接生产版 (内嵌前端静态资源)", env!("CARGO_PKG_VERSION"));
                return Some(CliActionResult::ExitSuccess);
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
        if let Err(e) = super::serializer::save_to_toml(cfg, &target) {
            return Some(CliActionResult::ExitError(format!("生成配置文件失败 ({}): {}", target.display(), e)));
        }
        println!("已生成默认配置文件: {}", target.display());
        return Some(CliActionResult::ExitSuccess);
    }

    Some(CliActionResult::Continue {
        explicit_config: explicit_config_path,
        custom_data_dir: None,
        custom_dist_dir: None,
        custom_db_path: None,
        print_config_only,
    })
}

fn apply_single_cli_arg(
    cfg: &mut AppConfig,
    key: &str,
    val_opt: Option<String>,
    args: &[String],
    j: &mut usize,
    custom_data: &mut Option<PathBuf>,
    custom_dist: &mut Option<PathBuf>,
    custom_db: &mut Option<PathBuf>,
) {
    let next_val = |idx: &mut usize| -> Option<String> {
        if *idx + 1 < args.len() {
            *idx += 1;
            Some(args[*idx].clone())
        } else {
            None
        }
    };

    match key {
        "-H" | "--host" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { cfg.host = v; } }
        "-p" | "--port" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { if let Ok(p) = v.parse::<u16>() { cfg.port = p; } } }
        "-b" | "--bind" => {
            if let Some(v) = val_opt.or_else(|| next_val(j)) {
                if let Some((h, p_str)) = v.rsplit_once(':') {
                    if !h.is_empty() { cfg.host = h.to_string(); }
                    if let Ok(port) = p_str.parse::<u16>() { cfg.port = port; }
                } else if let Ok(port) = v.parse::<u16>() {
                    cfg.port = port;
                } else {
                    cfg.host = v;
                }
            }
        }
        "--api-prefix" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { cfg.api_prefix = normalize_api_prefix(&v); } }
        "--api-base-url" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { cfg.api_base_url = v.trim_end_matches('/').to_string(); } }
        "-d" | "--data-dir" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { *custom_data = Some(PathBuf::from(v)); } }
        "--db-path" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { *custom_db = Some(PathBuf::from(v)); } }
        "--dist-dir" => {
            if let Some(v) = val_opt.or_else(|| next_val(j)) {
                *custom_dist = Some(PathBuf::from(v));
                cfg.prefer_external_dist = true;
            }
        }
        "--prefer-external-dist" => { cfg.prefer_external_dist = val_opt.map(|v| parse_bool(&v)).unwrap_or(true); }
        "--proxy" | "--proxy-url" => {
            if let Some(v) = val_opt.or_else(|| next_val(j)) {
                cfg.proxy_url = if v.eq_ignore_ascii_case("none") || v.eq_ignore_ascii_case("off") { String::new() } else { v };
            }
        }
        "--google-translate-url" | "--translate-endpoint" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { cfg.endpoints.google_translate_url = v; } }
        "--mymemory-translate-url" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { cfg.endpoints.mymemory_translate_url = v; } }
        "--youdao-translate-url" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { cfg.endpoints.youdao_translate_url = v; } }
        "--edge-tts-url" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { cfg.endpoints.edge_tts_ws_url = v; } }
        "--google-tts-url" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { cfg.endpoints.google_tts_url = v; } }
        "--baidu-tts-url" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { cfg.endpoints.baidu_tts_url = v; } }
        "--youdao-tts-url" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { cfg.endpoints.youdao_tts_url = v; } }
        "--tts-endpoint" | "--custom-tts-url" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { cfg.endpoints.custom_tts_url = v; } }
        "--default-voice" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { cfg.endpoints.default_tts_voice = v; } }
        "--lifeos-endpoint" | "--lifeos-api-url" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { cfg.endpoints.lifeos_api_url = v; } }
        "--zlib-url" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { cfg.endpoints.zlib_url = v; } }
        "--annas-url" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { cfg.endpoints.annas_archive_url = v; } }
        "--gutenberg-url" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { cfg.endpoints.gutenberg_url = v; } }
        "--openlibrary-url" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { cfg.endpoints.openlibrary_url = v; } }
        "--archive-url" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { cfg.endpoints.archive_org_url = v; } }
        "--max-upload-mb" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { if let Ok(mb) = v.parse::<usize>() { cfg.max_upload_mb = mb.max(1); } } }
        "--log-level" => { if let Some(v) = val_opt.or_else(|| next_val(j)) { cfg.log_level = v; } }
        "--clean-cache" | "--clear-cache" => { cfg.clean_cache_on_start = true; }
        "--reset-db" | "--clean-db" => { cfg.reset_db_on_start = true; }
        _ => {}
    }
}

pub fn apply_cli_overrides(
    cfg: &mut AppConfig,
    args: &[String],
    custom_data: &mut Option<PathBuf>,
    custom_dist: &mut Option<PathBuf>,
    custom_db: &mut Option<PathBuf>,
) {
    let mut j = 1;
    while j < args.len() {
        let arg = args[j].as_str();
        let (key, val_opt) = if let Some((k, v)) = arg.split_once('=') {
            (k, Some(v.to_string()))
        } else {
            (arg, None)
        };
        apply_single_cli_arg(cfg, key, val_opt, args, &mut j, custom_data, custom_dist, custom_db);
        j += 1;
    }
}
