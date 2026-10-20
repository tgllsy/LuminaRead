#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TtsRoleSegment {
    pub text: String,
    pub is_dialogue: bool,
}

pub fn is_matching_close_quote(open: char, close: char) -> bool {
    matches!(
        (open, close),
        ('“', '”')
            | ('‘', '’')
            | ('「', '」')
            | ('『', '』')
            | ('〝', '〞')
            | ('«', '»')
            | ('‹', '›')
            | ('"', '"')
    )
}

fn unescape_quotes(text: &str) -> String {
    text.replace("&quot;", "\"")
        .replace("&ldquo;", "“")
        .replace("&rdquo;", "”")
        .replace("&lsquo;", "‘")
        .replace("&rsquo;", "’")
        .replace("&apos;", "'")
        .replace("&#34;", "\"")
        .replace("&#39;", "'")
        .replace("&amp;", "&")
}

fn check_quote_char(ch: char, i: usize, chars: &[char], in_dialogue: bool) -> (bool, bool) {
    let len = chars.len();
    let is_open_quote = match ch {
        '“' | '「' | '『' | '〝' | '«' | '‹' => true,
        '‘' => {
            let prev_is_alpha = i > 0 && chars[i - 1].is_ascii_alphabetic();
            let next_is_alpha = i + 1 < len && chars[i + 1].is_ascii_alphabetic();
            !(prev_is_alpha && next_is_alpha)
        }
        '"' if !in_dialogue => true,
        _ => false,
    };

    let is_close_quote = match ch {
        '”' | '」' | '』' | '〞' | '»' | '›' => true,
        '’' => {
            let prev_is_alpha = i > 0 && chars[i - 1].is_ascii_alphabetic();
            let next_is_alpha = i + 1 < len && chars[i + 1].is_ascii_alphabetic();
            !(prev_is_alpha && next_is_alpha)
        }
        '"' if in_dialogue => true,
        _ => false,
    };
    (is_open_quote, is_close_quote)
}

fn filter_fake_dialogue(segments: &mut [TtsRoleSegment]) {
    for idx in 0..segments.len() {
        if segments[idx].is_dialogue {
            let t = segments[idx].text.trim();
            let char_len = t.chars().count();
            let ends_with_sentence_punct = t.ends_with(['。', '！', '？', '!', '?', '…', '~', '.']);
            let prev_ends_with_colon = idx > 0 && {
                let prev = segments[idx - 1].text.trim();
                prev.ends_with(['：', ':'])
            };
            let is_real = ends_with_sentence_punct || prev_ends_with_colon || char_len >= 15;
            if !is_real {
                segments[idx].is_dialogue = false;
            }
        }
    }
}

fn merge_consecutive_segments(segments: Vec<TtsRoleSegment>) -> Vec<TtsRoleSegment> {
    let mut merged: Vec<TtsRoleSegment> = Vec::with_capacity(segments.len());
    for seg in segments {
        if let Some(last) = merged.last_mut() {
            if last.is_dialogue == seg.is_dialogue {
                last.text.push_str(&seg.text);
                continue;
            }
        }
        merged.push(seg);
    }
    merged
}

pub fn parse_dialogue_segments(text: &str) -> Vec<TtsRoleSegment> {
    let unescaped = unescape_quotes(text);
    let chars: Vec<char> = unescaped.chars().collect();
    let len = chars.len();
    let mut segments: Vec<TtsRoleSegment> = Vec::new();
    let mut current = String::new();
    let mut in_dialogue = false;
    let mut quote_open_char = '\0';

    let mut i = 0;
    while i < len {
        let ch = chars[i];
        let (is_open, is_close) = check_quote_char(ch, i, &chars, in_dialogue);

        if !in_dialogue && is_open {
            let seg_text = current.trim().to_string();
            if !seg_text.is_empty() {
                segments.push(TtsRoleSegment { text: seg_text, is_dialogue: false });
            }
            current.clear();
            in_dialogue = true;
            quote_open_char = ch;
            i += 1;
            continue;
        }

        if in_dialogue && (is_close || (quote_open_char != '\0' && is_matching_close_quote(quote_open_char, ch))) {
            let seg_text = current.trim().to_string();
            if !seg_text.is_empty() {
                segments.push(TtsRoleSegment { text: seg_text, is_dialogue: true });
            }
            current.clear();
            in_dialogue = false;
            quote_open_char = '\0';
            i += 1;
            continue;
        }

        current.push(ch);
        i += 1;
    }

    let tail = current.trim().to_string();
    if !tail.is_empty() {
        segments.push(TtsRoleSegment { text: tail, is_dialogue: in_dialogue });
    }
    if segments.is_empty() && !text.trim().is_empty() {
        segments.push(TtsRoleSegment { text: text.trim().to_string(), is_dialogue: false });
    }

    filter_fake_dialogue(&mut segments);
    merge_consecutive_segments(segments)
}

pub fn resolve_dual_role_voices<'a>(
    voice: Option<&'a str>,
    dialogue_voice: Option<&'a str>,
) -> (&'a str, &'a str) {
    let raw_v = voice.unwrap_or("").trim();
    let raw_d = dialogue_voice.unwrap_or("").trim();

    if raw_v == "drama-yunxi-xiaoxiao" {
        return ("zh-CN-YunxiNeural", "zh-CN-XiaoxiaoNeural");
    }
    if raw_v == "drama-yunjian-xiaoxiao" || raw_v == "drama-cn-classic" {
        return ("zh-CN-YunjianNeural", "zh-CN-XiaoxiaoNeural");
    }
    if raw_v.starts_with("drama-") {
        return ("zh-CN-YunxiNeural", "zh-CN-XiaoxiaoNeural");
    }

    let narration = if raw_v.is_empty() { "zh-CN-YunxiNeural" } else { raw_v };
    let dialogue = if raw_d.is_empty() || raw_d.starts_with("drama-") {
        if narration == "zh-CN-YunxiNeural" || narration == "zh-CN-YunjianNeural" {
            "zh-CN-XiaoxiaoNeural"
        } else {
            narration
        }
    } else {
        raw_d
    };

    (narration, dialogue)
}

pub fn map_to_edge_voice<'a>(voice: &'a str) -> (&'a str, &'static str, &'static str) {
    match voice {
        "zh-CN-XiaoxiaoNeural" => ("zh-CN-XiaoxiaoNeural", "+0Hz", "+0%"),
        "zh-CN-YunxiNeural" => ("zh-CN-YunxiNeural", "+0Hz", "+0%"),
        "zh-CN-YunjianNeural" => ("zh-CN-YunjianNeural", "+0Hz", "+0%"),
        "zh-CN-XiaoyiNeural" => ("zh-CN-XiaoyiNeural", "+0Hz", "+0%"),
        "zh-CN-YunyangNeural" => ("zh-CN-YunyangNeural", "+0Hz", "+0%"),
        "zh-CN-YunxiaNeural" => ("zh-CN-YunxiaNeural", "+0Hz", "+0%"),
        "zh-CN-liaoning-XiaobeiNeural" => ("zh-CN-liaoning-XiaobeiNeural", "+0Hz", "+0%"),
        "zh-CN-shaanxi-XiaoniNeural" => ("zh-CN-shaanxi-XiaoniNeural", "+0Hz", "+0%"),
        "zh-TW-HsiaoChenNeural" => ("zh-TW-HsiaoChenNeural", "+0Hz", "+0%"),
        "zh-TW-HsiaoYuNeural" => ("zh-TW-HsiaoYuNeural", "+0Hz", "+0%"),
        "zh-TW-YunJheNeural" => ("zh-TW-YunJheNeural", "+0Hz", "+0%"),
        "zh-HK-HiuMaanNeural" => ("zh-HK-HiuMaanNeural", "+0Hz", "+0%"),
        "zh-HK-HiuGaaiNeural" => ("zh-HK-HiuGaaiNeural", "+0Hz", "+0%"),
        "zh-HK-WanLungNeural" => ("zh-HK-WanLungNeural", "+0Hz", "+0%"),
        "en-US-AvaMultilingualNeural" => ("en-US-AvaMultilingualNeural", "+0Hz", "+0%"),
        "en-US-BrianMultilingualNeural" => ("en-US-BrianMultilingualNeural", "+0Hz", "+0%"),
        "en-US-AndrewMultilingualNeural" => ("en-US-AndrewMultilingualNeural", "+0Hz", "+0%"),
        "en-US-EmmaMultilingualNeural" => ("en-US-EmmaMultilingualNeural", "+0Hz", "+0%"),
        "en-US-JennyNeural" => ("en-US-JennyNeural", "+0Hz", "+0%"),
        "en-US-GuyNeural" => ("en-US-GuyNeural", "+0Hz", "+0%"),
        "en-US-AriaNeural" => ("en-US-AriaNeural", "+0Hz", "+0%"),
        "zh-CN-XiaochenNeural" | "zh-CN-XiaohanNeural" | "zh-CN-XiaoqiuNeural" | "zh-CN-XiaoruiNeural" | "zh-CN-XiaozhenNeural" => ("zh-CN-XiaoxiaoNeural", "+0Hz", "+0%"),
        "zh-CN-XiaomengNeural" | "zh-CN-XiaomoNeural" | "zh-CN-XiaoshuangNeural" => ("zh-CN-XiaoyiNeural", "+0Hz", "+0%"),
        "zh-CN-XiaoyanNeural" | "zh-CN-XiaoyouNeural" => ("zh-CN-XiaoxiaoNeural", "-1Hz", "-2%"),
        "zh-CN-YunfengNeural" | "zh-CN-YunzeNeural" => ("zh-CN-YunjianNeural", "-1Hz", "+0%"),
        "zh-CN-YunhaoNeural" => ("zh-CN-YunxiNeural", "+1Hz", "+0%"),
        "zh-CN-YunyeNeural" => ("zh-CN-YunyangNeural", "+0Hz", "+0%"),
        "cloud-doubao-cancan" => ("zh-CN-XiaoxiaoNeural", "+2Hz", "+1%"),
        "cloud-lidan-chat" => ("zh-CN-YunxiNeural", "-3Hz", "-4%"),
        "cloud-xunfei-lingfeizhe" => ("zh-CN-YunyangNeural", "-2Hz", "+0%"),
        v if v.starts_with("en-") => ("en-US-JennyNeural", "+0Hz", "+0%"),
        _ => ("zh-CN-XiaoxiaoNeural", "+0Hz", "+0%"),
    }
}
