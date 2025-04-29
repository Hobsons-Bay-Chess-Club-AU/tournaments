<?php
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
        $changesWithinAgo = true; // Always true since we are using the last updated file
    }

    return [
        'checksum' => $finalChecksum,
        'lastUpdatedTime' => $lastUpdatedTimeFormatted,
        'lastUpdatedFile' => $lastUpdatedFile,
        'changesWithinAgo' => $changesWithinAgo
    ];
}

// Example usage
$directory = __DIR__; // Use the current folder
$ago = isset($_GET['ago']) ? (int)$_GET['ago'] : null; // Get the "ago" parameter from the query string
$result = calculateDirectoryChecksum($directory, $ago);

header('Content-Type: application/json');
echo json_encode($result, JSON_PRETTY_PRINT);