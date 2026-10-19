#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { processFolder, calculateDataHash } from "../src/vega-parser.mjs";
import { convertTournamentPhpFiles } from "../src/php-converter.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const wwwDir = path.join(projectRoot, "www");
const fixturesBaseDir = path.join(projectRoot, "crates", "hbcc-core", "tests", "fixtures");

// Ensure base fixtures directory exists
if (!fs.existsSync(fixturesBaseDir)) {
  fs.mkdirSync(fixturesBaseDir, { recursive: true });
}

// Curated list of diverse real tournaments across formats, years, and categories
const TARGET_TOURNAMENTS = [
  "www2025HobsonsBayClubChampionship",
  "www2025HobsonsBayCup",
  "www2025HobsonsBayCupJuniors",
  "www2025HobsonsBayKoshnitskyCup",
  "www2025HobsonsBayKoshnitskyCupJuniors",
  "www2025HobsonsBayWesternMasters",
  "www2025HobsonsBayWesternMajor",
  "www2025HobsonsBayWesternJuniors",
  "www2025HobsonsBayPurdyCup",
  "www2025HobsonsBayPurdyCupJuniors",
  "www2025HobsonsBayReservesChampionship",
  "www2025HobsonsBayReservesChampionshipJuniors",
  "www2025HobsonsBayFebruaryBlitz",
  "www2025HobsonsBayAprilBlitz",
  "www2025HobsonsBayAprilRapid",
  "www2025HobsonsBayJulyRapid",
  "www2025HobsonsBaySeptemberBlitz",
  "www2025HobsonsBaySeptemberRapid",
  "www2025HBCCHonourableBobJuniors",
  "www2025HobsonsBayHonourableBob",
  "www2024HBCCHobsonsBayClubChampionship2024",
  "www2024HBCCHobsonsBayReserveChampionship",
  "www2024HBCCPresidentCupJuniorsBlitz2024",
  "www2025ANZACRapid",
  "www2025BestintheWest"
];

async function generateFixture(tourName) {
  const tourDir = path.join(wwwDir, tourName);
  if (!fs.existsSync(tourDir)) {
    console.warn(`[WARN] Skipping ${tourName}: directory not found at ${tourDir}`);
    return false;
  }

  // Verify it has tourstat or standing
  const hasTourstat = fs.existsSync(path.join(tourDir, "tourstat.html")) || fs.existsSync(path.join(tourDir, "tourstat.php"));
  if (!hasTourstat) {
    console.warn(`[WARN] Skipping ${tourName}: no tourstat found`);
    return false;
  }

  const cleanName = tourName.replace(/^www/, "");
  const outFixtureDir = path.join(fixturesBaseDir, cleanName);
  const outInputDir = path.join(outFixtureDir, "input");

  fs.mkdirSync(outInputDir, { recursive: true });

  // 1. Copy essential HTML and PHP input files into input/
  const files = fs.readdirSync(tourDir);
  const relevantFiles = files.filter(f => {
    const lower = f.toLowerCase();
    return (
      lower.endsWith(".html") ||
      lower.endsWith(".php") ||
      lower.endsWith(".css") ||
      lower.endsWith(".js")
    ) && !lower.includes("data.json") && !lower.includes("data_clean.json");
  });

  for (const f of relevantFiles) {
    const src = path.join(tourDir, f);
    const dest = path.join(outInputDir, f);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dest);
    }
  }

  // 2. Run PHP converter on the fixture input dir if PHP files exist
  convertTournamentPhpFiles(outInputDir);

  // 3. Process tournament using reference JS parser
  const result = await processFolder(outInputDir, { writeFiles: false });
  if (!result) {
    console.error(`[ERROR] Failed to parse fixture for ${tourName}`);
    return false;
  }

  // 4. Calculate exact reference MD5 hash
  const referenceHash = calculateDataHash(result);
  result.md5Hash = referenceHash;

  const cleanData = result.cleanData || {};
  const cleanHash = calculateDataHash(cleanData);

  // 5. Save expected outputs
  fs.writeFileSync(
    path.join(outFixtureDir, "expected_data.json"),
    JSON.stringify(result, null, 2) + "\n",
    "utf8"
  );

  fs.writeFileSync(
    path.join(outFixtureDir, "expected_clean.json"),
    JSON.stringify(cleanData, null, 2) + "\n",
    "utf8"
  );

  fs.writeFileSync(
    path.join(outFixtureDir, "expected_hash.txt"),
    referenceHash + "\n",
    "utf8"
  );

  console.log(`✓ Generated golden fixture: ${cleanName} (${result.players?.length || 0} players, hash: ${referenceHash.substring(0, 8)}...)`);
  return true;
}

async function main() {
  console.log("=== Generating Golden Tournament Fixtures for Rust Parity Test Harness ===");
  let count = 0;
  for (const t of TARGET_TOURNAMENTS) {
    const ok = await generateFixture(t);
    if (ok) count++;
  }
  console.log(`\n🎉 Successfully generated ${count} golden fixtures in ${fixturesBaseDir}`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
