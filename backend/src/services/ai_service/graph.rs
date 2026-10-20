use serde_json::Value;
use std::collections::{HashMap, HashSet};

use super::translation_engine::sha256_hex;

#[derive(Clone)]
struct DynamicEntity {
    id: String,
    name: String,
    role: String,
    first_seen: usize,
    count: usize,
    sentences: Vec<String>,
}

pub fn ensure_complete_node(node: &Value, idx: usize, visible_len: usize) -> Value {
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
        .unwrap_or_else(|| vec![format!("首次出场：第 {} 章", first_seen + 1), role.clone()]);

    let status_up_to_now = node
        .get("statusUpToNow")
        .and_then(|v| v.as_str())
        .filter(|s| !s.trim().is_empty())
        .map(|s| s.to_string())
        .unwrap_or_else(|| format!("在前 {} 章已读叙事中持续推进核心情节线索。", visible_len.max(1)));

    let key_events: Vec<String> = node
        .get("keyEvents")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|x| x.as_str().map(|s| s.to_string()))
                .collect()
        })
        .filter(|v: &Vec<String>| !v.is_empty())
        .unwrap_or_else(|| vec![format!("第 {} 章解锁出场", first_seen + 1), status_up_to_now.clone()]);

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

fn get_stop_words() -> HashSet<&'static str> {
    [
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
    .collect()
}

fn register_candidate_entity(
    entity_map: &mut HashMap<String, DynamicEntity>,
    stop_words: &HashSet<&'static str>,
    raw_name: &str,
    ch_idx: usize,
    sentence: &str,
    role_hint: &str,
) {
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
}

fn scan_sentence_patterns(
    entity_map: &mut HashMap<String, DynamicEntity>,
    stop_words: &HashSet<&'static str>,
    ch_idx: usize,
    s: &str,
) {
    let verbs = [
        "说道", "问道", "答道", "喊道", "叫道", "低声道", "冷笑道", "笑着说", "大声说",
        "想道", "心想", "凝视着", "望着", "看着", "告诉", "认为", "决定", "发现", "意识到",
        "率领", "下令", "命令", "带领", "得知", "听闻", "明白", "来到", "回到",
    ];

    if s.contains(['·', '•', '・']) {
        let norm_s = s.replace(['•', '・'], "·");
        for (dot_idx, _) in norm_s.match_indices('·') {
            let before: String = norm_s[..dot_idx].chars().rev().take_while(|c| ('\u{4e00}'..='\u{9fff}').contains(c)).take(5).collect::<Vec<_>>().into_iter().rev().collect();
            let after: String = norm_s[dot_idx + '·'.len_utf8()..].chars().take_while(|c| ('\u{4e00}'..='\u{9fff}').contains(c)).take(5).collect();
            if (2..=5).contains(&before.chars().count()) && (2..=5).contains(&after.chars().count()) {
                let full_name = format!("{}·{}", before, after);
                register_candidate_entity(entity_map, stop_words, &full_name, ch_idx, s, "书中核心人物");
            }
        }
    }

    for (open_q, close_q) in [('「', '」'), ('“', '”')] {
        let mut rest = s;
        while let Some(start) = rest.find(open_q) {
            let after = &rest[start + open_q.len_utf8()..];
            if let Some(end) = after.find(close_q) {
                let term = &after[..end];
                if (2..=8).contains(&term.chars().count()) && !term.contains(['，', '。', '！', '？', ',', '.', '!', '?']) {
                    register_candidate_entity(entity_map, stop_words, term, ch_idx, s, "核心概念/意象");
                }
                rest = &after[end + close_q.len_utf8()..];
            } else {
                break;
            }
        }
    }

    for verb in &verbs {
        if let Some(v_pos) = s.find(verb) {
            let prefix: Vec<char> = s[..v_pos].chars().collect();
            if prefix.len() >= 2 {
                let take_len = prefix.len().min(3);
                let cand: String = prefix[prefix.len() - take_len..].iter().copied().filter(|c| ('\u{4e00}'..='\u{9fff}').contains(c)).collect();
                if (2..=3).contains(&cand.chars().count()) {
                    register_candidate_entity(entity_map, stop_words, &cand, ch_idx, s, "叙事核心角色");
                }
            }
        }
    }
}

fn fallback_thematic_nodes(visible_chapters: &[Value]) -> Vec<DynamicEntity> {
    let mut entities = Vec::new();
    for (idx, ch) in visible_chapters.iter().take(8).enumerate() {
        let raw_title = ch.get("title").and_then(|v| v.as_str()).unwrap_or("章节主题");
        let clean_title: String = raw_title.chars().take(12).collect();
        let content = ch.get("content").and_then(|v| v.as_str()).unwrap_or("");
        let paras: Vec<String> = content
            .split('\n')
            .map(|p| p.trim())
            .filter(|p| p.chars().count() > 12 && !p.starts_with("[["))
            .take(3)
            .map(|p| p.chars().take(78).collect())
            .collect();
        entities.push(DynamicEntity {
            id: format!("ch_theme_{}", idx),
            name: if clean_title.is_empty() { format!("第 {} 章主题", idx + 1) } else { clean_title },
            role: format!("第 {} 章核心脉络", idx + 1),
            first_seen: idx,
            count: paras.len().max(1),
            sentences: paras,
        });
    }
    entities
}

fn compute_cooccurrence_edges(visible_chapters: &[Value], top_entities: &[DynamicEntity], nodes: &[Value]) -> Vec<Value> {
    let mut pair_counts: HashMap<(String, String), usize> = HashMap::new();
    for ch in visible_chapters {
        let content = ch.get("content").and_then(|v| v.as_str()).unwrap_or("");
        for para in content.split('\n').map(|p| p.trim()).filter(|p| !p.is_empty()) {
            let present: Vec<&DynamicEntity> = top_entities.iter().filter(|e| para.contains(&e.name)).collect();
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
    edges
}

pub fn extract_dynamic_character_graph(visible_chapters: &[Value], book_title: &str) -> (Vec<Value>, Vec<Value>) {
    let stop_words = get_stop_words();
    let mut entity_map: HashMap<String, DynamicEntity> = HashMap::new();

    for (ch_idx, ch) in visible_chapters.iter().enumerate() {
        let content = ch.get("content").and_then(|v| v.as_str()).unwrap_or("");
        for sent in content.split(['。', '！', '？', '\n', '.', '!', '?']) {
            let s = sent.trim();
            if s.is_empty() || s.starts_with("[[PDF_PAGE:") || s.starts_with("[[BOOK_IMAGE:") {
                continue;
            }
            scan_sentence_patterns(&mut entity_map, &stop_words, ch_idx, s);
        }
    }

    let mut top_entities: Vec<DynamicEntity> = entity_map.into_values().filter(|e| e.count >= 2).collect();
    top_entities.sort_by(|a, b| b.count.cmp(&a.count));
    top_entities.truncate(8);

    if top_entities.len() < 2 {
        top_entities = fallback_thematic_nodes(visible_chapters);
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

    let edges = compute_cooccurrence_edges(visible_chapters, &top_entities, &nodes);
    (nodes, edges)
}
