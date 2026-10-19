use hbcc_core::leaderboards::generate_leaderboards_for_year;
use hbcc_core::{process_folder, ProcessOptions};
use tempfile::tempdir;

#[test]
fn test_leaderboard_generation_from_tournaments() {
    let tmp = tempdir().unwrap();
    let root = tmp.path();

    // Copy two fixtures into www mock folders
    let t1_src = std::path::Path::new("tests/fixtures/2025BestintheWest/input");
    let t1_dest = root.join("www2025BestintheWest");
    fs_extra_copy(t1_src, &t1_dest);

    let t2_src = std::path::Path::new("tests/fixtures/2025HobsonsBayClubChampionship/input");
    let t2_dest = root.join("www2025HobsonsBayClubChampionship");
    fs_extra_copy(t2_src, &t2_dest);

    // Process both tournaments
    let r1 = process_folder(&t1_dest, &ProcessOptions { write_files: true, ..Default::default() }).unwrap();
    let r2 = process_folder(&t2_dest, &ProcessOptions { write_files: true, ..Default::default() }).unwrap();
    assert!(r1.success);
    assert!(r2.success);

    // Generate leaderboards for 2025 tournaments
    let result = generate_leaderboards_for_year(root, Some("2025")).unwrap();
    assert!(result.total_tournaments >= 2);
    assert!(result.tournaments.len() >= 2);
    assert!(result.unified_players.count > 0);

    // Verify files were written to disk
    assert!(root.join("tournament.json").exists());
    assert!(root.join("players.json").exists());
    assert!(root.join("senior-players.json").exists());
    assert!(root.join("junior-players.json").exists());
}

fn fs_extra_copy(src: &std::path::Path, dest: &std::path::Path) {
    std::fs::create_dir_all(dest).unwrap();
    for entry in std::fs::read_dir(src).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();
        if path.is_file() {
            let file_name = path.file_name().unwrap();
            std::fs::copy(&path, dest.join(file_name)).unwrap();
        }
    }
}
