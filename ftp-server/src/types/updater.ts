export interface DownloadProgress {
  downloaded: number;
  total: number;
  percent: number;
}

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  version: string;
  body?: string;
  date?: string;
}
