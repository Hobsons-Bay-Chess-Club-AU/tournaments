import { create } from "zustand";
import { check as checkUpdate } from "@tauri-apps/plugin-updater";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { DownloadProgress, UpdateInfo } from "../types/updater";
import { toast } from "./useToastStore";

interface UpdaterState {
  currentAppVersion: string;
  isChecking: boolean;
  isDownloading: boolean;
  isReadyToRestart: boolean;
  isModalOpen: boolean;
  updateInfo: UpdateInfo | null;
  progress: DownloadProgress;
  errorMessage: string | null;
  activeUpdateInstance: any;

  initVersion: () => Promise<string>;
  checkForUpdates: (silent?: boolean, autoInstall?: boolean) => Promise<boolean>;
  startDownloadAndInstall: () => Promise<void>;
  restartApp: () => Promise<void>;
  dismissModal: () => void;
}

export const useUpdaterStore = create<UpdaterState>((set, get) => ({
  currentAppVersion: "0.1.12",
  isChecking: false,
  isDownloading: false,
  isReadyToRestart: false,
  isModalOpen: false,
  updateInfo: null,
  progress: { downloaded: 0, total: 0, percent: 0 },
  errorMessage: null,
  activeUpdateInstance: null,

  initVersion: async () => {
    try {
      const ver = await getVersion();
      if (ver) {
        set({ currentAppVersion: ver });
        return ver;
      }
    } catch (e) {
      console.debug("[Updater] Could not retrieve version via API, falling back to default:", e);
    }
    return get().currentAppVersion;
  },

  checkForUpdates: async (silent = false, autoInstall = true) => {
    set({ isChecking: true, errorMessage: null });
    try {
      console.log("[Updater] Checking for updates...");
      const update = await checkUpdate();
      console.log("[Updater] Check result:", update);

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

        // If autoInstall is true (e.g. startup auto-update check), immediately start download
        if (autoInstall) {
          console.log(`[Updater] Auto-downloading update v${update.version}...`);
          await get().startDownloadAndInstall();
        }
        return true;
      } else if (!silent) {
        toast.info("You are running the latest version!");
      }
      return false;
    } catch (err: any) {
      console.warn("[Updater] Update check failed:", err);
      if (!silent) {
        const msg = err?.message || String(err);
        set({ errorMessage: msg });
        toast.error(`Update check failed: ${msg}`);
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
      toast.success(`Update v${update.version} installed! Please restart the app.`, 5000);
    } catch (err: any) {
      console.error("[Updater] Download & install failed:", err);
      set({
        errorMessage: err?.message || "Failed to download and verify update package.",
        isDownloading: false,
      });
      toast.error(`Update installation failed: ${err?.message || err}`);
    }
  },

  restartApp: async () => {
    try {
      await invoke("restart_app");
    } catch (err: any) {
      const msg = `Restart failed: ${err?.message || err}`;
      set({ errorMessage: msg });
      toast.error(msg);
    }
  },

  dismissModal: () => set({ isModalOpen: false, errorMessage: null }),
}));
