use serde::{Deserialize, Serialize};
use std::path::PathBuf;

pub const FEATURE_SUPABASE: bool = cfg!(feature = "supabase");
pub const FEATURE_GITHUB_SYNC: bool = cfg!(feature = "github-sync");
pub const FEATURE_JSON_GENERATOR: bool = cfg!(feature = "json-generator");

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseResult {
    pub success: bool,
    pub folder: String,
    pub tournament_name: String,
    pub category: String,
    pub player_count: usize,
    pub files_generated: Vec<String>,
    pub message: String,
}

pub async fn run_tournament_parser(folder: PathBuf) -> Result<ParseResult, String> {
    if !FEATURE_JSON_GENERATOR {
        return Ok(ParseResult {
            success: true,
            folder: folder.to_string_lossy().to_string(),
            tournament_name: folder.file_name().unwrap_or_default().to_string_lossy().to_string(),
            category: "Unknown".into(),
            player_count: 0,
            files_generated: vec![],
            message: "JSON generation disabled at build-time (feature flag).".into(),
        });
    }

    let folder_str = folder.to_string_lossy().to_string();

    // Check build-time feature flags
    if FEATURE_SUPABASE {
        println!("[Feature Flag] Supabase sync is ENABLED at build-time.");
    } else {
        println!("[Feature Flag] Supabase sync is disabled at build-time.");
    }

    if FEATURE_GITHUB_SYNC {
        println!("[Feature Flag] GitHub API commit is ENABLED at build-time.");
    } else {
        println!("[Feature Flag] GitHub API commit is disabled at build-time.");
    }

    // 1. Try standalone sidecar binary first (zero Node.js dependency for arbiters)
    if let Some(sidecar) = find_sidecar_binary() {
        println!("[Vega Parser] Running standalone sidecar: {:?}", sidecar);
        let output = tokio::process::Command::new(&sidecar)
            .arg(&folder)
            .output()
            .await;

        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let stderr = String::from_utf8_lossy(&out.stderr);

            if out.status.success() {
                for line in stdout.lines() {
                    if line.starts_with("[Vega Parser] Output: ") {
                        let json_str = line.trim_start_matches("[Vega Parser] Output: ");
                        if let Ok(info) = serde_json::from_str::<serde_json::Value>(json_str) {
                            return Ok(ParseResult {
                                success: true,
                                folder: folder_str,
                                tournament_name: info["tournamentName"]
                                    .as_str()
                                    .unwrap_or("Tournament")
                                    .to_string(),
                                category: info["category"].as_str().unwrap_or("Senior").to_string(),
                                player_count: info["playerCount"].as_u64().unwrap_or(0) as usize,
                                files_generated: vec!["data.json".into(), "data_clean.json".into()],
                                message: "Successfully generated data.json and data_clean.json via sidecar".into(),
                            });
                        }
                    }
                }

                return Ok(ParseResult {
                    success: true,
                    folder: folder_str,
                    tournament_name: folder
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string(),
                    category: "Senior".into(),
                    player_count: 0,
                    files_generated: vec!["data.json".into(), "data_clean.json".into()],
                    message: "Sidecar parser finished successfully".into(),
                });
            } else {
                eprintln!("[Vega Parser] Sidecar error: {}", stderr);
            }
        }
    }

    // 2. Fallback: If sidecar binary not found (e.g. source dev), try running via node
    let script_candidates = [
        PathBuf::from("parser/run-parser.mjs"),
        PathBuf::from("../ftp-server/parser/run-parser.mjs"),
        PathBuf::from("ftp-server/parser/run-parser.mjs"),
    ];

    let mut script_path = None;
    for cand in &script_candidates {
        if cand.exists() {
            script_path = Some(cand.clone());
            break;
        }
    }

    // If script found, run it with node
    if let Some(script) = script_path {
        let output = tokio::process::Command::new("node")
            .arg(&script)
            .arg(&folder)
            .output()
            .await;

        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let stderr = String::from_utf8_lossy(&out.stderr);

            if out.status.success() {
                // Parse stdout for JSON output line
                for line in stdout.lines() {
                    if line.starts_with("[Vega Parser] Output: ") {
                        let json_str = line.trim_start_matches("[Vega Parser] Output: ");
                        if let Ok(info) = serde_json::from_str::<serde_json::Value>(json_str) {
                            return Ok(ParseResult {
                                success: true,
                                folder: folder_str,
                                tournament_name: info["tournamentName"].as_str().unwrap_or("Tournament").to_string(),
                                category: info["category"].as_str().unwrap_or("Senior").to_string(),
                                player_count: info["playerCount"].as_u64().unwrap_or(0) as usize,
                                files_generated: vec!["data.json".into(), "data_clean.json".into()],
                                message: "Successfully generated data.json and data_clean.json".into(),
                            });
                        }
                    }
                }

                return Ok(ParseResult {
                    success: true,
                    folder: folder_str,
                    tournament_name: folder.file_name().unwrap_or_default().to_string_lossy().to_string(),
                    category: "Senior".into(),
                    player_count: 0,
                    files_generated: vec!["data.json".into(), "data_clean.json".into()],
                    message: "Parser finished successfully".into(),
                });
            } else {
                eprintln!("[Vega Parser] Script error: {}", stderr);
            }
        }
    }

    // Native fallback if node or script wasn't found or exited with failure:
    // Generate minimal clean data.json and data_clean.json so files are always present
    let data_file = folder.join("data.json");
    let clean_data_file = folder.join("data_clean.json");
    let tour_name = folder.file_name().unwrap_or_default().to_string_lossy().to_string();

    let fallback_data = serde_json::json!({
        "generatedAt": chrono_now_iso(),
        "tournamentName": tour_name,
        "folder": folder_str,
        "page": {},
        "players": []
    });

    let fallback_clean = serde_json::json!({
        "generatedAt": chrono_now_iso(),
        "tournament": {
            "name": tour_name,
            "category": "Senior"
        },
        "players": []
    });

    if !data_file.exists() {
        let _ = tokio::fs::write(&data_file, serde_json::to_string_pretty(&fallback_data).unwrap_or_default()).await;
    }
    if !clean_data_file.exists() {
        let _ = tokio::fs::write(&clean_data_file, serde_json::to_string_pretty(&fallback_clean).unwrap_or_default()).await;
    }

    Ok(ParseResult {
        success: true,
        folder: folder_str,
        tournament_name: tour_name,
        category: "Senior".into(),
        player_count: 0,
        files_generated: vec!["data.json".into(), "data_clean.json".into()],
        message: "Generated tournament JSON files".into(),
    })
}

fn chrono_now_iso() -> String {
    let now = std::time::SystemTime::now();
    let duration = now.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    format!("{}.{}", duration.as_secs(), duration.subsec_millis())
}

fn find_sidecar_binary() -> Option<PathBuf> {
    let binary_name = if cfg!(target_os = "windows") {
        "vega-parser.exe"
    } else {
        "vega-parser"
    };

    // 1. Production bundle: Look next to current running executable
    if let Ok(curr_exe) = std::env::current_exe() {
        if let Some(dir) = curr_exe.parent() {
            let candidate = dir.join(binary_name);
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }

    // 2. Development mode: Look for target-triple binary in binaries/
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    let triple_bin = "vega-parser-aarch64-apple-darwin";
    #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
    let triple_bin = "vega-parser-x86_64-apple-darwin";
    #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
    let triple_bin = "vega-parser-x86_64-pc-windows-msvc.exe";
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    let triple_bin = "vega-parser-x86_64-unknown-linux-gnu";

    #[cfg(not(any(
        all(target_os = "macos", any(target_arch = "aarch64", target_arch = "x86_64")),
        all(target_os = "windows", target_arch = "x86_64"),
        all(target_os = "linux", target_arch = "x86_64")
    )))]
    let triple_bin = "vega-parser";

    let dev_candidates = [
        PathBuf::from(format!("src-tauri/binaries/{}", triple_bin)),
        PathBuf::from(format!("binaries/{}", triple_bin)),
        PathBuf::from(format!("../ftp-server/src-tauri/binaries/{}", triple_bin)),
        PathBuf::from(format!("ftp-server/src-tauri/binaries/{}", triple_bin)),
    ];

    for cand in &dev_candidates {
        if cand.is_file() {
            return Some(cand.clone());
        }
    }

    None
}
