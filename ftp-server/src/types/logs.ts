export type LogLevel = "all" | "info" | "warn" | "error";
export type LogSource = "FTP" | "HTTP" | "PARSER" | "CLOUD" | "GITHUB" | "SYSTEM";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  source: LogSource;
  message: string;
}
