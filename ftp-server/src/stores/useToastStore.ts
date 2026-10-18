import { create } from "zustand";

export interface ToastItem {
  id: string;
  message: string;
  type?: "info" | "success" | "warn" | "error";
  durationMs?: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (message: string, type?: "info" | "success" | "warn" | "error", durationMs?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = "info", durationMs = 3000) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, durationMs }],
    }));

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, durationMs);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export const toast = {
  info: (msg: string) => useToastStore.getState().addToast(msg, "info"),
  success: (msg: string) => useToastStore.getState().addToast(msg, "success"),
  warn: (msg: string) => useToastStore.getState().addToast(msg, "warn"),
  error: (msg: string) => useToastStore.getState().addToast(msg, "error"),
};
