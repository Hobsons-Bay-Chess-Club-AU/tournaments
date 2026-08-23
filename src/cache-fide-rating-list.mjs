import { copyFile, mkdir, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIDE_URL = "https://ratings.fide.com/download/players_list.zip";

function argumentValue(argumentsList, name) {
  const index = argumentsList.indexOf(name);
  return index === -1 ? null : argumentsList[index + 1] || null;
}

function currentMonthFolder(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    month: "short",
    year: "numeric",
    timeZone: "Australia/Melbourne",
  }).formatToParts(now);
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;
  return `${month}-${year}`;
}

function runCurl(destination) {
  return new Promise((resolvePromise, reject) => {
    const process = spawn("curl", [
      "--fail",
      "--location",
      "--show-error",
      "--retry", "3",
      "--retry-all-errors",
      "--connect-timeout", "30",
      "--max-time", "180",
      "--output", destination,
      FIDE_URL,
    ], { stdio: "inherit" });
    process.on("error", reject);
    process.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`curl failed with exit code ${code}`));
    });
  });
}

async function main() {
  const argumentsList = process.argv.slice(2);
  const month = argumentValue(argumentsList, "--month") || currentMonthFolder();
  const source = argumentValue(argumentsList, "--source");
  const masterDataDirectory = resolve(
    argumentValue(argumentsList, "--master-data-dir") || resolve(__dirname, "../master-data"),
  );
  if (!/^[A-Z][a-z]{2}-\d{4}$/.test(month)) {
    throw new Error(`Invalid month "${month}". Use the format Mon-YYYY, for example Jun-2026.`);
  }

  const outputDirectory = resolve(masterDataDirectory, month);
  const outputPath = resolve(outputDirectory, "players_list.zip");
  const temporaryPath = `${outputPath}.download`;
  await mkdir(outputDirectory, { recursive: true });
  await rm(temporaryPath, { force: true });

  if (source) {
    await copyFile(resolve(source), temporaryPath);
  } else {
    await runCurl(temporaryPath);
  }

  await rename(temporaryPath, outputPath);
  console.log(`FIDE rating list cached at ${outputPath}`);
}

main().catch((error) => {
  console.error(`FIDE rating cache failed: ${error.message}`);
  process.exitCode = 1;
});
