use anyhow::{bail, Context, Result};
use clap::{Parser, Subcommand};
use hbcc_core::github::{is_github_sync_enabled, GitHubClient};
use hbcc_core::leaderboards::{process_all_tournaments, update_single_tournament};
use hbcc_core::supabase::{is_supabase_configured, SupabaseClient};
use hbcc_core::{process_folder, ProcessOptions};
use serde_json::json;
use std::path::{Path, PathBuf};

#[derive(Parser, Debug)]
#[command(name = "hbcc")]
#[command(author = "HBCC")]
#[command(version = "0.1.0")]
#[command(about = "HBCC Tournament Native Engine CLI", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Parse tournament directory, convert PHP templates, and generate data.json & data_clean.json
    Parse {
        /// Target tournament directory
        folder: PathBuf,

        /// Threshold in seconds for converting PHP templates
        #[arg(long, default_value_t = 30.0)]
        php_threshold: f64,

        /// Explicitly sync tournament row to Supabase
        #[arg(long)]
        sync_supabase: bool,

        /// Explicitly push commit to GitHub
        #[arg(long)]
        sync_github: bool,
    },

    /// Prepare tournament.json and regenerate unique player leaderboards
    PrepareData {
        /// Optional tournament directory (processes all if omitted)
        folder: Option<PathBuf>,

        /// Path to www directory
        #[arg(long)]
        www_dir: Option<PathBuf>,
    },

    /// Backfill all tournaments and players to Supabase
    SyncSupabase {
        /// Repository root path containing www folder
        #[arg(long)]
        repo_path: Option<PathBuf>,
    },

    /// Commit tournament files to GitHub directly via Git Database API
    SyncGithub {
        /// Tournament directory to commit
        folder: PathBuf,
    },

    /// Execute full pipeline: parse, leaderboard generation, and cloud syncs
    RunAll {
        /// Optional specific tournament folder, or all if omitted
        folder: Option<PathBuf>,

        /// Path to www directory
        #[arg(long)]
        www_dir: Option<PathBuf>,
    },
}

fn resolve_www_dir(provided: Option<PathBuf>) -> PathBuf {
    if let Some(p) = provided {
        return p;
    }
    let p_www = PathBuf::from("www");
    if p_www.is_dir() {
        return p_www;
    }
    let p_cur = PathBuf::from(".");
    if p_cur.join("tournament.json").exists() {
        return p_cur;
    }
    p_www
}

#[tokio::main]
async fn main() -> Result<()> {
    env_logger::init();
    hbcc_core::supabase::load_env();

    let cli = Cli::parse();

    match cli.command {
        Commands::Parse {
            folder,
            php_threshold,
            sync_supabase,
            sync_github,
        } => {
            handle_parse(folder, php_threshold, sync_supabase, sync_github).await?;
        }
        Commands::PrepareData { folder, www_dir } => {
            let www = resolve_www_dir(www_dir);
            handle_prepare_data(folder, &www).await?;
        }
        Commands::SyncSupabase { repo_path } => {
            let repo = repo_path.unwrap_or_else(|| PathBuf::from("."));
            handle_sync_supabase(&repo).await?;
        }
        Commands::SyncGithub { folder } => {
            handle_sync_github(&folder).await?;
        }
        Commands::RunAll { folder, www_dir } => {
            let www = resolve_www_dir(www_dir);
            handle_run_all(folder, &www).await?;
        }
    }

    Ok(())
}

async fn handle_parse(
    folder: PathBuf,
    php_threshold: f64,
    sync_supabase: bool,
    sync_github: bool,
) -> Result<()> {
    if !folder.is_dir() {
        bail!("Specified path is not a directory: {}", folder.display());
    }

    println!("[Vega Parser] Processing tournament folder: {}", folder.display());

    let options = ProcessOptions {
        write_files: true,
        convert_php: true,
        php_threshold_seconds: php_threshold,
    };

    let result = process_folder(&folder, &options)
        .map_err(|e| anyhow::anyhow!("Failed to parse tournament: {e}"))?;

    let mut supabase_status = "skipped (not configured)".to_string();
    if (sync_supabase || is_supabase_configured()) && is_supabase_configured() {
        if let Some(client) = SupabaseClient::from_env() {
            println!(
                "[Vega Parser] Supabase configured. Upserting tournament: {}...",
                result.folder
            );
            let row = hbcc_core::supabase::format_tournament_row(
                &result.folder,
                &result.data,
                Some(&result.data),
            );
            match client.upsert_tournament(&row).await {
                Ok(_) => {
                    supabase_status = "upserted".to_string();
                    println!("[Vega Parser] Successfully upserted tournament to Supabase!");
                }
                Err(e) => {
                    supabase_status = format!("error: {e}");
                    eprintln!("[Vega Parser] Supabase error: {e}");
                }
            }
        }
    }

    let mut github_status = "skipped (disabled)".to_string();
    if (sync_github || is_github_sync_enabled()) && is_github_sync_enabled() {
        if let Some(client) = GitHubClient::from_env() {
            println!(
                "[GitHub Sync] Automatic push enabled. Committing tournament to GitHub..."
            );
            match client.commit_tournament(&folder, &result.data).await {
                Ok(commit_res) => {
                    github_status = format!("committed ({})", commit_res.short_sha);
                    println!(
                        "[GitHub Sync] Successfully committed and pushed '{}' to {} ({}). Commit: {}",
                        commit_res.tournament, client.repo, client.branch, commit_res.short_sha
                    );
                }
                Err(e) => {
                    github_status = format!("error: {e}");
                    eprintln!("[GitHub Sync] GitHub error: {e}");
                }
            }
        }
    }

    let output_json = json!({
        "success": true,
        "folder": folder.to_string_lossy(),
        "tournamentName": result.tournament_name,
        "category": result.category,
        "playerCount": result.player_count,
        "filesGenerated": ["data.json", "data_clean.json"],
        "md5Hash": result.md5_hash,
        "supabase": supabase_status,
        "github": github_status
    });

    println!("[Vega Parser] Output: {}", output_json);
    Ok(())
}

async fn handle_prepare_data(folder: Option<PathBuf>, www_dir: &Path) -> Result<()> {
    if let Some(target) = folder {
        println!(
            "[Prepare Data] Updating single tournament: {}...",
            target.display()
        );
        let res = update_single_tournament(&target, www_dir)
            .map_err(|e| anyhow::anyhow!("Failed to prepare tournament: {e}"))?;
        println!(
            "[Prepare Data] Successfully prepared '{}' ({} players)",
            res.tournament_name, res.player_count
        );
    } else {
        println!(
            "[Prepare Data] Processing all tournaments in {}...",
            www_dir.display()
        );
        let (results, leaderboards) = process_all_tournaments(www_dir)
            .map_err(|e| anyhow::anyhow!("Failed to process all tournaments: {e}"))?;
        println!(
            "[Prepare Data] Completed: {} tournaments processed. Total recorded: {}. Players: {} senior, {} junior, {} unified.",
            results.len(),
            leaderboards.total_tournaments,
            leaderboards.senior_players.count,
            leaderboards.junior_players.count,
            leaderboards.unified_players.count,
        );
    }
    Ok(())
}

async fn handle_sync_supabase(repo_path: &Path) -> Result<()> {
    let client = SupabaseClient::from_env().context(
        "Supabase credentials not configured (SUPABASE_URL and SUPABASE_SECRET_KEY/ANON_KEY required)",
    )?;

    println!("========================================================");
    println!("Starting full sync to Supabase: Tournaments & Players");
    println!("========================================================");

    let (tour_count, player_count) = client
        .sync_all(repo_path)
        .await
        .map_err(|e| anyhow::anyhow!("Supabase sync failed: {e}"))?;

    println!("========================================================");
    println!("Sync complete: {tour_count} tournaments, {player_count} players.");
    println!("========================================================");

    Ok(())
}

async fn handle_sync_github(folder: &Path) -> Result<()> {
    let client = GitHubClient::from_env().context(
        "GitHub credentials not configured (GH_TOKEN or GITHUB_TOKEN required)",
    )?;

    let data_json_path = folder.join("data.json");
    let parse_result = if data_json_path.exists() {
        let content = std::fs::read_to_string(&data_json_path)?;
        serde_json::from_str(&content)?
    } else {
        let options = ProcessOptions::default();
        let res = process_folder(folder, &options)
            .map_err(|e| anyhow::anyhow!("Failed to parse folder: {e}"))?;
        res.data
    };

    let res = client
        .commit_tournament(folder, &parse_result)
        .await
        .map_err(|e| anyhow::anyhow!("GitHub commit failed: {e}"))?;

    println!(
        "[GitHub Sync] Committed tournament '{}' ({}) to {} ({}). Commit: {}",
        res.tournament, res.folder, client.repo, client.branch, res.short_sha
    );

    Ok(())
}

async fn handle_run_all(folder: Option<PathBuf>, www_dir: &Path) -> Result<()> {
    println!(">>> HBCC Pipeline: Step 1 - Parsing and Leaderboards");
    handle_prepare_data(folder.clone(), www_dir).await?;

    if is_supabase_configured() {
        println!(">>> HBCC Pipeline: Step 2 - Supabase Synchronization");
        let repo_root = www_dir.parent().unwrap_or(www_dir);
        if let Err(e) = handle_sync_supabase(repo_root).await {
            eprintln!("[Supabase] Warning: {e}");
        }
    } else {
        println!(">>> HBCC Pipeline: Step 2 - Supabase skipped (not configured)");
    }

    if let Some(target) = folder {
        if is_github_sync_enabled() {
            println!(">>> HBCC Pipeline: Step 3 - GitHub Commit Synchronization");
            if let Err(e) = handle_sync_github(&target).await {
                eprintln!("[GitHub Sync] Warning: {e}");
            }
        } else {
            println!(">>> HBCC Pipeline: Step 3 - GitHub sync skipped (disabled)");
        }
    }

    println!(">>> HBCC Pipeline: All steps completed successfully!");
    Ok(())
}
