# Architecture Specification: Shared Native Rust Tournament Engine & Pipeline Migration

- **Date:** 2026-10-19
- **Status:** Approved
- **Scope:** Core tournament processing (PHP conversion, Vega HTML table parsing, MD5 hashing, data cleaning, leaderboard indexing, Supabase PostgREST sync, GitHub Git Database API commit) shared between Desktop FTP Server and GitHub Actions CI.

---

## 1. Executive Summary & Goals

### 1.1 Problem Statement
The HBCC tournaments repository currently relies on two execution paths for parsing Vega chess tournament HTML and publishing data:
1. **Desktop App (Tauri)**: Uses a compiled Bun sidecar executable (`vega-parser`) bundling Node.js scripts (~50MB overhead, platform-specific compilation hurdles).
2. **CI Pipeline (GitHub Actions)**: Uses Node.js scripts ([scripts/index.js](file:///Users/truongnguyen/source/hbcc/tournaments/scripts/index.js), [src/sync.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/src/sync.mjs), [src/prepare-data.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/src/prepare-data.mjs), [src/supabase.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/src/supabase.mjs), [src/github-sync.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/src/github-sync.mjs)).

Because both environments run separate wrappers around [src/vega-parser.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/src/vega-parser.mjs), any modernization of the desktop app or CI pipeline risks code drift, and maintaining the Bun sidecar adds deployment complexity.

### 1.2 Primary Goals
1. **Single Source of Truth**: Unify the entire parsing, PHP conversion, leaderboard generation, and cloud sync logic into a shared, headless Rust library (`crates/hbcc-core`).
2. **100% JSON Parity & Zero Regression**: Guarantee that `data.json`, `data_clean.json`, `tournament.json`, `players.json`, and calculated MD5 hashes produced by Rust are byte-for-byte and structurally identical to the existing JavaScript output.
3. **Eliminate Desktop Sidecar**: Remove the Bun binary from `ftp-server/src-tauri`, cutting the desktop bundle size from ~80MB down to ~30MB and running parser invocations natively in-process.
4. **Fast, Unified CI CLI**: Provide a standalone native binary (`crates/hbcc-cli`) to replace `node src/prepare-data.mjs` and `node src/sync.mjs` in GitHub Actions.

---

## 2. System Architecture

A Cargo workspace at the repository root containing the shared library, the CLI binary, and the Tauri desktop application.

```
tournaments/
├── Cargo.toml                     <-- Root Cargo Workspace
├── crates/
│   ├── hbcc-core/                 <-- Pure shared library (no GUI dependencies)
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   ├── lib.rs             (Public orchestration APIs)
│   │   │   ├── models/            (Tournament, Player, Round, Pairing structs)
│   │   │   ├── php.rs             (PHP include resolver & converter)
│   │   │   ├── parser/            (Vega HTML table scrapers)
│   │   │   │   ├── mod.rs
│   │   │   │   ├── tourstat.rs    (Metadata extractor)
│   │   │   │   ├── standings.rs   (Standings, ranks, tiebreaks)
│   │   │   │   ├── pairings.rs    (Round pairing tables pairs1..N.html)
│   │   │   │   ├── crosstable.rs  (Matrix & player cards)
│   │   │   │   └── player.rs      (Player cell parser: IDs, gender, FIDE links)
│   │   │   ├── hash.rs            (MD5 hash matching calculateDataHash)
│   │   │   ├── clean.rs           (data_clean.json generation)
│   │   │   ├── leaderboards.rs    (tournament.json, players.json, junior/senior points)
│   │   │   ├── supabase.rs        (PostgREST client using reqwest)
│   │   │   └── github.rs          (Git Database REST API client using reqwest)
│   │   └── tests/
│   │       ├── golden_tests.rs    (Snapshot comparison tests)
│   │       └── fixtures/          (25-30 historical tournament snapshots)
│   └── hbcc-cli/                  <-- CLI tool for CI and local batch processing
│       ├── Cargo.toml
│       └── src/main.rs            (Commands: parse, prepare-data, sync-supabase, sync-github, run-all)
└── ftp-server/
    └── src-tauri/                 <-- Tauri Desktop App
        ├── Cargo.toml             (Depends on hbcc-core: path = "../../crates/hbcc-core")
        └── src/
            ├── parser/mod.rs      (In-process tokio blocking calls to hbcc-core)
            └── ...
```

---

## 3. Detailed Component Specifications

### 3.1 `hbcc-core::php` (PHP-to-HTML Converter)
* **Equivalent File**: [src/php-converter.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/src/php-converter.mjs)
* **Responsibilities**:
  * Traverse tournament directory for `.php` files.
  * Evaluate file modification times (`mtime`) against corresponding `.html` files using `PHP_TO_HTML_THRESHOLD_SECONDS` (default: 30s).
  * Resolve PHP include directives (`include '...', require '...'`) by reading referenced partials from disk.
  * Rewrite internal `.php` hyperlinks and form actions to `.html`.
  * Strip PHP code blocks (`<?php ... ?>`) and output clean HTML files.

### 3.2 `hbcc-core::parser` (Vega HTML Table Scraper)
* **Equivalent File**: [src/vega-parser.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/src/vega-parser.mjs)
* **Crates Used**: `scraper` (Servo `html5ever`), `regex`, `chrono`, `serde`, `serde_json`.
* **Key Submodules**:
  * **`tourstat.rs`**: Parses `tourstat.html` table rows into metadata map (Tournament Name, Site, Place, Federation, Arbiter(s), Date Begin, Date End, Rounds, Rounds Played, Tournament Type).
  * **`player.rs`**: Extracts player info from cells:
    * ID spans (`span.idwhite`, `span.idblack`, `.sort-num`).
    * Gender badges (`span.male`, `span.female`, `notitle`).
    * FIDE profile hyperlinks (`ratings.fide.com/card.phtml?event=...`).
    * Player card anchors and title spans (`span.title`).
  * **`standings.rs`**: Parses `standing.html` and tiebreak tables. Supports standard Buchholz, Buchholz Cut 1, Sonneborn-Berger, Direct Encounter, Most Blacks, and Progressive Score.
  * **`pairings.rs`**: Scrapes each `pairs{N}.html` table for boards, player names, colors, IDs, and results (`1 - 0`, `0 - 1`, `1/2 - 1/2`, `1 - 0 F`, `BYE`, `0 - 0`).
  * **`crosstable.rs`**: Parses crosstable grids and individual player history cards.

### 3.3 `hbcc-core::hash` (Exact JSON MD5 Parity)
* **Equivalent Logic**: `calculateDataHash` in [src/vega-parser.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/src/vega-parser.mjs#L28-L47)
* **Requirements**:
  * In JavaScript, `calculateDataHash` excludes fields: `generatedAt`, `md5Hash`, `cleanData`, `cleanMd5Hash`, `folderName`, `folderPath`.
  * Serializes remaining object using `JSON.stringify()`.
  * Computes MD5 hex digest.
  * **Rust Implementation**:
    * Must use `serde_json::Map` with `preserve_order` enabled to mirror JavaScript property insertion order.
    * Numeric formatting must match JS (e.g. `1` vs `1.0`, `0.5`).
    * Assert MD5 digest equality against existing fixtures.

### 3.4 `hbcc-core::clean` (`data_clean.json`)
* Generates simplified JSON representations with normalized scores, clean string categories, and standard tiebreak structures used by the web tournament viewer.

### 3.5 `hbcc-core::leaderboards`
* **Equivalent File**: [src/prepare-data.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/src/prepare-data.mjs)
* Scans `www/` directory for tournament folders containing `data.json`.
* Aggregates active tournaments into `www/tournament.json`.
* Identifies senior players based on [src/ref.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/src/ref.mjs) (`Whitford,Matthew`, `Hogan,Steven`, `Hogg,Dean`, `Nowak,Ruben`).
* Calculates tournament participation counts and cumulative points per time control:
  * Standard / Classical
  * Rapid
  * Blitz
* Emits `www/players.json`, `www/players_junior.json`, and `www/players_senior.json`.

### 3.6 `hbcc-core::supabase`
* **Equivalent File**: [src/supabase.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/src/supabase.mjs)
* Uses `reqwest` to directly interact with Supabase PostgREST API:
  * `POST {SUPABASE_URL}/rest/v1/tournaments?on_conflict=slug`
  * `POST {SUPABASE_URL}/rest/v1/players?on_conflict=player_id`
* Request headers:
  * `apikey: {SUPABASE_SECRET_KEY || SUPABASE_ANON_KEY}`
  * `Authorization: Bearer {SUPABASE_SECRET_KEY || SUPABASE_ANON_KEY}`
  * `Prefer: resolution=merge-duplicates,return=representation`
  * `Content-Type: application/json`

### 3.7 `hbcc-core::github`
* **Equivalent File**: [src/github-sync.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/src/github-sync.mjs)
* Uses `reqwest` to execute GitHub Git Database API operations:
  1. `GET /repos/{owner}/{repo}/git/ref/heads/{branch}` -> get parent commit SHA.
  2. `GET /repos/{owner}/{repo}/git/commits/{sha}` -> get base tree SHA.
  3. `GET /repos/{owner}/{repo}/contents/www/tournament.json?ref={branch}` -> fetch and update `tournament.json`.
  4. `POST /repos/{owner}/{repo}/git/blobs` -> create blobs for changed files in tournament folder.
  5. `POST /repos/{owner}/{repo}/git/trees` -> create new tree pointing to blobs and base tree.
  6. `POST /repos/{owner}/{repo}/git/commits` -> create commit with tree and parent commit.
  7. `PATCH /repos/{owner}/{repo}/git/refs/heads/{branch}` -> advance branch HEAD to new commit.

---

## 4. Verification & Testing Strategy

### 4.1 Golden Fixture Test Suite (Parity Gate)
1. **Generator Script** ([scripts/generate-golden-fixtures.mjs](file:///Users/truongnguyen/source/hbcc/tournaments/scripts/generate-golden-fixtures.mjs)):
   * Selects 25–30 real tournaments in `www/`.
   * Executes existing JS parser.
   * Outputs raw input files, `expected_data.json`, `expected_clean.json`, and `expected_hash.txt` into `crates/hbcc-core/tests/fixtures/<name>/`.
2. **Rust Test Harness** (`crates/hbcc-core/tests/golden_tests.rs`):
   * Runs `hbcc_core::process_folder` on each fixture input directory.
   * Uses `assert_json_eq!` to perform deep, path-level semantic comparison.
   * Asserts MD5 hash equality: `assert_eq!(output.hash, fixture.expected_hash)`.

### 4.2 Unit Tests
* PHP parser edge cases (nested includes, circular includes, missing partials).
* Regex pattern matching for unconventional player names, FIDE IDs, and ratings.
* Supabase PostgREST payload serialization tests.
* GitHub Git Database tree payload construction tests.

---

## 5. Integration & Cutover Plan

### 5.1 Desktop FTP Server Integration
1. Add `hbcc-core = { path = "../../crates/hbcc-core" }` to `ftp-server/src-tauri/Cargo.toml`.
2. In `ftp-server/src-tauri/src/parser/mod.rs`, replace `Command::new_sidecar("vega-parser")` with in-process `hbcc_core::process_tournament_folder`.
3. Remove `"binaries/vega-parser"` from `tauri.conf.json`.
4. Delete `ftp-server/src-tauri/binaries/` and `scripts/build-sidecar.mjs`.
5. Remove Bun build steps from `.github/workflows/ftp-server-release.yml`.

### 5.2 GitHub Actions CI Pipeline Integration
1. Compile `crates/hbcc-cli` in `.github/workflows/sync.yml`.
2. Replace `node src/sync.mjs` and `node src/prepare-data.mjs` with:
   ```bash
   cargo run --release -p hbcc-cli -- run-all --www ./www
   ```
3. Verify that `git status` produces identical change sets to Node.js executions.
4. Archive legacy JavaScript scripts to `legacy/scripts/`.

---

## 6. Milestones & Implementation Order

1. **Milestone 1: Golden Fixture Harness**
   * Build fixture generator script.
   * Extract 25–30 real tournament snapshots.
   * Scaffold `Cargo.toml` workspace and `crates/hbcc-core` test runner.
2. **Milestone 2: Core Vega HTML Parser & PHP Converter**
   * Implement `php.rs`, `tourstat.rs`, `standings.rs`, `pairings.rs`, `crosstable.rs`, `hash.rs`, `clean.rs`.
   * Iterate until 100% of golden fixtures pass.
3. **Milestone 3: Leaderboards, Cloud Sync & `hbcc-cli`**
   * Implement `leaderboards.rs` (`tournament.json`, `players.json`).
   * Implement `supabase.rs` & `github.rs`.
   * Build `hbcc-cli` command-line application.
4. **Milestone 4: Tauri Integration & Sidecar Deletion**
   * Wire `hbcc-core` into `ftp-server/src-tauri`.
   * Test live FTP upload in desktop app.
   * Remove Bun sidecar assets and build scripts.
5. **Milestone 5: CI Cutover**
   * Update `.github/workflows/sync.yml` to call `hbcc-cli`.
   * Verify automated run on GitHub Actions.
