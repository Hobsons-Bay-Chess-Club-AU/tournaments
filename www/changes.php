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

function cleanupOldFiles($directory, $retentionDays) {
    $deletedCount = 0;
    $thresholdTime = time() - ($retentionDays * 24 * 60 * 60);
    
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($iterator as $file) {
        if ($file->getFilename() === '.' || $file->getFilename() === '..') {
            continue;
        }
        if ($file->isFile()) {
            $filePath = $file->getPathname();
            // Only delete files in www* folders, not root level files
            if (preg_match('/\/www[^\/]*\//', $filePath) && $file->getMTime() < $thresholdTime) {
                if (@unlink($filePath)) {
                    $deletedCount++;
                }
            }
        }
    }
    
    return $deletedCount;
}

function calculateDirectoryChecksum($directory, $ago = null) {
    $checksum = hash_init('sha256');
    $lastUpdatedTime = 0;
    $lastUpdatedFile = '';

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($iterator as $file) {
        if ($file->getFilename() === '.' || $file->getFilename() === '..') {
            continue;
        }
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
$retentionDays = isset($_GET['retentionDay']) ? (int)$_GET['retentionDay'] : 7;

$result = calculateDirectoryChecksum($directory, $ago);

// Run cleanup with retentionDays (default 7 days)
$deletedFiles = cleanupOldFiles($directory, $retentionDays);
$result['cleanupPerformed'] = true;
$result['deletedFilesCount'] = $deletedFiles;
$result['retentionDays'] = $retentionDays;

header('Content-Type: application/json');
echo json_encode($result, JSON_PRETTY_PRINT);
