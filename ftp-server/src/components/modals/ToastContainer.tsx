import React from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { useToastStore, ToastItem } from "../../stores/useToastStore";

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  const renderIcon = (type?: ToastItem["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "warn":
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <Info className="w-4 h-4 text-sky-400" />;
    }
  };

  const getBorderColor = (type?: ToastItem["type"]) => {
    switch (type) {
      case "success":
        return "border-emerald-500/30 bg-slate-900/95";
      case "warn":
        return "border-amber-500/30 bg-slate-900/95";
      case "error":
        return "border-rose-500/30 bg-slate-900/95";
      default:
        return "border-slate-800 bg-slate-900/95";
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl border shadow-xl backdrop-blur-md text-slate-100 transition-all transform animate-in fade-in slide-in-from-bottom-2 duration-200 ${getBorderColor(
            t.type
          )}`}
        >
          <div className="flex items-center space-x-2.5 mr-2">
            {renderIcon(t.type)}
            <span className="text-xs font-medium leading-snug">{t.message}</span>
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
