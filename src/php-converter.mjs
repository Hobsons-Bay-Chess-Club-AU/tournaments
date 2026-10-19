import fs from "fs";
import path from "path";

/**
 * Returns the configured threshold in seconds for considering an HTML file out of date
 * compared to its matching PHP source file. Default is 30 seconds.
 */
export function getPhpToHtmlThresholdSeconds() {
    const envVal = process.env.PHP_TO_HTML_THRESHOLD_SECONDS;
    if (envVal !== undefined && envVal !== null && envVal.trim() !== "") {
        const parsed = parseFloat(envVal);
        if (!isNaN(parsed) && parsed >= 0) {
            return parsed;
        }
    }
    return 30; // default 30 seconds
}

/**
 * Recursively find all .php files in a directory.
 */
export function findPhpFiles(directory) {
    const results = [];
    if (!fs.existsSync(directory)) {
        return results;
    }

    const entries = fs.readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            results.push(...findPhpFiles(fullPath));
        } else if (
            entry.isFile() &&
            path.extname(entry.name).toLowerCase() === ".php"
        ) {
            results.push(fullPath);
        }
    }

    return results;
}

/**
 * Checks if the corresponding HTML file is missing or out of date compared to the PHP file.
 * Returns true if:
 * 1. The HTML file does not exist.
 * 2. The PHP file was modified more than `thresholdSeconds` after the HTML file.
 */
export function isHtmlOutOfDate(phpFile, htmlFile, thresholdSeconds = getPhpToHtmlThresholdSeconds()) {
    if (!fs.existsSync(htmlFile)) {
        return true;
    }
    if (!fs.existsSync(phpFile)) {
        return false;
    }

    try {
        const phpStat = fs.statSync(phpFile);
        const htmlStat = fs.statSync(htmlFile);

        // Difference in seconds: positive if PHP was modified AFTER HTML
        const diffSec = (phpStat.mtimeMs - htmlStat.mtimeMs) / 1000;

        return diffSec > thresholdSeconds;
    } catch {
        return true;
    }
}

/**
 * Resolve simple PHP includes (include, include_once, require, require_once).
 */
export function resolvePhpIncludes(filePath, stack = []) {
    const absolutePath = path.resolve(filePath);

    // Prevent circular includes
    if (stack.includes(absolutePath)) {
        console.warn(`WARNING: Circular include detected: ${absolutePath}`);
        return `<!-- Circular include ignored: ${path.basename(absolutePath)} -->`;
    }

    if (!fs.existsSync(absolutePath)) {
        console.warn(`WARNING: Include file not found: ${absolutePath}`);
        return `<!-- Include not found: ${absolutePath} -->`;
    }

    let content = fs.readFileSync(absolutePath, "utf8");
    const currentDirectory = path.dirname(absolutePath);
    const newStack = [...stack, absolutePath];

    const includeRegex =
        /<\?php\s*(?:include|include_once|require|require_once)\s*(?:\(\s*)?['"]([^'"]+)['"]\s*\)?\s*;\s*\?>/gi;

    content = content.replace(includeRegex, (match, includePath) => {
        const resolvedInclude = path.resolve(currentDirectory, includePath);
        return resolvePhpIncludes(resolvedInclude, newStack);
    });

    return content;
}

/**
 * Rewrite PHP links in href, src, action attributes to HTML links.
 */
export function rewritePhpLinks(content) {
    return content.replace(
        /\b(href|src|action)\s*=\s*(["'])([^"']*?)\.php(?=([?#][^"']*)?\2)/gi,
        (match, attribute, quote, url) => {
            return `${attribute}=${quote}${url}.html`;
        }
    );
}

/**
 * Converts a PHP file to HTML if the HTML file is missing or out of date.
 *
 * @param {string} phpFile - Path to the source .php file
 * @param {Object} [options]
 * @param {number} [options.thresholdSeconds] - Max acceptable age difference in seconds (default: 30)
 * @param {boolean} [options.force=false] - Force conversion even if HTML is fresh
 * @param {string} [options.rootFolder] - Base directory for relative log printing
 * @param {boolean} [options.quiet=false] - Suppress console output
 * @returns {{ converted: boolean, skipped: boolean, htmlFile: string } | false}
 */
export function convertPhpFile(phpFile, options = {}) {
    const rootDir = options.rootFolder || process.cwd();
    const relativePhp = path.relative(rootDir, phpFile);
    const htmlFile = phpFile.replace(/\.php$/i, ".html");
    const relativeHtml = path.relative(rootDir, htmlFile);

    const thresholdSeconds = options.thresholdSeconds !== undefined
        ? options.thresholdSeconds
        : getPhpToHtmlThresholdSeconds();

    const force = options.force || false;

    // Check if HTML is up-to-date and conversion can be skipped
    if (!force && !isHtmlOutOfDate(phpFile, htmlFile, thresholdSeconds)) {
        if (!options.quiet) {
            console.log(`  HTML up to date (within ${thresholdSeconds}s threshold), skipping: ${relativeHtml}`);
        }
        return { converted: false, skipped: true, htmlFile };
    }

    try {
        let html = resolvePhpIncludes(phpFile);
        html = rewritePhpLinks(html);
        // Strip remaining PHP tags (e.g. siteprivacy checks) for clean static HTML
        html = html.replace(/<\?php[\s\S]*?\?>/gi, "");
        fs.writeFileSync(htmlFile, html, "utf8");

        if (!options.quiet) {
            console.log(`  Converted PHP -> HTML: ${relativePhp} -> ${relativeHtml}`);
        }

        return { converted: true, skipped: false, htmlFile };
    } catch (error) {
        console.error(`  ERROR converting ${relativePhp}:`, error.message || error);
        return false;
    }
}

/**
 * Scans a tournament folder and converts all PHP files whose HTML counterparts are missing
 * or out of date (modified > thresholdSeconds prior to PHP).
 *
 * @param {string} tournamentDir - Tournament folder path
 * @param {Object} [options]
 * @returns {{ totalPhp: number, converted: number, skipped: number, failed: number, htmlFiles: string[] }}
 */
export function convertTournamentPhpFiles(tournamentDir, options = {}) {
    const phpFiles = findPhpFiles(tournamentDir);
    let converted = 0;
    let skipped = 0;
    let failed = 0;
    const htmlFiles = [];

    for (const phpFile of phpFiles) {
        const res = convertPhpFile(phpFile, options);
        if (res === false) {
            failed++;
        } else {
            if (res.converted) {
                converted++;
            } else if (res.skipped) {
                skipped++;
            }
            htmlFiles.push(res.htmlFile);
        }
    }

    return {
        totalPhp: phpFiles.length,
        converted,
        skipped,
        failed,
        htmlFiles
    };
}
