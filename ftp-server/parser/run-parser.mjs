#!/usr/bin/env node
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { processFolder } from "../../src/vega-parser.mjs";
import { upsertTournamentToSupabase, isSupabaseConfigured } from "../../src/supabase.mjs";

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

      const info = {
        success: true,
        folder: resolvedDir,
        tournamentName: result.metadata?.["Tournament Name"] || path.basename(resolvedDir),
        category: result.category || "Senior",
        playerCount: result.players?.length || 0,
        filesGenerated: ["data.json", "data_clean.json"],
        md5Hash: result.md5Hash || "",
        supabase: supabaseStatus
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
