use std::fs::File;
use std::io::Read;
use std::path::Path;
use crate::infra::parser::epub::ParsedBook;
use crate::infra::parser::security::is_chapter_heading;

fn convert_markdown_line_images(line: &str) -> String {
    if !line.contains("![") || !line.contains("](") {
        return line.to_string();
    }

    let mut out = String::with_capacity(line.len());
    let mut rest = line;

    while let Some(start_bracket) = rest.find("![") {
        out.push_str(&rest[..start_bracket]);
        let after_start = &rest[start_bracket + 2..];
        if let Some(close_bracket) = after_start.find("](") {
            let alt = &after_start[..close_bracket];
            let after_paren = &after_start[close_bracket + 2..];
            if let Some(close_paren) = after_paren.find(')') {
                let url = after_paren[..close_paren].trim();
                if !url.is_empty() {
                    out.push_str(&format!("\n\n[[BOOK_IMAGE:{}]]\n\n", url));
                    if !alt.trim().is_empty() {
                        out.push_str(alt.trim());
                    }
                }
                rest = &after_paren[close_paren + 1..];
                continue;
            }
        }
        out.push_str("![");
        rest = after_start;
    }
    out.push_str(rest);
    out
}

fn is_ad_line(line: &str) -> bool {
    let t = line.trim();
    if t.len() > 120 {
        return false;
    }
    let lower = t.to_ascii_lowercase();
    lower.contains("天才一秒记住")
        || lower.contains("最新网址：")
        || lower.contains("最新域名：")
        || lower.contains("请记住本书首发域名")
        || lower.contains("关注微信公众号")
        || lower.contains("本章完，请翻页")
        || lower.contains("投推荐票")
        || lower.contains("加入书签")
        || lower.contains("免费阅读无弹窗")
        || (t.starts_with("ps：") && t.contains("求推荐"))
}

fn reflow_smart_paragraphs(lines: &[String], check_headings: bool) -> Vec<String> {
    let mut paras = Vec::new();
    let mut current = String::new();

    for line in lines {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            if !current.is_empty() {
                paras.push(std::mem::take(&mut current));
            }
            continue;
        }

        let is_heading = check_headings && is_chapter_heading(trimmed);
        let is_divider = trimmed.starts_with("---") || trimmed.starts_with("***") || trimmed.starts_with("___");
        let is_quote = trimmed.starts_with('>');
        let is_list = trimmed.starts_with("• ") || trimmed.starts_with("- ") || trimmed.starts_with("* ");
        let is_img = trimmed.starts_with("[[BOOK_IMAGE:");

        if is_heading || is_divider || is_quote || is_list || is_img {
            if !current.is_empty() {
                paras.push(std::mem::take(&mut current));
            }
            paras.push(trimmed.to_string());
            continue;
        }

        let has_indent = line.starts_with("　　") || line.starts_with("  ") || line.starts_with('\t');

        if current.is_empty() {
            current.push_str(trimmed);
        } else if has_indent {
            paras.push(std::mem::take(&mut current));
            current.push_str(trimmed);
        } else {
            let ends_sentence = current.ends_with(['。', '！', '？', '.', '!', '?', '…', '”', '"', '’', '\'']);

            if ends_sentence && current.len() >= 90 {
                paras.push(std::mem::take(&mut current));
                current.push_str(trimmed);
            } else {
                let prev_ascii = current.as_bytes().last().map(|b| b.is_ascii_alphanumeric()).unwrap_or(false);
                let next_ascii = trimmed.as_bytes().first().map(|b| b.is_ascii_alphanumeric()).unwrap_or(false);
                if prev_ascii && next_ascii {
                    current.push(' ');
                }
                current.push_str(trimmed);
            }
        }
    }

    if !current.is_empty() {
        paras.push(current);
    }

    paras
}

fn extract_chapters_from_text(text: &str, is_markdown: bool) -> Vec<serde_json::Value> {
    let clean_heading = |line: &str| -> String {
        let trimmed = line.trim();
        if trimmed.starts_with('#') {
            trimmed.trim_start_matches('#').trim().to_string()
        } else {
            trimmed.to_string()
        }
    };

    // 快速早停探测：一旦找到 2 个章节标题标记立即返回，避免全书数十万行全量扫描
    let has_markers = text
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty() && is_chapter_heading(l))
        .take(2)
        .count() >= 2;

    let line_iter = text.lines().filter_map(|l| {
        let trimmed = l.trim();
        if trimmed.is_empty() || is_ad_line(trimmed) {
            None
        } else if is_markdown && trimmed.contains("![") {
            Some(convert_markdown_line_images(trimmed))
        } else {
            Some(trimmed.to_string())
        }
    });

    let mut chapters = Vec::new();
    let mut cur_title = "前言 / 序".to_string();
    let mut cur_paras: Vec<String> = Vec::new();
    let mut order = 0;

    if has_markers {
        for line in line_iter {
            if is_chapter_heading(&line) {
                if !cur_paras.is_empty() {
                    let reflowed = reflow_smart_paragraphs(&cur_paras, false);
                    let content = reflowed.join("\n\n");
                    let wc = content.chars().count();
                    chapters.push(serde_json::json!({
                        "id": format!("ch_{}", order + 1),
                        "title": cur_title,
                        "content": content,
                        "wordCount": wc,
                        "order": order,
                    }));
                    order += 1;
                    cur_paras.clear();
                }
                cur_title = clean_heading(&line);
            } else {
                cur_paras.push(line);
            }
        }
        if !cur_paras.is_empty() {
            let reflowed = reflow_smart_paragraphs(&cur_paras, false);
            let content = reflowed.join("\n\n");
            let wc = content.chars().count();
            chapters.push(serde_json::json!({
                "id": format!("ch_{}", order + 1),
                "title": cur_title,
                "content": content,
                "wordCount": wc,
                "order": order,
            }));
        }
    } else {
        let target_chunk_chars = 3500;
        let mut ch_idx = 1;
        let mut cur_chars = 0usize;

        for line in line_iter {
            let line_chars = line.chars().count();
            if !cur_paras.is_empty() && cur_chars + line_chars > target_chunk_chars {
                let reflowed = reflow_smart_paragraphs(&cur_paras, false);
                let content = reflowed.join("\n\n");
                let wc = content.chars().count();
                chapters.push(serde_json::json!({
                    "id": format!("ch_{}", ch_idx),
                    "title": format!("第 {} 部分", ch_idx),
                    "content": content,
                    "wordCount": wc,
                    "order": ch_idx - 1,
                }));
                ch_idx += 1;
                cur_paras.clear();
                cur_chars = 0;
            }
            cur_paras.push(line);
            cur_chars += line_chars;
        }

        if !cur_paras.is_empty() {
            let reflowed = reflow_smart_paragraphs(&cur_paras, false);
            let content = reflowed.join("\n\n");
            let wc = content.chars().count();
            let title = if ch_idx == 1 {
                "正文".to_string()
            } else {
                format!("第 {} 部分", ch_idx)
            };
            chapters.push(serde_json::json!({
                "id": format!("ch_{}", ch_idx),
                "title": title,
                "content": content,
                "wordCount": wc,
                "order": ch_idx - 1,
            }));
        }
    }

    if chapters.is_empty() {
        let total_len = text.chars().count();
        chapters.push(serde_json::json!({
            "id": "ch_1",
            "title": "正文",
            "content": text.trim(),
            "wordCount": total_len,
            "order": 0,
        }));
    }

    chapters
}

pub fn parse_txt(file_path: &Path, title: &str, author: &str, format: &str) -> Result<ParsedBook, String> {
    let mut raw_bytes = Vec::new();
    let mut f = File::open(file_path).map_err(|e| format!("Failed to read text: {}", e))?;
    std::io::Read::take(&mut f, 120 * 1024 * 1024)
        .read_to_end(&mut raw_bytes)
        .map_err(|e| format!("Failed to read bytes: {}", e))?;

    let text = crate::infra::parser::security::decode_text_bytes(&raw_bytes);
    let is_markdown = matches!(format.to_lowercase().as_str(), "md" | "markdown")
        || text.lines().take(100).any(|l| l.trim().starts_with('#') || (l.contains("![") && l.contains("](")));

    let total_len = text.chars().count();
    let chapters = extract_chapters_from_text(&text, is_markdown);

    Ok(ParsedBook {
        title: title.to_string(),
        author: author.to_string(),
        format: format.to_string(),
        cover_url: None,
        isbn: None,
        publisher: Some("本地导入".to_string()),
        description: None,
        word_count: total_len,
        chapters,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_chapters_from_markdown_with_images() {
        let md = "# 第一章 宇宙的开端\n这是第一段文字说明。\n![示意图](/data/covers/bigbang.jpg)\n## 第二章 黑洞与时空\n关于奇点的论述。";
        let chs = extract_chapters_from_text(md, true);
        assert_eq!(chs.len(), 2);
        assert_eq!(chs[0]["title"], "第一章 宇宙的开端");
        let c0 = chs[0]["content"].as_str().unwrap();
        assert!(c0.contains("[[BOOK_IMAGE:/data/covers/bigbang.jpg]]"));
        assert_eq!(chs[1]["title"], "第二章 黑洞与时空");
    }

    #[test]
    fn test_extract_chapters_chinese_numbers_and_ads_filter() {
        let txt = "第一回 灵根育孕源流出\n花果山福地，水帘洞洞天。\n最新网址：www.biquge.com 精彩无弹窗！\n第二回 悟彻菩提真妙理\n幽微玄妙道，悟得起无生。";
        let chs = extract_chapters_from_text(txt, false);
        assert_eq!(chs.len(), 2);
        assert_eq!(chs[0]["title"], "第一回 灵根育孕源流出");
        assert!(!chs[0]["content"].as_str().unwrap().contains("biquge.com"));
        assert_eq!(chs[1]["title"], "第二回 悟彻菩提真妙理");
    }
}
