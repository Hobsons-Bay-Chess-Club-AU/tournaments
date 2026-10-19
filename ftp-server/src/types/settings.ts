export interface AppSettings {
  storageDir: string;
  ftpPort: number;
  httpPort: number;
  allowLan: boolean;
  autoStart: boolean;
  enableGithubSync: boolean;
  theme: "dark" | "light";
}
