use std::fs;
use std::path::Path;

#[test]
fn test_golden_fixtures_present() {
    let fixture_dir = Path::new("tests/fixtures");
    assert!(fixture_dir.exists(), "Golden fixture directory must exist");
    let entries = fs::read_dir(fixture_dir).unwrap();
    let count = entries.filter_map(Result::ok).filter(|e| e.path().is_dir()).count();
    println!("Found {} golden tournament fixtures", count);
    assert!(count >= 20, "Must have at least 20 golden tournament fixtures");
}
