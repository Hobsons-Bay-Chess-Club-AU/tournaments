import React from "react";
import { LayoutDashboard, Sliders } from "lucide-react";

interface NavigationProps {
  currentView: "dashboard" | "settings";
  onViewChange: (view: "dashboard" | "settings") => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange }) => {
  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
      <div className="w-full px-4 sm:px-6 lg:px-8 flex space-x-6">
        <button
          onClick={() => onViewChange("dashboard")}
          className={`flex items-center space-x-2 py-3 border-b-2 text-xs sm:text-sm font-medium transition-colors ${
            currentView === "dashboard"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard &amp; Logs</span>
        </button>

        <button
          onClick={() => onViewChange("settings")}
          className={`flex items-center space-x-2 py-3 border-b-2 text-xs sm:text-sm font-medium transition-colors ${
            currentView === "settings"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Configuration &amp; Integrations</span>
        </button>
      </div>
    </div>
  );
};
