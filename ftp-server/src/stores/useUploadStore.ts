import { create } from "zustand";
import { TournamentUploadItem } from "../types/upload";

interface UploadState {
  uploads: TournamentUploadItem[];
  addUpload: (upload: TournamentUploadItem) => void;
  clearUploads: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  uploads: [],
  addUpload: (upload) =>
    set((state) => ({
      uploads: [upload, ...state.uploads.filter((u) => u.folder !== upload.folder)].slice(0, 50),
    })),
  clearUploads: () => set({ uploads: [] }),
}));
