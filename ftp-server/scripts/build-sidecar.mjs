#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const binariesDir = path.join(projectRoot, "src-tauri", "binaries");
const parserEntry = path.join(projectRoot, "parser", "run-parser.mjs");

fs.mkdirSync(binariesDir, { recursive: true });

function findBun() {
  try {
    return execSync("which bun", { encoding: "utf8" }).trim();
  } catch {
    const homeBun = path.join(process.env.HOME || "", ".bun", "bin", "bun");
    if (fs.existsSync(homeBun)) return homeBun;
    return null;
  }
}

const bunPath = findBun();
if (!bunPath) {
  console.warn("[Sidecar Build] Bun not found in PATH or ~/.bun/bin/bun. Skipping sidecar compilation.");
  process.exit(0);
}

const targets = [
  { target: "bun-darwin-arm64", outfile: "vega-parser-aarch64-apple-darwin" },
  { target: "bun-darwin-x64", outfile: "vega-parser-x86_64-apple-darwin" },
  { target: "bun-windows-x64", outfile: "vega-parser-x86_64-pc-windows-msvc.exe" }
];

console.log("[Sidecar Build] Compiling standalone Vega parser sidecar binaries with Bun...");

for (const { target, outfile } of targets) {
  const destPath = path.join(binariesDir, outfile);
  console.log(` -> Building ${outfile} (${target})...`);
  try {
    execSync(`"${bunPath}" build "${parserEntry}" --compile --target=${target} --outfile "${destPath}"`, {
      stdio: "inherit"
    });
  } catch (err) {
    console.error(`Failed to compile ${outfile}:`, err);
  }
}

if (process.platform === "darwin") {
  const arm64Path = path.join(binariesDir, "vega-parser-aarch64-apple-darwin");
  const x64Path = path.join(binariesDir, "vega-parser-x86_64-apple-darwin");
  const universalPath = path.join(binariesDir, "vega-parser-universal-apple-darwin");
  if (fs.existsSync(arm64Path) && fs.existsSync(x64Path)) {
    console.log(" -> Creating universal macOS sidecar with lipo...");
    try {
      execSync(`lipo -create -output "${universalPath}" "${arm64Path}" "${x64Path}"`, { stdio: "inherit" });
    } catch (err) {
      console.error("Failed to create universal binary:", err);
    }
  }
}

console.log("[Sidecar Build] All sidecar binaries compiled into src-tauri/binaries/");

