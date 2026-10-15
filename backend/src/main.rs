#![allow(dead_code, unused_imports)]

use std::net::SocketAddr;
use tokio::signal;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use luminaread::config::AppConfig;
use luminaread::infra::db::{init_schema, DbContext};
use luminaread::transport::{build_router, AppState};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 1. 解析命令行参数与加载配置文件 (支持 --help / --version / --init-config / --print-config)
    let config = AppConfig::load();
    luminaread::config::set_global_config(config.clone());

    // 2. 初始化结构化日志
    let default_filter = format!(
        "luminaread={},tower_http={},axum={}",
        config.log_level, config.log_level, config.log_level
    );
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| default_filter.into());
    tracing_subscriber::registry()
        .with(filter)
        .with(tracing_subscriber::fmt::layer().with_target(true).with_thread_ids(true))
        .init();

    tracing::info!(
        "正在启动 LuminaRead 单文件生产服务 | 配置文件: {} | 数据目录: {} | API 前缀: {}",
        config.config_file.display(),
        config.data_dir.display(),
        config.api_prefix
    );

    // 3. 初始化存储与 SQLite 数据库
    let db = DbContext::new(&config.db_path)?;
    db.interact(|conn| init_schema(conn))
        .await
        .map_err(|e| anyhow::anyhow!("初始化数据库 Schema 失败: {}", e))?;

    // 4. 构建依赖注入容器与路由中间件
    let state = AppState::new(db, config.clone());
    let app = build_router(state);

    // 5. 挂载后台磁盘缓存巡检与 LRU 自动清理任务
    tokio::spawn(luminaread::infra::storage::run_cache_auto_pruner(config.clone()));

    // 6. 监听网络端口
    let addr: SocketAddr = format!("{}:{}", config.host, config.port).parse()?;
    let listener = tokio::net::TcpListener::bind(addr).await?;
    tracing::info!("LuminaRead Rust Server listening on http://{}", addr);

    // 7. 挂载跨平台优雅停机
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    tracing::info!("服务已完成资源清理并安全退出");
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("无法安装 Ctrl+C 信号监听器");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("无法安装 SIGTERM 信号监听器")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            tracing::warn!("收到 Ctrl+C (SIGINT) 中断信号，准备优雅停机...");
        },
        _ = terminate => {
            tracing::warn!("收到 SIGTERM 停机信号，准备优雅停机...");
        },
    }
}
