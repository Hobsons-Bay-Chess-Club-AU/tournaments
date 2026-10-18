import React from "react";
import { Sparkles, ArrowRight, Download, RefreshCw, CheckCircle2, AlertCircle, X } from "lucide-react";
import { useUpdaterStore } from "../../stores/useUpdaterStore";

export const BlockingUpdateModal: React.FC = () => {
  const isModalOpen = useUpdaterStore((s) => s.isModalOpen);
  const isDownloading = useUpdaterStore((s) => s.isDownloading);
  const isReadyToRestart = useUpdaterStore((s) => s.isReadyToRestart);
  const updateInfo = useUpdaterStore((s) => s.updateInfo);
  const progress = useUpdaterStore((s) => s.progress);
  const errorMessage = useUpdaterStore((s) => s.errorMessage);
  const startDownloadAndInstall = useUpdaterStore((s) => s.startDownloadAndInstall);
  const restartApp = useUpdaterStore((s) => s.restartApp);
  const dismissModal = useUpdaterStore((s) => s.dismissModal);

  if (!isModalOpen || !updateInfo) return null;

  const formatMB = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 border-b border-indigo-900/30 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Application Update Available</h3>
              <p className="text-[11px] text-slate-400">Cryptographically signed release</p>
            </div>
          </div>
          {!isDownloading && !isReadyToRestart && (
            <button
              onClick={dismissModal}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Version Diff Banner */}
          <div className="flex items-center justify-center space-x-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium block">
                Current
              </span>
              <span className="text-xs font-mono font-bold text-slate-300">
                v{updateInfo.currentVersion || "0.1.11"}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-indigo-400" />
            <div className="text-center">
              <span className="text-[10px] uppercase tracking-wider text-emerald-500 font-medium block">
                Target Update
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                v{updateInfo.version}
              </span>
            </div>
          </div>

          {/* Release Notes */}
          <div>
            <span className="text-xs font-medium text-slate-300 block mb-1.5">Release Notes:</span>
            <div className="bg-[#090d16] border border-slate-800 rounded-xl p-3.5 max-h-36 overflow-y-auto text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap select-text">
              {updateInfo.body || "No release notes provided for this version."}
            </div>
          </div>

          {/* Download Progress Bar */}
          {isDownloading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium flex items-center space-x-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Downloading &amp; Verifying Signature...</span>
                </span>
                <span className="font-mono text-indigo-400 font-bold">{progress.percent}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              {progress.total > 0 && (
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>{formatMB(progress.downloaded)} MB</span>
                  <span>{formatMB(progress.total)} MB</span>
                </div>
              )}
            </div>
          )}

          {/* Ready to Restart Banner */}
          {isReadyToRestart && (
            <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="font-semibold">Update Verified &amp; Installed!</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Restart the application now to run the new version.
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="break-all">{errorMessage}</div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-end space-x-3">
          {isReadyToRestart ? (
            <button
              onClick={restartApp}
              className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restart Application Now</span>
            </button>
          ) : isDownloading ? (
            <button
              disabled
              className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-slate-800 text-slate-500 font-medium text-xs opacity-75 cursor-not-allowed"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Downloading Update...</span>
            </button>
          ) : (
            <>
              <button
                onClick={dismissModal}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
              >
                Remind Me Later
              </button>
              <button
                onClick={startDownloadAndInstall}
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download &amp; Install Update</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
