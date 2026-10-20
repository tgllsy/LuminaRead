pub mod meta;

pub use meta::{build_pdf_meta_json, is_valid_natural_text};

use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::OnceLock;

use crate::infra::parser::epub::ParsedBook;
use meta::normalize_pdf_page_paragraphs;

static HAS_PDFINFO: OnceLock<bool> = OnceLock::new();
static HAS_PDFTOPPM: OnceLock<bool> = OnceLock::new();
static HAS_PDFTOTEXT: OnceLock<bool> = OnceLock::new();

pub fn has_pdfinfo() -> bool {
    *HAS_PDFINFO.get_or_init(|| Command::new("pdfinfo").arg("-v").output().is_ok())
}

pub fn has_pdftoppm() -> bool {
    *HAS_PDFTOPPM.get_or_init(|| Command::new("pdftoppm").arg("-v").output().is_ok())
}

pub fn has_pdftotext() -> bool {
    *HAS_PDFTOTEXT.get_or_init(|| Command::new("pdftotext").arg("-v").output().is_ok())
}

pub fn parse_pdf(
    file_path: &Path,
    default_title: &str,
    default_author: &str,
    covers_dir: &Path,
) -> Result<ParsedBook, String> {
    let (info_title, info_author, info_pages) = extract_pdf_meta_streamed(file_path);
    let title = info_title
        .filter(|t| !t.trim().is_empty() && !t.eq_ignore_ascii_case("untitled"))
        .unwrap_or_else(|| default_title.to_string());
    let author = info_author
        .filter(|a| !a.trim().is_empty() && !a.eq_ignore_ascii_case("unknown"))
        .unwrap_or_else(|| default_author.to_string());

    let page_texts = extract_pages_with_pdftotext(file_path);
    let total_pages = page_texts.len().max(info_pages).max(1);
    let cover_url = extract_pdf_cover_first_page(file_path, covers_dir);

    let mut chapters = Vec::new();
    let mut total_words = 0usize;
    let pages_per_chapter = if total_pages <= 12 { total_pages } else { 8 };

    let mut chunk_start = 0usize;
    let mut order = 0usize;
    while chunk_start < total_pages {
        let chunk_end = (chunk_start + pages_per_chapter).min(total_pages);
        let mut chapter_blocks = Vec::new();
        let mut detected_heading: Option<String> = None;

        for page_idx in chunk_start..chunk_end {
            let page_num = page_idx + 1;
            let raw_text = page_texts.get(page_idx).map(|s| s.as_str()).unwrap_or("");
            let clean_paras = normalize_pdf_page_paragraphs(raw_text);

            if detected_heading.is_none() {
                if let Some(first_para) = clean_paras.first() {
                    if crate::infra::parser::security::is_chapter_heading(first_para) {
                        detected_heading = Some(first_para.clone());
                    }
                }
            }

            chapter_blocks.push(format!("[[PDF_PAGE:{}]]", page_num));
            for p in clean_paras {
                total_words += p.chars().count();
                chapter_blocks.push(p);
            }
        }

        let ch_content = chapter_blocks.join("\n\n");
        let ch_wc = ch_content.chars().count();
        let ch_title = detected_heading.unwrap_or_else(|| {
            if total_pages == 1 {
                "第 1 页 · 全文".to_string()
            } else {
                format!("第 {}–{} 页", chunk_start + 1, chunk_end)
            }
        });

        chapters.push(serde_json::json!({
            "id": format!("ch_{}", order + 1),
            "title": ch_title,
            "content": ch_content,
            "wordCount": ch_wc,
            "order": order,
            "pageStart": chunk_start + 1,
            "pageEnd": chunk_end,
        }));
        order += 1;
        chunk_start = chunk_end;
    }

    if total_words == 0 {
        total_words = chapters
            .iter()
            .filter_map(|c| c.get("wordCount").and_then(|v| v.as_u64()))
            .sum::<u64>() as usize;
    }

    Ok(ParsedBook {
        title,
        author,
        format: "pdf".to_string(),
        cover_url,
        isbn: None,
        publisher: Some("PDF文献".to_string()),
        description: Some(format!("PDF 文档（共 {} 页）", total_pages)),
        word_count: total_words,
        chapters,
    })
}

fn extract_pdf_meta_streamed(file_path: &Path) -> (Option<String>, Option<String>, usize) {
    let mut title = None;
    let mut author = None;
    let mut pages = 0usize;

    if has_pdfinfo() {
        if let Ok(output) = Command::new("pdfinfo").arg(file_path).output() {
            if output.status.success() {
                let info_str = String::from_utf8_lossy(&output.stdout);
                for line in info_str.lines() {
                    if let Some(rest) = line.strip_prefix("Title:") {
                        let t = rest.trim();
                        if !t.is_empty() { title = Some(t.to_string()); }
                    } else if let Some(rest) = line.strip_prefix("Author:") {
                        let a = rest.trim();
                        if !a.is_empty() { author = Some(a.to_string()); }
                    } else if let Some(rest) = line.strip_prefix("Pages:") {
                        if let Ok(n) = rest.trim().parse::<usize>() { pages = n; }
                    }
                }
            }
        }
    }

    if pages == 0 {
        if let Ok(mut f) = File::open(file_path) {
            if let Ok(meta) = f.metadata() {
                let len = meta.len();
                let tail_read_len = len.min(65536) as usize;
                if f.seek(SeekFrom::End(-(tail_read_len as i64))).is_ok() {
                    let mut tail_buf = vec![0u8; tail_read_len];
                    if f.read_exact(&mut tail_buf).is_ok() {
                        let tail_str = String::from_utf8_lossy(&tail_buf);
                        for line in tail_str.lines() {
                            if let Some(pos) = line.find("/Count") {
                                let sub = &line[pos + 6..];
                                let num_str: String = sub.chars().skip_while(|c| c.is_whitespace()).take_while(|c| c.is_ascii_digit()).collect();
                                if let Ok(n) = num_str.parse::<usize>() {
                                    if n > pages { pages = n; }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    (title, author, pages)
}

pub fn extract_pages_with_pdftotext(file_path: &Path) -> Vec<String> {
    if !has_pdftotext() {
        return Vec::new();
    }
    let output = match Command::new("pdftotext")
        .arg("-enc")
        .arg("UTF-8")
        .arg(file_path)
        .arg("-")
        .output()
    {
        Ok(out) if out.status.success() => out.stdout,
        _ => return Vec::new(),
    };

    let full_text = String::from_utf8_lossy(&output);
    let mut pages: Vec<String> = full_text.split('\x0c').map(|s| s.trim().to_string()).collect();
    if pages.len() > 1 && pages.last().map(|s| s.is_empty()).unwrap_or(false) {
        pages.pop();
    }
    pages
}

pub fn render_pdf_page_to_jpeg(file_path: &Path, page: usize, target_dir: &Path) -> Option<PathBuf> {
    if !has_pdftoppm() {
        return None;
    }
    let jpg_path = target_dir.join(format!("page_{}.jpg", page));
    if jpg_path.exists() {
        return Some(jpg_path);
    }
    let _ = std::fs::create_dir_all(target_dir);
    let nonce = chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0);
    let tmp_prefix = target_dir.join(format!(".tmp_page_{}_{}", page, nonce));
    if let (Some(fp_str), Some(pref_str)) = (file_path.to_str(), tmp_prefix.to_str()) {
        if let Ok(st) = Command::new("pdftoppm")
            .args([
                "-jpeg",
                "-r",
                "150",
                "-f",
                &page.to_string(),
                "-l",
                &page.to_string(),
                "-singlefile",
                fp_str,
                pref_str,
            ])
            .status()
        {
            if st.success() {
                let tmp_jpg = PathBuf::from(format!("{}.jpg", pref_str));
                if tmp_jpg.exists() {
                    let _ = std::fs::rename(tmp_jpg, &jpg_path);
                    return Some(jpg_path);
                }
            }
        }
    }
    None
}

fn extract_pdf_cover_first_page(file_path: &Path, covers_dir: &Path) -> Option<String> {
    if !has_pdftoppm() {
        return None;
    }
    let _ = std::fs::create_dir_all(covers_dir);
    let cover_prefix_name = format!("cover_pdf_{}", chrono::Utc::now().timestamp_millis());
    let prefix = covers_dir.join(&cover_prefix_name);

    if let (Some(fp_str), Some(pref_str)) = (file_path.to_str(), prefix.to_str()) {
        if let Ok(out) = Command::new("pdftoppm")
            .args(["-jpeg", "-r", "150", "-f", "1", "-l", "1", "-singlefile", fp_str, pref_str])
            .output()
        {
            if out.status.success() {
                let candidate = covers_dir.join(format!("{}.jpg", cover_prefix_name));
                if candidate.exists() {
                    return Some(format!("/data/covers/{}.jpg", cover_prefix_name));
                }
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_pdf_meta_json_extracts_pages() {
        let chapters = vec![serde_json::json!({
            "id": "ch_1",
            "title": "第 1–2 页",
            "content": "[[PDF_PAGE:1]]\n\n第一页第一段。\n\n[[PDF_PAGE:2]]\n\n第二页第一段。",
            "wordCount": 20,
            "order": 0
        })];

        let meta = build_pdf_meta_json("book_123", &chapters);
        assert_eq!(meta["book_id"], "book_123");
        assert_eq!(meta["page_count"], 2);
        assert_eq!(meta["pages"][0]["page_num"], 1);
        assert_eq!(meta["pages"][1]["page_num"], 2);
    }
}
