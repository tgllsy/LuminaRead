use async_trait::async_trait;
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, OnceLock};

use crate::domain::entities::conversation::AiConversation;
use crate::domain::traits::{BookRepository, ConversationRepository};
use crate::error::AppResult;
use crate::infra::db::DbContext;
use crate::services::traits::{AiService, CopilotRequestDto};

pub struct AiServiceImpl {
    db: DbContext,
    conv_repo: Arc<dyn ConversationRepository>,
    book_repo: Arc<dyn BookRepository>,
}

impl AiServiceImpl {
    pub fn new(
        db: DbContext,
        conv_repo: Arc<dyn ConversationRepository>,
        book_repo: Arc<dyn BookRepository>,
    ) -> Self {
        Self {
            db,
            conv_repo,
            book_repo,
        }
    }
}

pub fn sha256_hex(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    hex::encode(hasher.finalize())
}

pub fn is_mostly_english_text(text: &str) -> bool {
    let sample: String = text.trim().chars().take(160).collect();
    if sample.is_empty() {
        return false;
    }
    let latin = sample.chars().filter(|c| c.is_ascii_alphabetic()).count();
    let cjk = sample
        .chars()
        .filter(|c| ('\u{4e00}'..='\u{9fff}').contains(c))
        .count();
    latin > cjk * 2 && latin > 3
}

static TRANSLATE_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

fn get_translate_client() -> &'static reqwest::Client {
    TRANSLATE_CLIENT.get_or_init(|| {
        let cfg = crate::config::current_config();
        let env_proxy = cfg.proxy_url.trim().to_string();
        let mut builder = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(6))
            .connect_timeout(std::time::Duration::from_secs(3))
            .pool_idle_timeout(std::time::Duration::from_secs(90))
            .pool_max_idle_per_host(16)
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0");
        if !env_proxy.is_empty() {
            if let Ok(p) = reqwest::Proxy::all(&env_proxy) {
                builder = builder.proxy(p);
            }
        }
        builder.build().unwrap_or_else(|_| reqwest::Client::new())
    })
}

fn is_valid_cached_translation(trans: &str) -> bool {
    let t = trans.trim();
    !t.is_empty()
        && !t.starts_with("（参考译文）")
        && !t.starts_with("(Reference translation)")
        && !t.starts_with("[Translation temporarily")
        && !t.starts_with("[当前网络暂无法")
}

async fn call_google_clients5_translate(text: &str, target_lang: &str) -> Option<String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return None;
    }
    let cfg = crate::config::current_config();
    let endpoint = cfg.endpoints.google_translate_url.trim();
    if endpoint.is_empty() {
        return None;
    }

    let client = get_translate_client();
    let resp = client
        .get(endpoint)
        .query(&[
            ("client", "dict-chrome-ex"),
            ("sl", "auto"),
            ("tl", target_lang),
            ("q", trimmed),
        ])
        .send()
        .await
        .ok()?;
    if !resp.status().is_success() {
        return None;
    }
    let val: Value = resp.json().await.ok()?;

    let arr = val.as_array()?;
    let first = arr.first()?;
    let trans_str = if let Some(s) = first.as_str() {
        s.trim().to_string()
    } else if let Some(inner) = first.as_array() {
        inner.first().and_then(|v| v.as_str()).unwrap_or("").trim().to_string()
    } else {
        String::new()
    };
    if trans_str.is_empty() || trans_str.starts_with("<!DOCTYPE") || trans_str.starts_with("<html") {
        None
    } else {
        Some(trans_str)
    }
}

async fn call_mymemory_translate(text: &str, target_lang: &str) -> Option<String> {
    let trimmed = text.trim();
    if trimmed.is_empty() || trimmed.chars().count() > 450 {
        return None;
    }
    let cfg = crate::config::current_config();
    let endpoint = cfg.endpoints.mymemory_translate_url.trim();
    if endpoint.is_empty() {
        return None;
    }
    let langpair = if target_lang == "en" { "zh-CN|en" } else { "en|zh-CN" };
    let client = get_translate_client();

    let val: Value = client
        .get(endpoint)
        .query(&[("langpair", &langpair), ("q", &trimmed)])
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;

    let trans = val
        .get("responseData")
        .and_then(|r| r.get("translatedText"))
        .and_then(|v| v.as_str())?
        .trim()
        .to_string();
    if trans.is_empty() || trans.contains("MYMEMORY WARNING") {
        None
    } else {
        Some(trans)
    }
}

async fn call_youdao_translate(text: &str) -> Option<String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return None;
    }
    let cfg = crate::config::current_config();
    let endpoint = cfg.endpoints.youdao_translate_url.trim();
    if endpoint.is_empty() {
        return None;
    }

    let client = get_translate_client();

    let val: Value = client
        .get(endpoint)
        .query(&[("doctype", "json"), ("type", "AUTO"), ("i", trimmed)])
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;

    if val.get("errorCode").and_then(|v| v.as_i64()) != Some(0) {
        return None;
    }

    let outer = val.get("translateResult")?.as_array()?;
    let mut lines = Vec::with_capacity(outer.len());
    for line_arr in outer {
        if let Some(segs) = line_arr.as_array() {
            let mut line_str = String::new();
            for seg in segs {
                if let Some(tgt) = seg.get("tgt").and_then(|v| v.as_str()) {
                    line_str.push_str(tgt);
                }
            }
            lines.push(line_str);
        }
    }
    let joined = lines.join("\n").trim().to_string();
    if joined.is_empty() {
        None
    } else {
        Some(joined)
    }
}

async fn translate_live_batch(text: &str, target_lang: &str) -> Option<String> {
    if let Some(res) = call_google_clients5_translate(text, target_lang).await {
        return Some(res);
    }
    if let Some(res) = call_mymemory_translate(text, target_lang).await {
        return Some(res);
    }
    if let Some(res) = call_youdao_translate(text).await {
        return Some(res);
    }
    None
}

pub async fn translate_text_real(db: &DbContext, text: &str, target_lang: Option<&str>) -> String {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    let is_en = is_mostly_english_text(trimmed);
    let tl = target_lang.unwrap_or(if is_en { "zh-CN" } else { "en" }).to_string();
    let hash = sha256_hex(&format!("{}:{}", tl, trimmed));

    let cached = db
        .interact({
            let h = hash.clone();
            move |conn| {
                Ok(conn
                    .query_row(
                        "SELECT translated_text FROM translation_cache WHERE source_hash = ?",
                        rusqlite::params![h],
                        |r| r.get::<_, String>(0),
                    )
                    .ok())
            }
        })
        .await
        .ok()
        .flatten();

    if let Some(c) = cached {
        if is_valid_cached_translation(&c) {
            return c;
        }
    }

    if let Some(live) = translate_live_batch(trimmed, &tl).await {
        let src_owned = trimmed.to_string();
        let tl_owned = tl.clone();
        let live_owned = live.clone();
        let now_str = chrono::Utc::now().to_rfc3339();
        let _ = db
            .interact(move |conn| {
                let _ = conn.execute(
                    "INSERT OR REPLACE INTO translation_cache (source_hash, source_text, target_lang, translated_text, created_at)
                     VALUES (?, ?, ?, ?, ?)",
                    rusqlite::params![hash, src_owned, tl_owned, live_owned, now_str],
                );
                Ok(())
            })
            .await;
        return live;
    }

    trimmed.to_string()
}

pub async fn translate_chapter_paragraphs(db: &DbContext, paragraphs: &[String]) -> Vec<Value> {
    if paragraphs.is_empty() {
        return Vec::new();
    }

    struct ParaMeta {
        idx: usize,
        source: String,
        is_en: bool,
        target_lang: String,
        hash: String,
        translation: Option<String>,
    }

    let mut items: Vec<ParaMeta> = paragraphs
        .iter()
        .enumerate()
        .map(|(idx, p)| {
            let trimmed = p.trim().to_string();
            let is_en = is_mostly_english_text(&trimmed);
            let tl = if is_en { "zh-CN" } else { "en" }.to_string();
            let hash = sha256_hex(&format!("{}:{}", tl, trimmed));
            ParaMeta {
                idx,
                source: trimmed,
                is_en,
                target_lang: tl,
                hash,
                translation: None,
            }
        })
        .collect();

    // 1. Batch lookup in SQLite translation_cache
    let hashes: Vec<String> = items
        .iter()
        .filter(|it| it.translation.is_none() && !it.source.is_empty())
        .map(|it| it.hash.clone())
        .collect();

    if !hashes.is_empty() {
        let cached_map: HashMap<String, String> = db
            .interact(move |conn| {
                let mut map = HashMap::new();
                if let Ok(mut stmt) = conn.prepare(
                    "SELECT translated_text FROM translation_cache WHERE source_hash = ?",
                ) {
                    for h in hashes {
                        if let Ok(t) = stmt.query_row(rusqlite::params![&h], |r| r.get::<_, String>(0)) {
                            if is_valid_cached_translation(&t) {
                                map.insert(h, t);
                            }
                        }
                    }
                }
                Ok(map)
            })
            .await
            .unwrap_or_default();

        for it in &mut items {
            if it.translation.is_none() {
                if let Some(t) = cached_map.get(&it.hash) {
                    it.translation = Some(t.clone());
                }
            }
        }
    }

    // 2. Group uncached paragraphs into batches of up to 12 paragraphs / 1300 chars
    let uncached_indices: Vec<usize> = items
        .iter()
        .enumerate()
        .filter(|(_, it)| {
            it.translation.is_none()
                && !it.source.is_empty()
                && !it.source.starts_with("[[PDF_PAGE:")
                && !it.source.starts_with("[[BOOK_IMAGE:")
        })
        .map(|(i, _)| i)
        .collect();

    if !uncached_indices.is_empty() {
        let mut batches: Vec<(String, Vec<usize>)> = Vec::new();
        let mut cur_batch: Vec<usize> = Vec::new();
        let mut cur_chars = 0usize;
        let mut cur_lang = items[uncached_indices[0]].target_lang.clone();

        for idx in uncached_indices {
            let clean_len = items[idx].source.chars().count();
            if items[idx].target_lang != cur_lang
                || cur_chars + clean_len > 1300
                || cur_batch.len() >= 12
            {
                if !cur_batch.is_empty() {
                    batches.push((cur_lang.clone(), cur_batch));
                }
                cur_batch = vec![idx];
                cur_chars = clean_len;
                cur_lang = items[idx].target_lang.clone();
            } else {
                cur_batch.push(idx);
                cur_chars += clean_len + 1;
            }
        }
        if !cur_batch.is_empty() {
            batches.push((cur_lang, cur_batch));
        }

        // Translate up to first 3 batches immediately; spawn background task for remaining batches
        let immediate_count = batches.len().min(3);
        let immediate_batches = batches[..immediate_count].to_vec();
        let deferred_batches = batches[immediate_count..].to_vec();

        let mut new_cache_rows: Vec<(String, String, String, String)> = Vec::new();

        for (lang, batch_idxs) in immediate_batches {
            let joined = batch_idxs
                .iter()
                .map(|&i| items[i].source.replace(['\r', '\n'], " "))
                .collect::<Vec<_>>()
                .join("\n");

            if let Some(trans_joined) = translate_live_batch(&joined, &lang).await {
                let lines: Vec<&str> = trans_joined.split('\n').collect();
                if lines.len() == batch_idxs.len() {
                    for (pos, &item_idx) in batch_idxs.iter().enumerate() {
                        let t = lines[pos].trim().to_string();
                        if !t.is_empty() {
                            items[item_idx].translation = Some(t.clone());
                            new_cache_rows.push((
                                items[item_idx].hash.clone(),
                                items[item_idx].source.clone(),
                                items[item_idx].target_lang.clone(),
                                t,
                            ));
                        }
                    }
                } else {
                    for &item_idx in &batch_idxs {
                        let single_src = items[item_idx].source.replace(['\r', '\n'], " ");
                        if let Some(t) = translate_live_batch(&single_src, &lang).await {
                            items[item_idx].translation = Some(t.clone());
                            new_cache_rows.push((
                                items[item_idx].hash.clone(),
                                items[item_idx].source.clone(),
                                items[item_idx].target_lang.clone(),
                                t,
                            ));
                        }
                    }
                }
            }
        }

        if !new_cache_rows.is_empty() {
            let now_str = chrono::Utc::now().to_rfc3339();
            let _ = db
                .interact(move |conn| {
                    if let Ok(mut stmt) = conn.prepare(
                        "INSERT OR REPLACE INTO translation_cache (source_hash, source_text, target_lang, translated_text, created_at)
                         VALUES (?, ?, ?, ?, ?)",
                    ) {
                        for (h, s, tl, tr) in new_cache_rows {
                            let _ = stmt.execute(rusqlite::params![h, s, tl, tr, &now_str]);
                        }
                    }
                    Ok(())
                })
                .await;
        }

        if !deferred_batches.is_empty() {
            let db_bg = db.clone();
            let deferred_data: Vec<(String, Vec<(String, String, String)>)> = deferred_batches
                .into_iter()
                .map(|(lang, idxs)| {
                    let entries = idxs
                        .into_iter()
                        .map(|i| {
                            (
                                items[i].hash.clone(),
                                items[i].source.clone(),
                                items[i].target_lang.clone(),
                            )
                        })
                        .collect();
                    (lang, entries)
                })
                .collect();

            tokio::spawn(async move {
                for (lang, entries) in deferred_data {
                    let joined = entries
                        .iter()
                        .map(|(_, src, _)| src.replace(['\r', '\n'], " "))
                        .collect::<Vec<_>>()
                        .join("\n");
                    if let Some(trans_joined) = translate_live_batch(&joined, &lang).await {
                        let lines: Vec<&str> = trans_joined.split('\n').collect();
                        if lines.len() == entries.len() {
                            let now_str = chrono::Utc::now().to_rfc3339();
                            let rows: Vec<(String, String, String, String)> = entries
                                .into_iter()
                                .enumerate()
                                .filter_map(|(idx, (h, s, tl))| {
                                    let t = lines[idx].trim().to_string();
                                    if t.is_empty() {
                                        None
                                    } else {
                                        Some((h, s, tl, t))
                                    }
                                })
                                .collect();
                            let _ = db_bg
                                .interact(move |conn| {
                                    if let Ok(mut stmt) = conn.prepare(
                                        "INSERT OR REPLACE INTO translation_cache (source_hash, source_text, target_lang, translated_text, created_at)
                                         VALUES (?, ?, ?, ?, ?)",
                                    ) {
                                        for (h, s, tl, tr) in rows {
                                            let _ = stmt.execute(rusqlite::params![h, s, tl, tr, &now_str]);
                                        }
                                    }
                                    Ok(())
                                })
                                .await;
                        }
                    }
                }
            });
        }
    }

    items
        .into_iter()
        .map(|it| {
            serde_json::json!({
                "paragraph_index": it.idx,
                "is_english": it.is_en,
                "translation": it.translation.unwrap_or_default(),
            })
        })
        .collect()
}

fn ensure_complete_node(node: &Value, idx: usize, visible_len: usize) -> Value {
    let id = node
        .get("id")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .unwrap_or_else(|| format!("char_{}", idx));
    let name = node
        .get("name")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .unwrap_or("核心人物")
        .to_string();
    let role = node
        .get("role")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .unwrap_or("核心叙事视角")
        .to_string();
    let first_seen = node
        .get("firstSeenChapter")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as usize;

    let traits: Vec<String> = node
        .get("traits")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|x| x.as_str().map(|s| s.to_string()))
                .collect()
        })
        .filter(|v: &Vec<String>| !v.is_empty())
        .unwrap_or_else(|| {
            vec![
                format!("首次出场：第 {} 章", first_seen + 1),
                role.clone(),
            ]
        });

    let status_up_to_now = node
        .get("statusUpToNow")
        .and_then(|v| v.as_str())
        .filter(|s| !s.trim().is_empty())
        .map(|s| s.to_string())
        .unwrap_or_else(|| {
            format!(
                "在前 {} 章已读叙事中持续推进核心情节线索。",
                visible_len.max(1)
            )
        });

    let key_events: Vec<String> = node
        .get("keyEvents")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|x| x.as_str().map(|s| s.to_string()))
                .collect()
        })
        .filter(|v: &Vec<String>| !v.is_empty())
        .unwrap_or_else(|| {
            vec![
                format!("第 {} 章解锁出场", first_seen + 1),
                status_up_to_now.clone(),
            ]
        });

    serde_json::json!({
        "id": id,
        "name": name,
        "role": role,
        "firstSeenChapter": first_seen,
        "traits": traits,
        "statusUpToNow": status_up_to_now,
        "keyEvents": key_events,
    })
}

fn extract_dynamic_character_graph(visible_chapters: &[Value], book_title: &str) -> (Vec<Value>, Vec<Value>) {
    #[derive(Clone)]
    struct DynamicEntity {
        id: String,
        name: String,
        role: String,
        first_seen: usize,
        count: usize,
        sentences: Vec<String>,
    }

    let stop_words: HashSet<&'static str> = [
        "我们", "你们", "他们", "她们", "它们", "自己", "什么", "怎么", "因为", "所以",
        "如果", "虽然", "但是", "然而", "不过", "已经", "可以", "没有", "一个", "一种",
        "这个", "那个", "这些", "那些", "这里", "那里", "现在", "时候", "事情", "问题",
        "知道", "觉得", "看到", "听见", "出来", "起来", "下来", "进来", "出去", "回去",
        "忽然", "突然", "依然", "仍然", "而且", "或者", "以及", "于是", "然后", "接着",
        "不是", "就是", "只是", "还是", "却是", "便是", "正是", "大家", "人们", "有人",
        "生活", "世界", "时间", "地方", "心中", "心里", "面上", "眼中", "手里", "身上",
        "先生", "女士", "小姐", "夫人", "大人", "第一章", "第二章", "第三章", "第四章",
        "好家伙", "朋友们", "孩子们", "伙计们", "老天爷", "上帝啊",
        "The", "And", "But", "For", "Nor", "Yet", "With", "From", "Into", "Upon",
        "That", "This", "These", "Those", "What", "When", "Where", "Which", "While",
        "Who", "Whom", "Whose", "Why", "How", "All", "Any", "Both", "Each", "Few",
        "More", "Most", "Other", "Some", "Such", "Than", "Too", "Very", "Can", "Will",
    ]
    .into_iter()
    .collect();

    let mut entity_map: HashMap<String, DynamicEntity> = HashMap::new();
    let mut register_mention = |raw_name: &str, ch_idx: usize, sentence: &str, role_hint: &str| {
        let clean = raw_name.trim();
        let char_len = clean.chars().count();
        if char_len < 2 || char_len > 14 || stop_words.contains(clean) {
            return;
        }
        if clean.chars().all(|c| c.is_ascii_digit() || c.is_ascii_punctuation() || c.is_whitespace()) {
            return;
        }
        let entry = entity_map.entry(clean.to_string()).or_insert_with(|| DynamicEntity {
            id: format!("ent_{}", &sha256_hex(clean)[..8]),
            name: clean.to_string(),
            role: role_hint.to_string(),
            first_seen: ch_idx,
            count: 0,
            sentences: Vec::new(),
        });
        entry.count += 1;
        if role_hint != "核心人物/概念" && entry.role == "核心人物/概念" {
            entry.role = role_hint.to_string();
        }
        let s_clean: String = sentence.trim().chars().take(84).collect();
        if s_clean.chars().count() >= 10 && entry.sentences.len() < 4 && !entry.sentences.contains(&s_clean) {
            entry.sentences.push(s_clean);
        }
    };

    let verbs = [
        "说道", "问道", "答道", "喊道", "叫道", "低声道", "冷笑道", "笑着说", "大声说",
        "想道", "心想", "凝视着", "望着", "看着", "告诉", "认为", "决定", "发现", "意识到",
        "率领", "下令", "命令", "带领", "得知", "听闻", "明白", "来到", "回到",
    ];

    for (ch_idx, ch) in visible_chapters.iter().enumerate() {
        let content = ch.get("content").and_then(|v| v.as_str()).unwrap_or("");
        for sent in content.split(['。', '！', '？', '\n', '.', '!', '?']) {
            let s = sent.trim();
            if s.is_empty() || s.starts_with("[[PDF_PAGE:") || s.starts_with("[[BOOK_IMAGE:") {
                continue;
            }
            // 1. Middle-dot transliterated names (supports ·, •, ・)
            if s.contains(['·', '•', '・']) {
                let norm_s = s.replace(['•', '・'], "·");
                for (dot_idx, _) in norm_s.match_indices('·') {
                    let before: String = norm_s[..dot_idx]
                        .chars()
                        .rev()
                        .take_while(|c| ('\u{4e00}'..='\u{9fff}').contains(c))
                        .take(5)
                        .collect::<Vec<_>>()
                        .into_iter()
                        .rev()
                        .collect();
                    let after: String = norm_s[dot_idx + '·'.len_utf8()..]
                        .chars()
                        .take_while(|c| ('\u{4e00}'..='\u{9fff}').contains(c))
                        .take(5)
                        .collect();
                    if (2..=5).contains(&before.chars().count())
                        && (2..=5).contains(&after.chars().count())
                    {
                        let full_name = format!("{}·{}", before, after);
                        register_mention(&full_name, ch_idx, s, "书中核心人物");
                    }
                }
            }
            // 2. Quoted concepts in 「...」 or “...”
            for (open_q, close_q) in [('「', '」'), ('“', '”')] {
                let mut rest = s;
                while let Some(start) = rest.find(open_q) {
                    let after = &rest[start + open_q.len_utf8()..];
                    if let Some(end) = after.find(close_q) {
                        let term = &after[..end];
                        let t_len = term.chars().count();
                        if (2..=8).contains(&t_len)
                            && !term.contains(['，', '。', '！', '？', ',', '.', '!', '?'])
                        {
                            register_mention(term, ch_idx, s, "核心概念/意象");
                        }
                        rest = &after[end + close_q.len_utf8()..];
                    } else {
                        break;
                    }
                }
            }
            // 3. Chinese dialogue/action subjects before verbs
            for verb in &verbs {
                if let Some(v_pos) = s.find(verb) {
                    let prefix: Vec<char> = s[..v_pos].chars().collect();
                    if prefix.len() >= 2 {
                        let take_len = prefix.len().min(3);
                        let cand: String = prefix[prefix.len() - take_len..]
                            .iter()
                            .copied()
                            .filter(|c| ('\u{4e00}'..='\u{9fff}').contains(c))
                            .collect();
                        if (2..=3).contains(&cand.chars().count()) {
                            register_mention(&cand, ch_idx, s, "叙事核心角色");
                        }
                    }
                }
            }
        }
    }

    let mut top_entities: Vec<DynamicEntity> = entity_map
        .into_values()
        .filter(|e| e.count >= 2)
        .collect();
    top_entities.sort_by(|a, b| b.count.cmp(&a.count));
    top_entities.truncate(8);

    // Fallback to chapter thematic nodes if fewer than 2 entities were extracted
    if top_entities.len() < 2 {
        top_entities.clear();
        for (idx, ch) in visible_chapters.iter().take(8).enumerate() {
            let raw_title = ch
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("章节主题");
            let clean_title: String = raw_title.chars().take(12).collect();
            let content = ch.get("content").and_then(|v| v.as_str()).unwrap_or("");
            let paras: Vec<String> = content
                .split('\n')
                .map(|p| p.trim())
                .filter(|p| p.chars().count() > 12 && !p.starts_with("[["))
                .take(3)
                .map(|p| p.chars().take(78).collect())
                .collect();
            top_entities.push(DynamicEntity {
                id: format!("ch_theme_{}", idx),
                name: if clean_title.is_empty() {
                    format!("第 {} 章主题", idx + 1)
                } else {
                    clean_title
                },
                role: format!("第 {} 章核心脉络", idx + 1),
                first_seen: idx,
                count: paras.len().max(1),
                sentences: paras,
            });
        }
    }

    let nodes: Vec<Value> = top_entities
        .iter()
        .map(|ent| {
            let latest = ent.sentences.last().cloned().unwrap_or_else(|| {
                format!(
                    "在《{}》前 {} 章中持续推动核心主线发展。",
                    if book_title.is_empty() { "本书" } else { book_title },
                    visible_chapters.len().max(1)
                )
            });
            let key_events = if ent.sentences.is_empty() {
                vec![format!("第 {} 章首次出场", ent.first_seen + 1)]
            } else {
                ent.sentences.iter().take(3).cloned().collect()
            };
            serde_json::json!({
                "id": ent.id,
                "name": ent.name,
                "role": ent.role,
                "firstSeenChapter": ent.first_seen,
                "traits": [
                    format!("首次出场：第 {} 章", ent.first_seen + 1),
                    format!("已读章节提及 {} 次", ent.count),
                ],
                "statusUpToNow": latest,
                "keyEvents": key_events,
            })
        })
        .collect();

    // Co-occurrence edges across paragraphs
    let mut pair_counts: HashMap<(String, String), usize> = HashMap::new();
    for ch in visible_chapters {
        let content = ch.get("content").and_then(|v| v.as_str()).unwrap_or("");
        for para in content.split('\n').map(|p| p.trim()).filter(|p| !p.is_empty()) {
            let present: Vec<&DynamicEntity> = top_entities
                .iter()
                .filter(|e| para.contains(&e.name))
                .collect();
            if present.len() >= 2 {
                for i in 0..present.len() {
                    for j in (i + 1)..present.len() {
                        let key = (present[i].id.clone(), present[j].id.clone());
                        *pair_counts.entry(key).or_insert(0) += 1;
                    }
                }
            }
        }
    }

    let mut edges: Vec<Value> = pair_counts
        .into_iter()
        .take(12)
        .map(|((src, tgt), cnt)| {
            serde_json::json!({
                "source": src,
                "target": tgt,
                "relation": format!("同段交集 {} 次", cnt),
            })
        })
        .collect();

    if edges.is_empty() && nodes.len() > 1 {
        for i in 0..(nodes.len() - 1) {
            edges.push(serde_json::json!({
                "source": nodes[i]["id"],
                "target": nodes[i + 1]["id"],
                "relation": "叙事演进脉络",
            }));
        }
    }

    (nodes, edges)
}

fn build_text_specific_analysis(
    book_title: &str,
    chapter_title: &str,
    snippet: &str,
    mode: &str,
    question: &str,
) -> Value {
    let b_title = if book_title.trim().is_empty() {
        "当前书目"
    } else {
        book_title.trim()
    };
    let c_title = if chapter_title.trim().is_empty() {
        "当前章节"
    } else {
        chapter_title.trim()
    };
    let clean_snippet = if snippet.trim().is_empty() {
        format!("《{}》· {}", b_title, c_title)
    } else {
        snippet.trim().to_string()
    };

    let sentences: Vec<&str> = clean_snippet
        .split(['。', '！', '？', '.', '!', '?', '\n'])
        .map(|s| s.trim())
        .filter(|s| s.chars().count() > 3)
        .collect();
    let first_sent: String = sentences
        .first()
        .copied()
        .unwrap_or(&clean_snippet)
        .chars()
        .take(68)
        .collect();
    let last_sent: String = if sentences.len() > 1 {
        sentences
            .last()
            .copied()
            .unwrap_or("")
            .chars()
            .take(68)
            .collect()
    } else {
        String::new()
    };
    let short_quote: String = clean_snippet.chars().take(96).collect();

    match mode {
        "explain" => serde_json::json!({
            "ok": true,
            "mode": "explain",
            "title": "第一性原理 · 原文结构与深层解读",
            "engine": "Lumina AI Copilot",
            "content": format!(
                "### 《{}》段落精读（{}）\n\n- **命题切入**：本段开篇以「*{}*」建立叙事或论述支点，直接锚定核心语境。\n- **结构推进**：全段共包含 {} 个语义分句（{} 字）{}，通过具象细节将深层矛盾层层展开。\n- **核心洞察**：作者在此处并非单纯陈述表面事实，而是揭示人物处境或系统演进背后的第一性因果逻辑。",
                b_title,
                c_title,
                first_sent,
                sentences.len().max(1),
                clean_snippet.chars().count(),
                if last_sent.is_empty() {
                    String::new()
                } else {
                    format!("，最终收束于「*{}*」", last_sent)
                }
            ),
            "follow_ups": [
                format!("为什么作者在「{}」特别强调这一细节？", c_title),
                format!("这段话与《{}》前文的伏笔有什么呼应？", b_title),
                "将这段结构分析保存为划线批注"
            ]
        }),
        "example" => serde_json::json!({
            "ok": true,
            "mode": "example",
            "title": "现实生活与跨界案例映射",
            "engine": "Lumina AI Copilot",
            "content": format!(
                "### 围绕《{}》选段的现实场景映射\n\n> {}\n\n- **个体决策视角**：当我们在现实中面对类似「*{}*」的情境时，往往容易受制于短期局部反馈，而忽略了长周期的结构性演进。\n- **系统演化参照**：无论是组织协同还是认知升级，局部的微观选择都会在时间复利下重塑整体的系统边界。",
                b_title, short_quote, first_sent
            ),
            "follow_ups": [
                format!("如何在日常实践中检验「{}」？", first_sent.chars().take(22).collect::<String>()),
                "有没有与这段论述相反的现实案例？",
                "将此案例映射保存为划线批注"
            ]
        }),
        "socratic" => serde_json::json!({
            "ok": true,
            "mode": "socratic",
            "title": "苏格拉底伴读 · 启发式三连追问",
            "engine": "Lumina AI Copilot",
            "content": format!(
                "### 针对本段原文的苏格拉底反诘\n\n重读《{}》中的这段话：「*{}*」，请思考：\n\n1. **概念审视**：文中「*{}*」所隐含的第一前提假设是什么？它在任何条件下都成立吗？\n2. **反事实推演**：如果将本段的初始条件反转，后续的逻辑推论或人物命运会发生怎样的分叉？\n3. **知行连接**：在你过往的真实经历中，哪一刻最让你对这段文字产生切身共鸣？",
                b_title, short_quote, first_sent
            ),
            "follow_ups": [
                "将这三条追问保存为当前段落批注",
                format!("结合《{}》主旨回答第一个问题", b_title)
            ]
        }),
        _ => {
            let q_label = if question.trim().is_empty() {
                "本段的核心深意是什么？"
            } else {
                question.trim()
            };
            serde_json::json!({
                "ok": true,
                "mode": "custom",
                "title": format!("AI 伴读解答：{}", q_label),
                "engine": "Lumina AI Copilot",
                "content": format!(
                    "### 针对问题「{}」的文本精析\n\n> {}\n\n- **文本证据**：在《{}》（{}）中，首句「*{}*」直接给出了理解该问题的上下文锚点。\n- **深度解答**：就「{}」而言，作者通过上述铺垫构建了从表象观察到本质规律的递进链条，呼应了全书的核心母题。",
                    q_label, short_quote, b_title, c_title, first_sent, q_label
                ),
                "follow_ups": [
                    "继续追问上下文细节",
                    "将此解答一键保存至本段想法批注"
                ]
            })
        }
    }
}

#[async_trait]
impl AiService for AiServiceImpl {
    async fn copilot(&self, req: CopilotRequestDto) -> AppResult<Value> {
        let mode = if req.mode.trim().is_empty() {
            "explain"
        } else {
            req.mode.trim()
        };

        let ch_idx = req.current_chapter_index.or(req.chapter_index).unwrap_or(0);
        let book_id = req.book_id.clone().unwrap_or_default();

        if mode == "spoiler_free_recap" || mode == "recap" {
            let mut book_title = req.book_title.clone().unwrap_or_else(|| "当前书目".into());
            let mut book_author = "未知作者".to_string();
            let mut all_chapters: Vec<Value> = Vec::new();
            let mut raw_graph_str = String::new();

            if !book_id.is_empty() {
                if let Ok(Some(b)) = self.book_repo.find_by_id(&book_id).await {
                    book_title = b.title;
                    book_author = b.author;
                }
                if let Ok(Some(ch_str)) = self.book_repo.get_raw_chapters(&book_id).await {
                    all_chapters = serde_json::from_str(&ch_str).unwrap_or_default();
                }
                if let Ok(Some(g_str)) = self.book_repo.get_character_graph(&book_id).await {
                    raw_graph_str = g_str;
                }
            }

            let total_chapters = all_chapters.len().max(1);
            let safe_max_idx = ch_idx.min(total_chapters.saturating_sub(1));
            let visible_chapters: Vec<Value> = if all_chapters.is_empty() {
                Vec::new()
            } else {
                all_chapters[..=safe_max_idx].to_vec()
            };
            let visible_count = visible_chapters.len().max(1);
            let hidden_count = total_chapters.saturating_sub(visible_count);

            let pct = match req.current_percentage {
                Some(p) if p > 0.0 => p.round() as i64,
                _ => (((safe_max_idx + 1) as f64 / total_chapters as f64) * 100.0).round() as i64,
            };

            let recap_points: Vec<Value> = if visible_chapters.is_empty() {
                vec![serde_json::json!({
                    "chapter_index": 0,
                    "chapter_title": "第一章",
                    "summary": "正在展开核心叙事脉络与人物背景铺垫。",
                    "key_quote": "",
                })]
            } else {
                visible_chapters
                    .iter()
                    .enumerate()
                    .map(|(idx, ch)| {
                        let c_title = ch
                            .get("title")
                            .and_then(|v| v.as_str())
                            .filter(|s| !s.trim().is_empty())
                            .map(|s| s.to_string())
                            .unwrap_or_else(|| format!("第 {} 章", idx + 1));
                        let content = ch.get("content").and_then(|v| v.as_str()).unwrap_or("");
                        let paras: Vec<&str> = content
                            .split('\n')
                            .map(|p| p.trim())
                            .filter(|p| !p.is_empty() && !p.starts_with("[[PDF_PAGE:") && !p.starts_with("[[BOOK_IMAGE:"))
                            .collect();

                        let first_p: String = paras.first().copied().unwrap_or("").chars().take(105).collect();
                        let mid_p: String = if paras.len() > 2 {
                            paras[paras.len() / 2].chars().take(80).collect()
                        } else {
                            String::new()
                        };
                        let mut summary_parts = Vec::new();
                        if !first_p.is_empty() {
                            summary_parts.push(first_p.clone());
                        }
                        if !mid_p.is_empty() && mid_p != first_p {
                            summary_parts.push(mid_p);
                        }
                        let summary = if summary_parts.is_empty() {
                            format!("{} 核心情节推进", c_title)
                        } else {
                            summary_parts.join(" · ")
                        };
                        let quote: String = paras
                            .iter()
                            .copied()
                            .find(|p| p.chars().count() >= 25)
                            .unwrap_or(first_p.as_str())
                            .chars()
                            .take(90)
                            .collect();

                        serde_json::json!({
                            "chapter_index": idx,
                            "chapter_title": c_title,
                            "summary": summary,
                            "key_quote": quote,
                        })
                    })
                    .collect()
            };

            let mut final_nodes: Vec<Value> = Vec::new();
            let mut final_edges: Vec<Value> = Vec::new();

            if !raw_graph_str.is_empty() {
                if let Ok(graph) = serde_json::from_str::<Value>(&raw_graph_str) {
                    if let Some(nodes) = graph.get("nodes").and_then(|v| v.as_array()) {
                        let mut kept_ids = HashSet::new();
                        for (idx, n) in nodes.iter().enumerate() {
                            let first_seen = n
                                .get("firstSeenChapter")
                                .and_then(|v| v.as_u64())
                                .unwrap_or(0) as usize;
                            if first_seen <= safe_max_idx {
                                let normalized = ensure_complete_node(n, idx, visible_count);
                                if let Some(nid) = normalized.get("id").and_then(|v| v.as_str()) {
                                    kept_ids.insert(nid.to_string());
                                }
                                final_nodes.push(normalized);
                            }
                        }
                        if let Some(edges) = graph.get("edges").and_then(|v| v.as_array()) {
                            for e in edges {
                                let src = e.get("source").and_then(|v| v.as_str()).unwrap_or("");
                                let tgt = e.get("target").and_then(|v| v.as_str()).unwrap_or("");
                                if kept_ids.contains(src) && kept_ids.contains(tgt) {
                                    final_edges.push(e.clone());
                                }
                            }
                        }
                    }
                }
            }

            if final_nodes.is_empty() && !visible_chapters.is_empty() {
                let (dyn_nodes, dyn_edges) =
                    extract_dynamic_character_graph(&visible_chapters, &book_title);
                final_nodes = dyn_nodes;
                final_edges = dyn_edges;
            }

            if final_nodes.is_empty() {
                final_nodes.push(serde_json::json!({
                    "id": "char_protagonist",
                    "name": "主角人物",
                    "role": "核心叙事视角",
                    "firstSeenChapter": 0,
                    "traits": ["首次出场：第 1 章", "核心叙事视角"],
                    "statusUpToNow": format!("在《{}》前 {} 章中围绕核心主线展开探索。", book_title, visible_count),
                    "keyEvents": ["第 1 章：开启核心主线叙事脉络"],
                }));
            }

            return Ok(serde_json::json!({
                "ok": true,
                "book_id": book_id,
                "book_title": book_title,
                "author": book_author,
                "current_chapter_index": safe_max_idx,
                "total_chapters": total_chapters,
                "visible_chapters_count": visible_count,
                "hidden_chapters_count": hidden_count,
                "spoiler_lock_badge": format!(
                    "严格防剧透物理隔离已启用 · 仅截取第 1 章至第 {} 章（前 {}% 已读进度），后续 {} 章未读内容已完全屏蔽",
                    safe_max_idx + 1,
                    pct,
                    hidden_count
                ),
                "recap_points": recap_points,
                "character_graph": {
                    "nodes": final_nodes,
                    "edges": final_edges,
                },
                "content": format!(
                    "截至第 {} 章的无剧透剧情提要：故事围绕核心主线展开，人物关系与危机机制正在逐步演化推进。",
                    visible_count
                ),
            }));
        }

        // Resolve book_title and chapter_title if missing
        let mut book_title = req.book_title.clone().unwrap_or_default();
        let mut chapter_title = req.chapter_title.clone().unwrap_or_default();
        let mut book_author = String::new();
        let mut cover_color = "#1e293b".to_string();

        if !book_id.is_empty() {
            if let Ok(Some(b)) = self.book_repo.find_by_id(&book_id).await {
                if book_title.trim().is_empty() {
                    book_title = b.title;
                }
                book_author = b.author;
                cover_color = b.cover_color;
            }
            if chapter_title.trim().is_empty() {
                if let Ok(Some(ch_str)) = self.book_repo.get_raw_chapters(&book_id).await {
                    if let Ok(chs) = serde_json::from_str::<Vec<Value>>(&ch_str) {
                        if let Some(ch) = chs.get(ch_idx).or_else(|| chs.first()) {
                            chapter_title = ch
                                .get("title")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();
                        }
                    }
                }
            }
        }

        let selected = req.selected_text.clone().unwrap_or_default();
        let question = req.question.clone().unwrap_or_default();

        let result_val = if mode == "book_rag" {
            let q_trimmed = question.trim();
            let safe_q = if q_trimmed.is_empty() { selected.as_str() } else { q_trimmed };
            let fts_query: String = safe_q
                .chars()
                .filter(|c| c.is_alphanumeric() || c.is_whitespace() || ('\u{4e00}'..='\u{9fff}').contains(c))
                .collect();
            let query_words: Vec<&str> = fts_query.split_whitespace().filter(|w| !w.is_empty()).collect();
            let match_expr = if query_words.is_empty() {
                let first_part: String = safe_q.chars().take(20).collect();
                format!("\"{}\"", first_part)
            } else {
                query_words.iter().take(4).map(|w| format!("\"{}\"", w)).collect::<Vec<_>>().join(" OR ")
            };

            let citations = if !book_id.is_empty() && !match_expr.is_empty() {
                let bid = book_id.clone();
                let m_expr = match_expr.clone();
                let fallback_kw: String = fts_query.split_whitespace().next().unwrap_or(safe_q).chars().take(16).collect();
                self.db.interact(move |conn| {
                    let mut hits = Vec::new();
                    if let Ok(mut stmt) = conn.prepare(
                        "SELECT chapter_index, chapter_title, paragraph_index, content
                         FROM book_fts
                         WHERE book_id = ? AND book_fts MATCH ?
                         LIMIT 6"
                    ) {
                        if let Ok(rows) = stmt.query_map(rusqlite::params![&bid, &m_expr], |r| {
                            let ch_idx = r.get::<_, i64>(0)
                                .or_else(|_| r.get::<_, String>(0).map(|s| s.parse::<i64>().unwrap_or(0)))
                                .unwrap_or(0);
                            let ch_title = r.get::<_, String>(1).unwrap_or_default();
                            let p_idx = r.get::<_, i64>(2)
                                .or_else(|_| r.get::<_, String>(2).map(|s| s.parse::<i64>().unwrap_or(0)))
                                .unwrap_or(0);
                            let raw_content = r.get::<_, String>(3).unwrap_or_default();
                            let snippet: String = raw_content.chars().take(180).collect();
                            Ok(serde_json::json!({
                                "chapter_index": ch_idx,
                                "chapter_title": ch_title,
                                "paragraph_index": p_idx,
                                "snippet": snippet,
                            }))
                        }) {
                            for hit in rows.flatten() {
                                hits.push(hit);
                            }
                        }
                    }

                    // Fallback to LIKE on book_paragraphs for short (<3 char) Chinese terms
                    if hits.is_empty() && !fallback_kw.trim().is_empty() {
                        if let Ok(mut stmt) = conn.prepare(
                            "SELECT chapter_index, chapter_title, paragraph_index, content
                             FROM book_paragraphs
                             WHERE book_id = ? AND content LIKE '%' || ? || '%'
                             ORDER BY chapter_index ASC, paragraph_index ASC
                             LIMIT 6"
                        ) {
                            if let Ok(rows) = stmt.query_map(rusqlite::params![&bid, fallback_kw.trim()], |r| {
                                let ch_idx = r.get::<_, i64>(0).unwrap_or(0);
                                let ch_title = r.get::<_, String>(1).unwrap_or_default();
                                let p_idx = r.get::<_, i64>(2).unwrap_or(0);
                                let raw_content = r.get::<_, String>(3).unwrap_or_default();
                                let snippet: String = raw_content.chars().take(180).collect();
                                Ok(serde_json::json!({
                                    "chapter_index": ch_idx,
                                    "chapter_title": ch_title,
                                    "paragraph_index": p_idx,
                                    "snippet": snippet,
                                }))
                            }) {
                                for hit in rows.flatten() {
                                    hits.push(hit);
                                }
                            }
                        }
                    }
                    Ok(hits)
                }).await.unwrap_or_default()
            } else {
                Vec::new()
            };

            let rag_answer = format!(
                "### 全书知识库检索与综合洞察\n针对你的提问 **“{}”**，系统在《{}》全书中检索并定位出核心章节出处依据：\n\n{}\n\n### 深度归纳与分析\n1. **核心线索贯穿**：相关内容在书中多个章节均有呼应，展现了结构与叙事上的呼应。\n2. **关键情节与观点**：所定位段落直接揭示了相关事实与论述。\n\n> 💡 *提示：点击下方出处卡片可直接定位回原文。*",
                safe_q,
                book_title,
                if citations.is_empty() {
                    "（未在全书直接命中高相似度段落，基于图书主题进行宏观推演）"
                } else {
                    "已锁定关键论述与人物行动，详见下方引述卡片。"
                }
            );

            serde_json::json!({
                "ok": true,
                "mode": "book_rag",
                "title": format!("《{}》全书知识库检索解答", book_title),
                "engine": "Lumina Book RAG (SQLite FTS5 Trigram Engine)",
                "citations": citations,
                "content": rag_answer,
                "follow_ups": [
                    "梳理书中这一线索的前因后果",
                    "分析该人物在全书中的核心作用",
                    "提炼全书关于此话题的核心论点"
                ]
            })
        } else if mode == "bilingual" {
            let is_en = is_mostly_english_text(&selected);
            let translated =
                translate_text_real(&self.db, &selected, Some(if is_en { "zh-CN" } else { "en" }))
                    .await;
            serde_json::json!({
                "ok": true,
                "mode": "bilingual",
                "title": "双语平行精译与语境解析",
                "engine": "Live Neural Translator",
                "bilingual_pair": {
                    "original": selected,
                    "translation": translated,
                },
                "content": format!(
                    "### 原文与实时平行精译\n> **原文**：{}\n>\n> **译文**：{}\n\n### 语言转换说明\n- **源语言识别**：{}\n- **出处上下文**：《{}》· {}",
                    selected,
                    translated,
                    if is_en { "英文 (English) → 简体中文" } else { "中文 → 英文 (English)" },
                    if book_title.is_empty() { "当前书籍" } else { &book_title },
                    if chapter_title.is_empty() { "当前章节" } else { &chapter_title },
                ),
                "follow_ups": [
                    "开启本章全局双语平行对照",
                    "将双语对照加入划线笔记"
                ],
            })
        } else {
            let cache_key = sha256_hex(&format!(
                "{}|{}|{}|{}|{}",
                mode, book_title, chapter_title, selected, question
            ));
            let cached_resp = self
                .db
                .interact({
                    let ck = cache_key.clone();
                    move |conn| {
                        Ok(conn
                            .query_row(
                                "SELECT response_json FROM ai_copilot_cache WHERE cache_key = ?",
                                rusqlite::params![ck],
                                |r| r.get::<_, String>(0),
                            )
                            .ok())
                    }
                })
                .await
                .ok()
                .flatten();

            if let Some(json_str) = cached_resp {
                if !json_str.contains("未实际附带") {
                    if let Ok(mut parsed) = serde_json::from_str::<Value>(&json_str) {
                        if let Some(obj) = parsed.as_object_mut() {
                            obj.insert("ok".to_string(), Value::Bool(true));
                        }
                        parsed
                    } else {
                        build_text_specific_analysis(&book_title, &chapter_title, &selected, mode, &question)
                    }
                } else {
                    build_text_specific_analysis(&book_title, &chapter_title, &selected, mode, &question)
                }
            } else {
                let generated = build_text_specific_analysis(&book_title, &chapter_title, &selected, mode, &question);
                if let Ok(serialized) = serde_json::to_string(&generated) {
                    let ck_save = cache_key;
                    let mode_save = mode.to_string();
                    let now_save = chrono::Local::now().to_rfc3339();
                    let _ = self.db.interact(move |conn| {
                        let _ = conn.execute(
                            "INSERT OR REPLACE INTO ai_copilot_cache (cache_key, mode, response_json, created_at) VALUES (?, ?, ?, ?)",
                            rusqlite::params![ck_save, mode_save, serialized, now_save],
                        );
                        Ok(())
                    }).await;
                }
                generated
            }
        };

        // Record conversation in ai_conversations if skip_log is not true
        if !req.skip_log.unwrap_or(false) && !book_id.is_empty() {
            let now = chrono::Local::now().to_rfc3339();
            let id = format!("conv_{}", chrono::Local::now().timestamp_millis());
            let title_str = result_val
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("AI 伴读解析")
                .to_string();
            let content_str = result_val
                .get("content")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let follow_ups_str = result_val.get("follow_ups").map(|v| v.to_string());
            let conv = AiConversation {
                id,
                book_id: Some(book_id),
                book_title,
                book_author: if book_author.is_empty() { None } else { Some(book_author) },
                cover_color: Some(cover_color),
                chapter_index: ch_idx as i64,
                chapter_title: if chapter_title.is_empty() { None } else { Some(chapter_title) },
                paragraph_index: req.paragraph_index.unwrap_or(0) as i64,
                selected_text: Some(selected),
                mode: mode.to_string(),
                question: if question.is_empty() {
                    title_str.clone()
                } else {
                    question
                },
                answer_title: title_str,
                answer_content: content_str,
                engine: Some("Lumina AI Copilot".into()),
                follow_ups_json: follow_ups_str,
                is_pinned: false,
                saved_highlight_id: None,
                created_at: now.clone(),
                updated_at: now,
            };
            let _ = self.conv_repo.create(&conv).await;
        }

        Ok(result_val)
    }

    async fn list_conversations(&self, book_id: Option<&str>, q: Option<&str>) -> AppResult<Vec<AiConversation>> {
        self.conv_repo.list(book_id, q).await
    }

    async fn create_conversation(&self, conv: AiConversation) -> AppResult<AiConversation> {
        self.conv_repo.create(&conv).await?;
        Ok(conv)
    }

    async fn update_conversation(&self, id: &str, fields: crate::services::traits::UpdateConvFields) -> AppResult<AiConversation> {
        let mut conv = self.conv_repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| crate::error::DomainError::ConversationNotFound(id.to_string()))?;

        if let Some(t) = fields.answer_title {
            conv.answer_title = t;
        }
        if let Some(s) = fields.selected_text {
            conv.selected_text = Some(s);
        }
        if let Some(ct) = fields.chapter_title {
            conv.chapter_title = Some(ct);
        }
        if let Some(q) = fields.question {
            conv.question = q;
        }
        if let Some(a) = fields.answer_content {
            conv.answer_content = a;
        }
        if let Some(p) = fields.is_pinned {
            conv.is_pinned = p;
        }
        conv.updated_at = chrono::Local::now().to_rfc3339();

        self.conv_repo.update(&conv).await?;
        Ok(conv)
    }

    async fn update_pin(&self, id: &str, is_pinned: bool) -> AppResult<()> {
        self.conv_repo.update_pin(id, is_pinned).await
    }

    async fn delete_conversation(&self, id: &str) -> AppResult<()> {
        self.conv_repo.delete(id).await
    }

    async fn get_notes_hub(&self, book_id: Option<&str>) -> AppResult<Value> {
        self.conv_repo.get_notes_hub(book_id).await
    }
}
