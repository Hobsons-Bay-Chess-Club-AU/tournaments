import { create } from "zustand";
import { LogEntry, LogLevel, LogSource } from "../types/logs";

interface LogState {
  logs: LogEntry[];
  levelFilter: LogLevel;
  searchQuery: string;
  autoScroll: boolean;
  isModalOpen: boolean;
  addLog: (level: "info" | "warn" | "error", source: LogSource, message: string) => void;
  clearLogs: () => void;
  setLevelFilter: (level: LogLevel) => void;
  setSearchQuery: (query: string) => void;
  setAutoScroll: (autoScroll: boolean) => void;
  setModalOpen: (open: boolean) => void;
  copyLogs: () => Promise<void>;
}

export const useLogStore = create<LogState>((set, get) => ({
  logs: [],
  levelFilter: "all",
  searchQuery: "",
  autoScroll: true,
  isModalOpen: false,

  addLog: (level, source, message) => {
    const newEntry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      source,
      message,
    };
    set((state) => ({
      logs: [...state.logs.slice(-499), newEntry],
    }));
  },

  clearLogs: () => set({ logs: [] }),
  setLevelFilter: (levelFilter) => set({ levelFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setAutoScroll: (autoScroll) => set({ autoScroll }),
  setModalOpen: (isModalOpen) => set({ isModalOpen }),

  copyLogs: async () => {
    const lines = get().logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`);
    await navigator.clipboard.writeText(lines.join("\n"));
  },
}));
