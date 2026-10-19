export interface ServiceStatus {
  is_running: boolean;
  ftp_port: number;
  http_port: number;
  storage_dir: string;
  local_ip: string | null;
}

// Keep ServicesStatus as alias for backward compatibility
export type ServicesStatus = ServiceStatus;

export interface AuthInfo {
  username?: string;
  usernames?: string[];
  user_count?: number;
  auth_mode?: "permissive" | "keypair";
  default_username?: string;
  default_password?: string;
}
