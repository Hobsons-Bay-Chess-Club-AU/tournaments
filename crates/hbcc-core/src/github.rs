use base64::{engine::general_purpose::STANDARD, Engine as _};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Check if GitHub push sync is enabled via environment variable.
pub fn is_github_sync_enabled() -> bool {
    crate::supabase::load_env();
    let flag = std::env::var("ALLOW_PUSH_CHANGE_TO_GH")
        .ok()
        .or_else(|| option_env!("ALLOW_PUSH_CHANGE_TO_GH").map(|s| s.to_string()))
        .unwrap_or_default()
        .trim()
        .to_lowercase();
    flag == "true" || flag == "1"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitResult {
    pub success: bool,
    pub commit_sha: String,
    pub short_sha: String,
    pub tournament: String,
    pub folder: String,
    pub files_count: usize,
}

#[derive(Debug, Clone)]
pub struct GitHubClient {
    pub token: String,
    pub repo: String,
    pub branch: String,
    pub base_url: String,
    pub client: Client,
}

impl GitHubClient {
    pub fn new(token: &str, repo: &str, branch: &str) -> Self {
        Self::with_base_url(token, repo, branch, "https://api.github.com")
    }

    pub fn with_base_url(token: &str, repo: &str, branch: &str, base_url: &str) -> Self {
        Self {
            token: token.trim().to_string(),
            repo: repo.trim().to_string(),
            branch: branch.trim().to_string(),
            base_url: base_url.trim_end_matches('/').to_string(),
            client: Client::new(),
        }
    }

    pub fn from_env() -> Option<Self> {
        crate::supabase::load_env();
        let token = std::env::var("GH_TOKEN")
            .ok()
            .or_else(|| option_env!("GH_TOKEN").map(|s| s.to_string()))
            .or_else(|| std::env::var("GITHUB_TOKEN").ok())
            .or_else(|| option_env!("GITHUB_TOKEN").map(|s| s.to_string()))?;
        if token.trim().is_empty() {
            return None;
        }

        let repo = std::env::var("GH_REPO")
            .ok()
            .or_else(|| option_env!("GH_REPO").map(|s| s.to_string()))
            .unwrap_or_else(|| "Hobsons-Bay-Chess-Club-AU/tournaments".to_string());
        let branch = std::env::var("GH_BRANCH")
            .ok()
            .or_else(|| option_env!("GH_BRANCH").map(|s| s.to_string()))
            .unwrap_or_else(|| "main".to_string());

        Some(Self::new(&token, &repo, &branch))
    }

    async fn send_request(
        &self,
        method: reqwest::Method,
        endpoint: &str,
        body: Option<Value>,
    ) -> Result<Value, String> {
        let url = if endpoint.starts_with("http://") || endpoint.starts_with("https://") {
            endpoint.to_string()
        } else {
            format!("{}{}", self.base_url, endpoint)
        };

        let mut req = self
            .client
            .request(method.clone(), &url)
            .header("Authorization", format!("Bearer {}", self.token))
            .header("Accept", "application/vnd.github.v3+json")
            .header("User-Agent", "HBCC-Tournament-Publisher")
            .header("X-GitHub-Api-Version", "2022-11-28");

        if let Some(ref b) = body {
            req = req.header("Content-Type", "application/json").json(b);
        }

        let resp = req
            .send()
            .await
            .map_err(|e| format!("GitHub request {method} {url} failed: {e}"))?;

        let status = resp.status();
        let body_text = resp
            .text()
            .await
            .map_err(|e| format!("Failed to read GitHub response body: {e}"))?;

        if !status.is_success() {
            return Err(format!(
                "GitHub API {method} {url} returned HTTP {status}: {body_text}"
            ));
        }

        if body_text.trim().is_empty() {
            return Ok(Value::Null);
        }

        serde_json::from_str::<Value>(&body_text)
            .map_err(|e| format!("Failed to parse GitHub JSON response ({e}): {body_text}"))
    }

    /// Commit tournament files and update www/tournament.json directly using Git Database API.
    pub async fn commit_tournament(
        &self,
        tournament_dir: &Path,
        parse_result: &Value,
    ) -> Result<CommitResult, String> {
        let folder_name = tournament_dir
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("tournament");

        let normalized_folder_name = if folder_name.starts_with("www") {
            folder_name.to_string()
        } else {
            format!("www{}", folder_name)
        };

        let tour_name = parse_result
            .get("metadata")
            .and_then(|m| m.get("Tournament Name"))
            .or_else(|| parse_result.get("tournamentName"))
            .and_then(|v| v.as_str())
            .unwrap_or(&normalized_folder_name)
            .to_string();

        // 1. Get HEAD commit SHA of target branch
        let ref_endpoint = format!("/repos/{}/git/ref/heads/{}", self.repo, self.branch);
        let ref_data = self
            .send_request(reqwest::Method::GET, &ref_endpoint, None)
            .await?;
        let parent_commit_sha = ref_data
            .get("object")
            .and_then(|o| o.get("sha"))
            .and_then(|s| s.as_str())
            .ok_or_else(|| "Failed to extract parent commit SHA from ref response".to_string())?
            .to_string();

        // 2. Get base tree SHA from parent commit
        let commit_endpoint = format!("/repos/{}/git/commits/{}", self.repo, parent_commit_sha);
        let commit_data = self
            .send_request(reqwest::Method::GET, &commit_endpoint, None)
            .await?;
        let base_tree_sha = commit_data
            .get("tree")
            .and_then(|t| t.get("sha"))
            .and_then(|s| s.as_str())
            .ok_or_else(|| "Failed to extract base tree SHA from commit response".to_string())?
            .to_string();

        // 3. Fetch existing www/tournament.json from branch
        let contents_endpoint = format!(
            "/repos/{}/contents/www/tournament.json?ref={}",
            self.repo, self.branch
        );
        let mut tournaments: Vec<Value> = match self
            .send_request(reqwest::Method::GET, &contents_endpoint, None)
            .await
        {
            Ok(val) => {
                let content_b64 = val.get("content").and_then(|c| c.as_str()).unwrap_or("");
                let sanitized: String = content_b64.chars().filter(|c| !c.is_whitespace()).collect();
                if let Ok(decoded) = STANDARD.decode(sanitized) {
                    serde_json::from_slice::<Vec<Value>>(&decoded).unwrap_or_default()
                } else {
                    vec![]
                }
            }
            Err(_) => vec![],
        };

        // 4. Update tournament.json with this tournament's metadata
        let top_players = parse_result
            .get("top_players")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();

        let meta = parse_result
            .get("metadata")
            .cloned()
            .unwrap_or_else(|| serde_json::json!({ "Tournament Name": tour_name }));

        let category = parse_result
            .get("category")
            .or_else(|| parse_result.get("metadata").and_then(|m| m.get("category")))
            .and_then(|v| v.as_str())
            .unwrap_or("Junior");

        let mut entry = serde_json::json!({
            "data": meta,
            "path": format!("{}/data.json", normalized_folder_name),
            "category": category
        });

        if !top_players.is_empty() {
            if let Some(map) = entry.as_object_mut() {
                map.insert("top_players".to_string(), serde_json::json!(top_players));
            }
        }

        let entry_path = entry.get("path").and_then(|v| v.as_str()).unwrap_or("");
        if let Some(idx) = tournaments
            .iter()
            .position(|t| t.get("path").and_then(|v| v.as_str()) == Some(entry_path))
        {
            tournaments[idx] = entry;
        } else {
            tournaments.insert(0, entry);
        }

        let updated_tour_json = format!(
            "{}\n",
            serde_json::to_string_pretty(&tournaments)
                .map_err(|e| format!("Failed to serialize tournament.json: {e}"))?
        );

        // 5. Gather all tournament files from disk
        let mut disk_files: Vec<(PathBuf, String)> = Vec::new();
        for entry in WalkDir::new(tournament_dir).into_iter().filter_map(|e| e.ok()) {
            if entry.file_type().is_file() {
                let name = entry.file_name().to_string_lossy();
                if name == ".DS_Store"
                    || name == "desktop.ini"
                    || name == "Thumbs.db"
                    || name == ".git"
                    || name == ".gitignore"
                    || name.ends_with(".tmp")
                {
                    continue;
                }

                if let Ok(rel) = entry.path().strip_prefix(tournament_dir) {
                    let rel_posix = rel
                        .components()
                        .map(|c| c.as_os_str().to_string_lossy())
                        .collect::<Vec<_>>()
                        .join("/");
                    disk_files.push((entry.path().to_path_buf(), rel_posix));
                }
            }
        }

        if disk_files.is_empty() {
            return Err(format!(
                "No files found in directory to commit: {}",
                tournament_dir.display()
            ));
        }

        // 6. Create Git Blobs for all tournament files
        let mut tree_entries = Vec::new();
        let blobs_endpoint = format!("/repos/{}/git/blobs", self.repo);

        for (full_path, rel_path) in disk_files {
            let bytes = std::fs::read(&full_path)
                .map_err(|e| format!("Failed to read {}: {e}", full_path.display()))?;
            let b64 = STANDARD.encode(&bytes);

            let blob_res = self
                .send_request(
                    reqwest::Method::POST,
                    &blobs_endpoint,
                    Some(serde_json::json!({
                        "content": b64,
                        "encoding": "base64"
                    })),
                )
                .await?;

            let sha = blob_res
                .get("sha")
                .and_then(|s| s.as_str())
                .ok_or_else(|| "Missing sha in blob response".to_string())?;

            tree_entries.push(serde_json::json!({
                "path": format!("www/{}/{}", normalized_folder_name, rel_path),
                "mode": "100644",
                "type": "blob",
                "sha": sha
            }));
        }

        // 7. Create Git Blob for updated www/tournament.json
        let tour_json_b64 = STANDARD.encode(updated_tour_json.as_bytes());
        let tour_blob_res = self
            .send_request(
                reqwest::Method::POST,
                &blobs_endpoint,
                Some(serde_json::json!({
                    "content": tour_json_b64,
                    "encoding": "base64"
                })),
            )
            .await?;

        let tour_sha = tour_blob_res
            .get("sha")
            .and_then(|s| s.as_str())
            .ok_or_else(|| "Missing sha in tournament.json blob response".to_string())?;

        tree_entries.push(serde_json::json!({
            "path": "www/tournament.json",
            "mode": "100644",
            "type": "blob",
            "sha": tour_sha
        }));

        // 8. Create new tree on GitHub based on base_tree_sha
        let trees_endpoint = format!("/repos/{}/git/trees", self.repo);
        let new_tree_res = self
            .send_request(
                reqwest::Method::POST,
                &trees_endpoint,
                Some(serde_json::json!({
                    "base_tree": base_tree_sha,
                    "tree": tree_entries
                })),
            )
            .await?;

        let new_tree_sha = new_tree_res
            .get("sha")
            .and_then(|s| s.as_str())
            .ok_or_else(|| "Missing sha in new tree response".to_string())?;

        // 9. Create commit
        let commits_endpoint = format!("/repos/{}/git/commits", self.repo);
        let commit_msg = format!("Update tournament: {} ({})", tour_name, normalized_folder_name);
        let commit_res = self
            .send_request(
                reqwest::Method::POST,
                &commits_endpoint,
                Some(serde_json::json!({
                    "message": commit_msg,
                    "tree": new_tree_sha,
                    "parents": [parent_commit_sha]
                })),
            )
            .await?;

        let commit_sha = commit_res
            .get("sha")
            .and_then(|s| s.as_str())
            .ok_or_else(|| "Missing sha in commit response".to_string())?
            .to_string();

        // 10. Update branch ref
        let patch_ref_endpoint = format!("/repos/{}/git/refs/heads/{}", self.repo, self.branch);
        self.send_request(
            reqwest::Method::PATCH,
            &patch_ref_endpoint,
            Some(serde_json::json!({
                "sha": commit_sha,
                "force": false
            })),
        )
        .await?;

        let short_sha = if commit_sha.len() >= 7 {
            commit_sha[..7].to_string()
        } else {
            commit_sha.clone()
        };

        Ok(CommitResult {
            success: true,
            commit_sha,
            short_sha,
            tournament: tour_name,
            folder: normalized_folder_name,
            files_count: tree_entries.len(),
        })
    }
}
