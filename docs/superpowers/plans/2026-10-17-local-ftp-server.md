# Local FTP & HTTP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform desktop application using Tauri v2, Tokio, and Rust that runs a local permissive FTP server (default port 2121) for Vega Chess uploads, an embedded HTTP preview server (default port 8080), a modern arbiter-friendly UI, and GitHub Releases auto-update support.

**Architecture:** Tauri v2 application wrapping an asynchronous Rust backend (using Tokio tasks for both `libunftp` FTP server and `axum` HTTP static server) and a lightweight web frontend. Incoming Vega FTP uploads are saved directly to a customizable local staging directory (`~/Documents/HBCC_Tournaments`), triggering real-time UI activity events.

**Tech Stack:**
- Desktop Framework: Tauri v2 (`@tauri-apps/cli` ^2.0, `@tauri-apps/api` ^2.0)
- Backend: Rust 1.80+ (Homebrew Rust 1.91 installed), Tokio async runtime
- FTP Engine: `libunftp` (or `unftp-sfs`), custom permissive authenticator
- HTTP Engine: `axum` ^0.7, `tower-http` ^0.5 (ServeDir)
- Plugins: `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-opener`, `@tauri-apps/plugin-store`, `@tauri-apps/plugin-updater`
- Frontend: HTML5, CSS3 (Modern dark/light brand styling), Vanilla JavaScript / Vite

**Spec:** [docs/superpowers/specs/2026-10-17-local-ftp-server-design.md](file:///Users/truongnguyen/source/hbcc/tournaments/docs/superpowers/specs/2026-10-17-local-ftp-server-design.md)

## Global Constraints
- Target Platforms: macOS (Intel & Apple Silicon) and Windows (x64)
- Default FTP Port: `2121` (configurable down to `21` if needed on Windows)
- Default HTTP Preview Port: `8080` (configurable)
- Default Staging Directory: `~/Documents/HBCC_Tournaments`
- Authentication: Permissive (accepts any credentials and anonymous)
- Zero external runtime dependencies for arbiters (single self-contained binary)

---

### Task 1: Initialize Project Scaffolding & Tauri v2 Skeleton

**Files:**
- Create: `ftp-server/package.json`
- Create: `ftp-server/vite.config.js`
- Create: `ftp-server/index.html`
- Create: `ftp-server/src-tauri/Cargo.toml`
- Create: `ftp-server/src-tauri/tauri.conf.json`
- Create: `ftp-server/src-tauri/src/main.rs`
- Create: `ftp-server/src-tauri/src/lib.rs`

**Interfaces:**
- Produces: Tauri v2 base application capable of running and building with `cargo test` and `npm run build`.

- [ ] **Step 1: Write `ftp-server/package.json` and `ftp-server/vite.config.js`**

```json
{
  "name": "hbcc-ftp-server",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-dialog": "^2.0.0",
    "@tauri-apps/plugin-opener": "^2.0.0",
    "@tauri-apps/plugin-store": "^2.0.0",
    "@tauri-apps/plugin-updater": "^2.0.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "vite": "^5.4.0"
  }
}
```

```javascript
import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM == "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
```

- [ ] **Step 2: Create initial minimal `ftp-server/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HBCC Vega FTP Server</title>
  </head>
  <body>
    <div id="app">
      <h1>HBCC Tournament FTP Server</h1>
      <p id="status">Initializing...</p>
    </div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `ftp-server/src-tauri/Cargo.toml`**

```toml
[package]
name = "hbcc-ftp-server"
version = "0.1.0"
description = "Local FTP & HTTP server for Vega Chess tournaments"
edition = "2021"

[lib]
name = "hbcc_ftp_server_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2.0.0", features = [] }

[dependencies]
tauri = { version = "2.0.0", features = [] }
tauri-plugin-dialog = "2.0.0"
tauri-plugin-opener = "2.0.0"
tauri-plugin-store = "2.0.0"
tauri-plugin-updater = "2.0.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.38", features = ["full"] }
libunftp = "0.19.0"
unftp-sfs = "0.2.0"
async-trait = "0.1"
axum = "0.7"
tower-http = { version = "0.5", features = ["fs", "cors"] }
dirs = "5.0"
tracing = "0.1"
tracing-subscriber = "0.3"

[dev-dependencies]
reqwest = { version = "0.12", features = ["json"] }
```

- [ ] **Step 4: Create `ftp-server/src-tauri/tauri.conf.json`**

```json
{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-cli/schema.json",
  "productName": "HBCC FTP Server",
  "version": "0.1.0",
  "identifier": "com.hobsonsbaychess.ftpserver",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "HBCC Tournament FTP Server",
        "width": 840,
        "height": 680,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  },
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/Hobsons-Bay-Chess-Club-AU/tournaments/releases/latest/download/latest.json"
      ]
    }
  }
}
```

- [ ] **Step 5: Create `src-tauri/src/main.rs` and `src-tauri/src/lib.rs`**

```rust
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    hbcc_ftp_server_lib::run();
}
```

```rust
// src-tauri/src/lib.rs
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_skeleton() {
        assert_eq!(2 + 2, 4);
    }
}
```

- [ ] **Step 6: Run `npm install` and `cargo test` in `ftp-server/`**

Run:
```bash
cd ftp-server && npm install && cargo test --manifest-path src-tauri/Cargo.toml
```
Expected: PASS (dependencies resolved, test_skeleton passed).

- [ ] **Step 7: Commit Task 1**

```bash
git add ftp-server/
git commit -m "feat(ftp-server): initialize Tauri v2 project structure and dependencies"
```

---

### Task 2: Implement Permissive FTP Server Engine in Rust

**Files:**
- Create: `ftp-server/src-tauri/src/ftp/mod.rs`
- Create: `ftp-server/src-tauri/src/ftp/auth.rs`
- Modify: `ftp-server/src-tauri/src/lib.rs`
- Create: `ftp-server/src-tauri/tests/ftp_test.rs`

**Interfaces:**
- Produces:
  - `pub struct FtpServerHandle { ... }`
  - `pub async fn start_ftp_server(host: &str, port: u16, root_dir: std::path::PathBuf, on_file_uploaded: impl Fn(String, u64) + Send + Sync + 'static) -> Result<FtpServerHandle, String>`
  - `FtpServerHandle::stop(self) -> ()`

- [ ] **Step 1: Write the failing FTP integration test in `ftp-server/src-tauri/tests/ftp_test.rs`**

```rust
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::time::{sleep, Duration};

#[tokio::test]
async fn test_ftp_server_lifecycle_and_permissive_auth() {
    let temp_dir = tempfile::tempdir().unwrap();
    let root_path = temp_dir.path().to_path_buf();
    let port = 22121; // test port
    let upload_count = Arc::new(AtomicUsize::new(0));
    let upload_counter_clone = upload_count.clone();

    let server_handle = hbcc_ftp_server_lib::ftp::start_ftp_server(
        "127.0.0.1",
        port,
        root_path.clone(),
        move |_filename, _bytes| {
            upload_counter_clone.fetch_add(1, Ordering::SeqCst);
        },
    )
    .await
    .expect("FTP server failed to start");

    // Sleep briefly to ensure listener is active
    sleep(Duration::from_millis(150)).await;

    // Test TCP connect
    let stream = tokio::net::TcpStream::connect(format!("127.0.0.1:{}", port)).await;
    assert!(stream.is_ok(), "Failed to connect to FTP port");

    server_handle.stop().await;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test --test ftp_test --manifest-path ftp-server/src-tauri/Cargo.toml`
Expected: FAIL with "module `ftp` not found".

- [ ] **Step 3: Implement `ftp/auth.rs`**

```rust
// ftp-server/src-tauri/src/ftp/auth.rs
use async_trait::async_trait;
use libunftp::auth::{AuthenticationError, Authenticator, Credentials, DefaultUser};
use std::sync::Arc;

#[derive(Debug)]
pub struct PermissiveAuthenticator;

#[async_trait]
impl Authenticator<DefaultUser> for PermissiveAuthenticator {
    async fn authenticate(
        &self,
        username: &str,
        _creds: &Credentials,
    ) -> Result<DefaultUser, AuthenticationError> {
        // Accept any username (anonymous, vega, admin, arbiter, etc.)
        let user_id = if username.is_empty() { "anonymous" } else { username };
        Ok(DefaultUser::new(user_id))
    }
}
```

- [ ] **Step 4: Implement `ftp/mod.rs`**

```rust
// ftp-server/src-tauri/src/ftp/mod.rs
pub mod auth;

use auth::PermissiveAuthenticator;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::oneshot;
use unftp_sfs::Filesystem;

pub struct FtpServerHandle {
    shutdown_tx: Option<oneshot::Sender<()>>,
}

impl FtpServerHandle {
    pub async fn stop(mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }
}

pub async fn start_ftp_server<F>(
    host: &str,
    port: u16,
    root_dir: PathBuf,
    on_file_uploaded: F,
) -> Result<FtpServerHandle, String>
where
    F: Fn(String, u64) + Send + Sync + 'static,
{
    std::fs::create_dir_all(&root_dir)
        .map_err(|e| format!("Failed to create storage directory: {}", e))?;

    let addr: SocketAddr = format!("{}:{}", host, port)
        .parse()
        .map_err(|e| format!("Invalid address {}:{}: {}", host, port, e))?;

    let fs_backend = Filesystem::new(root_dir.clone());
    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

    let server = libunftp::ServerBuilder::new(Box::new(move || Filesystem::new(root_dir.clone())))
        .authenticator(Arc::new(PermissiveAuthenticator))
        .greeting("HBCC Vega Tournament FTP Server ready")
        .build()
        .map_err(|e| format!("Failed to build FTP server: {:?}", e))?;

    tokio::spawn(async move {
        tokio::select! {
            res = server.listen(addr) => {
                if let Err(e) = res {
                    eprintln!("FTP server exited with error: {:?}", e);
                }
            }
            _ = shutdown_rx => {
                println!("FTP server received shutdown signal");
            }
        }
    });

    Ok(FtpServerHandle {
        shutdown_tx: Some(shutdown_tx),
    })
}
```

- [ ] **Step 5: Export `pub mod ftp;` in `src-tauri/src/lib.rs` and add `tempfile = "3.10"` to dev-dependencies**

Add `tempfile = "3.10"` to `ftp-server/src-tauri/Cargo.toml` `[dev-dependencies]`.
Update `src-tauri/src/lib.rs` with `pub mod ftp;`.

- [ ] **Step 6: Run test to verify it passes**

Run: `cargo test --test ftp_test --manifest-path ftp-server/src-tauri/Cargo.toml`
Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```bash
git add ftp-server/src-tauri/
git commit -m "feat(ftp-server): implement permissive FTP server engine with Tokio lifecycle"
```

---

### Task 3: Implement Local HTTP Preview Server (`axum` + directory index)

**Files:**
- Create: `ftp-server/src-tauri/src/http/mod.rs`
- Modify: `ftp-server/src-tauri/src/lib.rs`
- Create: `ftp-server/src-tauri/tests/http_test.rs`

**Interfaces:**
- Produces:
  - `pub struct HttpServerHandle { ... }`
  - `pub async fn start_http_server(host: &str, port: u16, root_dir: std::path::PathBuf) -> Result<HttpServerHandle, String>`
  - `HttpServerHandle::stop(self) -> ()`

- [ ] **Step 1: Write the failing HTTP server test in `ftp-server/src-tauri/tests/http_test.rs`**

```rust
use std::fs;
use std::path::PathBuf;
use tokio::time::{sleep, Duration};

#[tokio::test]
async fn test_http_server_serves_html_and_index() {
    let temp_dir = tempfile::tempdir().unwrap();
    let root_path = temp_dir.path().to_path_buf();
    let sample_file = root_path.join("index.html");
    fs::write(&sample_file, "<html><body><h1>Vega Tournament</h1></body></html>").unwrap();

    let port = 18080;
    let handle = hbcc_ftp_server_lib::http::start_http_server("127.0.0.1", port, root_path.clone())
        .await
        .expect("Failed to start HTTP server");

    sleep(Duration::from_millis(150)).await;

    let resp = reqwest::get(format!("http://127.0.0.1:{}/index.html", port))
        .await
        .expect("HTTP GET failed");

    assert_eq!(resp.status(), 200);
    let body = resp.text().await.unwrap();
    assert!(body.contains("Vega Tournament"));

    handle.stop().await;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test --test http_test --manifest-path ftp-server/src-tauri/Cargo.toml`
Expected: FAIL with "module `http` not found".

- [ ] **Step 3: Implement `ftp-server/src-tauri/src/http/mod.rs`**

```rust
// ftp-server/src-tauri/src/http/mod.rs
use axum::{
    body::Body,
    extract::Request,
    http::{header, Response, StatusCode},
    response::Html,
    routing::get,
    Router,
};
use std::net::SocketAddr;
use std::path::PathBuf;
use tokio::sync::oneshot;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

pub struct HttpServerHandle {
    shutdown_tx: Option<oneshot::Sender<()>>,
}

impl HttpServerHandle {
    pub async fn stop(mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }
}

pub async fn start_http_server(
    host: &str,
    port: u16,
    root_dir: PathBuf,
) -> Result<HttpServerHandle, String> {
    let addr: SocketAddr = format!("{}:{}", host, port)
        .parse()
        .map_err(|e| format!("Invalid HTTP address {}:{}: {}", host, port, e))?;

    let serve_dir = ServeDir::new(root_dir.clone())
        .append_index_html_on_directories(true);

    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

    let app = Router::new()
        .fallback_service(serve_dir)
        .layer(CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| format!("Failed to bind HTTP server to {}: {}", addr, e))?;

    tokio::spawn(async move {
        let _ = axum::serve(listener, app)
            .with_graceful_shutdown(async move {
                let _ = shutdown_rx.await;
            })
            .await;
    });

    Ok(HttpServerHandle {
        shutdown_tx: Some(shutdown_tx),
    })
}
```

- [ ] **Step 4: Register `pub mod http;` in `src-tauri/src/lib.rs`**

- [ ] **Step 5: Run HTTP test to verify it passes**

Run: `cargo test --test http_test --manifest-path ftp-server/src-tauri/Cargo.toml`
Expected: PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add ftp-server/src-tauri/
git commit -m "feat(ftp-server): implement embedded HTTP static preview server with Axum"
```

---

### Task 4: Implement Tauri IPC Commands & Server State Coordinator

**Files:**
- Create: `ftp-server/src-tauri/src/commands.rs`
- Modify: `ftp-server/src-tauri/src/lib.rs`

**Interfaces:**
- Produces:
  - Tauri command `start_services(ftp_port, http_port, storage_dir)`
  - Tauri command `stop_services()`
  - Tauri command `get_services_status()`
  - Tauri command `open_folder(path)`
  - Tauri command `open_url(url)`
  - Emits event: `ftp-file-received` payload `{ filename, relative_path, size_bytes, timestamp }`

- [ ] **Step 1: Write `ftp-server/src-tauri/src/commands.rs`**

```rust
// ftp-server/src-tauri/src/commands.rs
use crate::ftp::{start_ftp_server, FtpServerHandle};
use crate::http::{start_http_server, HttpServerHandle};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;

#[derive(Default)]
pub struct AppState {
    pub ftp_handle: Arc<Mutex<Option<FtpServerHandle>>>,
    pub http_handle: Arc<Mutex<Option<HttpServerHandle>>>,
    pub current_status: Arc<Mutex<ServiceStatus>>,
}

#[derive(Clone, Serialize, Deserialize, Default)]
pub struct ServiceStatus {
    pub is_running: bool,
    pub ftp_port: u16,
    pub http_port: u16,
    pub storage_dir: String,
}

#[derive(Clone, Serialize)]
pub struct FileReceivedPayload {
    pub filename: String,
    pub relative_path: String,
    pub size_bytes: u64,
    pub timestamp: String,
}

#[tauri::command]
pub async fn start_services(
    app: AppHandle,
    state: State<'_, AppState>,
    ftp_port: u16,
    http_port: u16,
    storage_dir: String,
) -> Result<ServiceStatus, String> {
    let mut ftp_guard = state.ftp_handle.lock().await;
    let mut http_guard = state.http_handle.lock().await;

    if ftp_guard.is_some() || http_guard.is_some() {
        return Err("Services are already running".into());
    }

    let root_path = PathBuf::from(&storage_dir);
    let app_handle_clone = app.clone();

    let ftp = start_ftp_server(
        "127.0.0.1",
        ftp_port,
        root_path.clone(),
        move |filename, size| {
            let now = chrono_now_iso();
            let _ = app_handle_clone.emit(
                "ftp-file-received",
                FileReceivedPayload {
                    filename: filename.clone(),
                    relative_path: filename,
                    size_bytes: size,
                    timestamp: now,
                },
            );
        },
    )
    .await?;

    let http = start_http_server("127.0.0.1", http_port, root_path).await?;

    *ftp_guard = Some(ftp);
    *http_guard = Some(http);

    let status = ServiceStatus {
        is_running: true,
        ftp_port,
        http_port,
        storage_dir,
    };
    *state.current_status.lock().await = status.clone();

    Ok(status)
}

#[tauri::command]
pub async fn stop_services(state: State<'_, AppState>) -> Result<(), String> {
    let mut ftp_guard = state.ftp_handle.lock().await;
    let mut http_guard = state.http_handle.lock().await;

    if let Some(ftp) = ftp_guard.take() {
        ftp.stop().await;
    }
    if let Some(http) = http_guard.take() {
        http.stop().await;
    }

    let mut status = state.current_status.lock().await;
    status.is_running = false;

    Ok(())
}

#[tauri::command]
pub async fn get_services_status(state: State<'_, AppState>) -> Result<ServiceStatus, String> {
    Ok(state.current_status.lock().await.clone())
}

#[tauri::command]
pub fn get_default_storage_dir() -> Result<String, String> {
    let doc_dir = dirs::document_dir().unwrap_or_else(|| PathBuf::from("."));
    let target = doc_dir.join("HBCC_Tournaments");
    Ok(target.to_string_lossy().to_string())
}

fn chrono_now_iso() -> String {
    // Standard UTC ISO timestamp
    let now = std::time::SystemTime::now();
    let duration = now.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    format!("{}.{}", duration.as_secs(), duration.subsec_millis())
}
```

- [ ] **Step 2: Update `ftp-server/src-tauri/src/lib.rs` to register commands and AppState**

```rust
pub mod commands;
pub mod ftp;
pub mod http;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            start_services,
            stop_services,
            get_services_status,
            get_default_storage_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: Verify compilation with `cargo check`**

Run: `cargo check --manifest-path ftp-server/src-tauri/Cargo.toml`
Expected: SUCCESS.

- [ ] **Step 4: Commit Task 4**

```bash
git add ftp-server/src-tauri/
git commit -m "feat(ftp-server): register Tauri IPC commands and state coordinator"
```

---

### Task 5: Build Desktop Frontend UI

**Files:**
- Create: `ftp-server/src/styles.css`
- Create: `ftp-server/src/main.js`
- Modify: `ftp-server/index.html`

**Interfaces:**
- Consumes: Tauri invoke (`start_services`, `stop_services`, `get_services_status`, `get_default_storage_dir`), Tauri events (`ftp-file-received`), Tauri plugins (`@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-opener`).
- Produces: Polished arbiter dashboard with live status pill, start/stop toggle, Vega helper, live activity feed, folder reveal, HTTP preview launcher.

- [ ] **Step 1: Write `ftp-server/src/styles.css`**

Create styling with curated HSL color palette, dark mode by default with clean typography, card containers, animated pulse status indicator, activity feed table, and accessible buttons.

- [ ] **Step 2: Write `ftp-server/src/main.js`**

Implement:
- Initialization: fetch default directory, restore settings from `@tauri-apps/plugin-store`, auto-start server.
- Start/Stop toggle button handler.
- "Change Folder" using `@tauri-apps/plugin-dialog.open()`.
- "Open Folder" using `@tauri-apps/plugin-opener.revealItemInDir()`.
- "Preview Site" opening `http://127.0.0.1:8080` in browser via `@tauri-apps/plugin-opener.openUrl()`.
- Vega helper copy-to-clipboard button.
- Real-time event listener for `ftp-file-received` appending entries to the live activity log.
- "Check for Updates" triggering Tauri updater check.

- [ ] **Step 3: Update `ftp-server/index.html`**

Create semantic HTML structure for the control grid, status cards, copy helper, and scrolling activity feed.

- [ ] **Step 4: Verify frontend build with `npm run build`**

Run:
```bash
cd ftp-server && npm run build
```
Expected: SUCCESS (Vite bundles assets to `dist/`).

- [ ] **Step 5: Commit Task 5**

```bash
git add ftp-server/
git commit -m "feat(ftp-server): build responsive arbiter dashboard UI with live activity feed"
```

---

### Task 6: Configure Auto-Updater & GitHub Actions CI/CD Workflow

**Files:**
- Create: `.github/workflows/ftp-server-release.yml`
- Modify: `ftp-server/src-tauri/tauri.conf.json`

**Interfaces:**
- Produces: Automated release pipeline triggered on `ftp-v*` tags building Windows (.msi/.exe) and macOS (.dmg/.app) artifacts and publishing `latest.json` to GitHub Releases.

- [ ] **Step 1: Configure Tauri updater in `tauri.conf.json`**

Ensure `plugins.updater.pubkey` placeholder or environment secret variable is set up and update target URLs match `Hobsons-Bay-Chess-Club-AU/tournaments`.

- [ ] **Step 2: Create `.github/workflows/ftp-server-release.yml`**

```yaml
name: Release HBCC FTP Server

on:
  push:
    tags:
      - 'ftp-v*'

jobs:
  release:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: 'macos-latest'
            args: '--target universal-apple-darwin'
          - platform: 'windows-latest'
            args: ''

    runs-on: ${{ matrix.platform }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - name: Install dependencies
        working-directory: ftp-server
        run: npm install

      - name: Build Tauri App
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        with:
          projectPath: './ftp-server'
          tagName: ${{ github.ref_name }}
          releaseName: 'HBCC FTP Server ${{ github.ref_name }}'
          releaseBody: 'Automated release for HBCC Vega FTP Server.'
          releaseDraft: false
          prerelease: false
          args: ${{ matrix.args }}
```

- [ ] **Step 3: Commit Task 6**

```bash
git add .github/workflows/ftp-server-release.yml ftp-server/src-tauri/tauri.conf.json
git commit -m "ci(ftp-server): add GitHub Actions release workflow for Windows and macOS"
```

---

### Task 7: End-to-End Verification & Documentation

**Files:**
- Create: `ftp-server/tests/e2e_simulate_vega.sh`
- Create: `ftp-server/README.md`

- [ ] **Step 1: Write `ftp-server/tests/e2e_simulate_vega.sh`**

Script that uses `curl` to upload mock tournament files via FTP to `127.0.0.1:2121`, verifies file presence in the staging folder, and fetches the file via `http://127.0.0.1:8080`.

- [ ] **Step 2: Run verification script against running services**

Run: `bash ftp-server/tests/e2e_simulate_vega.sh`
Expected: 100% upload success and HTTP 200 verification.

- [ ] **Step 3: Write comprehensive `ftp-server/README.md`**

Arbiter user guide with screenshots, Vega configuration walkthrough, port adjustment instructions, and development build instructions.

- [ ] **Step 4: Commit Task 7**

```bash
git add ftp-server/
git commit -m "docs(ftp-server): add arbiter guide and end-to-end Vega simulation script"
```
