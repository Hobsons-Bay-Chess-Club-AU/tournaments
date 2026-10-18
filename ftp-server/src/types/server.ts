export interface ServicesStatus {
  ftp_running: boolean;
  http_running: boolean;
  ftp_port: number;
  http_port: number;
  host: string;
  storage_dir: string;
}

export interface AuthInfo {
  username: string;
  auth_mode: "permissive" | "keypair";
}
