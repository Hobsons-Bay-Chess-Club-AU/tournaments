<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

function notifyChangeViaGet($change_id) {
    $url = 'https://game-processor.fly.dev/ftp-sync?change_id=' . urlencode($change_id);
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 5
        ]
    ]);
    return @file_get_contents($url, false, $context);
}

function calculateDirectoryChecksum($directory, $ago = null) {
    $checksum = hash_init('sha256');
    $lastUpdatedTime = 0;
    $lastUpdatedFile = '';

    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory));
    foreach ($iterator as $file) {
        if ($file->isFile()) {
            hash_update_file($checksum, $file->getPathname());
            $fileMTime = $file->getMTime();
            if ($fileMTime > $lastUpdatedTime) {
                $lastUpdatedTime = $fileMTime;
                $lastUpdatedFile = $file->getPathname();
            }
        }
    }

    $finalChecksum = hash_final($checksum);
    $lastUpdatedTimeFormatted = date('Y-m-d H:i:s', $lastUpdatedTime);

    $changesWithinAgo = false;
    if ($ago !== null) {
        $thresholdTime = time() - ($ago * 60);
        $changesWithinAgo = $lastUpdatedTime >= $thresholdTime;
    } else {
        $changesWithinAgo = true;
    }

    $response = ''; // <-- Fixed line

    if ($changesWithinAgo) {
        $response = notifyChangeViaGet($finalChecksum);
    }

    return [
        'checksum' => $finalChecksum,
        'lastUpdatedTime' => $lastUpdatedTimeFormatted,
        'lastUpdatedFile' => $lastUpdatedFile,
        'changesWithinAgo' => $changesWithinAgo,
        'response' => $response
    ];
}

$directory = __DIR__;
$ago = isset($_GET['ago']) ? (int)$_GET['ago'] : null;
$result = calculateDirectoryChecksum($directory, $ago);

header('Content-Type: application/json');
echo json_encode($result, JSON_PRETTY_PRINT);
