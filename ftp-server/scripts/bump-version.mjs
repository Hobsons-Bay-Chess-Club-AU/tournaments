#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const newVersion = process.argv[2];
if (!newVersion) {
  console.error("Usage: npm run bump <new_version> (e.g. npm run bump 0.1.2)");
  process.exit(1);
}

// Strip leading 'v' if provided
const version = newVersion.replace(/^v/, "").trim();

// 1. package.json
const pkgPath = path.join(projectRoot, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const oldVersion = pkg.version;
pkg.version = version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`✓ Updated package.json: ${oldVersion} -> ${version}`);

// 2. src-tauri/tauri.conf.json
const tauriConfPath = path.join(projectRoot, "src-tauri", "tauri.conf.json");
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf8"));
tauriConf.version = version;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");
console.log(`✓ Updated tauri.conf.json: ${oldVersion} -> ${version}`);

// 3. src-tauri/Cargo.toml
const cargoPath = path.join(projectRoot, "src-tauri", "Cargo.toml");
let cargoContent = fs.readFileSync(cargoPath, "utf8");
cargoContent = cargoContent.replace(/^version\s*=\s*"[^"]+"/m, `version = "${version}"`);
fs.writeFileSync(cargoPath, cargoContent);
console.log(`✓ Updated Cargo.toml: ${oldVersion} -> ${version}`);

console.log(`\n🎉 Version successfully updated to ${version} across all files!`);
console.log(`Next commands:`);
console.log(`  git commit -am "chore(release): bump version to ${version}"`);
console.log(`  git push`);
console.log(`  # Optional git tag: git tag ftp-v${version} && git push origin ftp-v${version}\n`);
