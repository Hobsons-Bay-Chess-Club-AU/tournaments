<?php


function notifyChangeViaGet() {
    $url = 'https://game-processor.fly.dev/ftp-sync';

    // Simple GET request
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 5
        ]
    ]);

    @file_get_contents($url, false, $context);
}

function calculateDirectoryChecksum($directory, $ago = null) {
    $checksum = hash_init('sha256'); // Initialize a SHA-256 hash
    $lastUpdatedTime = 0; // Track the most recent modification time
    $lastUpdatedFile = ''; // Track the file with the most recent modification time

    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory));

    foreach ($iterator as $file) {
        if ($file->isFile()) {
            // Update the checksum with the file's contents
            hash_update_file($checksum, $file->getPathname());

            // Check if this file is the most recently updated
            $fileMTime = $file->getMTime();
            if ($fileMTime > $lastUpdatedTime) {
                $lastUpdatedTime = $fileMTime;
                $lastUpdatedFile = $file->getPathname();
            }
        }
    }

    // Finalize the checksum
    $finalChecksum = hash_final($checksum);

    // Format the last updated time
    $lastUpdatedTimeFormatted = date('Y-m-d H:i:s', $lastUpdatedTime);

    // Check if there were changes within the specified "ago" parameter
    $changesWithinAgo = false;
    if ($ago !== null) {
        $thresholdTime = time() - ($ago * 60); // Convert minutes to seconds
        $changesWithinAgo = $lastUpdatedTime >= $thresholdTime;
    } else {
        // If "ago" is not provided, default to checking the last updated file
        $changesWithinAgo = true;
    }

    // Make HTTP call if changes were recent
    if ($changesWithinAgo) {
        notifyChangeViaGet();
    }

    return [
        'checksum' => $finalChecksum,
        'lastUpdatedTime' => $lastUpdatedTimeFormatted,
        'lastUpdatedFile' => $lastUpdatedFile,
        'changesWithinAgo' => $changesWithinAgo,
        'test' => 'test'
    ];
}

function notifyChange() {
    $url = 'https://game-processor.fly.dev/ftp-sync';
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_GET, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    // Optionally, send JSON payload if needed
    // curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    // curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['event' => 'change_detected']));

    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        error_log('Curl error: ' . curl_error($ch));
    }
    curl_close($ch);
}

// Example usage
$directory = __DIR__; // Use the current folder
$ago = isset($_GET['ago']) ? (int)$_GET['ago'] : null; // Get the "ago" parameter from the query string
$result = calculateDirectoryChecksum($directory, $ago);

header('Content-Type: application/json');
echo json_encode($result, JSON_PRETT