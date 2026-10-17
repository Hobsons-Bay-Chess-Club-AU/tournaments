#!/usr/bin/env node
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { processFolder } from "../../src/vega-parser.mjs";

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
      const info = {
        success: true,
        folder: resolvedDir,
        tournamentName: result.metadata?.["Tournament Name"] || path.basename(resolvedDir),
        category: result.category || "Senior",
        playerCount: result.players?.length || 0,
        filesGenerated: ["data.json", "data_clean.json"],
        md5Hash: result.md5Hash || ""
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
