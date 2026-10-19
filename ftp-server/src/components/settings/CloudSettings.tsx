import React from "react";
import { Cloud, Database, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export const CloudSettings: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
          <Cloud className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Supabase Cloud Database Sync</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time synchronization of tournament standings, pairings, and player results to cloud database.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">HBCC Production Database</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                  Connected
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Automatically upserts parsed tournament records upon receiving Vega FTP round updates.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 mb-1">
              <Database className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Sync Target</span>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Supabase Postgres</p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">schema: public</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Trigger Mode</span>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">On FTP Upload</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Debounced parser (30s cache)</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Security</span>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Embedded Service Key</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Authenticated sidecar</p>
          </div>
        </div>
      </div>
    </div>
  );
};
