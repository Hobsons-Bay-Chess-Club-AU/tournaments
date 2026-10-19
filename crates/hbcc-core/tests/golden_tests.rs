use hbcc_core::{process_folder, ProcessOptions};
use std::fs;
use std::path::Path;

#[test]
fn test_golden_fixtures_present() {
    let fixture_dir = Path::new("tests/fixtures");
    assert!(fixture_dir.exists(), "Golden fixture directory must exist");
    let entries = fs::read_dir(fixture_dir).unwrap();
    let count = entries
        .filter_map(Result::ok)
        .filter(|e| e.path().is_dir())
        .count();
    println!("Found {} golden tournament fixtures", count);
    assert!(count >= 20, "Must have at least 20 golden tournament fixtures");
}

#[test]
fn test_all_golden_fixtures_parity() {
    let fixture_dir = Path::new("tests/fixtures");
    let mut fixture_paths = Vec::new();

    for entry in fs::read_dir(fixture_dir).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();
        if path.is_dir() && path.join("expected_hash.txt").exists() {
            fixture_paths.push(path);
        }
    }
    fixture_paths.sort();

    println!(
        "Testing {} golden tournament fixtures for exact parity...",
        fixture_paths.len()
    );
    let mut passed = 0;
    let mut failures = Vec::new();

    for f_path in &fixture_paths {
        let name = f_path.file_name().unwrap().to_string_lossy().to_string();
        let input_dir = f_path.join("input");

        let expected_hash = fs::read_to_string(f_path.join("expected_hash.txt"))
            .unwrap()
            .trim()
            .to_string();

        let expected_clean_str = fs::read_to_string(f_path.join("expected_clean.json")).unwrap();
        let expected_clean: serde_json::Value = serde_json::from_str(&expected_clean_str).unwrap();
        let expected_clean_hash = expected_clean
            .get("md5Hash")
            .and_then(|v| v.as_str())
            .unwrap_or_default();

        match process_folder(&input_dir, &ProcessOptions::default()) {
            Ok(result) => {
                let clean_hash = result
                    .data_clean
                    .get("md5Hash")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default();

                if result.md5_hash == expected_hash && clean_hash == expected_clean_hash {
                    println!(
                        "  ✓ {} ({} players, raw hash: {}, clean hash: {})",
                        name,
                        result.player_count,
                        &result.md5_hash[..8],
                        &clean_hash[..8]
                    );
                    passed += 1;
                } else {
                    println!("  ✗ {} MD5 mismatch!", name);
                    if result.md5_hash != expected_hash {
                        println!(
                            "    Raw:   calculated {}, expected {}",
                            result.md5_hash, expected_hash
                        );
                    }
                    if clean_hash != expected_clean_hash {
                        println!(
                            "    Clean: calculated {}, expected {}",
                            clean_hash, expected_clean_hash
                        );
                    }
                    failures.push(name);
                }
            }
            Err(e) => {
                println!("  ✗ {} execution error: {}", name, e);
                failures.push(name);
            }
        }
    }

    println!(
        "\nGolden parity results: {} passed, {} failed out of {}",
        passed,
        failures.len(),
        fixture_paths.len()
    );
    assert!(failures.is_empty(), "Failed fixtures: {:?}", failures);
    assert_eq!(passed, fixture_paths.len());
}
