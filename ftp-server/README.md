# HBCC Tournament FTP & Local Preview Server

A cross-platform desktop application built with **Tauri v2** and **Rust** that provides a local FTP server and HTTP preview server for chess arbiters running tournaments with **Vega Chess**.

---

## Features

- 🚀 **Zero Setup:** Launches with one click and is immediately ready to accept uploads on `127.0.0.1:2121`.
- 🔓 **Permissive Authentication:** Accepts any username and password (e.g. `vega`/`vega` or anonymous) from Vega Chess.
- 📁 **Configurable Storage Folder:** Saves all uploaded tournament files and directory structures directly to `~/Documents/HBCC_Tournaments` (customizable in UI).
- 🌐 **Instant Local HTTP Preview:** Embedded web server running on `http://127.0.0.1:8080` with directory browsing fallback so arbiters can click "Preview Site" to view live pairings and standings in their browser.
- 📊 **Real-Time Upload Feed:** Live activity log displaying incoming files, sizes, timestamps, and upload statuses as Vega publishes them.
- 🔄 **Built-in Auto-Updater:** Checks GitHub Releases for new updates automatically using cryptographic signature verification.

---

## Vega Chess Configuration Guide

1. Open **Vega Chess**.
2. Go to **Options** > **Internet FTP** (or Internet Publishing).
3. Enter the following settings:
   - **Host / Server:** `127.0.0.1`
   - **Port:** `2121` (or click "Copy Settings" in the app)
   - **Username:** `vega` (or any string)
   - **Password:** `vega` (or any string)
   - **Remote Directory:** `/` (or leave empty)
   - **Passive Mode:** Enabled (checked)
4. Click **Publish** in Vega.
5. In the HBCC FTP Server desktop app, watch the files appear in the **Live Activity Feed**, and click **🌐 Preview Site** to view your tournament in the browser!

---

## Development & Building

### Requirements
- **Node.js** v18+ (tested on Node v22)
- **Rust** 1.80+ (tested on Rust 1.91)

### Run in Development
```bash
cd ftp-server
npm install
npm run tauri -- dev
```

### Run Tests
```bash
# Unit & integration tests (Rust backend)
cargo test --manifest-path ftp-server/src-tauri/Cargo.toml

# End-to-end integration test
cargo test --test e2e_test --manifest-path ftp-server/src-tauri/Cargo.toml

# Bash simulation script
bash ftp-server/tests/e2e_simulate_vega.sh 2121 8080
```

### Build Production Binary
```bash
cd ftp-server
npm run tauri -- build
```
Build outputs:
- **macOS:** `src-tauri/target/release/bundle/dmg/` (`.dmg`) and `bundle/macos/` (`.app`)
- **Windows:** `src-tauri/target/release/bundle/msi/` (`.msi`) and `bundle/nsis/` (`.exe`)

---

## CI/CD Releases & Auto-Updates

Releases are automatically built and published via GitHub Actions when pushing a version tag:
```bash
git tag ftp-v0.1.0
git push origin ftp-v0.1.0
```
This triggers `.github/workflows/ftp-server-release.yml`, which compiles signed installers for Windows and macOS and publishes them to GitHub Releases alongside `latest.json`.
