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

pub async fn run_tournament_parser(folder: PathBuf, app: Option<tauri::AppHandle>) -> Result<ParseResult, String> {
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
    let tour_folder_name = folder
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    crate::commands::emit_log(
        app.as_ref(),
        "INFO",
        "Parser",
        &format!("Starting tournament parsing for folder: '{}'", tour_folder_name),
    );

    // 1. Try standalone sidecar binary first (zero Node.js dependency for arbiters)
    if let Some(sidecar) = find_sidecar_binary() {
        crate::commands::emit_log(
            app.as_ref(),
            "INFO",
            "Parser",
            &format!("Executing sidecar parser: {:?}", sidecar.file_name().unwrap_or_default()),
        );
        let mut cmd = tokio::process::Command::new(&sidecar);
        cmd.arg(&folder);
        apply_cloud_env(&mut cmd);
        let output = cmd.output().await;

        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let stderr = String::from_utf8_lossy(&out.stderr);
            dispatch_process_logs(app.as_ref(), &stdout, &stderr);

            if out.status.success() {
                for line in stdout.lines() {
                    if line.starts_with("[Vega Parser] Output: ") {
                        let json_str = line.trim_start_matches("[Vega Parser] Output: ");
                        if let Ok(info) = serde_json::from_str::<serde_json::Value>(json_str) {
                            let tour_name = info["tournamentName"]
                                .as_str()
                                .unwrap_or("Tournament")
                                .to_string();
                            crate::commands::emit_log(
                                app.as_ref(),
                                "INFO",
                                "Parser",
                                &format!("Successfully parsed '{}' ({} players)", tour_name, info["playerCount"].as_u64().unwrap_or(0)),
                            );
                            return Ok(ParseResult {
                                success: true,
                                folder: folder_str,
                                tournament_name: tour_name,
                                category: info["category"].as_str().unwrap_or("Senior").to_string(),
                                player_count: info["playerCount"].as_u64().unwrap_or(0) as usize,
                                files_generated: vec!["data.json".into(), "data_clean.json".into()],
                                message: "Successfully generated data.json and data_clean.json via sidecar".into(),
                            });
                        }
                    }
                }

                crate::commands::emit_log(
                    app.as_ref(),
                    "INFO",
                    "Parser",
                    &format!("Sidecar parser finished for '{}'", tour_folder_name),
                );
                return Ok(ParseResult {
                    success: true,
                    folder: folder_str,
                    tournament_name: tour_folder_name,
                    category: "Senior".into(),
                    player_count: 0,
                    files_generated: vec!["data.json".into(), "data_clean.json".into()],
                    message: "Sidecar parser finished successfully".into(),
                });
            } else {
                crate::commands::emit_log(
                    app.as_ref(),
                    "ERROR",
                    "Parser",
                    &format!("Sidecar exited with error status: {:?}", out.status),
                );
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
        crate::commands::emit_log(
            app.as_ref(),
            "INFO",
            "Parser",
            &format!("Running fallback script: {:?}", script),
        );
        let mut cmd = tokio::process::Command::new("node");
        cmd.arg(&script).arg(&folder);
        apply_cloud_env(&mut cmd);
        let output = cmd.output().await;

        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let stderr = String::from_utf8_lossy(&out.stderr);
            dispatch_process_logs(app.as_ref(), &stdout, &stderr);

            if out.status.success() {
                // Parse stdout for JSON output line
                for line in stdout.lines() {
                    if line.starts_with("[Vega Parser] Output: ") {
                        let json_str = line.trim_start_matches("[Vega Parser] Output: ");
                        if let Ok(info) = serde_json::from_str::<serde_json::Value>(json_str) {
                            let tour_name = info["tournamentName"].as_str().unwrap_or("Tournament").to_string();
                            crate::commands::emit_log(
                                app.as_ref(),
                                "INFO",
                                "Parser",
                                &format!("Node script parsed '{}' ({} players)", tour_name, info["playerCount"].as_u64().unwrap_or(0)),
                            );
                            return Ok(ParseResult {
                                success: true,
                                folder: folder_str,
                                tournament_name: tour_name,
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
                    tournament_name: tour_folder_name,
                    category: "Senior".into(),
                    player_count: 0,
                    files_generated: vec!["data.json".into(), "data_clean.json".into()],
                    message: "Parser finished successfully".into(),
                });
            } else {
                crate::commands::emit_log(
                    app.as_ref(),
                    "ERROR",
                    "Parser",
                    &format!("Node script exited with error: {:?}", out.status),
                );
            }
        }
    }

    crate::commands::emit_log(
        app.as_ref(),
        "WARN",
        "Parser",
        &format!("Sidecar/node parser unavailable. Writing minimal JSON data for '{}'", tour_folder_name),
    );

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

fn apply_cloud_env(cmd: &mut tokio::process::Command) {
    let mut file_vars = std::collections::HashMap::new();

    let mut env_paths = vec![
        PathBuf::from(".env"),
        PathBuf::from("ftp-server/.env"),
        PathBuf::from("../.env"),
    ];

    if let Ok(curr_exe) = std::env::current_exe() {
        if let Some(parent) = curr_exe.parent() {
            env_paths.push(parent.join(".env"));
            env_paths.push(parent.join("ftp-server").join(".env"));
        }
    }

    for p in env_paths {
        if let Ok(iter) = dotenvy::from_path_iter(&p) {
            for item in iter.flatten() {
                file_vars.insert(item.0, item.1);
            }
        }
    }

    let env_vars = [
        "SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_URL",
        "SUPABASE_SECRET_KEY",
        "SUPABASE_PUBLISHABLE_KEY",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        "SUPABASE_ANON_KEY",
        "SUPABASE_TABLE",
        "SUPABASE_JWKS_URL",
        "SUPABASE_ACCESS_TOKEN",
        "ALLOW_PUSH_CHANGE_TO_GH",
        "GH_TOKEN",
        "GITHUB_TOKEN",
        "GH_REPO",
        "GH_BRANCH",
        "PHP_TO_HTML_THRESHOLD_SECONDS",
    ];

    for var in env_vars {
        if let Some(val) = file_vars.get(var) {
            cmd.env(var, val);
            std::env::set_var(var, val);
        } else if let Ok(val) = std::env::var(var) {
            cmd.env(var, val);
        }
    }

    // Build-time embedded fallbacks
    if let Some(val) = option_env!("SUPABASE_URL") {
        if std::env::var("SUPABASE_URL").is_err() {
            cmd.env("SUPABASE_URL", val);
        }
    }
    if let Some(val) = option_env!("SUPABASE_SECRET_KEY") {
        if std::env::var("SUPABASE_SECRET_KEY").is_err() {
            cmd.env("SUPABASE_SECRET_KEY", val);
        }
    }
    if let Some(val) = option_env!("SUPABASE_PUBLISHABLE_KEY") {
        if std::env::var("SUPABASE_PUBLISHABLE_KEY").is_err() {
            cmd.env("SUPABASE_PUBLISHABLE_KEY", val);
        }
    }
    if let Some(val) = option_env!("SUPABASE_ANON_KEY") {
        if std::env::var("SUPABASE_ANON_KEY").is_err() {
            cmd.env("SUPABASE_ANON_KEY", val);
        }
    }
    if let Some(val) = option_env!("SUPABASE_TABLE") {
        if std::env::var("SUPABASE_TABLE").is_err() {
            cmd.env("SUPABASE_TABLE", val);
        }
    }
    if let Some(val) = option_env!("ALLOW_PUSH_CHANGE_TO_GH") {
        if std::env::var("ALLOW_PUSH_CHANGE_TO_GH").is_err() {
            cmd.env("ALLOW_PUSH_CHANGE_TO_GH", val);
        }
    }
    if let Some(val) = option_env!("GH_TOKEN") {
        if std::env::var("GH_TOKEN").is_err() {
            cmd.env("GH_TOKEN", val);
        }
    }
    if let Some(val) = option_env!("GH_REPO") {
        if std::env::var("GH_REPO").is_err() {
            cmd.env("GH_REPO", val);
        }
    }
    if let Some(val) = option_env!("GH_BRANCH") {
        if std::env::var("GH_BRANCH").is_err() {
            cmd.env("GH_BRANCH", val);
        }
    }
}

fn dispatch_process_logs(app: Option<&tauri::AppHandle>, stdout: &str, stderr: &str) {
    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with("[Vega Parser] Output: ") {
            continue;
        }

        let is_github = trimmed.contains("[GitHub Sync]") || trimmed.contains("GitHub Sync");
        let is_supabase = trimmed.contains("[Supabase]") || trimmed.contains("Supabase");
        let source = if is_github {
            "GitHub"
        } else if is_supabase {
            "Supabase"
        } else {
            "Parser"
        };

        let lower = trimmed.to_lowercase();
        let level = if lower.contains("error") || lower.contains("exception") {
            "ERROR"
        } else if lower.contains("warn") || lower.contains("warning") {
            "WARN"
        } else {
            "INFO"
        };

        crate::commands::emit_log(app, level, source, trimmed);
    }

    for line in stderr.lines() {
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            crate::commands::emit_log(app, "ERROR", "Parser", trimmed);
        }
    }
}

