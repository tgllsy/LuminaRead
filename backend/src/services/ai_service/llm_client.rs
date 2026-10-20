use std::sync::OnceLock;
use serde_json::Value;

use crate::services::traits::ChatHistoryItemDto;

static SHARED_AI_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

fn get_ai_client(proxy: &str) -> Option<reqwest::Client> {
    if proxy.is_empty() {
        return Some(SHARED_AI_CLIENT.get_or_init(|| {
            reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(60))
                .pool_idle_timeout(std::time::Duration::from_secs(90))
                .tcp_nodelay(true)
                .build()
                .unwrap_or_default()
        }).clone());
    }
    let mut builder = reqwest::Client::builder().timeout(std::time::Duration::from_secs(60));
    if let Ok(p) = reqwest::Proxy::all(proxy) {
        builder = builder.proxy(p);
    }
    builder.build().ok()
}

pub async fn call_real_llm_copilot(
    book_title: &str,
    chapter_title: &str,
    selected: &str,
    mode: &str,
    question: &str,
    history: Option<&[ChatHistoryItemDto]>,
) -> Option<Value> {
    let cfg = crate::config::current_config();
    let api_key = cfg.ai.api_key.trim();
    if api_key.is_empty() {
        return None;
    }

    let b_title = if book_title.trim().is_empty() { "当前书目" } else { book_title.trim() };
    let c_title = if chapter_title.trim().is_empty() { "当前章节" } else { chapter_title.trim() };
    let clean_sel = selected.trim();

    let system_prompt = format!(
        r#"你是一位极富智慧、渊博且亲切真诚的读书伴侣导师。你正与读者并肩精读《{}》（{}）。
读者当前视线聚焦的选段内容如下：
“{}”

请遵循以下核心准则进行回答：
1. 真诚自然：像一位坐在身边的读书朋友一样交流，语言生动、直率、深刻。具备连贯的会话记忆，结合前文探讨的主题自然承接与深入。
2. 严禁任何模板化八股文套话（严禁输出类似“针对问题XX的文本精析”、“就XX而言，作者通过上述铺垫构建了递进链条”等机械描述！）。
3. 如果读者只是日常打招呼（如“你好”、“在吗”），请温暖亲切地问候，并简短表达你已准备好与读者就本书本章内容展开探讨即可。
4. 如果读者提出问题、质疑或要求解析，结合原书与上下文深度解答，言之有物，给出真正的启发。
5. 采用清晰优美的 Markdown 格式排版。"#,
        b_title,
        c_title,
        if clean_sel.is_empty() { "（未圈选特定文字，阅读当前章节中）" } else { clean_sel }
    );

    let user_prompt = if question.trim().is_empty() {
        match mode {
            "socratic" => "请针对这段原文的核心论述，提出具有启发性的深层反思与反事实推演。".to_string(),
            "intertextual" => "请给出与本段核心论题相呼应或产生激烈学术/思想交锋的其他经典著作观点对照。".to_string(),
            _ => "请为我提炼本段的核心洞见与关键启示。".to_string(),
        }
    } else {
        question.trim().to_string()
    };

    let client = get_ai_client(cfg.proxy_url.trim())?;

    let base_url = if cfg.ai.api_base_url.trim().is_empty() {
        "https://api.deepseek.com/v1"
    } else {
        cfg.ai.api_base_url.trim().trim_end_matches('/')
    };

    let model_name = if cfg.ai.model.trim().is_empty() {
        "deepseek-v4-flash"
    } else {
        cfg.ai.model.trim()
    };

    let mut messages = vec![serde_json::json!({
        "role": "system",
        "content": system_prompt
    })];

    if let Some(hist) = history {
        for item in hist {
            let r = if item.role == "assistant" { "assistant" } else { "user" };
            let c = item.content.trim();
            if !c.is_empty() {
                messages.push(serde_json::json!({
                    "role": r,
                    "content": c
                }));
            }
        }
    }

    messages.push(serde_json::json!({
        "role": "user",
        "content": user_prompt
    }));

    let mut payload = serde_json::json!({
        "model": model_name,
        "messages": messages,
        "temperature": cfg.ai.temperature,
        "max_tokens": cfg.ai.max_tokens.max(2048)
    });

    if model_name.contains("deepseek") || base_url.contains("deepseek") {
        if let Some(obj) = payload.as_object_mut() {
            obj.insert("thinking".to_string(), serde_json::json!({"type": "disabled"}));
        }
    }

    let resp = match client
        .post(format!("{}/chat/completions", base_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::warn!("AI LLM request send failed: {}", e);
            return None;
        }
    };

    if !resp.status().is_success() {
        let status = resp.status();
        let err_text = resp.text().await.unwrap_or_default();
        tracing::warn!("AI LLM request failed with status: {}, body: {}", status, err_text);
        return None;
    }

    let json_val = resp.json::<Value>().await.ok()?;
    let msg_obj = json_val
        .get("choices")
        .and_then(|c| c.as_array())
        .and_then(|arr| arr.first())
        .and_then(|item| item.get("message"));

    let raw_content = msg_obj
        .and_then(|m| m.get("content"))
        .and_then(|s| s.as_str())
        .unwrap_or("")
        .trim()
        .to_string();

    let content = if raw_content.is_empty() {
        msg_obj
            .and_then(|m| m.get("reasoning_content"))
            .and_then(|s| s.as_str())
            .unwrap_or("")
            .trim()
            .to_string()
    } else {
        raw_content
    };

    if content.is_empty() {
        return None;
    }

    let q_display = if question.trim().is_empty() { "深度伴读解析" } else { question.trim() };

    Some(serde_json::json!({
        "ok": true,
        "mode": mode,
        "title": format!("AI 伴读 · {}", q_display),
        "engine": format!("Lumina AI ({})", model_name),
        "content": content,
        "follow_ups": [
            "结合全书核心母题展开分析",
            "寻找原书中的反面论据",
            "提炼为划线想法笔记"
        ]
    }))
}

pub fn build_text_specific_analysis(
    book_title: &str,
    chapter_title: &str,
    snippet: &str,
    mode: &str,
    question: &str,
) -> Value {
    let b_title = if book_title.trim().is_empty() { "当前书目" } else { book_title.trim() };
    let c_title = if chapter_title.trim().is_empty() { "当前章节" } else { chapter_title.trim() };
    let q_trim = question.trim();

    let is_greeting = q_trim.eq_ignore_ascii_case("你好")
        || q_trim.eq_ignore_ascii_case("您好")
        || q_trim.eq_ignore_ascii_case("hi")
        || q_trim.eq_ignore_ascii_case("hello")
        || q_trim.eq_ignore_ascii_case("在吗")
        || q_trim.eq_ignore_ascii_case("在不在");

    if is_greeting {
        return serde_json::json!({
            "ok": true,
            "mode": mode,
            "title": "AI 伴读问候",
            "engine": "Lumina AI Copilot",
            "content": format!("你好！我是你的读书伴读助手。很高兴与你一同精读《{}》（{}）。\n\n你可以随时圈选文本向我提问，或直接输入你想探讨的核心思想、人物动机与结构分析！", b_title, c_title),
            "follow_ups": [
                "解析当前章节核心思想",
                "梳理当前章节的关键矛盾",
                "提炼关键启示与行动建议"
            ]
        });
    }

    let cfg = crate::config::current_config();
    if cfg.ai.api_key.trim().is_empty() {
        return serde_json::json!({
            "ok": true,
            "mode": mode,
            "title": "AI 伴读配置提示",
            "engine": "Lumina AI Copilot",
            "content": format!(
                "### 💡 AI 大模型伴读未配置\n\n当前尚未配置 AI 密钥 (`api_key`)。\n\n如需开启 DeepSeek V4 Flash 真实大模型深度思辨与对话交互，请在生产环境配置文件 (`config.toml`) 的 `[ai]` 分组中填入您的密钥：\n\n```toml\n[ai]\napi_key = \"sk-e094...\"\napi_base_url = \"https://api.deepseek.com/v1\"\nmodel = \"deepseek-v4-flash\"\n```\n\n保存配置后重启服务即可畅享全自动大模型伴读推演。"
            ),
            "follow_ups": ["查看当前章节概要", "解析当前段落逻辑"]
        });
    }

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
    let first_sent: String = sentences.first().copied().unwrap_or(&clean_snippet).chars().take(68).collect();
    let last_sent: String = if sentences.len() > 1 {
        sentences.last().copied().unwrap_or("").chars().take(68).collect()
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
                b_title, c_title, first_sent, sentences.len().max(1), clean_snippet.chars().count(),
                if last_sent.is_empty() { String::new() } else { format!("，最终收束于「*{}*」", last_sent) }
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
            let q_label = if question.trim().is_empty() { "本段的核心深意是什么？" } else { question.trim() };
            serde_json::json!({
                "ok": true,
                "mode": "custom",
                "title": format!("AI 伴读解答：{}", q_label),
                "engine": "Lumina AI Copilot",
                "content": format!(
                    "### 针对问题「{}」的文本精析\n\n> {}\n\n- **文本证据**：在《{}》（{}）中，首句「*{}*」直接给出了理解该问题的上下文锚点。\n- **深度解答**：就「{}」而言，作者通过上述铺垫构建了从表象观察到本质规律的递进链条，呼应了全书的核心母题。",
                    q_label, short_quote, b_title, c_title, first_sent, q_label
                ),
                "follow_ups": ["继续追问上下文细节", "将此解答一键保存至本段想法批注"]
            })
        }
    }
}
