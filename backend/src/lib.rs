#![allow(dead_code, unused_imports)]

pub mod config;
pub mod domain;
pub mod error;
pub mod infra;
pub mod services;
pub mod transport;

use std::net::SocketAddr;
use std::path::PathBuf;
use crate::config::{set_global_config, AppConfig};
use crate::infra::db::{init_schema, DbContext};
use crate::transport::{build_router, AppState};

/// 启动 Axum HTTP 服务核心（监听指定 host 和 port）
pub async fn run_server(config: AppConfig) -> anyhow::Result<()> {
    set_global_config(config.clone());

    // 1. 初始化存储与 SQLite 数据库
    let db = DbContext::new(&config.db_path)?;
    db.interact(|conn| init_schema(conn))
        .await
        .map_err(|e| anyhow::anyhow!("初始化数据库 Schema 失败: {}", e))?;

    // 2. 构建依赖注入容器与路由中间件
    let state = AppState::new(db, config.clone());
    let app = build_router(state);

    // 3. 挂载后台磁盘缓存巡检与 LRU 自动清理任务
    tokio::spawn(crate::infra::storage::run_cache_auto_pruner(config.clone()));

    // 4. 监听网络端口
    let addr: SocketAddr = format!("{}:{}", config.host, config.port).parse()?;
    let listener = tokio::net::TcpListener::bind(addr).await?;
    tracing::info!("LuminaRead Core Server listening on http://{}", addr);

    axum::serve(listener, app).await?;
    Ok(())
}

/// 移动端/嵌入式专用启动接口（独立线程 + Tokio Runtime）
pub fn start_embedded_server(data_dir: PathBuf, port: u16) -> anyhow::Result<()> {
    std::thread::Builder::new()
        .name("luminaread-backend".to_string())
        .spawn(move || {
            let rt = match tokio::runtime::Builder::new_multi_thread()
                .enable_all()
                .build()
            {
                Ok(r) => r,
                Err(e) => {
                    eprintln!("[LuminaRead Embedded] 无法创建 Tokio 运行时: {:?}", e);
                    return;
                }
            };

            rt.block_on(async move {
                let mut cfg = AppConfig::default_resolved();
                cfg.host = "127.0.0.1".to_string();
                cfg.port = port;
                cfg.data_dir = data_dir.clone();
                cfg.db_path = data_dir.join("luminaread.db");
                cfg.books_dir = data_dir.join("books");
                cfg.covers_dir = data_dir.join("covers");
                cfg.pdf_cache_dir = data_dir.join("pdf_cache");
                cfg.tts_cache_dir = data_dir.join("tts_cache");

                let _ = std::fs::create_dir_all(&cfg.data_dir);
                let _ = std::fs::create_dir_all(&cfg.books_dir);
                let _ = std::fs::create_dir_all(&cfg.covers_dir);
                let _ = std::fs::create_dir_all(&cfg.pdf_cache_dir);
                let _ = std::fs::create_dir_all(&cfg.tts_cache_dir);

                tracing::info!(
                    "[LuminaRead Embedded] 正在启动移动端内嵌服务 | 数据目录: {} | 端口: {}",
                    cfg.data_dir.display(),
                    port
                );

                if let Err(e) = run_server(cfg).await {
                    eprintln!("[LuminaRead Embedded] 服务异常终止: {:?}", e);
                }
            });
        })?;

    Ok(())
}

#[cfg(target_os = "android")]
#[no_mangle]
pub extern "C" fn Java_com_luminaread_app_MainActivity_startNativeServer(
    mut env: jni::JNIEnv,
    _class: jni::objects::JClass,
    data_dir_jstr: jni::objects::JString,
    port: jni::sys::jint,
) -> jni::sys::jint {
    let data_dir_str: String = match env.get_string(&data_dir_jstr) {
        Ok(s) => s.into(),
        Err(_) => return -1,
    };

    let path = PathBuf::from(data_dir_str);
    match start_embedded_server(path, port as u16) {
        Ok(_) => 0,
        Err(_) => -2,
    }
}
