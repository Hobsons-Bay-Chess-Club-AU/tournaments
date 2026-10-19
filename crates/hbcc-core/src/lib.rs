//! Core tournament parsing, leaderboard calculation, and sync engine for HBCC.

pub mod php;
pub mod parser;
pub mod hash;
pub mod clean;
pub mod leaderboards;
pub mod supabase;
pub mod github;

#[derive(Debug, Clone, Default)]
pub struct ProcessOptions {
    pub write_files: bool,
    pub convert_php: bool,
    pub php_threshold_seconds: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TournamentProcessResult {
    pub success: bool,
    pub folder: String,
    pub tournament_name: String,
    pub category: String,
    pub player_count: usize,
    pub md5_hash: String,
    pub data: serde_json::Value,
    pub data_clean: serde_json::Value,
}
