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
