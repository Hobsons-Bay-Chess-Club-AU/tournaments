# Design Spec: HBCC FTP Server UI Uplift to React, TypeScript & Tailwind CSS

- **Date:** 2026-10-18
- **Project:** HBCC Vega Tournament FTP & Preview Server (`ftp-server/`)
- **Status:** Approved for Implementation

---

## 1. Overview & Objectives
The HBCC FTP Server desktop application (built with Tauri v2) currently runs a vanilla HTML/JS frontend (`index.html`, `main.js` ~1,080 lines, and `styles.css` ~1,000 lines). While functional, the procedural DOM manipulation is difficult to maintain and extend as new features are added (such as LAN discovery, smart PHP conversion, GitHub commit sync, and auto-updates).

This specification outlines the complete uplift of the frontend to **React 18**, **TypeScript**, **Tailwind CSS v3**, **Zustand**, and **Lucide React Icons**, while introducing **Dark and Light mode support**.

### Goals:
1. **Maintain 100% feature parity** with existing vanilla JS functionality:
   - Server lifecycle control (Start/Stop FTP on 2121 and HTTP preview on 8080).
   - LAN connection discovery (binding 0.0.0.0, displaying local IP like `192.168.x.x`).
   - One-click copy for Vega FTP credentials with Arbiter guidance.
   - Storage directory selection and system file explorer opening.
   - Real-time tournament upload activity stream with parse details, Supabase status, and GitHub commit status.
   - Live system logs stream with source tagging (`[FTP]`, `[HTTP]`, `[Parser]`, `[Cloud]`, `[GitHub]`, `[System]`), log level filtering (All, Info, Warn, Error), live search, auto-scroll, and log copying.
   - Fullscreen log modal inspector.
   - Blocking auto-updater modal with progress bar, download speed/bytes, error dismiss/retry, and app restart action.
   - Settings panel with persistence using `@tauri-apps/plugin-store`.
2. **Modular Component Architecture**: Replace monolithic DOM querying with declarative, typed React components.
3. **Robust State Management**: Use decoupled Zustand stores with TypeScript interfaces for server state, real-time logs, upload history, settings, and auto-updater.
4. **Theme Support**: Implement Tailwind dark/light theme switching with persistence in localStorage.
5. **Zero Backend Disruption**: Leave Rust Tauri IPC commands (`commands.rs`), capabilities, and sidecar binaries completely intact.

---

## 2. Technology Stack & Dependencies

### Core Frontend Stack:
- **Framework:** React 18 (`react`, `react-dom`, `@types/react`, `@types/react-dom`)
- **Language:** TypeScript 5 (`typescript`)
- **Build Tool:** Vite 5 (`vite`, `@vitejs/plugin-react`)
- **Styling:** Tailwind CSS v3 (`tailwindcss`, `postcss`, `autoprefixer`)
- **Icons:** Lucide React (`lucide-react`)
- **State Management:** Zustand 5 (`zustand`)
- **Tauri Integration:**
  - `@tauri-apps/api` (v2 core invoke & event listen)
  - `@tauri-apps/plugin-dialog` (v2 directory picker)
  - `@tauri-apps/plugin-opener` (v2 URL and system path opener)
  - `@tauri-apps/plugin-store` (v2 persistent settings store)
  - `@tauri-apps/plugin-updater` (v2 cryptographic auto-updater)

---

## 3. Directory & File Structure

```
ftp-server/
├── index.html                       # Single root mount <div id="root"></div>
├── vite.config.ts                   # React plugin, build outDir: "../dist"
├── tailwind.config.js               # darkMode: 'class', custom color palette
├── postcss.config.js                # Tailwind + Autoprefixer
├── tsconfig.json                    # Strict TypeScript configuration
├── package.json                     # React, TypeScript, Tailwind dependencies
│
└── src/
    ├── main.tsx                     # Application entry point
    ├── App.tsx                      # Root component, layout, modal coordinator
    ├── index.css                    # Tailwind base, components, utilities
    │
    ├── types/
    │   ├── server.ts                # ServerStatus, ConnectionInfo, PortConfig
    │   ├── logs.ts                  # LogEntry, LogSource, LogLevel
    │   ├── upload.ts                # TournamentUploadItem, ParseResult
    │   ├── settings.ts              # AppSettings
    │   └── updater.ts               # UpdateInfo, DownloadProgress
    │
    ├── stores/
    │   ├── useServerStore.ts        # Server status, toggle, ports, local IP
    │   ├── useLogStore.ts           # Real-time log buffer (up to 500 lines), filters
    │   ├── useUploadStore.ts        # Upload history cards, parse output
    │   ├── useSettingsStore.ts      # Persistent settings (plugin-store)
    │   └── useUpdaterStore.ts       # Updater checking, download progress, restart
    │
    ├── hooks/
    │   ├── useTauriEvents.ts        # Global Tauri IPC listeners
    │   └── useTheme.ts              # Light / Dark mode management
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Header.tsx           # Logo, unified toggle, preview button, update pill
    │   │   ├── Navigation.tsx       # Tabs (Dashboard vs Settings)
    │   │   └── Footer.tsx           # Status, directory hint, app version
    │   ├── dashboard/
    │   │   ├── StorageBanner.tsx    # Folder path display, browse & open buttons
    │   │   ├── ConnectionCards.tsx  # Localhost & LAN cards, Vega copy button
    │   │   ├── UploadsList.tsx      # Received tournament uploads with status pills
    │   │   └── InlineLogs.tsx       # Streaming logs, search input, filter pills
    │   ├── settings/
    │   │   ├── ServerSettings.tsx   # Ports, LAN toggle, directory selector
    │   │   ├── CloudSettings.tsx    # Supabase cloud status indicators
    │   │   ├── GitHubSettings.tsx   # GitHub auto-commit status indicators
    │   │   └── AppearanceSettings.tsx # Dark / Light theme toggle
    │   └── modals/
    │       ├── BlockingUpdateModal.tsx # Fullscreen update progress & restart prompt
    │       ├── LogViewerModal.tsx   # Enlarged log inspector modal
    │       └── ToastContainer.tsx   # Floating feedback toasts
```

---

## 4. State Management (Zustand Stores)

### 4.1 `useServerStore`
- **State**:
  - `isRunning: boolean`
  - `isLoading: boolean`
  - `ftpPort: number` (default 2121)
  - `httpPort: number` (default 8080)
  - `lanIp: string` (e.g. `192.168.0.94`)
  - `username: string` (default `hbcc`)
  - `storageDir: string`
- **Actions**:
  - `startServer(config?: Partial<ServerConfig>): Promise<boolean>`
  - `stopServer(): Promise<boolean>`
  - `toggleServer(): Promise<boolean>`
  - `refreshStatus(): Promise<void>`
  - `setStorageDir(dir: string): void`

### 4.2 `useLogStore`
- **State**:
  - `logs: LogEntry[]` (capped at 500 entries)
  - `levelFilter: 'all' | 'info' | 'warn' | 'error'`
  - `sourceFilter: string`
  - `searchQuery: string`
  - `autoScroll: boolean`
  - `isModalOpen: boolean`
- **Actions**:
  - `addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): void`
  - `clearLogs(): void`
  - `setLevelFilter(filter): void`
  - `setSearchQuery(query): void`
  - `toggleAutoScroll(): void`
  - `setModalOpen(open: boolean): void`
  - `copyLogsToClipboard(): Promise<void>`

### 4.3 `useUploadStore`
- **State**:
  - `uploads: TournamentUploadItem[]` (ordered by newest first)
- **Actions**:
  - `addUpload(upload: TournamentUploadItem): void`
  - `clearUploads(): void`

### 4.4 `useSettingsStore`
- **State**:
  - `settings: AppSettings`
  - `isLoaded: boolean`
- **Actions**:
  - `loadSettings(): Promise<void>`
  - `updateSettings(partial: Partial<AppSettings>): Promise<void>`

### 4.5 `useUpdaterStore`
- **State**:
  - `isChecking: boolean`
  - `isDownloading: boolean`
  - `updateAvailable: boolean`
  - `currentVersion: string`
  - `targetVersion: string`
  - `releaseBody: string`
  - `downloadProgress: { downloaded: number; total: number; percent: number }`
  - `isReadyToRestart: boolean`
  - `errorMessage: string | null`
  - `isModalOpen: boolean`
- **Actions**:
  - `checkForUpdates(silent?: boolean): Promise<boolean>`
  - `startDownloadAndInstall(): Promise<void>`
  - `restartApp(): Promise<void>`
  - `dismissModal(): void`

---

## 5. UI & Styling Specifications

### 5.1 Design Tokens & Colors
- **Dark Mode (Default)**:
  - Background: Deep slate/neutral (`#0b0f19` / `bg-slate-950`)
  - Surfaces/Cards: `bg-slate-900/80 backdrop-blur border border-slate-800`
  - Primary Accent: Indigo/Violet (`#6366f1` / `bg-indigo-600 hover:bg-indigo-500`)
  - Success/Connected Accent: Emerald (`#10b981` / `text-emerald-400 bg-emerald-950/40 border-emerald-800/60`)
  - Warning: Amber (`#f59e0b`)
  - Danger/Error: Rose (`#f43f5e`)
  - Text: Primary `text-slate-100`, Muted `text-slate-400`, Dim `text-slate-500`
- **Light Mode**:
  - Background: Cool gray (`#f8fafc` / `bg-slate-50`)
  - Surfaces/Cards: `bg-white border border-slate-200 shadow-sm`
  - Text: Primary `text-slate-900`, Muted `text-slate-600`, Dim `text-slate-400`
  - Primary Accent: Indigo (`bg-indigo-600 text-white`)

### 5.2 Micro-Interactions & Aesthetics
- Smooth transition on server toggle switch with color shift (Gray -> Emerald).
- Copy button visual feedback (Checkmark icon with "Copied!" toast).
- Pulse animation on active server indicator dot.
- Live progress bar for auto-updater with percentage and byte counts.
- High-contrast badge tags for log sources: `[FTP]`, `[HTTP]`, `[PARSER]`, `[CLOUD]`, `[GITHUB]`.

---

## 6. Integration Points & Backend Compatibility

1. **Tauri IPC Commands**:
   - `start_services(host, ftp_port, http_port, storage_dir)`
   - `stop_services()`
   - `get_services_status()`
   - `get_default_storage_dir()`
   - `open_folder(path)`
   - `get_auth_info()`
   - `restart_app()`
   *Note: All signatures in `src-tauri/src/commands.rs` remain completely unchanged.*
2. **Tauri Events**:
   - `ftp-upload`: Dispatched when an arbiter transfers tournament files.
   - `server-log`: Dispatched for server activity logs.
3. **Tauri Plugins**:
   - `plugin-store`: Persistent settings storage in `settings.json`.
   - `plugin-dialog`: System folder selection.
   - `plugin-opener`: Open local browser preview and file explorer.
   - `plugin-updater`: Cryptographic update verification and installation.
4. **Build Target**:
   - `tauri.conf.json` specifies `"frontendDist": "../dist"`. Vite outputs production React bundle to `dist/`, maintaining complete CI/CD packaging compatibility.

---

## 7. Verification & Testing Strategy

1. **Local Development (HMR)**:
   - Run `npm run dev` in `ftp-server/` with Vite dev server at `http://localhost:1420`.
   - Verify zero console errors, instant HMR, and smooth component mounting.
2. **Production Bundle Verification**:
   - Run `npm run build` in `ftp-server/` to verify TypeScript compile (`tsc --noEmit`) and Vite asset bundling.
3. **Tauri Integration & Rust Unit Tests**:
   - Run `cargo test --lib --manifest-path src-tauri/Cargo.toml` to verify all 9 tests pass.
4. **Functionality Testing Checklist**:
   - [ ] Server toggle starts FTP and HTTP services.
   - [ ] Vega copy button copies credentials.
   - [ ] Directory selector updates storage path and opens system explorer.
   - [ ] Uploading via FTP reflects in Recent Uploads list.
   - [ ] Log stream filters by level (All, Info, Warn, Error) and live search filters items.
   - [ ] Dark/Light mode toggles seamlessly across all views and modals.
   - [ ] "Check for Updates" connects to GitHub Releases, validates signature, and displays progress.
