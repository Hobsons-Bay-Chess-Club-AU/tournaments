import React from "react";
import { Palette, Moon, Sun, Check, Sparkles, RefreshCw } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { useUpdaterStore } from "../../stores/useUpdaterStore";

export const AppearanceSettings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const checkForUpdates = useUpdaterStore((s) => s.checkForUpdates);
  const isCheckingUpdate = useUpdaterStore((s) => s.isChecking);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
          <Palette className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Appearance &amp; System</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Customize interface visual theme and manage software release updates.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
            Theme Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Dark Mode Option */}
            <button
              onClick={() => {
                if (theme !== "dark") toggleTheme();
              }}
              className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition ${
                theme === "dark"
                  ? "bg-slate-950 border-indigo-500 text-white shadow-sm ring-2 ring-indigo-500/20"
                  : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-800/50">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold">Dark Mode</p>
                  <p className="text-[11px] text-slate-400">Deep slate &amp; indigo palette</p>
                </div>
              </div>
              {theme === "dark" && <Check className="w-4 h-4 text-indigo-400" />}
            </button>

            {/* Light Mode Option */}
            <button
              onClick={() => {
                if (theme !== "light") toggleTheme();
              }}
              className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition ${
                theme === "light"
                  ? "bg-white border-indigo-500 text-slate-900 shadow-sm ring-2 ring-indigo-500/20"
                  : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700 border border-amber-200">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold">Light Mode</p>
                  <p className="text-[11px] text-slate-500">Crisp high-contrast theme</p>
                </div>
              </div>
              {theme === "light" && <Check className="w-4 h-4 text-indigo-600" />}
            </button>
          </div>
        </div>

        {/* Software Updates Box */}
        <div className="pt-2">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  Application Updates
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Version 0.1.11 • Cryptographically verified releases via minisign
                </p>
              </div>
            </div>
            <button
              onClick={() => checkForUpdates(false)}
              disabled={isCheckingUpdate}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? "animate-spin" : ""}`} />
              <span>{isCheckingUpdate ? "Checking..." : "Check for Updates"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
