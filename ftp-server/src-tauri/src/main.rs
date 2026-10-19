#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    hbcc_ftp_server_lib::run();
}
