pub mod epub;
pub mod html_converter;
pub mod mobi;
pub mod palmdoc;
pub mod pdf;
pub mod security;
pub mod txt;

use std::path::Path;
pub use epub::ParsedBook;
pub use security::infer_title_and_author;

pub fn parse_book_file(file_path: &Path, original_name: &str, covers_dir: &Path) -> Result<ParsedBook, String> {
    let (inferred_title, inferred_author) = infer_title_and_author(original_name);
    parse_book_file_with_meta(file_path, &inferred_title, &inferred_author, covers_dir)
}

pub fn parse_book_file_with_meta(
    file_path: &Path,
    default_title: &str,
    default_author: &str,
    covers_dir: &Path,
) -> Result<ParsedBook, String> {
    let ext = file_path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("txt")
        .to_lowercase();

    match ext.as_str() {
        "epub" => epub::parse_epub(file_path, default_title, default_author, covers_dir),
        "txt" | "md" | "markdown" => txt::parse_txt(file_path, default_title, default_author, &ext),
        "pdf" => pdf::parse_pdf(file_path, default_title, default_author, covers_dir),
        "mobi" | "azw" | "azw3" | "prc" => mobi::parse_mobi(file_path, default_title, default_author, covers_dir),
        _ => txt::parse_txt(file_path, default_title, default_author, "txt"),
    }
}
