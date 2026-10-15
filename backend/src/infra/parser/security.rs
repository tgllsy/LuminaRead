use std::io::Write;
use std::path::Path;
use std::process::{Command, Stdio};

pub const MAX_DECOMPRESSED_BYTES: u64 = 100 * 1024 * 1024; // 100MB limit per book
pub const MAX_EXPANSION_RATIO: u64 = 100; // max 100x compression ratio

pub fn infer_title_and_author(filename: &str) -> (String, String) {
    let base = Path::new(filename)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or(filename);

    let known_exts = [
        ".epub", ".txt", ".pdf", ".mobi", ".azw3", ".azw", ".prc", ".md", ".markdown",
    ];
    let mut clean = base.trim();
    let lower = clean.to_lowercase();
    for ext in known_exts {
        if lower.ends_with(ext) && clean.len() > ext.len() {
            clean = clean[..clean.len() - ext.len()].trim();
            break;
        }
    }

    if let Some(pos) = clean.find(" - ") {
        let p1 = clean[..pos].trim();
        let p2 = clean[pos + 3..].trim();
        if !p1.is_empty() && !p2.is_empty() {
            return (p1.to_string(), p2.to_string());
        }
    }

    if clean.starts_with('《') {
        let open_len = '《'.len_utf8();
        if let Some(end) = clean.find('》') {
            let title = clean[open_len..end].trim();
            let close_len = '》'.len_utf8();
            let author = clean[end + close_len..].trim().trim_start_matches(['-', '_', ' ', '·']);
            return (
                if title.is_empty() { clean.to_string() } else { title.to_string() },
                if author.is_empty() {
                    "未知作者".to_string()
                } else {
                    author.to_string()
                },
            );
        }
    }

    // Only split on '_' if there is a single '_' and the second part looks like an author name (not digits)
    if clean.matches('_').count() == 1 {
        if let Some(pos) = clean.find('_') {
            let p1 = clean[..pos].trim();
            let p2 = clean[pos + 1..].trim();
            if !p1.is_empty()
                && !p2.is_empty()
                && p2.chars().count() <= 20
                && !p2.chars().all(|c| c.is_ascii_digit())
            {
                return (p1.to_string(), p2.to_string());
            }
        }
    }

    (clean.to_string(), "未知作者".to_string())
}

pub fn decode_text_bytes(raw_bytes: &[u8]) -> String {
    if raw_bytes.is_empty() {
        return String::new();
    }
    // Check UTF-8 BOM
    if raw_bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        if let Ok(s) = std::str::from_utf8(&raw_bytes[3..]) {
            return s.to_string();
        }
    }
    // Check UTF-16LE BOM
    if raw_bytes.starts_with(&[0xFF, 0xFE]) {
        let u16s: Vec<u16> = raw_bytes[2..]
            .chunks_exact(2)
            .map(|c| u16::from_le_bytes([c[0], c[1]]))
            .collect();
        return String::from_utf16_lossy(&u16s);
    }
    // Check UTF-16BE BOM
    if raw_bytes.starts_with(&[0xFE, 0xFF]) {
        let u16s: Vec<u16> = raw_bytes[2..]
            .chunks_exact(2)
            .map(|c| u16::from_be_bytes([c[0], c[1]]))
            .collect();
        return String::from_utf16_lossy(&u16s);
    }
    // Valid UTF-8
    if let Ok(s) = std::str::from_utf8(raw_bytes) {
        return s.to_string();
    }
    // Try GB18030 via system iconv for Chinese legacy text files.
    // Spawn a dedicated writer thread for stdin so files larger than OS pipe buffer (64KB) never deadlock!
    if let Ok(mut child) = Command::new("iconv")
        .args(["-f", "GB18030", "-t", "UTF-8//IGNORE"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
    {
        let writer_handle = child.stdin.take().map(|mut stdin| {
            let input_owned = raw_bytes.to_vec();
            std::thread::spawn(move || {
                let _ = stdin.write_all(&input_owned);
            })
        });
        let output_res = child.wait_with_output();
        if let Some(handle) = writer_handle {
            let _ = handle.join();
        }
        if let Ok(output) = output_res {
            if output.status.success() && !output.stdout.is_empty() {
                if let Ok(s) = String::from_utf8(output.stdout) {
                    if !s.trim().is_empty() {
                        return s;
                    }
                }
            }
        }
    }

    String::from_utf8_lossy(raw_bytes).to_string()
}

pub fn is_chapter_heading(line: &str) -> bool {
    let raw = line.trim();
    if raw.is_empty() {
        return false;
    }
    let t = raw
        .trim_matches(|c| matches!(c, '【' | '】' | '[' | ']' | '（' | '）' | '(' | ')' | '★' | '☆' | '◆' | '◇' | '■' | '□' | '▲' | '△'))
        .trim();
    let char_cnt = t.chars().count();
    if char_cnt == 0 || char_cnt > 55 {
        return false;
    }
    if t.ends_with(['。', '；', ';', '，', ',']) {
        return false;
    }
    if t.starts_with(['“', '"', '‘', '\'', '「', '『']) {
        return false;
    }

    // 1. Markdown 标题
    if t.starts_with('#') && !t.starts_with("#####") {
        let heading_text = t.trim_start_matches('#').trim();
        return !heading_text.is_empty();
    }

    // 2. 英文标准章节与罗马数字章节
    let lower = t.to_ascii_lowercase();
    if lower.starts_with("chapter ")
        || lower.starts_with("part ")
        || lower.starts_with("book ")
        || lower.starts_with("section ")
        || lower.starts_with("volume ")
        || lower.starts_with("act ")
        || lower.starts_with("scene ")
        || lower == "prologue"
        || lower == "epilogue"
        || lower == "introduction"
        || lower == "preface"
        || lower == "foreword"
        || lower == "afterword"
        || lower == "appendix"
        || lower == "conclusion"
        || lower.starts_with("prologue:")
        || lower.starts_with("prologue ")
        || lower.starts_with("epilogue:")
        || lower.starts_with("epilogue ")
    {
        return true;
    }

    // 罗马数字章节（如 I. Introduction, II. Space, III. Time）
    for rom in ["i.", "ii.", "iii.", "iv.", "v.", "vi.", "vii.", "viii.", "ix.", "x.", "xi.", "xii.", "xiii.", "xiv.", "xv."] {
        if lower.starts_with(rom) {
            return true;
        }
    }

    // 3. 特殊章节词汇
    for kw in [
        "序言", "序章", "楔子", "前言", "引子", "尾声", "后记", "番外", "终章", "大结局",
        "结语", "完本感言", "上架感言", "附录", "致谢", "总结", "概述", "导论", "跋", "尾曲",
        "上篇", "中篇", "下篇", "正文卷", "作品相关"
    ] {
        if t == kw
            || t.starts_with(&format!("{} ", kw))
            || t.starts_with(&format!("{}：", kw))
            || t.starts_with(&format!("{}:", kw))
            || t.starts_with(&format!("{}（", kw))
            || t.starts_with(&format!("{}(", kw))
            || t.starts_with(&format!("{}【", kw))
            || t.starts_with(&format!("{}[", kw))
            || t.starts_with(&format!("{}篇", kw))
            || t.starts_with(&format!("{}一", kw))
        {
            return true;
        }
    }

    // 4. “第...章/节/回/卷/集/部/篇/折/幕/话/讲”
    let search_str = if let Some(sec_idx) = t.find(" 第") {
        &t[sec_idx + 1..]
    } else {
        t
    };

    if search_str.starts_with('第') {
        let chars_vec: Vec<char> = search_str.chars().collect();
        if let Some(m_pos) = chars_vec.iter().skip(1).take(18).position(|&c| matches!(c, '章' | '节' | '回' | '卷' | '集' | '部' | '篇' | '折' | '幕' | '话' | '讲')) {
            let actual_pos = m_pos + 1;
            let num_chars = &chars_vec[1..actual_pos];
            let is_valid_num = !num_chars.is_empty() && num_chars.iter().all(|&c| {
                c.is_ascii_digit() || matches!(c, '零' | '一' | '二' | '三' | '四' | '五' | '六' | '七' | '八' | '九' | '十' | '百' | '千' | '万' | '亿' | '两' | '〇' | ' ' | '　')
            });
            if is_valid_num {
                if actual_pos + 1 >= chars_vec.len() {
                    return true;
                }
                let next_char = chars_vec[actual_pos + 1];
                if matches!(next_char, ' ' | '\t' | '　' | ':' | '：' | '-' | '—' | '·' | '、' | '（' | '(' | '【' | '[' | '.' | '，' | ',') {
                    return true;
                }
                let remainder: String = chars_vec[actual_pos + 1..].iter().collect();
                if !remainder.contains(['，', ',']) && char_cnt <= 50 {
                    return true;
                }
            }
        }
    }

    // 5. “卷...” 独立分卷
    if t.starts_with('卷') {
        let chars_vec: Vec<char> = t.chars().collect();
        if chars_vec.len() >= 2 {
            let num_char = chars_vec[1];
            if num_char.is_ascii_digit() || matches!(num_char, '一' | '二' | '三' | '四' | '五' | '六' | '七' | '八' | '九' | '十' | '百' | '千') {
                return true;
            }
        }
    }

    // 6. 中文顿号序数章节（如“一、概述”、“十二、总结”）
    if let Some(pos) = t.find('、') {
        if pos > 0 && pos <= 12 {
            let prefix = &t[..pos];
            if prefix.chars().all(|c| matches!(c, '一' | '二' | '三' | '四' | '五' | '六' | '七' | '八' | '九' | '十' | '百' | '千' | '0'..='9')) {
                return true;
            }
        }
    }

    // 7. 纯序号章节与层级数字（如“1.1 什么是宇宙”、“1. 导论”）
    let chars_vec: Vec<char> = t.chars().collect();
    if !chars_vec.is_empty() && chars_vec[0].is_ascii_digit() {
        let digit_count = chars_vec.iter().take_while(|c| c.is_ascii_digit() || **c == '.').count();
        if digit_count >= 1 && digit_count <= 8 && digit_count < chars_vec.len() {
            let after_digits = chars_vec[digit_count];
            if matches!(after_digits, ' ' | '\t' | '　' | '、' | ':' | '：' | '-' | '—' | '章') {
                return true;
            }
        }
    }

    false
}

fn decode_numeric_entities(input: &str) -> String {
    if !input.contains("&#") {
        return input.to_string();
    }
    let mut out = String::with_capacity(input.len());
    let mut rest = input;
    while let Some(start) = rest.find("&#") {
        out.push_str(&rest[..start]);
        let after = &rest[start + 2..];
        if let Some(semi) = after.find(';') {
            if semi > 0 && semi <= 8 {
                let token = &after[..semi];
                let parsed = if let Some(hex) = token.strip_prefix('x').or_else(|| token.strip_prefix('X')) {
                    u32::from_str_radix(hex, 16).ok()
                } else {
                    token.parse::<u32>().ok()
                };
                if let Some(code) = parsed.and_then(char::from_u32) {
                    out.push(code);
                    rest = &after[semi + 1..];
                    continue;
                }
            }
        }
        out.push_str("&#");
        rest = after;
    }
    out.push_str(rest);
    out
}

pub fn strip_html_tags(html: &str) -> String {
    let mut out = String::with_capacity(html.len());
    let mut in_tag = false;
    let mut in_script_or_style = false;
    let mut tag_buf = String::new();

    for ch in html.chars() {
        if ch == '<' {
            in_tag = true;
            tag_buf.clear();
        } else if ch == '>' {
            in_tag = false;
            let tag_lower = tag_buf.to_ascii_lowercase();
            let trimmed_tag = tag_lower.trim();
            let is_self_closing = trimmed_tag.ends_with('/');
            let base_tag = trimmed_tag
                .split_whitespace()
                .next()
                .unwrap_or("")
                .trim_end_matches('/');
            if !is_self_closing && (base_tag == "script" || base_tag == "style" || base_tag == "head") {
                in_script_or_style = true;
            } else if base_tag == "/script" || base_tag == "/style" || base_tag == "/head" {
                in_script_or_style = false;
            } else if !in_script_or_style && matches!(
                base_tag,
                "p" | "/p"
                    | "br"
                    | "div"
                    | "/div"
                    | "li"
                    | "/li"
                    | "blockquote"
                    | "/blockquote"
                    | "tr"
                    | "/tr"
                    | "pre"
                    | "/pre"
                    | "h1"
                    | "/h1"
                    | "h2"
                    | "/h2"
                    | "h3"
                    | "/h3"
                    | "h4"
                    | "/h4"
                    | "h5"
                    | "/h5"
                    | "h6"
                    | "/h6"
            ) && !out.ends_with('\n')
            {
                out.push('\n');
            }
        } else if in_tag {
            tag_buf.push(ch);
        } else if !in_script_or_style {
            out.push(ch);
        }
    }

    let replaced = out
        .replace("&nbsp;", " ")
        .replace("&#160;", " ")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'")
        .replace("&ldquo;", "“")
        .replace("&rdquo;", "”")
        .replace("&lsquo;", "‘")
        .replace("&rsquo;", "’")
        .replace("&mdash;&mdash;", "——")
        .replace("&mdash;", "—")
        .replace("&ndash;", "–")
        .replace("&hellip;", "…");

    decode_numeric_entities(&replaced)
        .split('\n')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("\n\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_infer_title_and_author_preserves_underscores() {
        let (title, author) = infer_title_and_author("my_notes_2026_v1.md");
        assert_eq!(title, "my_notes_2026_v1");
        assert_eq!(author, "未知作者");

        let (title2, author2) = infer_title_and_author("C++_Primer_5th_Edition.pdf");
        assert_eq!(title2, "C++_Primer_5th_Edition");
        assert_eq!(author2, "未知作者");

        let (title3, author3) = infer_title_and_author("三体_刘慈欣.epub");
        assert_eq!(title3, "三体");
        assert_eq!(author3, "刘慈欣");

        let (title4, author4) = infer_title_and_author("《明朝那些事儿》-当年明月.txt");
        assert_eq!(title4, "明朝那些事儿");
        assert_eq!(author4, "当年明月");
    }

    #[test]
    fn test_is_chapter_heading_distinguishes_headings_from_prose() {
        assert!(is_chapter_heading("第一章 陨落的天才"));
        assert!(is_chapter_heading("第12章：起源"));
        assert!(is_chapter_heading("## 第二节 架构设计"));
        assert!(is_chapter_heading("序言"));
        assert!(is_chapter_heading("第一卷 山村少年 第一章 山边小村"));
        assert!(is_chapter_heading("第两千四百四十六章 大结局（下）"));
        assert!(is_chapter_heading("第753章 灭敌！"));
        assert!(is_chapter_heading("001 山村少年"));
        assert!(is_chapter_heading("卷一 灵界百族"));
        assert!(is_chapter_heading("楔子 仙凡之隔"));
        assert!(!is_chapter_heading("第一节课老师讲了微积分。"));
        assert!(!is_chapter_heading("第一部作品出版于1999年，引起了轰动"));
        assert!(!is_chapter_heading("第二章的内容已经在前面讨论过了。"));
        assert!(!is_chapter_heading("“第一章到底写了什么？”他好奇地问道。"));
    }

    #[test]
    fn test_strip_html_tags_and_entities() {
        let html = r#"
            <html>
            <head>
                <style type="text/css">
                    body { color: red; }
                </style>
                <script>
                    console.log("ignore <p>inside script</p>");
                </script>
            </head>
            <body>
                <h1>&#x7B2C;&#x4E00;&#x7AE0; &#24320;&#31471;</h1>
                <p>第一段正文&mdash;&mdash;测试。</p>
                <pre><code>fn main() {
    println!("hello");
}</code></pre>
            </body>
            </html>
        "#;
        let stripped = strip_html_tags(html);
        assert!(stripped.contains("第一章 开端"));
        assert!(stripped.contains("第一段正文——测试。"));
        assert!(!stripped.contains("color: red"));
        assert!(!stripped.contains("inside script"));
        assert!(stripped.contains("fn main() {\n\nprintln!(\"hello\");\n\n}"));
    }

    #[test]
    fn test_strip_html_tags_handles_self_closing_script_and_long_tags() {
        let html = r#"
            <html>
            <body>
                <style type="text/css" media="screen, print, projection" data-theme="custom-epub-stylesheet-with-very-long-attribute" />
                <script type="application/javascript" src="../scripts/very-long-script-path-that-exceeds-forty-eight-bytes.js"/>
                <p class="paragraph-class-name-that-is-much-longer-than-forty-eight-characters-in-length">保留完整正文段落。</p>
            </body>
            </html>
        "#;
        let stripped = strip_html_tags(html);
        assert_eq!(stripped, "保留完整正文段落。");
    }
}
