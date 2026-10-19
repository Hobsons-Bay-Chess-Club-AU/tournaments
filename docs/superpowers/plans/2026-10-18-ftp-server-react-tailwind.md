# HBCC FTP Server UI React + TypeScript + Tailwind Uplift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uplift the HBCC FTP Server desktop application UI from vanilla HTML/JS to React 18, TypeScript, Tailwind CSS v3, Zustand, and Lucide React icons with Dark/Light mode support while maintaining 100% feature parity and backend compatibility.

**Architecture:** Componentized single-page architecture powered by Vite. Decoupled Zustand stores manage server lifecycle, real-time log buffers, upload events, and updater progress. Global Tauri IPC listeners feed data into stores, and modular React components present the UI with Tailwind CSS design tokens.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Tailwind CSS v3, PostCSS, Zustand 5, Lucide React, Tauri v2 API (`@tauri-apps/api`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-opener`, `@tauri-apps/plugin-store`, `@tauri-apps/plugin-updater`).

**Spec:** [docs/superpowers/specs/2026-10-18-ftp-server-react-tailwind-design.md](file:///Users/truongnguyen/source/hbcc/tournaments/docs/superpowers/specs/2026-10-18-ftp-server-react-tailwind-design.md)

## Global Constraints

- Must retain 100% compatibility with Tauri v2 backend commands in `ftp-server/src-tauri/src/commands.rs` (no backend Rust modifications required).
- Vite output directory must remain `../dist` to match `ftp-server/src-tauri/tauri.conf.json` (`"frontendDist": "../dist"`).
- Must preserve all existing functionality: server start/stop on ports 2121/8080, LAN IP detection, 1-click Vega config copy, tournament upload parsing status, Supabase cloud status, GitHub commit status, real-time log stream with filters/search, fullscreen log modal, blocking auto-updater with verified cryptographic signatures, and Dark/Light mode.
- TypeScript must compile cleanly (`tsc --noEmit`) with zero errors.
- Existing 9 Rust tests (`cargo test --lib --manifest-path src-tauri/Cargo.toml`) must pass.

---

### Task 1: Scaffolding Dependencies & Configuration

**Files:**
- Modify: `ftp-server/package.json`
- Create: `ftp-server/tsconfig.json`
- Create: `ftp-server/tsconfig.node.json`
- Create: `ftp-server/tailwind.config.js`
- Create: `ftp-server/postcss.config.js`
- Modify: `ftp-server/vite.config.ts` (renamed from `vite.config.js` if needed)
- Create: `ftp-server/src/index.css`

**Interfaces:**
- Produces: Tailwind build pipeline, React Vite plugin, TypeScript compile target for `ftp-server/src/`.

- [ ] **Step 1: Update `ftp-server/package.json` with React, TypeScript, Tailwind, Lucide, and Zustand dependencies**

```json
{
  "name": "hbcc-ftp-server",
  "private": true,
  "version": "0.1.8",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:sidecar": "node scripts/build-sidecar.mjs",
    "bump": "node scripts/bump-version.mjs",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.118.0",
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-dialog": "^2.0.0",
    "@tauri-apps/plugin-opener": "^2.0.0",
    "@tauri-apps/plugin-store": "^2.0.0",
    "@tauri-apps/plugin-updater": "^2.0.0",
    "cheerio": "^1.2.0",
    "clsx": "^2.1.1",
    "dotenv": "^18.0.8",
    "lucide-react": "^0.475.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.6.0",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.2",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.3",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `ftp-server/tsconfig.json` and `ftp-server/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 3: Create `ftp-server/tailwind.config.js` and `ftp-server/postcss.config.js`**

`tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        }
      }
    },
  },
  plugins: [],
}
```

`postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 4: Create `ftp-server/vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  }
});
```

- [ ] **Step 5: Create `ftp-server/src/index.css` with Tailwind directives and custom scrollbar styles**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply antialiased select-none text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-[#0b0f19];
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
}

/* Custom minimal scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  @apply bg-slate-300 dark:bg-slate-700 rounded-full;
}
::-webkit-scrollbar-thumb:hover {
  @apply bg-slate-400 dark:bg-slate-600;
}
```

- [ ] **Step 6: Run `npm install` in `ftp-server/` and test Tailwind compilation**

Run: `cd ftp-server && npm install && npx tailwindcss -i src/index.css -o /tmp/tailwind-test.css`
Expected: Exits with code 0.

- [ ] **Step 7: Commit configuration setup**

```bash
git add ftp-server/package.json ftp-server/package-lock.json ftp-server/tsconfig.json ftp-server/tsconfig.node.json ftp-server/tailwind.config.js ftp-server/postcss.config.js ftp-server/vite.config.ts ftp-server/src/index.css
git commit -m "feat(ftp-server): scaffold React, TypeScript, and Tailwind CSS v3 configuration"
```

---

### Task 2: Core TypeScript Interfaces

**Files:**
- Create: `ftp-server/src/types/server.ts`
- Create: `ftp-server/src/types/logs.ts`
- Create: `ftp-server/src/types/upload.ts`
- Create: `ftp-server/src/types/settings.ts`
- Create: `ftp-server/src/types/updater.ts`

**Interfaces:**
- Produces: Strictly typed domain contracts for all stores and components.

- [ ] **Step 1: Create `ftp-server/src/types/server.ts`**

```typescript
export interface ServicesStatus {
  ftp_running: boolean;
  http_running: boolean;
  ftp_port: number;
  http_port: number;
  host: string;
  storage_dir: string;
}

export interface AuthInfo {
  username: string;
  auth_mode: "permissive" | "keypair";
}
```

- [ ] **Step 2: Create `ftp-server/src/types/logs.ts`**

```typescript
export type LogLevel = "all" | "info" | "warn" | "error";
export type LogSource = "FTP" | "HTTP" | "PARSER" | "CLOUD" | "GITHUB" | "SYSTEM";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  source: LogSource;
  message: string;
}
```

- [ ] **Step 3: Create `ftp-server/src/types/upload.ts`**

```typescript
export interface TournamentUploadItem {
  id: string;
  tournamentName: string;
  folder: string;
  timestamp: string;
  playerCount?: number;
  category?: string;
  supabaseStatus?: string;
  githubStatus?: string;
  filesGenerated?: string[];
  success: boolean;
  message?: string;
}
```

- [ ] **Step 4: Create `ftp-server/src/types/settings.ts`**

```typescript
export interface AppSettings {
  storageDir: string;
  ftpPort: number;
  httpPort: number;
  allowLan: boolean;
  autoStart: boolean;
  enableGithubSync: boolean;
  theme: "dark" | "light";
}
```

- [ ] **Step 5: Create `ftp-server/src/types/updater.ts`**

```typescript
export interface DownloadProgress {
  downloaded: number;
  total: number;
  percent: number;
}

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  version: string;
  body?: string;
  date?: string;
}
```

- [ ] **Step 6: Run TypeScript typecheck to verify interface definitions**

Run: `cd ftp-server && npx tsc --noEmit`
Expected: Exits with code 0.

- [ ] **Step 7: Commit types**

```bash
git add ftp-server/src/types/
git commit -m "feat(ftp-server): add core TypeScript interfaces for server, logs, uploads, and updater"
```

---

### Task 3: Zustand State Stores & Custom Hooks

**Files:**
- Create: `ftp-server/src/stores/useServerStore.ts`
- Create: `ftp-server/src/stores/useLogStore.ts`
- Create: `ftp-server/src/stores/useUploadStore.ts`
- Create: `ftp-server/src/stores/useSettingsStore.ts`
- Create: `ftp-server/src/stores/useUpdaterStore.ts`
- Create: `ftp-server/src/hooks/useTheme.ts`
- Create: `ftp-server/src/hooks/useTauriEvents.ts`

**Interfaces:**
- Consumes: Types from `src/types/*`, Tauri APIs (`@tauri-apps/api/core`, `@tauri-apps/plugin-store`, `@tauri-apps/plugin-updater`).
- Produces: Reactive state stores hookable by UI components.

- [ ] **Step 1: Implement `ftp-server/src/stores/useServerStore.ts`**

Handles starting/stopping services, polling status, and discovering LAN IP via WebRTC:
```typescript
import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { ServicesStatus, AuthInfo } from "../types/server";

interface ServerState {
  isRunning: boolean;
  isLoading: boolean;
  ftpPort: number;
  httpPort: number;
  host: string;
  lanIp: string;
  storageDir: string;
  username: string;
  authMode: "permissive" | "keypair";
  startServices: (storageDir?: string, allowLan?: boolean, ftpPort?: number, httpPort?: number) => Promise<boolean>;
  stopServices: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
  setStorageDir: (dir: string) => void;
  discoverLanIp: () => Promise<void>;
}

export const useServerStore = create<ServerState>((set, get) => ({
  isRunning: false,
  isLoading: false,
  ftpPort: 2121,
  httpPort: 8080,
  host: "127.0.0.1",
  lanIp: "",
  storageDir: "",
  username: "hbcc",
  authMode: "permissive",

  refreshStatus: async () => {
    try {
      const status = await invoke<ServicesStatus>("get_services_status");
      const auth = await invoke<AuthInfo>("get_auth_info").catch(() => ({ username: "hbcc", auth_mode: "permissive" as const }));
      set({
        isRunning: status.ftp_running && status.http_running,
        ftpPort: status.ftp_port || 2121,
        httpPort: status.http_port || 8080,
        host: status.host || "127.0.0.1",
        storageDir: status.storage_dir || get().storageDir,
        username: auth.username || "hbcc",
        authMode: auth.auth_mode || "permissive",
      });
    } catch (err) {
      console.error("Failed to get services status:", err);
    }
  },

  startServices: async (storageDir, allowLan, ftpPort, httpPort) => {
    set({ isLoading: true });
    try {
      const targetDir = storageDir || get().storageDir;
      const targetHost = allowLan ? "0.0.0.0" : "127.0.0.1";
      const targetFtp = ftpPort || get().ftpPort;
      const targetHttp = httpPort || get().httpPort;

      const success = await invoke<boolean>("start_services", {
        host: targetHost,
        ftpPort: targetFtp,
        httpPort: targetHttp,
        storageDir: targetDir,
      });

      if (success) {
        await get().refreshStatus();
        if (allowLan) await get().discoverLanIp();
      }
      return success;
    } catch (err) {
      console.error("Failed to start services:", err);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  stopServices: async () => {
    set({ isLoading: true });
    try {
      const success = await invoke<boolean>("stop_services");
      if (success) {
        set({ isRunning: false });
      }
      return success;
    } catch (err) {
      console.error("Failed to stop services:", err);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  setStorageDir: (dir) => set({ storageDir: dir }),

  discoverLanIp: async () => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel("");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      pc.onicecandidate = (event) => {
        if (!event || !event.candidate) return;
        const candidate = event.candidate.candidate;
        const ipMatch = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
        if (ipMatch && !ipMatch[1].startsWith("127.")) {
          set({ lanIp: ipMatch[1] });
          pc.close();
        }
      };
    } catch {
      // Fallback
    }
  },
}));
```

- [ ] **Step 2: Implement `ftp-server/src/stores/useLogStore.ts`**

Buffer streaming logs (up to 500 lines) with search, filtering, and clipboard export:
```typescript
import { create } from "zustand";
import { LogEntry, LogLevel, LogSource } from "../types/logs";

interface LogState {
  logs: LogEntry[];
  levelFilter: LogLevel;
  searchQuery: string;
  autoScroll: boolean;
  isModalOpen: boolean;
  addLog: (level: "info" | "warn" | "error", source: LogSource, message: string) => void;
  clearLogs: () => void;
  setLevelFilter: (level: LogLevel) => void;
  setSearchQuery: (query: string) => void;
  setAutoScroll: (autoScroll: boolean) => void;
  setModalOpen: (open: boolean) => void;
  copyLogs: () => Promise<void>;
}

export const useLogStore = create<LogState>((set, get) => ({
  logs: [],
  levelFilter: "all",
  searchQuery: "",
  autoScroll: true,
  isModalOpen: false,

  addLog: (level, source, message) => {
    const newEntry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      source,
      message,
    };
    set((state) => ({
      logs: [...state.logs.slice(-499), newEntry],
    }));
  },

  clearLogs: () => set({ logs: [] }),
  setLevelFilter: (levelFilter) => set({ levelFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setAutoScroll: (autoScroll) => set({ autoScroll }),
  setModalOpen: (isModalOpen) => set({ isModalOpen }),

  copyLogs: async () => {
    const lines = get().logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`);
    await navigator.clipboard.writeText(lines.join("\n"));
  },
}));
```

- [ ] **Step 3: Implement `ftp-server/src/stores/useUploadStore.ts`**

```typescript
import { create } from "zustand";
import { TournamentUploadItem } from "../types/upload";

interface UploadState {
  uploads: TournamentUploadItem[];
  addUpload: (upload: TournamentUploadItem) => void;
  clearUploads: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  uploads: [],
  addUpload: (upload) =>
    set((state) => ({
      uploads: [upload, ...state.uploads.filter((u) => u.folder !== upload.folder)].slice(0, 50),
    })),
  clearUploads: () => set({ uploads: [] }),
}));
```

- [ ] **Step 4: Implement `ftp-server/src/stores/useSettingsStore.ts`**

Wraps `@tauri-apps/plugin-store` for reliable persistence of configuration across app launches:
```typescript
import { create } from "zustand";
import { LazyStore } from "@tauri-apps/plugin-store";
import { AppSettings } from "../types/settings";

const store = new LazyStore("settings.json");

interface SettingsState {
  settings: AppSettings;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {
    storageDir: "",
    ftpPort: 2121,
    httpPort: 8080,
    allowLan: true,
    autoStart: true,
    enableGithubSync: true,
    theme: "dark",
  },
  isLoaded: false,

  loadSettings: async () => {
    try {
      const stored = await store.get<Partial<AppSettings>>("config");
      if (stored) {
        set((state) => ({
          settings: { ...state.settings, ...stored },
          isLoaded: true,
        }));
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  updateSetting: async (key, value) => {
    const updated = { ...get().settings, [key]: value };
    set({ settings: updated });
    try {
      await store.set("config", updated);
      await store.save();
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  },
}));
```

- [ ] **Step 5: Implement `ftp-server/src/stores/useUpdaterStore.ts`**

Handles Tauri v2 updater checking, download progress events, and app restart:
```typescript
import { create } from "zustand";
import { check as checkUpdate } from "@tauri-apps/plugin-updater";
import { invoke } from "@tauri-apps/api/core";
import { DownloadProgress, UpdateInfo } from "../types/updater";

interface UpdaterState {
  isChecking: boolean;
  isDownloading: boolean;
  isReadyToRestart: boolean;
  isModalOpen: boolean;
  updateInfo: UpdateInfo | null;
  progress: DownloadProgress;
  errorMessage: string | null;
  activeUpdateInstance: any;

  checkForUpdates: (silent?: boolean) => Promise<boolean>;
  startDownloadAndInstall: () => Promise<void>;
  restartApp: () => Promise<void>;
  dismissModal: () => void;
}

export const useUpdaterStore = create<UpdaterState>((set, get) => ({
  isChecking: false,
  isDownloading: false,
  isReadyToRestart: false,
  isModalOpen: false,
  updateInfo: null,
  progress: { downloaded: 0, total: 0, percent: 0 },
  errorMessage: null,
  activeUpdateInstance: null,

  checkForUpdates: async (silent = false) => {
    set({ isChecking: true, errorMessage: null });
    try {
      const update = await checkUpdate();
      if (update?.available) {
        set({
          updateInfo: {
            available: true,
            currentVersion: update.currentVersion,
            version: update.version,
            body: update.body || "",
            date: update.date,
          },
          activeUpdateInstance: update,
          isModalOpen: true,
        });
        return true;
      }
      return false;
    } catch (err: any) {
      if (!silent) {
        set({ errorMessage: err?.message || String(err) });
      }
      return false;
    } finally {
      set({ isChecking: false });
    }
  },

  startDownloadAndInstall: async () => {
    const update = get().activeUpdateInstance;
    if (!update) return;

    set({ isDownloading: true, errorMessage: null });
    let totalBytes = 0;
    let downloadedBytes = 0;

    try {
      await update.downloadAndInstall((event: any) => {
        switch (event.event) {
          case "Started":
            totalBytes = event.data?.contentLength || 0;
            set({ progress: { downloaded: 0, total: totalBytes, percent: 0 } });
            break;
          case "Progress":
            downloadedBytes += event.data.chunkLength;
            const pct = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 50;
            set({ progress: { downloaded: downloadedBytes, total: totalBytes, percent: pct } });
            break;
          case "Finished":
            set({ progress: { downloaded: totalBytes, total: totalBytes, percent: 100 } });
            break;
        }
      });
      set({ isReadyToRestart: true, isDownloading: false });
    } catch (err: any) {
      set({
        errorMessage: err?.message || "Failed to download and verify update package.",
        isDownloading: false,
      });
    }
  },

  restartApp: async () => {
    try {
      await invoke("restart_app");
    } catch (err: any) {
      set({ errorMessage: `Restart failed: ${err?.message || err}` });
    }
  },

  dismissModal: () => set({ isModalOpen: false, errorMessage: null }),
}));
```

- [ ] **Step 6: Implement `ftp-server/src/hooks/useTheme.ts` & `ftp-server/src/hooks/useTauriEvents.ts`**

`useTheme.ts`:
```typescript
import { useEffect } from "react";
import { useSettingsStore } from "../stores/useSettingsStore";

export function useTheme() {
  const theme = useSettingsStore((s) => s.settings.theme);
  const updateSetting = useSettingsStore((s) => s.updateSetting);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    updateSetting("theme", theme === "dark" ? "light" : "dark");
  };

  return { theme, toggleTheme };
}
```

`useTauriEvents.ts`:
```typescript
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useLogStore } from "../stores/useLogStore";
import { useUploadStore } from "../stores/useUploadStore";

export function useTauriEvents() {
  const addLog = useLogStore((s) => s.addLog);
  const addUpload = useUploadStore((s) => s.addUpload);

  useEffect(() => {
    let unlistenLog: (() => void) | undefined;
    let unlistenUpload: (() => void) | undefined;

    listen<any>("server-log", (event) => {
      const payload = event.payload;
      if (typeof payload === "string") {
        addLog("info", "SYSTEM", payload);
      } else if (payload && payload.message) {
        addLog(payload.level || "info", payload.source || "SYSTEM", payload.message);
      }
    }).then((unsub) => {
      unlistenLog = unsub;
    });

    listen<any>("ftp-upload", (event) => {
      const data = event.payload;
      if (data) {
        addUpload({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          tournamentName: data.tournamentName || "Tournament Upload",
          folder: data.folder || "",
          timestamp: new Date().toLocaleTimeString(),
          playerCount: data.playerCount,
          category: data.category,
          supabaseStatus: data.supabase,
          githubStatus: data.github,
          filesGenerated: data.filesGenerated,
          success: data.success !== false,
          message: data.message,
        });
        addLog("info", "FTP", `Received upload for tournament: ${data.tournamentName || data.folder}`);
      }
    }).then((unsub) => {
      unlistenUpload = unsub;
    });

    return () => {
      if (unlistenLog) unlistenLog();
      if (unlistenUpload) unlistenUpload();
    };
  }, [addLog, addUpload]);
}
```

- [ ] **Step 7: Run TypeScript verification**

Run: `cd ftp-server && npx tsc --noEmit`
Expected: Exits with code 0.

- [ ] **Step 8: Commit stores and hooks**

```bash
git add ftp-server/src/stores/ ftp-server/src/hooks/
git commit -m "feat(ftp-server): implement Zustand stores and Tauri event listeners"
```

---

### Task 4: Layout Components (Header, Navigation, Footer)

**Files:**
- Create: `ftp-server/src/components/layout/Header.tsx`
- Create: `ftp-server/src/components/layout/Navigation.tsx`
- Create: `ftp-server/src/components/layout/Footer.tsx`

**Interfaces:**
- Consumes: `useServerStore`, `useUpdaterStore`, `useTheme`, `lucide-react`.

- [ ] **Step 1: Implement `ftp-server/src/components/layout/Header.tsx`**

Features:
- App brand title with chess knight / server logo.
- Unified Server Toggle Control: Click switch to toggle running state, pulsing green dot when active, port pill.
- "Preview Site" button (opens browser `http://localhost:<httpPort>/` via `@tauri-apps/plugin-opener`).
- "Check Updates" pill badge (`⚡ v0.1.8 Connected`).
- Settings gear toggle button.

- [ ] **Step 2: Implement `ftp-server/src/components/layout/Navigation.tsx`**

Tab switcher between Dashboard view and Settings view with smooth active indicators.

- [ ] **Step 3: Implement `ftp-server/src/components/layout/Footer.tsx`**

Displays tournament storage path indicator, HBCC footer text, and app version badge.

- [ ] **Step 4: Run TypeScript verification**

Run: `cd ftp-server && npx tsc --noEmit`
Expected: Exits with code 0.

- [ ] **Step 5: Commit layout components**

```bash
git add ftp-server/src/components/layout/
git commit -m "feat(ftp-server): add Header, Navigation, and Footer components"
```

---

### Task 5: Dashboard Components

**Files:**
- Create: `ftp-server/src/components/dashboard/StorageBanner.tsx`
- Create: `ftp-server/src/components/dashboard/ConnectionCards.tsx`
- Create: `ftp-server/src/components/dashboard/UploadsList.tsx`
- Create: `ftp-server/src/components/dashboard/InlineLogs.tsx`

**Interfaces:**
- Consumes: `useServerStore`, `useLogStore`, `useUploadStore`, `@tauri-apps/plugin-opener`, `@tauri-apps/plugin-dialog`.

- [ ] **Step 1: Implement `ftp-server/src/components/dashboard/StorageBanner.tsx`**

Shows active tournament directory path with "Open Folder" button calling Tauri `open_folder` command.

- [ ] **Step 2: Implement `ftp-server/src/components/dashboard/ConnectionCards.tsx`**

Cards displaying:
- Localhost (127.0.0.1 : 2121)
- LAN IP (192.168.x.x : 2121)
- Username (`hbcc`) & Directory notice (`/ (use /)`)
- One-click "Copy Vega FTP Settings" button with animated checkmark feedback.

- [ ] **Step 3: Implement `ftp-server/src/components/dashboard/UploadsList.tsx`**

Renders received tournament uploads, showing tournament name, timestamp, player count, Supabase cloud sync status tag (`upserted` / `skipped`), and GitHub status tag (`committed` / `skipped`), with action buttons to Open Folder or View in Preview Browser.

- [ ] **Step 4: Implement `ftp-server/src/components/dashboard/InlineLogs.tsx`**

Renders live-updating log stream:
- Pills for level filter: All, Info, Warn, Error with counter badges.
- Search input with clear button.
- Auto-scroll checkbox.
- "Expand" button to trigger `LogViewerModal`.
- "Copy All" and "Clear" buttons.

- [ ] **Step 5: Run TypeScript verification**

Run: `cd ftp-server && npx tsc --noEmit`
Expected: Exits with code 0.

- [ ] **Step 6: Commit dashboard components**

```bash
git add ftp-server/src/components/dashboard/
git commit -m "feat(ftp-server): add StorageBanner, ConnectionCards, UploadsList, and InlineLogs"
```

---

### Task 6: Settings Components

**Files:**
- Create: `ftp-server/src/components/settings/ServerSettings.tsx`
- Create: `ftp-server/src/components/settings/CloudSettings.tsx`
- Create: `ftp-server/src/components/settings/GitHubSettings.tsx`
- Create: `ftp-server/src/components/settings/AppearanceSettings.tsx`

**Interfaces:**
- Consumes: `useSettingsStore`, `useServerStore`, `useTheme`, `useUpdaterStore`.

- [ ] **Step 1: Implement `ftp-server/src/components/settings/ServerSettings.tsx`**

Inputs for FTP Port, HTTP Preview Port, Allow LAN connections toggle, and Directory Browse button using `@tauri-apps/plugin-dialog`.

- [ ] **Step 2: Implement `ftp-server/src/components/settings/CloudSettings.tsx`**

Displays Supabase Cloud sync status, project URL, and destination table info.

- [ ] **Step 3: Implement `ftp-server/src/components/settings/GitHubSettings.tsx`**

Toggle for `ALLOW_PUSH_CHANGE_TO_GH` with target repository and branch displays.

- [ ] **Step 4: Implement `ftp-server/src/components/settings/AppearanceSettings.tsx`**

Dark and Light mode buttons with icon previews and instant active theme update.

- [ ] **Step 5: Run TypeScript verification**

Run: `cd ftp-server && npx tsc --noEmit`
Expected: Exits with code 0.

- [ ] **Step 6: Commit settings components**

```bash
git add ftp-server/src/components/settings/
git commit -m "feat(ftp-server): add ServerSettings, CloudSettings, GitHubSettings, and AppearanceSettings"
```

---

### Task 7: Modals & Feedback Overlays

**Files:**
- Create: `ftp-server/src/components/modals/BlockingUpdateModal.tsx`
- Create: `ftp-server/src/components/modals/LogViewerModal.tsx`
- Create: `ftp-server/src/components/modals/ToastContainer.tsx`

**Interfaces:**
- Consumes: `useUpdaterStore`, `useLogStore`.

- [ ] **Step 1: Implement `ftp-server/src/components/modals/BlockingUpdateModal.tsx`**

Modal overlay displaying:
- Version comparison pills: `Current: v0.1.8 ➔ Target: v0.1.9`.
- Release notes snippet.
- Animated progress bar with percentage and downloaded / total bytes.
- Error state with Retry and Dismiss buttons.
- "Restart Application Now" button when download and signature verification complete.

- [ ] **Step 2: Implement `ftp-server/src/components/modals/LogViewerModal.tsx`**

Full-window enlarged log inspector with log source badges, level filters, live search, and export to clipboard.

- [ ] **Step 3: Implement `ftp-server/src/components/modals/ToastContainer.tsx`**

Floating toast notifications for user actions (e.g. "Vega settings copied to clipboard!").

- [ ] **Step 4: Run TypeScript verification**

Run: `cd ftp-server && npx tsc --noEmit`
Expected: Exits with code 0.

- [ ] **Step 5: Commit modals and overlays**

```bash
git add ftp-server/src/components/modals/
git commit -m "feat(ftp-server): add BlockingUpdateModal, LogViewerModal, and ToastContainer"
```

---

### Task 8: Main Application Assembly & Mount

**Files:**
- Modify: `ftp-server/index.html`
- Create: `ftp-server/src/App.tsx`
- Create: `ftp-server/src/main.tsx`

**Interfaces:**
- Consumes: All components from `src/components/*`, hooks from `src/hooks/*`, stores from `src/stores/*`.
- Produces: Production application bundle.

- [ ] **Step 1: Update `ftp-server/index.html`**

Replace monolithic vanilla markup with clean modern root mount:
```html
<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HBCC Tournament FTP Server</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `ftp-server/src/App.tsx`**

Coordinates:
- View switching (Dashboard vs Settings).
- Initial load: calls `loadSettings()`, `get_default_storage_dir()`, `refreshStatus()`, and auto-checks updates silently.
- Registers global Tauri events via `useTauriEvents()`.
- Renders `Header`, active tab view, `Footer`, `BlockingUpdateModal`, `LogViewerModal`, and `ToastContainer`.

- [ ] **Step 3: Create `ftp-server/src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 4: Test production build with `npm run build`**

Run: `cd ftp-server && npm run build`
Expected: Generates output files in `ftp-server/dist/` without errors.

- [ ] **Step 5: Commit application assembly**

```bash
git add ftp-server/index.html ftp-server/src/App.tsx ftp-server/src/main.tsx
git commit -m "feat(ftp-server): assemble React application with App.tsx and main.tsx"
```

---

### Task 9: Final Integration & Verification

**Files:**
- Test: `ftp-server/src-tauri/src/tests.rs`
- Verify: Full production build & release artifacts

- [ ] **Step 1: Run Rust unit tests**

Run: `cd ftp-server && cargo test --lib --manifest-path src-tauri/Cargo.toml`
Expected: 9 passed; 0 failed.

- [ ] **Step 2: Run Bun sidecar build verification**

Run: `cd ftp-server && bun build parser/run-parser.mjs --compile --target=bun-darwin-arm64 --outfile src-tauri/binaries/vega-parser-aarch64-apple-darwin`
Expected: Compiles clean sidecar bundle.

- [ ] **Step 3: Test production build output**

Run: `cd ftp-server && npm run build`
Expected: `dist/index.html` and bundled JS/CSS generated cleanly.

- [ ] **Step 4: Clean up obsolete files**

Remove deprecated `ftp-server/src/main.js` and `ftp-server/src/styles.css` once React components are verified.
```bash
git rm ftp-server/src/main.js ftp-server/src/styles.css
git commit -m "chore(ftp-server): remove legacy vanilla JS and CSS in favor of React components"
```
