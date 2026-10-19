use hbcc_core::php::{
    convert_php_content, convert_tournament_php_files, find_php_files, is_html_out_of_date,
    rewrite_php_links,
};
use std::collections::HashMap;
use std::fs;
use tempfile::tempdir;

#[test]
fn test_resolve_php_includes_and_clean_links() {
    let mut files = HashMap::new();
    files.insert(
        "header.php".to_string(),
        "<div class='nav'><a href='index.php'>Home</a></div>".to_string(),
    );

    let main_php =
        "<?php include 'header.php'; ?>\n<h1>Tournament</h1>\n<a href='standing.php'>Standings</a>";
    let converted = convert_php_content(main_php, &files);

    assert!(converted.contains("<div class='nav'><a href='index.html'>Home</a></div>"));
    assert!(converted.contains("<a href='standing.html'>Standings</a>"));
    assert!(!converted.contains("<?php"));
}

#[test]
fn test_rewrite_php_links() {
    let input = r#"<a href="pairs1.php">Round 1</a> and <a href="standing.php?sort=1">Standings</a>"#;
    let rewritten = rewrite_php_links(input);
    assert_eq!(
        rewritten,
        r#"<a href="pairs1.html">Round 1</a> and <a href="standing.html?sort=1">Standings</a>"#
    );
}

#[test]
fn test_disk_tournament_php_conversion() {
    let dir = tempdir().unwrap();
    let root = dir.path();

    let header_path = root.join("header.php");
    fs::write(&header_path, "<header><a href=\"index.php\">Title</a></header>").unwrap();

    let index_php = root.join("index.php");
    fs::write(
        &index_php,
        "<?php include 'header.php'; ?>\n<p>Welcome</p>\n<?php // comment ?>",
    )
    .unwrap();

    let php_files = find_php_files(root);
    assert_eq!(php_files.len(), 2);

    let index_html = root.join("index.html");
    assert!(!index_html.exists());
    assert!(is_html_out_of_date(&index_php, &index_html, 30.0));

    let stats = convert_tournament_php_files(root, 30.0).unwrap();
    assert_eq!(stats.total_php, 2);
    assert_eq!(stats.converted, 2);
    assert_eq!(stats.failed, 0);

    assert!(index_html.exists());
    let html_content = fs::read_to_string(&index_html).unwrap();
    assert!(html_content.contains("<header><a href=\"index.html\">Title</a></header>"));
    assert!(html_content.contains("<p>Welcome</p>"));
    assert!(!html_content.contains("<?php"));

    // Second run: should skip since HTML is fresh
    let second_stats = convert_tournament_php_files(root, 30.0).unwrap();
    assert_eq!(second_stats.converted, 0);
    assert_eq!(second_stats.skipped, 2);
}
