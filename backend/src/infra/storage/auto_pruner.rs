use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};
use tracing::info;
use crate::config::AppConfig;
use crate::infra::db::DbContext;

struct FileEntry {
    path: PathBuf,
    size: u64,
    modified: SystemTime,
}

fn collect_files_recursive(dir: &Path, now: SystemTime, entries: &mut Vec<FileEntry>, total_size: &mut u64) {
    let read_dir = match fs::read_dir(dir) {
        Ok(rd) => rd,
        Err(_) => return,
    };
    for entry in read_dir.flatten() {
        let path = entry.path();
        if let Ok(meta) = entry.metadata() {
            if meta.is_dir() {
                collect_files_recursive(&path, now, entries, total_size);
                // Try removing empty subdirectories left after pruning
                let _ = fs::remove_dir(&path);
            } else if meta.is_file() {
                let size = meta.len();
                let modified = meta.modified().unwrap_or(now);
                *total_size += size;
                entries.push(FileEntry {
                    path,
                    size,
                    modified,
                });
            }
        }
    }
}

/// 递归扫描目录并根据容量上限与过期时间执行 LRU 磁盘缓存淘汰
pub fn prune_directory(dir: &Path, max_bytes: u64, max_age: Duration) -> u64 {
    if !dir.exists() {
        return 0;
    }

    let mut entries = Vec::new();
    let mut total_size: u64 = 0;
    let now = SystemTime::now();

    collect_files_recursive(dir, now, &mut entries, &mut total_size);

    // 按修改时间升序排序：最久未更新的文件排在最前面
    entries.sort_by_key(|e| e.modified);

    let mut reclaimed: u64 = 0;
    let target_size = (max_bytes as f64 * 0.75) as u64;

    for entry in entries {
        let is_expired = now
            .duration_since(entry.modified)
            .map(|age| age > max_age)
            .unwrap_or(false);

        let over_capacity = total_size > max_bytes && (total_size.saturating_sub(reclaimed)) > target_size;

        if is_expired || over_capacity {
            if fs::remove_file(&entry.path).is_ok() {
                reclaimed += entry.size;
                if let Some(parent) = entry.path.parent() {
                    if parent != dir {
                        let _ = fs::remove_dir(parent);
                    }
                }
            }
        }
    }

    reclaimed
}

/// 同步清理 SQLite `tts_audio_cache` 表中物理文件已被淘汰的记录
async fn sync_pruned_tts_cache_records(config: &AppConfig) {
    if let Ok(db) = DbContext::new(&config.db_path) {
        let _ = db
            .interact(|conn| {
                let mut stmt = conn.prepare("SELECT cache_key, file_path FROM tts_audio_cache")?;
                let rows: Vec<(String, String)> = stmt
                    .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?
                    .filter_map(|r| r.ok())
                    .collect();
                for (cache_key, file_path) in rows {
                    if !Path::new(&file_path).exists() {
                        let _ = conn.execute(
                            "DELETE FROM tts_audio_cache WHERE cache_key = ?",
                            rusqlite::params![cache_key],
                        );
                    }
                }
                Ok(())
            })
            .await;
    }
}

/// 后台常驻定时任务：巡检 TTS 缓存与 PDF 渲染缓存，防止 NAS / 服务器磁盘被打满
/// 注意：`covers_dir` 存放持久化书籍封面与提取的正文插图，严禁按时间自动清理（仅在删书时按引用清理）
pub async fn run_cache_auto_pruner(config: AppConfig) {
    // 首次在启动后 2 分钟执行，避免与系统启动初始化竞争磁盘 IO
    tokio::time::sleep(Duration::from_secs(120)).await;

    loop {
        let cfg_clone = config.clone();
        let (tts_pruned, pdf_pruned) = tokio::task::spawn_blocking(move || {
            // TTS 缓存: 上限 1.5GB, 过期时间 30 天
            let tts_max_bytes = 1536 * 1024 * 1024;
            let tts_max_age = Duration::from_secs(30 * 86400);
            let tts_p = prune_directory(&cfg_clone.tts_cache_dir, tts_max_bytes, tts_max_age);

            // PDF 渲染切片缓存 (含 {book_id}/page_*.jpg 子目录): 上限 2.0GB, 过期时间 14 天
            let pdf_max_bytes = 2048 * 1024 * 1024;
            let pdf_max_age = Duration::from_secs(14 * 86400);
            let pdf_p = prune_directory(&cfg_clone.pdf_cache_dir, pdf_max_bytes, pdf_max_age);

            // 临时回收站目录清理
            let trash_dir = cfg_clone.data_dir.join(".trash_pdf_cache");
            if trash_dir.exists() {
                let _ = std::fs::remove_dir_all(&trash_dir);
            }

            (tts_p, pdf_p)
        })
        .await
        .unwrap_or((0, 0));

        if tts_pruned > 0 {
            sync_pruned_tts_cache_records(&config).await;
        }

        if tts_pruned > 0 || pdf_pruned > 0 {
            info!(
                "[AutoPruner] 自动回收磁盘缓存: TTS={:.2}MB, PDF={:.2}MB",
                tts_pruned as f64 / 1_048_576.0,
                pdf_pruned as f64 / 1_048_576.0,
            );
        }

        // 每隔 6 小时周期性巡检一次
        tokio::time::sleep(Duration::from_secs(6 * 3600)).await;
    }
}
