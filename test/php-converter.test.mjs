import assert from "assert";
import fs from "fs";
import path from "path";
import os from "os";
import {
    getPhpToHtmlThresholdSeconds,
    isHtmlOutOfDate,
    resolvePhpIncludes,
    rewritePhpLinks,
    convertPhpFile,
    convertTournamentPhpFiles
} from "../src/php-converter.mjs";

console.log("Running PHP to HTML Converter Tests...");

// 1. Threshold config default and override
assert.strictEqual(getPhpToHtmlThresholdSeconds(), 30, "Default threshold should be 30s");
process.env.PHP_TO_HTML_THRESHOLD_SECONDS = "45";
assert.strictEqual(getPhpToHtmlThresholdSeconds(), 45, "Should respect custom env threshold");
delete process.env.PHP_TO_HTML_THRESHOLD_SECONDS;
assert.strictEqual(getPhpToHtmlThresholdSeconds(), 30, "Should revert to 30s default");

// 2. isHtmlOutOfDate logic
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "php-test-"));
const samplePhp = path.join(tmpDir, "standings.php");
const sampleHtml = path.join(tmpDir, "standings.html");

// Case A: HTML missing -> out of date
fs.writeFileSync(samplePhp, "<?php echo 'hello'; ?>", "utf8");
assert.strictEqual(isHtmlOutOfDate(samplePhp, sampleHtml, 30), true, "Missing HTML must be out of date");

// Case B: HTML fresh (created right now, same or newer than PHP)
fs.writeFileSync(sampleHtml, "<html>standings</html>", "utf8");
const now = Date.now() / 1000;
fs.utimesSync(samplePhp, now, now);
fs.utimesSync(sampleHtml, now, now);
assert.strictEqual(isHtmlOutOfDate(samplePhp, sampleHtml, 30), false, "Same timestamp should be up to date");

// Case C: PHP is newer by 10s (< 30s threshold) -> considered up to date (same upload session)
fs.utimesSync(sampleHtml, now, now);
fs.utimesSync(samplePhp, now + 10, now + 10);
assert.strictEqual(isHtmlOutOfDate(samplePhp, sampleHtml, 30), false, "PHP 10s newer than HTML should be within 30s threshold");

// Case D: PHP is newer by 35s (> 30s threshold) -> OUT OF DATE
fs.utimesSync(sampleHtml, now, now);
fs.utimesSync(samplePhp, now + 35, now + 35);
assert.strictEqual(isHtmlOutOfDate(samplePhp, sampleHtml, 30), true, "PHP 35s newer than HTML must be out of date for 30s threshold");

// 3. rewritePhpLinks
const rawHtml = '<a href="index.php">Home</a> <a href="pairs1.php#top">Pairs</a> <img src="logo.png">';
const rewritten = rewritePhpLinks(rawHtml);
assert.strictEqual(rewritten, '<a href="index.html">Home</a> <a href="pairs1.html#top">Pairs</a> <img src="logo.png">');

// 4. convertPhpFile
const phpWithInclude = path.join(tmpDir, "test_include.php");
const headerFile = path.join(tmpDir, "header.php");
fs.writeFileSync(headerFile, "<h1>HBCC Chess</h1>", "utf8");
fs.writeFileSync(phpWithInclude, '<?php include "header.php"; ?><a href="schedule.php">Schedule</a>', "utf8");

const res = convertPhpFile(phpWithInclude, { quiet: true, force: true });
assert.strictEqual(res.converted, true, "Should convert file");
const generatedHtml = fs.readFileSync(path.join(tmpDir, "test_include.html"), "utf8");
assert.ok(generatedHtml.includes("<h1>HBCC Chess</h1>"), "Should resolve include");
assert.ok(generatedHtml.includes('href="schedule.html"'), "Should rewrite .php link to .html");

// 5. convertTournamentPhpFiles
const batchRes = convertTournamentPhpFiles(tmpDir, { quiet: true });
assert.ok(batchRes.totalPhp >= 2, "Should find PHP files in directory");
assert.strictEqual(batchRes.failed, 0, "No failures expected");

// Cleanup
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log("All PHP to HTML Converter Tests Passed!");
