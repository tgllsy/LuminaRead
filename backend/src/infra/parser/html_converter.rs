#[derive(Debug, Default, Clone)]
pub struct HtmlTagInfo<'a> {
    pub tag: &'a str,
    pub src: Option<&'a str>,
    pub recindex: Option<&'a str>,
    pub xlink_href: Option<&'a str>,
    pub href: Option<&'a str>,
    pub alt: Option<&'a str>,
    pub title: Option<&'a str>,
    pub is_closing: bool,
    pub is_self_closing: bool,
}

pub fn extract_attr_value<'a>(tag_content: &'a str, attr_name: &str) -> Option<&'a str> {
    let lower_tag = tag_content.to_ascii_lowercase();
    let pat = format!("{}=", attr_name.to_ascii_lowercase());
    let mut search_from = 0;
    while let Some(rel_idx) = lower_tag[search_from..].find(&pat) {
        let idx = search_from + rel_idx;
        if idx > 0 {
            let prev = tag_content.as_bytes()[idx - 1];
            if !prev.is_ascii_whitespace() {
                search_from = idx + pat.len();
                continue;
            }
        }
        let after_eq = idx + pat.len();
        if after_eq >= tag_content.len() {
            return None;
        }
        let bytes = tag_content.as_bytes();
        let quote = bytes[after_eq];
        if quote == b'"' || quote == b'\'' {
            let val_start = after_eq + 1;
            if let Some(end_rel) = tag_content[val_start..].find(quote as char) {
                return Some(&tag_content[val_start..val_start + end_rel]);
            }
        } else {
            let mut end = after_eq;
            while end < tag_content.len() && !bytes[end].is_ascii_whitespace() && bytes[end] != b'>' && bytes[end] != b'/' {
                end += 1;
            }
            return Some(&tag_content[after_eq..end]);
        }
        search_from = after_eq;
    }
    None
}

pub fn html_to_reader_text<F>(html: &str, img_resolver: F) -> String
where
    F: Fn(&HtmlTagInfo) -> Option<String>,
{
    let mut out = String::with_capacity(html.len());
    let mut in_tag = false;
    let mut in_skip_block = false;
    let mut skip_tag_name = String::new();
    let mut tag_buf = String::new();

    let mut inside_blockquote = 0usize;
    let mut inside_pre = false;
    let mut span_highlight_stack: Vec<bool> = Vec::new();

    let ensure_newline = |buf: &mut String, count: usize| {
        let current_trailing = buf.chars().rev().take_while(|&c| c == '\n').count();
        for _ in current_trailing..count {
            buf.push('\n');
        }
    };

    let mut chars = html.char_indices().peekable();
    while let Some((_, ch)) = chars.next() {
        if ch == '<' {
            in_tag = true;
            tag_buf.clear();
        } else if ch == '>' && in_tag {
            in_tag = false;
            let trimmed = tag_buf.trim();
            let is_closing = trimmed.starts_with('/');
            let tag_body = if is_closing {
                trimmed[1..].trim()
            } else {
                trimmed
            };
            let is_self_closing = trimmed.ends_with('/') || (!is_closing && is_void_html_tag(tag_body));

            let base_tag = tag_body
                .split_whitespace()
                .next()
                .unwrap_or("")
                .trim_end_matches('/')
                .to_ascii_lowercase();

            if in_skip_block {
                if is_closing && base_tag == skip_tag_name {
                    in_skip_block = false;
                    skip_tag_name.clear();
                }
                continue;
            }

            if !is_closing && !is_self_closing && matches!(base_tag.as_str(), "script" | "style" | "head") {
                in_skip_block = true;
                skip_tag_name = base_tag;
                continue;
            }

            match base_tag.as_str() {
                "p" | "div" | "section" | "article" => {
                    ensure_newline(&mut out, 2);
                }
                "br" => {
                    ensure_newline(&mut out, 1);
                }
                "hr" | "mbp:pagebreak" | "pagebreak" => {
                    ensure_newline(&mut out, 2);
                    out.push_str("---\n\n");
                }
                "h1" => {
                    if is_closing {
                        ensure_newline(&mut out, 2);
                    } else {
                        ensure_newline(&mut out, 2);
                        out.push_str("# ");
                    }
                }
                "h2" => {
                    if is_closing {
                        ensure_newline(&mut out, 2);
                    } else {
                        ensure_newline(&mut out, 2);
                        out.push_str("## ");
                    }
                }
                "h3" => {
                    if is_closing {
                        ensure_newline(&mut out, 2);
                    } else {
                        ensure_newline(&mut out, 2);
                        out.push_str("### ");
                    }
                }
                "h4" | "h5" | "h6" => {
                    if is_closing {
                        ensure_newline(&mut out, 2);
                    } else {
                        ensure_newline(&mut out, 2);
                        out.push_str("#### ");
                    }
                }
                "blockquote" => {
                    if is_closing {
                        inside_blockquote = inside_blockquote.saturating_sub(1);
                        ensure_newline(&mut out, 2);
                    } else {
                        inside_blockquote += 1;
                        ensure_newline(&mut out, 2);
                        out.push_str("> ");
                    }
                }
                "pre" => {
                    if is_closing {
                        inside_pre = false;
                        ensure_newline(&mut out, 1);
                        out.push_str("```\n\n");
                    } else {
                        inside_pre = true;
                        ensure_newline(&mut out, 2);
                        out.push_str("```\n");
                    }
                }
                "code" => {
                    if !inside_pre {
                        out.push('`');
                    }
                }
                "b" | "strong" => {
                    out.push_str("**");
                }
                "i" | "em" => {
                    out.push('*');
                }
                "mark" => {
                    out.push_str("==");
                }
                "del" | "s" | "strike" => {
                    out.push_str("~~");
                }
                "kbd" => {
                    if !is_closing {
                        out.push_str("<kbd>");
                    } else {
                        out.push_str("</kbd>");
                    }
                }
                "sup" => {
                    out.push('^');
                }
                "sub" => {
                    out.push('~');
                }
                "li" => {
                    if !is_closing {
                        ensure_newline(&mut out, 1);
                        out.push_str("• ");
                    } else {
                        ensure_newline(&mut out, 1);
                    }
                }
                "ruby" => {
                    if !is_closing {
                        out.push_str("<ruby>");
                    } else {
                        out.push_str("</ruby>");
                    }
                }
                "rt" => {
                    if !is_closing {
                        out.push_str("<rt>");
                    } else {
                        out.push_str("</rt>");
                    }
                }
                "table" => {
                    ensure_newline(&mut out, 2);
                }
                "tr" => {
                    if !is_closing {
                        ensure_newline(&mut out, 1);
                        out.push_str("| ");
                    } else {
                        out.push('\n');
                    }
                }
                "td" | "th" => {
                    if is_closing {
                        out.push_str(" | ");
                    }
                }
                "aside" => {
                    if !is_closing {
                        ensure_newline(&mut out, 2);
                        out.push_str("> [!NOTE] ");
                    } else {
                        ensure_newline(&mut out, 2);
                    }
                }
                "span" => {
                    if !is_closing {
                        let is_highlight = extract_attr_value(&tag_buf, "class")
                            .map(|c| c.contains("highlight") || c.contains("hl") || c.contains("mark"))
                            .unwrap_or(false);
                        if !is_self_closing {
                            span_highlight_stack.push(is_highlight);
                        }
                        if is_highlight {
                            out.push_str("==");
                        }
                    } else if let Some(was_highlight) = span_highlight_stack.pop() {
                        if was_highlight {
                            out.push_str("==");
                        }
                    }
                }
                "img" | "image" => {
                    let info = HtmlTagInfo {
                        tag: &base_tag,
                        src: extract_attr_value(&tag_buf, "src"),
                        recindex: extract_attr_value(&tag_buf, "recindex"),
                        xlink_href: extract_attr_value(&tag_buf, "xlink:href"),
                        href: extract_attr_value(&tag_buf, "href"),
                        alt: extract_attr_value(&tag_buf, "alt"),
                        title: extract_attr_value(&tag_buf, "title"),
                        is_closing,
                        is_self_closing,
                    };

                    if let Some(img_url) = img_resolver(&info) {
                        let clean_url = img_url.trim();
                        if !clean_url.is_empty() {
                            ensure_newline(&mut out, 2);
                            out.push_str(&format!("[[BOOK_IMAGE:{}]]\n\n", clean_url));
                        }
                    }
                }
                _ => {}
            }
        } else if in_tag {
            tag_buf.push(ch);
        } else if !in_skip_block {
            if ch == '\n' || ch == '\r' {
                if inside_pre {
                    if ch == '\n' {
                        out.push('\n');
                    }
                } else if !out.ends_with('\n') && !out.ends_with(' ') {
                    out.push(' ');
                }
            } else {
                out.push(ch);
            }
        }
    }

    let decoded = decode_html_entities(&out);
    cleanup_reader_paragraphs(&decoded)
}

fn is_void_html_tag(tag: &str) -> bool {
    let base = tag.split_whitespace().next().unwrap_or("").to_ascii_lowercase();
    matches!(base.as_str(), "img" | "image" | "br" | "hr" | "meta" | "link" | "input" | "col" | "source" | "area")
}

pub fn decode_html_entities(input: &str) -> String {
    let replaced = input
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
        .replace("&hellip;", "…")
        .replace("&copy;", "©")
        .replace("&reg;", "®")
        .replace("&trade;", "™");

    decode_numeric_entities(&replaced)
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

pub fn cleanup_reader_paragraphs(raw: &str) -> String {
    let mut cleaned_paras = Vec::new();
    let mut in_code_fence = false;
    let mut code_buf = Vec::new();

    for p in raw.split("\n\n") {
        let trimmed = p.trim();
        if trimmed.is_empty() && !in_code_fence {
            continue;
        }

        if in_code_fence {
            code_buf.push(p.trim_end());
            if trimmed.ends_with("```") {
                cleaned_paras.push(code_buf.join("\n"));
                code_buf.clear();
                in_code_fence = false;
            }
            continue;
        }

        if trimmed.starts_with("```") {
            let fence_count = trimmed.matches("```").count();
            if fence_count >= 2 && trimmed.ends_with("```") {
                // Complete fenced code block: preserve leading indentation on each line
                let preserved = p
                    .trim_matches('\n')
                    .lines()
                    .map(|l| l.trim_end())
                    .collect::<Vec<_>>()
                    .join("\n");
                cleaned_paras.push(preserved);
            } else {
                in_code_fence = true;
                code_buf.push(p.trim_matches('\n'));
            }
            continue;
        }

        let single_line = trimmed
            .lines()
            .map(|l| l.trim())
            .filter(|l| !l.is_empty())
            .collect::<Vec<_>>()
            .join("\n");
        if !single_line.is_empty() {
            cleaned_paras.push(single_line);
        }
    }

    if !code_buf.is_empty() {
        let mut last_code = code_buf.join("\n");
        if !last_code.trim_end().ends_with("```") {
            last_code.push_str("\n```");
        }
        cleaned_paras.push(last_code);
    }

    cleaned_paras.join("\n\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_attr_value() {
        let tag = r#"img align="baseline" height="460" recindex="00007" width="400""#;
        assert_eq!(extract_attr_value(tag, "recindex"), Some("00007"));
        assert_eq!(extract_attr_value(tag, "height"), Some("460"));
        assert_eq!(extract_attr_value(tag, "src"), None);

        let epub_img = r#"img src="../Images/fig1.jpg" alt="图1.1 托勒密模型""#;
        assert_eq!(extract_attr_value(epub_img, "src"), Some("../Images/fig1.jpg"));
        assert_eq!(extract_attr_value(epub_img, "alt"), Some("图1.1 托勒密模型"));
    }

    #[test]
    fn test_html_to_reader_text_with_images_and_headings() {
        let html = r#"
            <h1>第一章 我们的宇宙图像</h1>
            <p>最后一层天球之外为何物一直不清楚。</p>
            <p><img recindex="00007" /></p>
            <p>图1.1从最里面往最外面顺序为月亮球。</p>
            <blockquote>亚里士多德认为地球是不动的。</blockquote>
            <hr/>
        "#;

        let result = html_to_reader_text(html, |info| {
            if info.recindex == Some("00007") {
                Some("/data/covers/fig1_1.jpg".to_string())
            } else {
                None
            }
        });

        assert!(result.contains("# 第一章 我们的宇宙图像"));
        assert!(result.contains("[[BOOK_IMAGE:/data/covers/fig1_1.jpg]]"));
        assert!(result.contains("图1.1从最里面往最外面顺序为月亮球。"));
        assert!(result.contains("> 亚里士多德认为地球是不动的。"));
        assert!(result.contains("---"));
    }

    #[test]
    fn test_html_to_reader_text_with_inline_formatting() {
        let html = r#"
            <p>这是<b>粗体文本</b>与<strong>强加粗</strong>。</p>
            <p>这是<i>斜体文本</i>与<em>强调斜体</em>。</p>
            <p>这是<mark>高亮文本</mark>与<span class="highlight">样式高亮</span>与<del>删除文本</del>与<code>代码片段</code>。</p>
            <pre>fn main() {
    println!("hello");
}</pre>
        "#;
        let result = html_to_reader_text(html, |_| None);
        assert!(result.contains("**粗体文本**"));
        assert!(result.contains("**强加粗**"));
        assert!(result.contains("*斜体文本*"));
        assert!(result.contains("*强调斜体*"));
        assert!(result.contains("==高亮文本=="));
        assert!(result.contains("==样式高亮=="));
        assert!(result.contains("~~删除文本~~"));
        assert!(result.contains("`代码片段`"));
        assert!(result.contains("```\nfn main() {\n    println!(\"hello\");\n}\n```"));
    }
}
