pub fn has_speakable_content(text: &str) -> bool {
    text.chars().any(|ch| {
        ch.is_alphanumeric()
            || matches!(
                ch,
                '\u{4e00}'..='\u{9fff}'
                    | '\u{3400}'..='\u{4dbf}'
                    | '\u{f900}'..='\u{faff}'
                    | '\u{3040}'..='\u{30ff}'
                    | '\u{ac00}'..='\u{d7af}'
            )
    })
}

fn skip_caret_superscript(chars: &[char], i: usize) -> Option<usize> {
    let len = chars.len();
    let mut j = i + 1;
    if j < len && (chars[j] == '(' || chars[j] == '（' || chars[j] == '[') {
        let close = match chars[j] {
            '(' => ')',
            '（' => '）',
            '[' => ']',
            _ => ')',
        };
        let mut depth = 1;
        j += 1;
        while j < len && depth > 0 {
            if chars[j] == chars[i + 1] {
                depth += 1;
            } else if chars[j] == close {
                depth -= 1;
            }
            j += 1;
        }
        if j < len && chars[j] == '^' {
            j += 1;
        }
        Some(j)
    } else if j < len && chars[j].is_ascii_digit() {
        while j < len && chars[j].is_ascii_digit() {
            j += 1;
        }
        if j < len && chars[j] == '^' {
            j += 1;
        }
        Some(j)
    } else {
        None
    }
}

fn skip_bracketed_footnote(chars: &[char], i: usize) -> Option<usize> {
    let len = chars.len();
    let close = match chars[i] {
        '(' => ')',
        '（' => '）',
        '[' => ']',
        '【' => '】',
        '〔' => '〕',
        _ => return None,
    };
    let mut j = i + 1;
    if j < len && chars[j] == '注' {
        j += 1;
    }
    let start_digits = j;
    while j < len && chars[j].is_ascii_digit() {
        j += 1;
    }
    if j > start_digits && (j - start_digits) <= 4 && j < len && chars[j] == close {
        Some(j + 1)
    } else {
        None
    }
}

pub fn strip_citation_markers(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let chars: Vec<char> = input.chars().collect();
    let len = chars.len();
    let mut i = 0;

    while i < len {
        let ch = chars[i];
        if matches!(ch, '\u{2460}'..='\u{2473}' | '\u{2474}'..='\u{2487}' | '\u{2488}'..='\u{249B}') {
            i += 1;
            continue;
        }
        if ch == '^' {
            if let Some(next_i) = skip_caret_superscript(&chars, i) {
                i = next_i;
                continue;
            }
        }
        if matches!(ch, '(' | '（' | '[' | '【' | '〔') {
            if let Some(next_i) = skip_bracketed_footnote(&chars, i) {
                i = next_i;
                continue;
            }
        }
        out.push(ch);
        i += 1;
    }
    out
}

pub fn sanitize_tts_text(text: &str) -> String {
    let mut s = text.trim();
    while s.starts_with('>') {
        s = s[1..].trim_start();
    }

    let unescaped = s
        .replace("&quot;", "\"")
        .replace("&ldquo;", "\"")
        .replace("&rdquo;", "\"")
        .replace("&lsquo;", "'")
        .replace("&rsquo;", "'")
        .replace("&apos;", "'")
        .replace("&#34;", "\"")
        .replace("&#39;", "'")
        .replace("&amp;", "&");

    let stripped_citations = strip_citation_markers(&unescaped);
    let chars: Vec<char> = stripped_citations.chars().collect();
    let mut cleaned = String::with_capacity(chars.len());
    let len = chars.len();

    for (i, &ch) in chars.iter().enumerate() {
        if matches!(
            ch,
            '“' | '”' | '‘' | '’' | '「' | '」' | '『' | '』' | '〝' | '〞' | '＂' | '"' | '«' | '»' | '‹' | '›'
        ) {
            continue;
        }

        if ch == '\'' {
            let prev_is_alpha = i > 0 && chars[i - 1].is_ascii_alphabetic();
            let next_is_alpha = i + 1 < len && chars[i + 1].is_ascii_alphabetic();
            if prev_is_alpha && next_is_alpha {
                cleaned.push('\'');
            }
            continue;
        }

        if matches!(
            ch,
            '*' | '#' | '~' | '^' | '_' | '=' | '\\' | '·' | '•' | '【' | '】' | '>' | '<' | '|' | '`'
        ) {
            cleaned.push(' ');
            continue;
        }

        cleaned.push(ch);
    }

    cleaned.split_whitespace().collect::<Vec<_>>().join(" ")
}

pub fn split_text_into_tts_chunks(text: &str, max_chars: usize) -> Vec<String> {
    if text.chars().count() <= max_chars {
        return vec![text.to_string()];
    }

    let mut chunks = Vec::new();
    let mut current = String::new();

    for sentence in text.split_inclusive(|c| c == '。' || c == '！' || c == '？' || c == '；' || c == '\n') {
        let sent_len = sentence.chars().count();
        let curr_len = current.chars().count();

        if curr_len + sent_len > max_chars && !current.is_empty() {
            chunks.push(current.trim().to_string());
            current = String::new();
        }

        if sent_len > max_chars {
            for sub in sentence.split_inclusive(|c| c == '，' || c == ',' || c == ' ') {
                let sub_len = sub.chars().count();
                let c_len = current.chars().count();
                if c_len + sub_len > max_chars && !current.is_empty() {
                    chunks.push(current.trim().to_string());
                    current = String::new();
                }
                current.push_str(sub);
            }
        } else {
            current.push_str(sentence);
        }
    }

    if !current.trim().is_empty() {
        chunks.push(current.trim().to_string());
    }

    chunks
}
