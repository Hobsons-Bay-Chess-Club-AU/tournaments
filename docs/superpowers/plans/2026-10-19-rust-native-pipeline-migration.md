# Shared Native Rust Tournament Engine & Pipeline Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify tournament HTML parsing, PHP conversion, leaderboard indexing, Supabase PostgREST sync, and GitHub API commits into a single shared Rust workspace (`hbcc-core` and `hbcc-cli`), eliminating the Bun sidecar from the desktop FTP server and replacing Node.js scripts in the CI pipeline while guaranteeing 100% JSON data parity.

**Architecture:** A Cargo workspace at repository root containing `crates/hbcc-core` (pure shared headless library), `crates/hbcc-cli` (standalone CLI binary for CI), and `ftp-server/src-tauri` (desktop GUI app consuming `hbcc-core` directly in-process). Built against an automated Golden Test Suite of 25+ real historical tournaments asserting exact JSON deep equality.

**Tech Stack:** Rust 2021, Cargo Workspace, `scraper` (Servo html5ever), `serde`, `serde_json` (with `preserve_order`), `md5`, `regex`, `chrono`, `reqwest`, `clap` (v4), `assert_json_diff`, Tauri v2.

**Spec:** [docs/superpowers/specs/2026-10-19-rust-native-pipeline-migration-design.md](file:///Users/truongnguyen/source/hbcc/tournaments/docs/superpowers/specs/2026-10-19-rust-native-pipeline-migration-design.md)

## Global Constraints
- **JSON Parity**: All outputs (`data.json`, `data_clean.json`, `tournament.json`, `players.json`) must maintain exact structural, type, and key-order equality with existing JavaScript output.
- **MD5 Hashing**: Must match Node.js `crypto.createHash('md5').update(JSON.stringify(dataCopy)).digest('hex')` verbatim.
- **Zero Sidecar**: Desktop app (`ftp-server/src-tauri`) must completely remove Bun sidecar binary (`vega-parser`) and build without Bun dependencies.
- **Desktop Compatibility**: Must build cleanly on macOS (`universal-apple-darwin`) and Windows (`x86_64-pc-windows-msvc`).

---

### Task 1: Cargo Workspace Initialization & Golden Fixture Generator

**Files:**
- Create: `Cargo.toml` (root workspace)
- Create: `scripts/generate-golden-fixtures.mjs`
- Create: `crates/hbcc-core/Cargo.toml`
- Create: `crates/hbcc-core/src/lib.rs`
- Create: `crates/hbcc-core/tests/golden_tests.rs`

**Interfaces:**
- Consumes: Existing tournaments in `www/` and [src/vega-parser.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/src/vega-parser.mjs).
- Produces: `crates/hbcc-core/tests/fixtures/<name>/{expected_data.json, expected_clean.json, expected_hash.txt}` and workspace root definition.

- [ ] **Step 1: Create root Cargo.toml workspace configuration**

```toml
[workspace]
members = [
    "crates/hbcc-core",
    "crates/hbcc-cli",
    "ftp-server/src-tauri"
]
resolver = "2"
```

- [ ] **Step 2: Scaffold `crates/hbcc-core` library**

`crates/hbcc-core/Cargo.toml`:
```toml
[package]
name = "hbcc-core"
version = "0.1.0"
edition = "2021"
description = "Core tournament parsing, leaderboard calculation, and sync engine for HBCC"

[dependencies]
scraper = "0.22"
serde = { version = "1.0", features = ["derive"] }
serde_json = { version = "1.0", features = ["preserve_order"] }
indexmap = { version = "2.6", features = ["serde"] }
md-5 = "0.10"
regex = "1.11"
chrono = { version = "0.4", features = ["serde"] }
walkdir = "2.5"
reqwest = { version = "0.12", features = ["json", "blocking"] }
tokio = { version = "1", features = ["full"], optional = true }

[dev-dependencies]
assert_json_diff = "2.0"
tempfile = "3.14"
```

- [ ] **Step 3: Create fixture generator script `scripts/generate-golden-fixtures.mjs`**

Script selects 25 representative tournaments in `www/` (Swiss, Round Robin, Junior, Senior, Vega 7, Vega 8, PHP wrappers), parses each with `processFolder`, and writes test fixtures:
- Input HTML/PHP files
- `expected_data.json`
- `expected_clean.json`
- `expected_hash.txt`

- [ ] **Step 4: Run generator script to create test fixtures**

Run: `node scripts/generate-golden-fixtures.mjs`
Expected: 25+ fixture directories populated in `crates/hbcc-core/tests/fixtures/`.

- [ ] **Step 5: Create test harness skeleton in `crates/hbcc-core/tests/golden_tests.rs`**

```rust
use std::fs;
use std::path::Path;

#[test]
fn test_golden_fixtures_present() {
    let fixture_dir = Path::new("tests/fixtures");
    assert!(fixture_dir.exists(), "Golden fixture directory must exist");
    let entries = fs::read_dir(fixture_dir).unwrap();
    let count = entries.filter_map(Result::ok).filter(|e| e.path().is_dir()).count();
    assert!(count >= 20, "Must have at least 20 golden tournament fixtures");
}
```

- [ ] **Step 6: Run cargo test to verify fixtures**

Run: `cargo test -p hbcc-core`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add Cargo.toml scripts/generate-golden-fixtures.mjs crates/hbcc-core
git commit -m "feat(core): initialize Cargo workspace and generate golden tournament fixtures"
```

---

### Task 2: PHP Template Converter (`hbcc-core::php`)

**Files:**
- Create: `crates/hbcc-core/src/php.rs`
- Modify: `crates/hbcc-core/src/lib.rs`
- Test: `crates/hbcc-core/tests/php_tests.rs`

**Interfaces:**
- Consumes: Target directory containing `.php` files.
- Produces: `pub fn convert_tournament_php_files(dir: &Path, threshold_secs: f64) -> Result<PhpConversionStats>`

- [ ] **Step 1: Write failing unit test for PHP conversion**

`crates/hbcc-core/tests/php_tests.rs`:
```rust
use hbcc_core::php::{convert_php_content, resolve_includes};
use std::collections::HashMap;

#[test]
fn test_resolve_php_includes_and_clean_links() {
    let mut files = HashMap::new();
    files.insert("header.php".to_string(), "<div class='nav'><a href='index.php'>Home</a></div>".to_string());
    
    let main_php = "<?php include 'header.php'; ?>\n<h1>Tournament</h1>\n<a href='standing.php'>Standings</a>";
    let converted = convert_php_content(main_php, &files);
    
    assert!(converted.contains("<div class='nav'><a href='index.html'>Home</a></div>"));
    assert!(converted.contains("<a href='standing.html'>Standings</a>"));
    assert!(!converted.contains("<?php"));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p hbcc-core --test php_tests`
Expected: FAIL with missing module/function.

- [ ] **Step 3: Implement `crates/hbcc-core/src/php.rs`**

Port logic from [src/php-converter.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/src/php-converter.mjs):
- `find_php_files(dir: &Path) -> Vec<PathBuf>`
- `is_html_out_of_date(php_path: &Path, html_path: &Path, threshold_secs: f64) -> bool`
- `resolve_includes(content: &str, base_dir: &Path) -> String`
- `rewrite_php_links(html: &str) -> String`
- `convert_tournament_php_files(dir: &Path, threshold: f64) -> Result<PhpConversionStats>`

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test -p hbcc-core --test php_tests`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crates/hbcc-core/src/php.rs crates/hbcc-core/tests/php_tests.rs crates/hbcc-core/src/lib.rs
git commit -m "feat(core): implement native PHP template to HTML converter"
```

---

### Task 3: Vega Metadata & Player Parser (`hbcc-core::parser::{tourstat, player}`)

**Files:**
- Create: `crates/hbcc-core/src/parser/mod.rs`
- Create: `crates/hbcc-core/src/parser/tourstat.rs`
- Create: `crates/hbcc-core/src/parser/player.rs`
- Test: `crates/hbcc-core/tests/parser_tests.rs`

**Interfaces:**
- Consumes: `tourstat.html` and player table cells (`<td>` elements).
- Produces: `pub fn extract_metadata(html: &str) -> Result<IndexMap<String, String>>` and `pub fn read_pair_player(element: &ElementRef) -> ParsedPlayerRef`

- [ ] **Step 1: Write failing tests for tourstat metadata & player extraction**

`crates/hbcc-core/tests/parser_tests.rs`:
```rust
use hbcc_core::parser::tourstat::extract_metadata;
use hbcc_core::parser::player::parse_caption_player_info;

#[test]
fn test_tourstat_metadata_extraction() {
    let html = r#"
    <table class="table-striped">
      <tbody>
        <tr><td>Tournament Name</td><td>2026 HBCC Club Championship</td></tr>
        <tr><td>Site</td><td>Hobsons Bay Chess Club</td></tr>
        <tr><td>Rounds</td><td>7</td></tr>
        <tr><td>Date Begin</td><td>05/02/2026</td></tr>
        <tr><td>Date End</td><td>19/03/2026</td></tr>
        <tr><td>Arbiter(s)</td><td>IA Truong Nguyen</td></tr>
      </tbody>
    </table>"#;
    
    let meta = extract_metadata(html).unwrap();
    assert_eq!(meta.get("Tournament Name").unwrap(), "2026 HBCC Club Championship");
    assert_eq!(meta.get("Site").unwrap(), "Hobsons Bay Chess Club");
    assert_eq!(meta.get("Rounds").unwrap(), "7");
}

#[test]
fn test_parse_player_fide_link_caption() {
    let caption = r#"<caption><a href="http://ratings.fide.com/card.phtml?event=3244806" target="X"> Annapureddy, Rheyansh Reddy </a> ID=3244806, N=1, Elo=1850</caption>"#;
    let info = parse_caption_player_info(caption).unwrap();
    assert_eq!(info.player_name, "Annapureddy, Rheyansh Reddy");
    assert_eq!(info.id, "3244806");
    assert_eq!(info.more_info.get("FIDE_ID").unwrap(), "3244806");
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p hbcc-core --test parser_tests`
Expected: FAIL

- [ ] **Step 3: Implement `tourstat.rs` and `player.rs`**

Port table parsing logic matching lines 12–25 and 65–200 of [src/vega-parser.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/src/vega-parser.mjs).
- Parse table rows with class `.table-striped tbody tr`.
- Handle player IDs in `span.idwhite`, `span.idblack`, and `.sort-num`.
- Extract titles (`span.title`), genders (`span.male`, `span.female`, `notitle`), and FIDE links.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test -p hbcc-core --test parser_tests`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crates/hbcc-core/src/parser/
git commit -m "feat(core): implement Vega tourstat metadata and player cell parsing"
```

---

### Task 4: Standings, Pairings & Crosstable Scrapers

**Files:**
- Create: `crates/hbcc-core/src/parser/standings.rs`
- Create: `crates/hbcc-core/src/parser/pairings.rs`
- Create: `crates/hbcc-core/src/parser/crosstable.rs`
- Modify: `crates/hbcc-core/src/parser/mod.rs`
- Test: `crates/hbcc-core/tests/standings_pairings_tests.rs`

**Interfaces:**
- Consumes: Raw `standing.html`, `pairs*.html`, and `crosstable.html` contents.
- Produces: `ParsedStandings`, `Vec<RoundPairings>`, and `ParsedCrosstable`.

- [ ] **Step 1: Write failing tests for standings & round pairings**

```rust
#[test]
fn test_parse_standings_and_tiebreaks() {
    let html = include_str!("../tests/fixtures/sample_standing.html");
    let standings = parse_standings(html).unwrap();
    assert!(!standings.is_empty());
    assert_eq!(standings[0].rank, 1);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p hbcc-core --test standings_pairings_tests`
Expected: FAIL

- [ ] **Step 3: Implement standings, pairings, and crosstable parsers**

Replicate [src/vega-parser.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/src/vega-parser.mjs) parsing:
- Standings tables, rank resolution, scores (`Pts`), tiebreak values (`BH`, `BH/C1`, `SB`, `DE`, `Prog`).
- Pairings: board number, white player, black player, results (`1 - 0`, `0 - 1`, `1/2 - 1/2`, forfeit flags).
- Individual player game cards and colors.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test -p hbcc-core --test standings_pairings_tests`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crates/hbcc-core/src/parser/
git commit -m "feat(core): implement standings, pairings, and crosstable scrapers"
```

---

### Task 5: JSON Assembly, MD5 Hashing & Golden Parity Verification

**Files:**
- Create: `crates/hbcc-core/src/hash.rs`
- Create: `crates/hbcc-core/src/clean.rs`
- Modify: `crates/hbcc-core/src/lib.rs`
- Modify: `crates/hbcc-core/tests/golden_tests.rs`

**Interfaces:**
- Consumes: Parsed tournament data structures and raw tournament folder.
- Produces: `pub fn process_folder(dir: &Path, opts: &ProcessOptions) -> Result<TournamentProcessResult>`

- [ ] **Step 1: Implement `hash.rs` with exact exclusion logic**

Match `calculateDataHash`:
- Deep copy `serde_json::Value`.
- Remove: `generatedAt`, `md5Hash`, `cleanData`, `cleanMd5Hash`, `folderName`, `folderPath`.
- Serialize using `serde_json::to_string` preserving key order.
- Compute MD5 hex string.

- [ ] **Step 2: Implement `clean.rs` for `data_clean.json` generation**

Normalizes categories, formats dates, strips verbose HTML blobs.

- [ ] **Step 3: Wire `process_folder` in `crates/hbcc-core/src/lib.rs`**

Orchestrates:
1. PHP conversion if applicable.
2. Metadata, standings, pairings, and crosstable extraction.
3. Category classification (Senior vs Junior based on [src/ref.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/src/ref.mjs)).
4. `data.json` and `data_clean.json` serialization.
5. MD5 hash generation.

- [ ] **Step 4: Run Golden Fixture Test Suite against all 25+ real tournaments**

`crates/hbcc-core/tests/golden_tests.rs`:
```rust
#[test]
fn test_all_golden_fixtures_parity() {
    let fixtures = load_all_fixtures();
    for f in fixtures {
        let result = hbcc_core::process_folder(&f.input_dir, &ProcessOptions::default()).unwrap();
        assert_json_eq!(result.data, f.expected_data);
        assert_json_eq!(result.data_clean, f.expected_clean);
        assert_eq!(result.md5_hash, f.expected_hash);
    }
}
```

Run: `cargo test -p hbcc-core --test golden_tests`
Expected: PASS with 100% equality across all 25+ fixtures.

- [ ] **Step 5: Commit**

```bash
git add crates/hbcc-core/src/hash.rs crates/hbcc-core/src/clean.rs crates/hbcc-core/src/lib.rs crates/hbcc-core/tests/golden_tests.rs
git commit -m "feat(core): implement JSON assembly, MD5 hashing, and pass golden parity suite"
```

---

### Task 6: Leaderboard & Index Generation (`hbcc-core::leaderboards`)

**Files:**
- Create: `crates/hbcc-core/src/leaderboards.rs`
- Modify: `crates/hbcc-core/src/lib.rs`
- Test: `crates/hbcc-core/tests/leaderboard_tests.rs`

**Interfaces:**
- Consumes: `www/` base directory.
- Produces: `pub fn generate_leaderboards(www_dir: &Path) -> Result<LeaderboardOutputs>` (`tournament.json`, `players.json`, `players_junior.json`, `players_senior.json`).

- [ ] **Step 1: Write failing test for `tournament.json` and player leaderboard aggregation**

Compare outputs against sample snapshots of `tournament.json` and `players.json`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p hbcc-core --test leaderboard_tests`
Expected: FAIL

- [ ] **Step 3: Implement `crates/hbcc-core/src/leaderboards.rs`**

Port [src/prepare-data.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/src/prepare-data.mjs):
- Scan `www/` for `data.json` files.
- Aggregate active tournaments into `tournament.json`.
- Aggregate points by rating type: Standard, Rapid, Blitz.
- Categorize Junior vs Senior.
- Output JSON files.

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test -p hbcc-core --test leaderboard_tests`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crates/hbcc-core/src/leaderboards.rs crates/hbcc-core/tests/leaderboard_tests.rs
git commit -m "feat(core): implement tournament index and player leaderboard generation"
```

---

### Task 7: Cloud Sync (`hbcc-core::supabase`, `github`)

**Files:**
- Create: `crates/hbcc-core/src/supabase.rs`
- Create: `crates/hbcc-core/src/github.rs`
- Modify: `crates/hbcc-core/src/lib.rs`
- Test: `crates/hbcc-core/tests/cloud_sync_tests.rs`

**Interfaces:**
- Consumes: Processed tournament data and environment variables (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `GH_TOKEN`, `GH_REPO`, `GH_BRANCH`).
- Produces: `pub fn upsert_to_supabase(...) -> Result<SyncResult>` and `pub fn commit_to_github(...) -> Result<GitCommitResult>`.

- [ ] **Step 1: Write unit tests verifying payload formatting and mock REST requests**

Test payload generation for `tournaments` and `players` tables matching [src/supabase.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/src/supabase.mjs).
Test Git Database tree construction matching [src/github-sync.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/src/github-sync.mjs).

- [ ] **Step 2: Implement `crates/hbcc-core/src/supabase.rs`**

Direct PostgREST calls with `reqwest`:
- `POST /rest/v1/tournaments?on_conflict=slug`
- `POST /rest/v1/players?on_conflict=player_id`

- [ ] **Step 3: Implement `crates/hbcc-core/src/github.rs`**

GitHub Git Database REST API flow:
- `GET ref`, `GET tree`, update `tournament.json`, `POST blobs`, `POST tree`, `POST commit`, `PATCH ref`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test -p hbcc-core --test cloud_sync_tests`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crates/hbcc-core/src/supabase.rs crates/hbcc-core/src/github.rs crates/hbcc-core/tests/cloud_sync_tests.rs
git commit -m "feat(core): implement Supabase PostgREST sync and GitHub Git Database commit"
```

---

### Task 8: Command-Line Tool (`crates/hbcc-cli`)

**Files:**
- Create: `crates/hbcc-cli/Cargo.toml`
- Create: `crates/hbcc-cli/src/main.rs`
- Test: `crates/hbcc-cli/tests/cli_tests.rs`

**Interfaces:**
- Consumes: CLI arguments (`parse`, `prepare-data`, `sync-supabase`, `sync-github`, `run-all`).
- Produces: Executable binary `hbcc-cli`.

- [ ] **Step 1: Write CLI definition with `clap` (v4 derive)**

`crates/hbcc-cli/Cargo.toml`:
```toml
[package]
name = "hbcc-cli"
version = "0.1.0"
edition = "2021"

[dependencies]
hbcc-core = { path = "../hbcc-core" }
clap = { version = "4.5", features = ["derive"] }
anyhow = "1.0"
dotenvy = "0.15"
env_logger = "0.11"
log = "0.4"
```

- [ ] **Step 2: Implement CLI commands in `crates/hbcc-cli/src/main.rs`**

Commands:
- `hbcc parse <dir>`: runs PHP converter + parser on a tournament folder.
- `hbcc prepare-data --www <path>`: updates `tournament.json` and `players.json`.
- `hbcc sync-supabase <dir>`: upserts tournament to Supabase.
- `hbcc sync-github <dir>`: commits tournament to GitHub.
- `hbcc run-all --dir <dir>`: full end-to-end pipeline.

- [ ] **Step 3: Test CLI execution locally on sample tournament folder**

Run: `cargo run -p hbcc-cli -- parse ./www/2026ClubChampionship`
Expected: `data.json` and `data_clean.json` generated.

- [ ] **Step 4: Commit**

```bash
git add crates/hbcc-cli/
git commit -m "feat(cli): create standalone hbcc-cli command-line tool"
```

---

### Task 9: Tauri Desktop Integration & Sidecar Deletion

**Files:**
- Modify: `ftp-server/src-tauri/Cargo.toml`
- Modify: `ftp-server/src-tauri/tauri.conf.json`
- Modify: `ftp-server/src-tauri/src/parser/mod.rs`
- Delete: `ftp-server/parser/`
- Delete: `ftp-server/scripts/build-sidecar.mjs`
- Modify: `.github/workflows/ftp-server-release.yml`

**Interfaces:**
- Consumes: In-process `hbcc_core::process_tournament_folder`.
- Produces: Pure native Tauri app with zero external Bun binaries.

- [ ] **Step 1: Link `hbcc-core` in `ftp-server/src-tauri/Cargo.toml`**

Add:
```toml
hbcc-core = { path = "../../crates/hbcc-core" }
```

- [ ] **Step 2: Replace sidecar execution in `ftp-server/src-tauri/src/parser/mod.rs`**

Replace `Command::new_sidecar("vega-parser")` with in-process call:
```rust
let res = tokio::task::spawn_blocking(move || {
    hbcc_core::process_tournament_folder(&path, &opts)
}).await??;
```
Emit existing `parser-complete` and `parser-error` Tauri events with the resulting data.

- [ ] **Step 3: Remove sidecar from `tauri.conf.json` and workflow**

- In `ftp-server/src-tauri/tauri.conf.json`: remove `"externalBin": ["binaries/vega-parser"]`.
- Delete `ftp-server/scripts/build-sidecar.mjs` and `ftp-server/parser/run-parser.mjs`.
- In `.github/workflows/ftp-server-release.yml`: remove Bun installation and `build-sidecar` step.

- [ ] **Step 4: Run desktop tests and verify build**

Run: `cargo test -p hbcc-ftp-server`
Run: `npm --prefix ftp-server run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ftp-server .github/workflows/ftp-server-release.yml
git commit -m "feat(ftp-server): integrate native hbcc-core parser and eliminate Bun sidecar"
```

---

### Task 10: CI Pipeline Integration (`.github/workflows/sync.yml`)

**Files:**
- Modify: `.github/workflows/sync.yml`
- Test: Local verification of `hbcc-cli run-all`

- [ ] **Step 1: Test full run of `hbcc-cli` against `www/`**

Run: `cargo run --release -p hbcc-cli -- prepare-data --www ./www`
Verify: `git diff www/tournament.json www/players.json` shows no structural regressions.

- [ ] **Step 2: Update `.github/workflows/sync.yml`**

Replace:
```yaml
- name: run Sync.mjs
  run: |
    sudo chown -R $(whoami) ./www
    node src/sync.mjs
    node src/prepare-data.mjs
```
With:
```yaml
- name: Process tournaments and update leaderboards
  run: |
    sudo chown -R $(whoami) ./www
    cargo run --release -p hbcc-cli -- run-all --www ./www
```

- [ ] **Step 3: Run full workflow validation or dry run**

Verify workflow YAML syntax and dependencies.

- [ ] **Step 4: Commit and push**

```bash
git add .github/workflows/sync.yml
git commit -m "ci: switch FTP sync workflow to native hbcc-cli tournament engine"
```
