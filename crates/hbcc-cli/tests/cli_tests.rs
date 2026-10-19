use assert_cmd::Command;
use predicates::prelude::*;
use std::fs;
use tempfile::tempdir;

#[test]
fn test_cli_help() {
    let mut cmd = Command::cargo_bin("hbcc").unwrap();
    cmd.arg("--help")
        .assert()
        .success()
        .stdout(predicate::str::contains("parse"))
        .stdout(predicate::str::contains("prepare-data"))
        .stdout(predicate::str::contains("sync-supabase"))
        .stdout(predicate::str::contains("sync-github"))
        .stdout(predicate::str::contains("run-all"));
}

#[test]
fn test_cli_parse_fixture() {
    let fixture_src = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../hbcc-core/tests/fixtures/www2025HobsonsBayKoshnitskyCupJuniors");

    if !fixture_src.exists() {
        eprintln!("Fixture not found at {:?}, skipping", fixture_src);
        return;
    }

    let temp_dir = tempdir().unwrap();
    let dest_tour = temp_dir.path().join("www2025HobsonsBayKoshnitskyCupJuniors");
    fs::create_dir_all(&dest_tour).unwrap();

    // Copy html files to temp tournament folder
    for entry in fs::read_dir(&fixture_src).unwrap().filter_map(|e| e.ok()) {
        if entry.path().is_file() {
            if let Some(name) = entry.file_name().to_str() {
                if name.ends_with(".html") {
                    fs::copy(entry.path(), dest_tour.join(name)).unwrap();
                }
            }
        }
    }

    let mut cmd = Command::cargo_bin("hbcc").unwrap();
    cmd.arg("parse")
        .arg(&dest_tour)
        .assert()
        .success()
        .stdout(predicate::str::contains("[Vega Parser] Processing tournament folder"))
        .stdout(predicate::str::contains("[Vega Parser] Output: "))
        .stdout(predicate::str::contains("\"success\":true"))
        .stdout(predicate::str::contains("\"data.json\""));

    assert!(dest_tour.join("data.json").exists());
    assert!(dest_tour.join("data_clean.json").exists());
}

#[test]
fn test_cli_prepare_data() {
    let fixture_src = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../hbcc-core/tests/fixtures/www2025HobsonsBayKoshnitskyCupJuniors");

    if !fixture_src.exists() {
        return;
    }

    let temp_dir = tempdir().unwrap();
    let www_dir = temp_dir.path().join("www");
    let dest_tour = www_dir.join("www2025HobsonsBayKoshnitskyCupJuniors");
    fs::create_dir_all(&dest_tour).unwrap();

    for entry in fs::read_dir(&fixture_src).unwrap().filter_map(|e| e.ok()) {
        if entry.path().is_file() {
            if let Some(name) = entry.file_name().to_str() {
                if name.ends_with(".html") {
                    fs::copy(entry.path(), dest_tour.join(name)).unwrap();
                }
            }
        }
    }

    let mut cmd = Command::cargo_bin("hbcc").unwrap();
    cmd.arg("prepare-data")
        .arg("--www-dir")
        .arg(&www_dir)
        .assert()
        .success()
        .stdout(predicate::str::contains("[Prepare Data] Completed: 1 tournaments processed."));

    assert!(www_dir.join("tournament.json").exists());
    assert!(www_dir.join("senior-players.json").exists());
    assert!(www_dir.join("junior-players.json").exists());
    assert!(www_dir.join("players.json").exists());
}

#[test]
fn test_cli_parse_invalid_folder() {
    let mut cmd = Command::cargo_bin("hbcc").unwrap();
    cmd.arg("parse")
        .arg("/non/existent/path/for/sure")
        .assert()
        .failure()
        .stderr(predicate::str::contains("Specified path is not a directory"));
}
