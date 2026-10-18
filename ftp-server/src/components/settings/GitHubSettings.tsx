import React from "react";
import { GitBranch, GitCommit, GitPullRequest, ShieldAlert } from "lucide-react";
import { useSettingsStore } from "../../stores/useSettingsStore";

export const GitHubSettings: React.FC = () => {
  const enableGithubSync = useSettingsStore((s) => s.settings.enableGithubSync);
  const updateSetting = useSettingsStore((s) => s.updateSetting);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
          <GitBranch className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">GitHub Automated Sync &amp; Publishing</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automatically commit generated tournament standings and push updates to the club repository.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Toggle Switch */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <GitCommit className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Enable Git Commit &amp; Push on Upload
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                When enabled, incoming Vega rounds will be committed and pushed to the upstream branch.
              </p>
            </div>
          </div>
          <button
            onClick={() => updateSetting("enableGithubSync", !enableGithubSync)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              enableGithubSync ? "bg-purple-600" : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enableGithubSync ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Repository Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 mb-1">
              <GitPullRequest className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Target Repository</span>
            </div>
            <p className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate">
              Hobsons-Bay-Chess-Club-AU/tournaments
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 mb-1">
              <GitBranch className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Auto-Commit Target</span>
            </div>
            <p className="text-xs font-mono text-slate-800 dark:text-slate-200">
              origin / current active branch
            </p>
          </div>
        </div>

        {!enableGithubSync && (
          <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              GitHub sync is currently disabled. Tournament files will still be parsed and saved locally and into Supabase, but Git commits will be skipped.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
