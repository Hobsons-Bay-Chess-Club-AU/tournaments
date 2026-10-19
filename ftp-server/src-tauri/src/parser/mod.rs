use hbcc_core::github::{is_github_sync_enabled, GitHubClient};
use hbcc_core::supabase::{is_supabase_configured, SupabaseClient};
use hbcc_core::{process_folder, ProcessOptions};
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

pub async fn run_tournament_parser(
    folder: PathBuf,
    app: Option<tauri::AppHandle>,
) -> Result<ParseResult, String> {
    if !FEATURE_JSON_GENERATOR {
        return Ok(ParseResult {
            success: true,
            folder: folder.to_string_lossy().to_string(),
            tournament_name: folder
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
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
        &format!(
            "Starting native in-process tournament parsing for folder: '{}'",
            tour_folder_name
        ),
    );

    hbcc_core::supabase::load_env();

    let options = ProcessOptions {
        write_files: true,
        convert_php: true,
        php_threshold_seconds: 30.0,
    };

    let result = match process_folder(&folder, &options) {
        Ok(res) => res,
        Err(e) => {
            let err_msg = format!("Native parser failed for '{}': {e}", tour_folder_name);
            crate::commands::emit_log(app.as_ref(), "ERROR", "Parser", &err_msg);
            return Err(err_msg);
        }
    };

    crate::commands::emit_log(
        app.as_ref(),
        "INFO",
        "Parser",
        &format!(
            "Successfully parsed '{}' ({} players, category: {})",
            result.tournament_name, result.player_count, result.category
        ),
    );

    // Supabase sync
    if is_supabase_configured() {
        crate::commands::emit_log(
            app.as_ref(),
            "INFO",
            "Supabase",
            &format!(
                "Supabase configured. Upserting tournament '{}'...",
                tour_folder_name
            ),
        );
        if let Some(client) = SupabaseClient::from_env() {
            let row = hbcc_core::supabase::format_tournament_row(
                &tour_folder_name,
                &result.data,
                Some(&result.data),
            );
            match client.upsert_tournament(&row).await {
                Ok(_) => {
                    crate::commands::emit_log(
                        app.as_ref(),
                        "INFO",
                        "Supabase",
                        &format!(
                            "Successfully upserted tournament '{}' to Supabase!",
                            tour_folder_name
                        ),
                    );
                }
                Err(e) => {
                    crate::commands::emit_log(
                        app.as_ref(),
                        "WARN",
                        "Supabase",
                        &format!("Supabase upsert warning: {e}"),
                    );
                }
            }
        }
    }

    // GitHub sync
    if is_github_sync_enabled() {
        crate::commands::emit_log(
            app.as_ref(),
            "INFO",
            "GitHub",
            &format!(
                "Automatic push enabled. Committing tournament '{}' to GitHub...",
                tour_folder_name
            ),
        );
        if let Some(client) = GitHubClient::from_env() {
            match client.commit_tournament(&folder, &result.data).await {
                Ok(res) => {
                    crate::commands::emit_log(
                        app.as_ref(),
                        "INFO",
                        "GitHub",
                        &format!(
                            "Successfully committed and pushed '{}' to {} ({}). Commit: {}",
                            res.tournament, client.repo, client.branch, res.short_sha
                        ),
                    );
                }
                Err(e) => {
                    crate::commands::emit_log(
                        app.as_ref(),
                        "WARN",
                        "GitHub",
                        &format!("GitHub commit warning: {e}"),
                    );
                }
            }
        }
    }

    Ok(ParseResult {
        success: true,
        folder: folder_str,
        tournament_name: result.tournament_name,
        category: result.category,
        player_count: result.player_count,
        files_generated: vec!["data.json".into(), "data_clean.json".into()],
        message: "Successfully generated data.json and data_clean.json natively".into(),
    })
}
