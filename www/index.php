<?php

// Configuration
$directoryToWatch = __DIR__ . ''; // Change to the directory you want to watch
$webhookUrl = 'https://example.com/webhook'; // Replace with your webhook URL
$stateFile = __DIR__ . '/file_watcher_state.json'; // File to store the last state

// Function to get the current state of the directory
function getDirectoryState($directory) {
    $files = [];
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory));
    foreach ($iterator as $file) {
        if ($file->isFile()) {
            $files[$file->getPathname()] = $file->getMTime(); // File path and last modified time
        }
    }
    return $files;
}

// Load previous state
$previousState = file_exists($stateFile) ? json_decode(file_get_contents($stateFile), true) : [];

// Get current state
$currentState = getDirectoryState($directoryToWatch);

// Compare states
$changes = [];
foreach ($currentState as $file => $mtime) {
    if (!isset($previousState[$file])) {
        $changes[] = ['action' => 'created', 'file' => $file];
    } elseif ($previousState[$file] !== $mtime) {
        $changes[] = ['action' => 'modified', 'file' => $file];
    }
}

foreach ($previousState as $file => $mtime) {
    if (!isset($currentState[$file])) {
        $changes[] = ['action' => 'deleted', 'file' => $file];
    }
}

// Trigger webhook for changes


// Save current state
file_put_contents($stateFile, json_encode($currentState));

echo "File watcher executed. Detected " . count($changes) . " changes.\n";
?>
