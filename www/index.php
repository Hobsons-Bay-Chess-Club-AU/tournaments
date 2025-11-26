<?php
function getTitleFromIndex($path) {
    if (!file_exists($path)) return null;

    $content = file_get_contents($path, false, null, 0, 4096);
    if (preg_match('/<title>(.*?)<\/title>/si', $content, $matches)) {
        return trim($matches[1]);
    }
    return 'Untitled Tournament';
}

$dirs = array_filter(glob('www*'), 'is_dir');

$tournaments = [];

foreach ($dirs as $dir) {
    $indexFile = $dir . '/index.php';
    $title = getTitleFromIndex($indexFile);

    $mtime = file_exists($indexFile) ? filemtime($indexFile) : null;

    $updated = $mtime ? date("d M Y, H:i", $mtime) : "Unknown";

    // Determine if it is NEW (updated in last 7 days)
    $isNew = $mtime && (time() - $mtime < 7 * 24 * 60 * 60);

    $tournaments[] = [
        'folder' => $dir,
        'title' => $title,
        'updated' => $updated,
        'isNew' => $isNew
    ];
}

usort($tournaments, function($a, $b) {
    return strcmp($a['title'], $b['title']);
});
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Hobsons Bay Chess Club – Tournament Directory</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">

    <style>
        .card-title { min-height: 55px; }
        .logo-img {
            width: 90px;
            height: 90px;
            border-radius: 10px;
        }
        @media (max-width: 576px) {
            .logo-img { width: 70px; height: 70px; }
            h1 { font-size: 1.5rem; }
        }
    </style>
</head>
<body class="bg-light">

<div class="container py-4">

    <!-- Header -->
    <div class="text-center mb-4">
        <img src="https://geelongchess.wordpress.com/wp-content/uploads/2023/07/cropped-gcc_logo_150x150.jpg"
             alt="Geelong Chess Club Logo"
             class="logo-img mb-3">

        <h1 class="fw-bold">Geelong Chess Club – Tournament Directory</h1>
        <p class="text-muted mb-4">Browse all available tournament pages</p>
    </div>

    <!-- Search bar -->
    <div class="mb-4">
        <input id="searchInput" type="text" class="form-control form-control-lg"
               placeholder="Search tournament...">
    </div>

    <?php if (empty($tournaments)): ?>
        <div class="alert alert-warning">No tournaments found!</div>
    <?php else: ?>
        <div id="tournamentGrid" class="row g-4">
            <?php foreach ($tournaments as $t): ?>
                <div class="col-12 col-sm-6 col-md-4 tournament-item">
                    <a href="<?php echo $t['folder']; ?>/index.php" class="text-decoration-none">
                        <div class="card shadow-sm h-100">

                            <div class="card-body">

                                <h5 class="card-title text-dark">
                                    <?php echo htmlspecialchars($t['title']); ?>

                                    <?php if ($t['isNew']): ?>
                                        <span class="badge bg-danger ms-2">NEW</span>
                                    <?php endif; ?>
                                </h5>

                                <p class="text-muted mb-1" style="font-size: 0.9rem;">
                                    Folder: <?php echo htmlspecialchars($t['folder']); ?>
                                </p>

                                <p class="card-text mb-0">
                                    <small class="text-muted">Updated: <?php echo $t['updated']; ?></small>
                                </p>

                            </div>

                        </div>
                    </a>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>

</div>

<script>
// Live search filter
document.getElementById('searchInput').addEventListener('input', function () {
    let q = this.value.toLowerCase();
    let items = document.querySelectorAll('.tournament-item');

    items.forEach(item => {
        let text = item.innerText.toLowerCase();
        item.style.display = text.includes(q) ? "" : "none";
    });
});
</script>

</body>
</html>
