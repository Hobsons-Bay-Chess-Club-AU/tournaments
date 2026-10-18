import React, { useState } from "react";
import { Server, Folder, FolderOpen, Wifi, Globe, RefreshCw, Check } from "lucide-react";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useServerStore } from "../../stores/useServerStore";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

export const ServerSettings: React.FC = () => {
  const settings = useSettingsStore((s) => s.settings);
  const updateSetting = useSettingsStore((s) => s.updateSetting);

  const isRunning = useServerStore((s) => s.isRunning);
  const isLoading = useServerStore((s) => s.isLoading);
  const startServices = useServerStore((s) => s.startServices);
  const setStorageDir = useServerStore((s) => s.setStorageDir);

  const [applied, setApplied] = useState(false);

  const handleBrowseFolder = async () => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        defaultPath: settings.storageDir || undefined,
        title: "Select Vega Tournament Storage Folder",
      });

      if (selected && typeof selected === "string") {
        await updateSetting("storageDir", selected);
        setStorageDir(selected);
      }
    } catch (err) {
      console.error("Failed to browse folder:", err);
    }
  };

  const handleApplyRestart = async () => {
    try {
      await startServices(settings.storageDir, settings.allowLan, settings.ftpPort, settings.httpPort);
      setApplied(true);
      setTimeout(() => setApplied(false), 2500);
    } catch (err) {
      console.error("Failed to restart services with new settings:", err);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
          <Server className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Server &amp; Network Configuration</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure local FTP listener, HTTP preview server, and Vega storage paths.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Tournament Storage Folder */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Tournament Storage Directory
          </label>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Folder className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={settings.storageDir}
                onChange={(e) => {
                  updateSetting("storageDir", e.target.value);
                  setStorageDir(e.target.value);
                }}
                placeholder="/path/to/tournament/folder"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            <button
              onClick={handleBrowseFolder}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Browse</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Incoming FTP files are written directly to subfolders inside this path.
          </p>
        </div>

        {/* Port Configuration Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              FTP Listener Port
            </label>
            <input
              type="number"
              value={settings.ftpPort}
              onChange={(e) => updateSetting("ftpPort", parseInt(e.target.value) || 2121)}
              min={1024}
              max={65535}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition"
            />
            <p className="text-[11px] text-slate-400 mt-1">Default 2121. Vega connects to this port.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              HTTP Web Preview Port
            </label>
            <input
              type="number"
              value={settings.httpPort}
              onChange={(e) => updateSetting("httpPort", parseInt(e.target.value) || 8080)}
              min={1024}
              max={65535}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition"
            />
            <p className="text-[11px] text-slate-400 mt-1">Default 8080. Local browser preview.</p>
          </div>
        </div>

        {/* Toggle Controls */}
        <div className="space-y-3 pt-2">
          {/* Allow LAN */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-900 dark:text-white">
                  Allow Local Area Network (LAN) Connections
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Bind to 0.0.0.0 so arbiters on other laptops can publish results to your IP.
                </p>
              </div>
            </div>
            <button
              onClick={() => updateSetting("allowLan", !settings.allowLan)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                settings.allowLan ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.allowLan ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Auto Start Services */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-900 dark:text-white">
                  Auto-Start Services on Launch
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Automatically start FTP and HTTP servers when this application opens.
                </p>
              </div>
            </div>
            <button
              onClick={() => updateSetting("autoStart", !settings.autoStart)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                settings.autoStart ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoStart ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleApplyRestart}
            disabled={isLoading}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-sm shadow-indigo-600/30 transition cursor-pointer"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : applied ? (
              <Check className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>{applied ? "Saved & Restarted!" : isRunning ? "Apply & Restart Services" : "Save & Start Services"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
