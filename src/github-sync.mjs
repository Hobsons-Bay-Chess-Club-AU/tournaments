// Module to commit uploaded tournament files and update www/tournament.json directly
// via the GitHub REST API (Git Database API) without requiring local git CLI or SSH keys.

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded from standard locations, always overriding stale cached values
function loadEnv() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "ftp-server", ".env"),
    path.resolve(process.cwd(), "..", ".env"),
    path.resolve(process.cwd(), "..", "ftp-server", ".env"),
    path.resolve(__dirname, "..", "ftp-server", ".env"),
    path.resolve(__dirname, "..", ".env"),
  ];

  for (const p of candidates) {
    try {
      dotenv.config({ path: p, override: true });
    } catch {
      // ignore
    }
  }
}

loadEnv();

/**
 * Check if GitHub sync feature is explicitly enabled.
 */
export function isGitHubSyncEnabled() {
  loadEnv();
  const flag = (process.env.ALLOW_PUSH_CHANGE_TO_GH || "").trim().toLowerCase();
  return flag === "true" || flag === "1";
}

/**
 * Concurrency helper to run async tasks in bounded parallel batches.
 */
async function mapConcurrent(items, concurrency, fn) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);
    if (concurrency <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}

/**
 * Recursively scans directory for files to commit, excluding OS artifacts.
 */
async function getAllFiles(dir, baseDir = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    // Ignore junk / OS / temp files
    if (
      entry.name === ".DS_Store" ||
      entry.name === "desktop.ini" ||
      entry.name === "Thumbs.db" ||
      entry.name === ".git" ||
      entry.name === ".gitignore" ||
      entry.name.endsWith(".tmp")
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      const nested = await getAllFiles(fullPath, baseDir);
      files.push(...nested);
    } else if (entry.isFile()) {
      const relativePath = path
        .relative(baseDir, fullPath)
        .split(path.sep)
        .join("/");
      files.push({ fullPath, relativePath });
    }
  }

  return files;
}

/**
 * Authenticated GitHub REST API request wrapper.
 */
async function githubRequest(endpoint, { token, method = "GET", body = null }) {
  const url = endpoint.startsWith("https://")
    ? endpoint
    : `https://api.github.com${endpoint}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "HBCC-Tournament-Publisher",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type") || "";
  let data;
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const errorMsg =
      (data && typeof data === "object" && data.message) ||
      `HTTP ${res.status} ${res.statusText}`;
    const err = new Error(`GitHub API ${method} ${endpoint} failed: ${errorMsg}`);
    err.status = res.status;
    err.response = data;
    throw err;
  }

  return data;
}

/**
 * Commit all tournament files and update www/tournament.json using GitHub Git Database API.
 *
 * @param {Object} options
 * @param {string} options.tournamentDir - Local path to the tournament directory
 * @param {Object} options.parseResult - Output from vega-parser (metadata, category, top_players, etc.)
 */
export async function commitTournamentToGitHub({ tournamentDir, parseResult = {} }) {
  loadEnv();

  if (!isGitHubSyncEnabled()) {
    console.log("[GitHub Sync] ALLOW_PUSH_CHANGE_TO_GH is not enabled. Skipping GitHub commit.");
    return { success: false, skipped: true, reason: "disabled" };
  }

  const token = (process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "").trim();
  if (!token) {
    console.log("[GitHub Sync] GH_TOKEN / GITHUB_TOKEN is not configured in environment. Skipping GitHub commit.");
    return { success: false, skipped: true, reason: "missing_token" };
  }

  const repo = (process.env.GH_REPO || "Hobsons-Bay-Chess-Club-AU/tournaments").trim();
  const branch = (process.env.GH_BRANCH || "main").trim();

  try {
    const folderName = path.basename(tournamentDir);
    // Standard HBCC tournament folder names in www start with 'www'
    const normalizedFolderName = folderName.startsWith("www")
      ? folderName
      : `www${folderName}`;

    const tourName =
      parseResult.metadata?.["Tournament Name"] ||
      parseResult.tournamentName ||
      normalizedFolderName;

    console.log(`[GitHub Sync] Starting commit for tournament '${tourName}' to ${repo} (${branch})...`);

    // 1. Get HEAD commit SHA of target branch
    const refData = await githubRequest(`/repos/${repo}/git/ref/heads/${branch}`, {
      token,
    });
    const parentCommitSha = refData.object.sha;

    // 2. Get base tree SHA from parent commit
    const parentCommitData = await githubRequest(
      `/repos/${repo}/git/commits/${parentCommitSha}`,
      { token }
    );
    const baseTreeSha = parentCommitData.tree.sha;

    // 3. Fetch existing www/tournament.json from branch
    let tournaments = [];
    try {
      const contentsData = await githubRequest(
        `/repos/${repo}/contents/www/tournament.json?ref=${branch}`,
        { token }
      );
      if (contentsData && contentsData.content) {
        const raw = Buffer.from(contentsData.content, "base64").toString("utf-8");
        tournaments = JSON.parse(raw);
        if (!Array.isArray(tournaments)) tournaments = [];
      }
    } catch (contentsErr) {
      console.warn(
        `[GitHub Sync] Could not fetch remote www/tournament.json (${contentsErr.message}). Starting with empty list.`
      );
      tournaments = [];
    }

    // 4. Update tournament.json with this tournament's metadata
    const topPlayers = parseResult.top_players || [];
    const tournamentEntry = {
      data: parseResult.metadata || { "Tournament Name": tourName },
      path: `${normalizedFolderName}/data.json`,
      category: parseResult.category || parseResult.metadata?.category || "Junior",
      ...(topPlayers.length > 0 ? { top_players: topPlayers } : {}),
    };

    const existingIdx = tournaments.findIndex(
      (t) => t.path === tournamentEntry.path
    );
    if (existingIdx >= 0) {
      tournaments[existingIdx] = tournamentEntry;
    } else {
      tournaments.unshift(tournamentEntry);
    }

    const updatedTournamentJsonBuf = Buffer.from(
      JSON.stringify(tournaments, null, 2) + "\n",
      "utf-8"
    );

    // 5. Gather all tournament files from disk
    const diskFiles = await getAllFiles(tournamentDir);
    if (diskFiles.length === 0) {
      console.warn(`[GitHub Sync] No files found in ${tournamentDir} to commit.`);
      return { success: false, skipped: true, reason: "empty_directory" };
    }

    console.log(
      `[GitHub Sync] Uploading ${diskFiles.length} tournament files + updated www/tournament.json...`
    );

    // 6. Create Git Blobs for all tournament files in parallel batches (concurrency: 6)
    const fileBlobs = await mapConcurrent(diskFiles, 6, async (f) => {
      const buf = await fs.readFile(f.fullPath);
      const res = await githubRequest(`/repos/${repo}/git/blobs`, {
        token,
        method: "POST",
        body: {
          content: buf.toString("base64"),
          encoding: "base64",
        },
      });
      return {
        path: `www/${normalizedFolderName}/${f.relativePath}`,
        mode: "100644",
        type: "blob",
        sha: res.sha,
      };
    });

    // 7. Create Git Blob for updated www/tournament.json
    const tourJsonBlobRes = await githubRequest(`/repos/${repo}/git/blobs`, {
      token,
      method: "POST",
      body: {
        content: updatedTournamentJsonBuf.toString("base64"),
        encoding: "base64",
      },
    });

    const treeEntries = [
      ...fileBlobs,
      {
        path: "www/tournament.json",
        mode: "100644",
        type: "blob",
        sha: tourJsonBlobRes.sha,
      },
    ];

    // 8. Create new tree on GitHub based on baseTreeSha
    const newTreeRes = await githubRequest(`/repos/${repo}/git/trees`, {
      token,
      method: "POST",
      body: {
        base_tree: baseTreeSha,
        tree: treeEntries,
      },
    });

    // 9. Create commit
    const commitMsg = `Update tournament: ${tourName} (${normalizedFolderName})`;
    const commitRes = await githubRequest(`/repos/${repo}/git/commits`, {
      token,
      method: "POST",
      body: {
        message: commitMsg,
        tree: newTreeRes.sha,
        parents: [parentCommitSha],
      },
    });

    // 10. Update branch ref
    await githubRequest(`/repos/${repo}/git/refs/heads/${branch}`, {
      token,
      method: "PATCH",
      body: {
        sha: commitRes.sha,
        force: false,
      },
    });

    const shortSha = commitRes.sha.substring(0, 7);
    console.log(
      `[GitHub Sync] Successfully committed and pushed '${tourName}' to ${repo} (${branch})! Commit: ${shortSha}`
    );

    return {
      success: true,
      commitSha: commitRes.sha,
      shortSha,
      tournament: tourName,
      folder: normalizedFolderName,
      filesCount: treeEntries.length,
    };
  } catch (err) {
    console.error(`[GitHub Sync] Commit failed: ${err.message}`, err);
    return {
      success: false,
      error: err,
      message: err.message,
    };
  }
}
