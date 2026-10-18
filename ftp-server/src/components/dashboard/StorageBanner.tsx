import React from "react";
import { Folder, FolderOpen, RefreshCw, Sparkles } from "lucide-react";
import { useServerStore } from "../../stores/useServerStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useUpdaterStore } from "../../stores/useUpdaterStore";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

export const StorageBanner: React.FC = () => {
  const storageDir = useServerStore((s) => s.storageDir);
  const setStorageDir = useServerStore((s) => s.setStorageDir);
  const isRunning = useServerStore((s) => s.isRunning);
  const startServices = useServerStore((s) => s.startServices);

  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const currentAppVersion = useUpdaterStore((s) => s.currentAppVersion);
  const checkForUpdates = useUpdaterStore((s) => s.checkForUpdates);
  const isCheckingUpdate = useUpdaterStore((s) => s.isChecking);

  const handleOpenFolder = async () => {
    if (!storageDir) return;
    try {
      await invoke("open_folder", { path: storageDir });
    } catch (err) {
      console.error("Failed to open storage directory:", err);
    }
  };

  const handleChangeFolder = async () => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        defaultPath: storageDir || undefined,
        title: "Select Vega Tournament Storage Folder",
      });

      if (selected && typeof selected === "string") {
        setStorageDir(selected);
        await updateSetting("storageDir", selected);
        if (isRunning) {
          // Restart services with new directory
          await startServices(selected);
        }
      }
    } catch (err) {
      console.error("Failed to select folder dialog:", err);
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-900/40 rounded-2xl p-4 sm:p-5 shadow-sm text-slate-100 relative overflow-hidden">
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start space-x-3 max-w-2xl">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex-shrink-0 mt-0.5">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                Tournament Storage Folder
              </span>
              <button
                onClick={() => checkForUpdates(false, true)}
                disabled={isCheckingUpdate}
                className="inline-flex items-center space-x-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition cursor-pointer"
                title="Click to check for updates"
              >
                {isCheckingUpdate ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                )}
                <span>v{currentAppVersion} Connected</span>
              </button>
            </div>
            <p className="text-sm font-mono mt-1 text-slate-200 bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800 break-all select-all">
              {storageDir || "No folder selected. Click 'Change' to configure."}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end md:self-center w-full md:w-auto justify-end">
          <button
            onClick={handleChangeFolder}
            className="px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            Change Folder
          </button>
          <button
            onClick={handleOpenFolder}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Open in Explorer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
