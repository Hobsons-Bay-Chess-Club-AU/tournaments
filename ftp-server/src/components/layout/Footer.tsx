import React from "react";
import { Folder, Shield } from "lucide-react";
import { useServerStore } from "../../stores/useServerStore";

export const Footer: React.FC = () => {
  const isRunning = useServerStore((s) => s.isRunning);
  const storageDir = useServerStore((s) => s.storageDir);

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 text-xs text-slate-500 dark:text-slate-400 py-3 mt-auto">
      <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-slate-400"
              }`}
            ></span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {isRunning ? "Services Active" : "Services Ready"}
            </span>
          </div>

          <span>•</span>

          <div className="flex items-center space-x-1 max-w-xs sm:max-w-md truncate" title={storageDir}>
            <Folder className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
            <span className="truncate">{storageDir || "Storage Directory Initializing..."}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 text-slate-400 dark:text-slate-500">
            <Shield className="w-3.5 h-3.5" />
            <span>Sandboxed Local Server</span>
          </div>
          <span>•</span>
          <span className="font-semibold text-slate-600 dark:text-slate-400">HBCC Vega v0.1.11</span>
        </div>
      </div>
    </footer>
  );
};
