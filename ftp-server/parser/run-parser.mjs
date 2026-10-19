#!/usr/bin/env node
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { processFolder } from "../../src/vega-parser.mjs";
import { upsertTournamentToSupabase, isSupabaseConfigured } from "../../src/supabase.mjs";
import { commitTournamentToGitHub, isGitHubSyncEnabled } from "../../src/github-sync.mjs";
import { convertTournamentPhpFiles } from "../../src/php-converter.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const targetDir = process.argv[2];
  if (!targetDir) {
    console.error("Usage: node run-parser.mjs <tournament_directory>");
    process.exit(1);
  }

  const resolvedDir = path.resolve(targetDir);

  try {
    const stat = await fs.stat(resolvedDir);
    if (!stat.isDirectory()) {
      console.error(`Error: ${resolvedDir} is not a directory`);
      process.exit(1);
    }

    console.log(`[Vega Parser] Processing tournament folder: ${resolvedDir}`);

    const phpCheck = convertTournamentPhpFiles(resolvedDir);
    if (phpCheck.converted > 0) {
      console.log(`[Vega Parser] Converted ${phpCheck.converted} PHP file(s) to HTML (HTML was missing or older than threshold).`);
    } else if (phpCheck.totalPhp > 0) {
      console.log(`[Vega Parser] Checked ${phpCheck.totalPhp} PHP file(s); all corresponding HTML files are up to date.`);
    }

    const result = await processFolder(resolvedDir, {
      writeFiles: true
    });

    if (result) {
      let supabaseStatus = "skipped (not configured)";
      if (isSupabaseConfigured()) {
        try {
          console.log(`[Vega Parser] Supabase configured. Upserting tournament: ${path.basename(resolvedDir)}...`);
          const sbRes = await upsertTournamentToSupabase({
            websiteName: path.basename(resolvedDir),
            repoPath: path.resolve(resolvedDir, ".."),
            result: result,
            fullData: result
          });
          if (sbRes.success) {
            supabaseStatus = "upserted";
            console.log(`[Vega Parser] Successfully upserted tournament to Supabase!`);
          } else {
            supabaseStatus = `warning: ${sbRes.error?.message || sbRes.reason}`;
            console.warn(`[Vega Parser] Supabase sync warning:`, sbRes.error || sbRes.reason);
          }
        } catch (sbErr) {
          supabaseStatus = `error: ${sbErr.message}`;
          console.error(`[Vega Parser] Supabase exception:`, sbErr.message);
        }
      } else {
        console.log(`[Vega Parser] Supabase credentials not found; skipping cloud sync.`);
      }

      let githubStatus = "skipped (disabled)";
      if (isGitHubSyncEnabled()) {
        try {
          console.log(`[GitHub Sync] Automatic push enabled. Committing tournament to GitHub...`);
          const ghRes = await commitTournamentToGitHub({
            tournamentDir: resolvedDir,
            parseResult: result,
          });
          if (ghRes.success) {
            githubStatus = `committed (${ghRes.shortSha || ghRes.commitSha?.substring(0, 7) || "ok"})`;
          } else if (ghRes.skipped) {
            githubStatus = `skipped (${ghRes.reason})`;
          } else {
            githubStatus = `warning: ${ghRes.message || ghRes.error?.message || ghRes.reason}`;
            console.warn(`[GitHub Sync] Warning:`, ghRes.message || ghRes.reason);
          }
        } catch (ghErr) {
          githubStatus = `error: ${ghErr.message}`;
          console.error(`[GitHub Sync] Exception:`, ghErr.message);
        }
      } else {
        console.log(`[GitHub Sync] ALLOW_PUSH_CHANGE_TO_GH is not set to true; skipping GitHub commit.`);
      }

      const info = {
        success: true,
        folder: resolvedDir,
        tournamentName: result.metadata?.["Tournament Name"] || path.basename(resolvedDir),
        category: result.category || "Senior",
        playerCount: result.players?.length || 0,
        filesGenerated: ["data.json", "data_clean.json"],
        md5Hash: result.md5Hash || "",
        supabase: supabaseStatus,
        github: githubStatus
      };
      console.log(`[Vega Parser] Output: ${JSON.stringify(info)}`);
    } else {
      console.log(JSON.stringify({
        success: false,
        folder: resolvedDir,
        message: "No player data found in HTML files to generate data.json"
      }));
    }
  } catch (err) {
    console.error(`[Vega Parser] Failed:`, err);
    process.exit(1);
  }
}

main();
