import React from "react";
import { Trophy, Users, FolderOpen, ExternalLink, Cloud, GitCommit, Clock } from "lucide-react";
import { useUploadStore } from "../../stores/useUploadStore";
import { useServerStore } from "../../stores/useServerStore";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

export const UploadsList: React.FC = () => {
  const uploads = useUploadStore((s) => s.uploads);
  const clearUploads = useUploadStore((s) => s.clearUploads);
  const httpPort = useServerStore((s) => s.httpPort);
  const isRunning = useServerStore((s) => s.isRunning);

  const handleOpenFolder = async (folder: string) => {
    try {
      await invoke("open_folder", { path: folder });
    } catch (err) {
      console.error("Failed to open tournament folder:", err);
    }
  };

  const handleOpenPreview = async (folder: string) => {
    const parts = folder.split(/[/\\]/);
    const folderName = parts[parts.length - 1];
    try {
      await openUrl(`http://localhost:${httpPort}/${folderName}/`);
    } catch (err) {
      console.error("Failed to open preview URL:", err);
    }
  };

  if (uploads.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 mx-auto flex items-center justify-center mb-3">
          <Trophy className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Tournament Uploads Yet</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
          When Vega publishes results via FTP, parsed tournament files (with player counts, Supabase cloud sync, and GitHub commits) will appear here in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Tournament Uploads</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-medium">
            {uploads.length}
          </span>
        </div>
        <button
          onClick={clearUploads}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
        >
          Clear History
        </button>
      </div>

      <div className="space-y-3">
        {uploads.map((upload) => (
          <div
            key={upload.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                    {upload.tournamentName}
                  </h3>
                  {upload.category && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                      {upload.category}
                    </span>
                  )}
                  {upload.playerCount !== undefined && upload.playerCount > 0 && (
                    <span className="inline-flex items-center space-x-1 text-xs px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40 font-medium">
                      <Users className="w-3 h-3" />
                      <span>{upload.playerCount} Players</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">
                  <span className="truncate max-w-xs sm:max-w-md">{upload.folder}</span>
                  <span>•</span>
                  <span className="flex items-center space-x-1 font-sans">
                    <Clock className="w-3 h-3" />
                    <span>{upload.timestamp}</span>
                  </span>
                </div>
              </div>

              {/* Status badges & Action buttons */}
              <div className="flex items-center space-x-2 self-end sm:self-center">
                {upload.supabaseStatus && (
                  <span
                    className={`inline-flex items-center space-x-1 text-xs px-2 py-1 rounded-lg font-medium border ${
                      upload.supabaseStatus.includes("upserted")
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}
                    title={`Supabase Sync: ${upload.supabaseStatus}`}
                  >
                    <Cloud className="w-3 h-3" />
                    <span className="capitalize">{upload.supabaseStatus.split(" ")[0]}</span>
                  </span>
                )}

                {upload.githubStatus && (
                  <span
                    className={`inline-flex items-center space-x-1 text-xs px-2 py-1 rounded-lg font-medium border ${
                      upload.githubStatus.includes("committed")
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}
                    title={`GitHub Sync: ${upload.githubStatus}`}
                  >
                    <GitCommit className="w-3 h-3" />
                    <span className="capitalize">{upload.githubStatus.split(" ")[0]}</span>
                  </span>
                )}

                <button
                  onClick={() => handleOpenFolder(upload.folder)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
                  title="Open tournament folder in system explorer"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>

                {isRunning && (
                  <button
                    onClick={() => handleOpenPreview(upload.folder)}
                    className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 transition"
                    title="Open tournament in local HTTP preview"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
