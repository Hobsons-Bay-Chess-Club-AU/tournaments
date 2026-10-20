use regex::Regex;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;
use std::time::SystemTime;

static RE_DOUBLE_QUOTE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?i)\b(href|src|action)\s*=\s*"([^"]*?)\.php([?#][^"]*)?""#).unwrap()
});

static RE_SINGLE_QUOTE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?i)\b(href|src|action)\s*=\s*'([^']*?)\.php([?#][^']*)?'"#).unwrap()
});

static RE_INCLUDE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?i)<\?php\s*(?:include|include_once|require|require_once)\s*(?:\(\s*)?['"]([^'"]+)['"]\s*\)?\s*;\s*\?>"#).unwrap()
});

static RE_STRIP_PHP: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?is)<\?php.*?\?>"#).unwrap()
});

/// Default threshold in seconds for considering an HTML file out of date compared to PHP.
pub const DEFAULT_PHP_TO_HTML_THRESHOLD_SECONDS: f64 = 30.0;

#[derive(Debug, Clone)]
pub struct PhpConvertOptions {
    pub threshold_seconds: f64,
    pub force: bool,
    pub quiet: bool,
}

impl Default for PhpConvertOptions {
    fn default() -> Self {
        Self {
            threshold_seconds: get_php_to_html_threshold_seconds(),
            force: false,
            quiet: true,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PhpFileResult {
    pub converted: bool,
    pub skipped: bool,
    pub html_file: PathBuf,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PhpConversionStats {
    pub total_php: usize,
    pub converted: usize,
    pub skipped: usize,
    pub failed: usize,
    pub html_files: Vec<PathBuf>,
}

/// Returns the configured threshold in seconds for considering an HTML file out of date
/// compared to its matching PHP source file. Default is 30 seconds.
pub fn get_php_to_html_threshold_seconds() -> f64 {
    let env_val = std::env::var("PHP_TO_HTML_THRESHOLD_SECONDS")
        .ok()
        .or_else(|| option_env!("PHP_TO_HTML_THRESHOLD_SECONDS").map(|s| s.to_string()));
    if let Some(val) = env_val {
        let trimmed = val.trim();
        if !trimmed.is_empty() {
            if let Ok(parsed) = trimmed.parse::<f64>() {
                if parsed >= 0.0 {
                    return parsed;
                }
            }
        }
    }
    DEFAULT_PHP_TO_HTML_THRESHOLD_SECONDS
}

/// Recursively find all `.php` files in a directory.
pub fn find_php_files(directory: &Path) -> Vec<PathBuf> {
    let mut results = Vec::new();
    if !directory.exists() {
        return results;
    }

    if let Ok(entries) = fs::read_dir(directory) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                results.extend(find_php_files(&path));
            } else if path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext.to_string_lossy().eq_ignore_ascii_case("php") {
                        results.push(path);
                    }
                }
            }
        }
    }

    results.sort();
    results
}

/// Checks if the corresponding HTML file is missing or out of date compared to the PHP file.
/// Returns true if:
/// 1. The HTML file does not exist.
/// 2. The PHP file was modified more than `threshold_seconds` after the HTML file.
pub fn is_html_out_of_date(php_file: &Path, html_file: &Path, threshold_seconds: f64) -> bool {
    if !html_file.exists() {
        return true;
    }
    if !php_file.exists() {
        return false;
    }

    let php_meta = match fs::metadata(php_file) {
        Ok(m) => m,
        Err(_) => return true,
    };
    let html_meta = match fs::metadata(html_file) {
        Ok(m) => m,
        Err(_) => return true,
    };

    let php_mtime = php_meta.modified().unwrap_or(SystemTime::UNIX_EPOCH);
    let html_mtime = html_meta.modified().unwrap_or(SystemTime::UNIX_EPOCH);

    match php_mtime.duration_since(html_mtime) {
        Ok(duration) => duration.as_secs_f64() > threshold_seconds,
        Err(_) => false, // PHP modified before or equal to HTML
    }
}

/// Rewrite PHP links in href, src, action attributes to HTML links.
/// Matches patterns like `href="standing.php"` or `href='standing.php?sort=1#rank'`.
pub fn rewrite_php_links(content: &str) -> String {
    let intermediate = RE_DOUBLE_QUOTE.replace_all(content, |caps: &regex::Captures| {
        let attr = &caps[1];
        let url_base = &caps[2];
        let query_hash = caps.get(3).map(|m| m.as_str()).unwrap_or("");
        format!("{attr}=\"{url_base}.html{query_hash}\"")
    });
    
    RE_SINGLE_QUOTE.replace_all(&intermediate, |caps: &regex::Captures| {
        let attr = &caps[1];
        let url_base = &caps[2];
        let query_hash = caps.get(3).map(|m| m.as_str()).unwrap_or("");
        format!("{attr}='{url_base}.html{query_hash}'")
    }).into_owned()
}

/// Strip remaining PHP tags (e.g. `<?php ... ?>`) for clean static HTML.
pub fn strip_php_tags(content: &str) -> String {
    RE_STRIP_PHP.replace_all(content, "").into_owned()
}

/// Resolves PHP include directives in an in-memory string with a map of mock files.
pub fn resolve_includes_in_memory(
    file_name: &str,
    content: &str,
    files: &HashMap<String, String>,
    stack: &mut Vec<String>,
) -> String {
    if stack.contains(&file_name.to_string()) {
        return format!("<!-- Circular include ignored: {file_name} -->");
    }

    stack.push(file_name.to_string());

    let resolved = RE_INCLUDE.replace_all(content, |caps: &regex::Captures| {
        let inc_name = &caps[1];
        if let Some(inc_content) = files.get(inc_name) {
            resolve_includes_in_memory(inc_name, inc_content, files, stack)
        } else {
            format!("<!-- Include not found: {inc_name} -->")
        }
    }).into_owned();

    stack.pop();
    resolved
}

/// Convert in-memory PHP content using a map of available included files.
pub fn convert_php_content(content: &str, files: &HashMap<String, String>) -> String {
    let mut stack = Vec::new();
    let resolved = resolve_includes_in_memory("main.php", content, files, &mut stack);
    let rewritten = rewrite_php_links(&resolved);
    strip_php_tags(&rewritten)
}

/// Resolve simple PHP includes from disk (include, include_once, require, require_once).
pub fn resolve_php_includes_disk(file_path: &Path, stack: &mut Vec<PathBuf>) -> String {
    let canonical = match file_path.canonicalize() {
        Ok(c) => c,
        Err(_) => file_path.to_path_buf(),
    };

    if stack.contains(&canonical) {
        let file_name = file_path.file_name().and_then(|n| n.to_str()).unwrap_or("unknown");
        return format!("<!-- Circular include ignored: {file_name} -->");
    }

    if !file_path.exists() {
        return format!("<!-- Include not found: {} -->", file_path.display());
    }

    let content = match fs::read_to_string(file_path) {
        Ok(c) => c,
        Err(_) => return format!("<!-- Error reading: {} -->", file_path.display()),
    };

    let parent_dir = file_path.parent().unwrap_or_else(|| Path::new("."));
    stack.push(canonical);

    let resolved = RE_INCLUDE.replace_all(&content, |caps: &regex::Captures| {
        let include_rel = &caps[1];
        let include_path = parent_dir.join(include_rel);
        resolve_php_includes_disk(&include_path, stack)
    }).into_owned();

    stack.pop();
    resolved
}

/// Converts a single PHP file to HTML if missing or out of date.
pub fn convert_php_file(php_file: &Path, options: &PhpConvertOptions) -> Result<PhpFileResult, std::io::Error> {
    let html_file = php_file.with_extension("html");

    if !options.force && !is_html_out_of_date(php_file, &html_file, options.threshold_seconds) {
        return Ok(PhpFileResult {
            converted: false,
            skipped: true,
            html_file,
        });
    }

    let mut stack = Vec::new();
    let resolved = resolve_php_includes_disk(php_file, &mut stack);
    let rewritten = rewrite_php_links(&resolved);
    let final_html = strip_php_tags(&rewritten);

    fs::write(&html_file, final_html)?;

    Ok(PhpFileResult {
        converted: true,
        skipped: false,
        html_file,
    })
}

/// Scans a tournament folder and converts all PHP files whose HTML counterparts are missing or out of date.
pub fn convert_tournament_php_files(
    tournament_dir: &Path,
    threshold: f64,
) -> Result<PhpConversionStats, std::io::Error> {
    let php_files = find_php_files(tournament_dir);
    let options = PhpConvertOptions {
        threshold_seconds: threshold,
        force: false,
        quiet: true,
    };

    let mut stats = PhpConversionStats {
        total_php: php_files.len(),
        ..Default::default()
    };

    for php_file in php_files {
        match convert_php_file(&php_file, &options) {
            Ok(res) => {
                if res.converted {
                    stats.converted += 1;
                } else if res.skipped {
                    stats.skipped += 1;
                }
                stats.html_files.push(res.html_file);
            }
            Err(_) => {
                stats.failed += 1;
            }
        }
    }

    Ok(stats)
}
