import fs from "fs";
import path from "path";
import util from "util";
import { spawnSync, execSync } from "child_process";
import { fileURLToPath } from "url";
import { processFolder } from "../src/vega-parser.mjs";
import { generateRewardPage, updateNavigation } from "../src/shared.mjs";
import { generateUniquePlayersFiles } from "../src/prepare-data.mjs";
import dotenv from "dotenv";
import {
    upsertTournamentToSupabase,
    upsertPlayersToSupabase,
    isSupabaseConfigured
} from "../src/supabase.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (.env in scripts/ and project root)
dotenv.config({ path: path.join(__dirname, ".env"), quiet: true });
dotenv.config({ path: path.join(__dirname, "..", ".env"), quiet: true });

// ============================================================
// Custom Logger: outputs to console and ROOT_FOLDER/log.txt
// ============================================================

const rawConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
};

let logFilePath = null;
const earlyLogBuffer = [];

function getTimestamp() {
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");
    const YYYY = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const DD = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}`;
}

let logFileInitialized = false;

export function setLogFilePath(targetPath) {
    logFilePath = targetPath;
    if (logFilePath) {
        // Overwrite log file on each run so only the latest execution log is kept
        try {
            const initialContent = earlyLogBuffer.length > 0 ? earlyLogBuffer.join("\n") + "\n" : "";
            fs.writeFileSync(logFilePath, initialContent, "utf8");
            earlyLogBuffer.length = 0;
            logFileInitialized = true;
        } catch (err) {
            rawConsole.error(`Failed to initialize log file at ${logFilePath}:`, err.message);
        }
    }
}

export function maskSensitiveData(text) {
    if (text === null || text === undefined) return "";
    let str = typeof text !== "string" ? util.format(text) : text;

    return str
        // Mask Supabase secret keys, publishable keys, personal access tokens
        .replace(/sb_secret_[a-zA-Z0-9_\-]+/gi, "sb_secret_***")
        .replace(/sb_publishable_[a-zA-Z0-9_\-]+/gi, "sb_publishable_***")
        .replace(/sbp_[a-zA-Z0-9_\-]+/gi, "sbp_***")
        // Mask JWT tokens
        .replace(/eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]+/gi, "[REDACTED_JWT]")
        // Mask JWKS endpoint or auth URLs
        .replace(/https?:\/\/[^\s\/]+\/auth\/v1\/\.well-known\/jwks\.json/gi, "[REDACTED_JWKS_URL]")
        // Mask basic auth or DB passwords in URLs (e.g. postgresql://user:pass@host:port/db)
        .replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, "$1***$3")
        // Mask key=val or key: val patterns for known sensitive variable names
        .replace(/\b(SUPABASE_ACCESS_TOKEN|SUPABASE_JWKS_URL|SUPABASE_SECRET_KEY|SUPABASE_PUBLISHABLE_KEY|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|NEXT_PUBLIC_SUPABASE_URL|DATABASE_URL|PASSWORD|SECRET|TOKEN|API_KEY)\s*([:=])\s*([^\s,;]+)/gi, "$1$2***");
}

export function writeLog(level, ...args) {
    const rawFormatted = util.format(...args);
    const formatted = maskSensitiveData(rawFormatted);

    // 1. Output to console
    if (level === "ERROR") {
        rawConsole.error(formatted);
    } else if (level === "WARN") {
        rawConsole.warn(formatted);
    } else {
        rawConsole.log(formatted);
    }

    // 2. Format for log.txt
    let fileEntry;
    if (!formatted.trim()) {
        fileEntry = "";
    } else {
        const timestamp = getTimestamp();
        const lines = formatted.split("\n");
        fileEntry = lines.map(line => `[${timestamp}] [${level}] ${line}`).join("\n");
    }

    // 3. Write to file or buffer
    if (logFilePath) {
        try {
            if (!logFileInitialized) {
                fs.writeFileSync(logFilePath, fileEntry ? fileEntry + "\n" : "", "utf8");
                logFileInitialized = true;
            } else if (fileEntry) {
                fs.appendFileSync(logFilePath, fileEntry + "\n", "utf8");
            }
        } catch (err) {
            rawConsole.error(`Failed writing to ${logFilePath}:`, err.message);
        }
    } else {
        earlyLogBuffer.push(fileEntry);
    }
}

export const logger = {
    log: (...args) => writeLog("INFO", ...args),
    info: (...args) => writeLog("INFO", ...args),
    warn: (...args) => writeLog("WARN", ...args),
    error: (...args) => writeLog("ERROR", ...args)
};

// Hook global console to also write to custom logger
console.log = (...args) => writeLog("INFO", ...args);
console.info = (...args) => writeLog("INFO", ...args);
console.warn = (...args) => writeLog("WARN", ...args);
console.error = (...args) => writeLog("ERROR", ...args);

// Execute command and log stdout/stderr to logger
export function execCommand(cmd, options = {}) {
    logger.log(`$ ${cmd}`);
    const result = spawnSync(cmd, {
        shell: true,
        encoding: "utf8",
        ...options
    });

    if (result.stdout && result.stdout.trim()) {
        logger.log(result.stdout.trim());
    }
    if (result.stderr && result.stderr.trim()) {
        if (result.status === 0) {
            logger.log(result.stderr.trim());
        } else {
            logger.error(result.stderr.trim());
        }
    }

    if (result.status !== 0) {
        const error = new Error(`Command failed with exit code ${result.status}: ${cmd}`);
        error.status = result.status;
        error.stdout = result.stdout;
        error.stderr = result.stderr;
        throw error;
    }

    return result.stdout;
}

// ============================================================
// Configuration
// ============================================================

function resolveRootFolder() {
    if (process.env.SFTPGO_ROOT_FOLDER && fs.existsSync(process.env.SFTPGO_ROOT_FOLDER)) {
        return path.resolve(process.env.SFTPGO_ROOT_FOLDER);
    }
    if (process.env.ROOT_FOLDER && fs.existsSync(process.env.ROOT_FOLDER)) {
        return path.resolve(process.env.ROOT_FOLDER);
    }
    const cwdWww = path.join(process.cwd(), "www");
    if (fs.existsSync(cwdWww) && fs.statSync(cwdWww).isDirectory()) {
        return cwdWww;
    }
    const repoPath =
        process.env.REPO_PATH ||
        process.argv.slice(2).find(arg => arg.startsWith("--repo-path="))?.split("=")[1];
    if (repoPath) {
        const repoWww = path.join(path.resolve(repoPath), "www");
        if (fs.existsSync(repoWww) && fs.statSync(repoWww).isDirectory()) {
            return repoWww;
        }
    }
    const fsPath = process.env.SFTPGO_ACTION_FS_PATH || process.env.SFTPGO_FILE_PATH;
    if (fsPath && fs.existsSync(fsPath)) {
        const stat = fs.statSync(fsPath);
        const dir = stat.isDirectory() ? fsPath : path.dirname(fsPath);
        if (path.basename(dir).toLowerCase().startsWith("www")) {
            return path.dirname(dir);
        }
        return dir;
    }
    return null;
}

const ROOT_FOLDER = resolveRootFolder();

if (!ROOT_FOLDER) {
    setLogFilePath(path.join(process.cwd(), "log.txt"));
    console.error(
        "ERROR: Root folder could not be resolved. Please set SFTPGO_ROOT_FOLDER, ROOT_FOLDER, or REPO_PATH."
    );
    process.exit(1);
}

setLogFilePath(path.join(ROOT_FOLDER, "log.txt"));

const REPO_PATH =
    process.env.REPO_PATH ||
    process.argv.slice(2).find(arg => arg.startsWith("--repo-path="))?.split("=")[1] ||
    null;

const ALLOW_COMMIT_PUSH = (() => {
    const cliArg = process.argv
        .slice(2)
        .find(arg => arg.startsWith("--allow-commit-push="))
        ?.split("=")[1];
    if (cliArg !== undefined) {
        return cliArg.toLowerCase() === "true" || cliArg === "1";
    }
    if (process.env.ALLOW_COMMIT_PUSH !== undefined) {
        return (
            String(process.env.ALLOW_COMMIT_PUSH).toLowerCase() === "true" ||
            process.env.ALLOW_COMMIT_PUSH === "1"
        );
    }
    return true;
})();

const DEBOUNCE_SYNC_DELAY = (() => {
    const cliArg = process.argv
        .slice(2)
        .find(arg => arg.startsWith("--debounce-delay="))
        ?.split("=")[1];
    if (cliArg !== undefined) {
        return parseFloat(cliArg);
    }
    if (process.env.DEBOUNCE_SYNC_DELAY !== undefined) {
        return parseFloat(process.env.DEBOUNCE_SYNC_DELAY);
    }
    return 2;
})();

const NO_DEBOUNCE =
    process.argv.includes("--no-debounce") ||
    DEBOUNCE_SYNC_DELAY <= 0;

if (!fs.existsSync(ROOT_FOLDER)) {
    console.error(`ERROR: Root folder does not exist: ${ROOT_FOLDER}`);
    process.exit(1);
}

if (!fs.statSync(ROOT_FOLDER).isDirectory()) {
    console.error(`ERROR: Root folder is not a directory: ${ROOT_FOLDER}`);
    process.exit(1);
}

console.log("==========================================");
console.log("SFTPGo Static Site Builder & Vega Generator");
console.log("==========================================");
console.log(`Root:              ${ROOT_FOLDER}`);
if (REPO_PATH) {
    console.log(`Repo:              ${REPO_PATH}`);
}
console.log(`Allow Commit/Push: ${ALLOW_COMMIT_PUSH}`);
console.log(`Debounce Delay:    ${NO_DEBOUNCE ? "disabled" : `${DEBOUNCE_SYNC_DELAY}s`}`);
console.log(`Log file:          ${path.join(ROOT_FOLDER, "log.txt")}`);
console.log("");
console.log("------------------------------------------");
console.log("Trigger Context");
console.log("------------------------------------------");
console.log(`Command:     ${process.argv.join(" ")}`);
const cliArgs = process.argv.slice(2);
console.log(`CLI Args:    ${cliArgs.length > 0 ? JSON.stringify(cliArgs) : "[] (none passed)"}`);
const sftpTarget = process.env.SFTPGO_EVENT_FS_PATH || process.env.SFTPGO_ACTION_FS_PATH || process.env.SFTPGO_FILE_PATH;
if (sftpTarget) {
    console.log(`Target:      ${sftpTarget}`);
}
console.log("------------------------------------------");
console.log("");

// ============================================================
// Debounce & Concurrency Coordinator
// ============================================================

function withStateLock(fn) {
    const lockPath = path.join(ROOT_FOLDER, ".sftpgo_sync_state.lock");
    let acquired = false;
    const start = Date.now();
    while (!acquired && Date.now() - start < 5000) {
        try {
            fs.mkdirSync(lockPath);
            acquired = true;
        } catch {
            try {
                const stat = fs.statSync(lockPath);
                if (Date.now() - stat.mtimeMs > 20000) {
                    fs.rmdirSync(lockPath);
                }
            } catch {}
            try {
                Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
            } catch {
                const waitUntil = Date.now() + 50;
                while (Date.now() < waitUntil) {}
            }
        }
    }
    try {
        return fn();
    } finally {
        if (acquired) {
            try { fs.rmdirSync(lockPath); } catch {}
        }
    }
}

function readDebounceState() {
    const stateFile = path.join(ROOT_FOLDER, ".sftpgo_sync_state.json");
    try {
        if (fs.existsSync(stateFile)) {
            return JSON.parse(fs.readFileSync(stateFile, "utf8"));
        }
    } catch {}
    return null;
}

function writeDebounceState(state) {
    const stateFile = path.join(ROOT_FOLDER, ".sftpgo_sync_state.json");
    try {
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf8");
    } catch (err) {
        console.warn("Could not write debounce state:", err.message);
    }
}

function isPidRunning(pid) {
    if (!pid || typeof pid !== "number") return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

export async function coordinateDebounce(targetWebsite) {
    if (NO_DEBOUNCE) {
        console.log("[DEBOUNCE] Debounce disabled (--no-debounce or DEBOUNCE_SYNC_DELAY=0); running immediately.");
        return {
            isLeader: true,
            pendingFolders: targetWebsite ? [targetWebsite.name] : []
        };
    }

    const targetName = targetWebsite ? targetWebsite.name : null;
    let isLeader = false;

    withStateLock(() => {
        const existing = readDebounceState();
        const now = Date.now();

        if (existing && existing.activePid && isPidRunning(existing.activePid) && existing.activePid !== process.pid) {
            existing.lastTriggerTime = now;
            if (targetName && !existing.pendingFolders.includes(targetName)) {
                existing.pendingFolders.push(targetName);
            }
            writeDebounceState(existing);
            console.log(
                `[DEBOUNCE] Registered upload${targetName ? ` for "${targetName}"` : ""} to active worker (PID ${existing.activePid}). Exiting.`
            );
            isLeader = false;
        } else {
            const newState = {
                activePid: process.pid,
                lastTriggerTime: now,
                pendingFolders: targetName ? [targetName] : [],
                status: "waiting"
            };
            writeDebounceState(newState);
            isLeader = true;
        }
    });

    if (!isLeader) {
        process.exit(0);
    }

    const debounceMs = DEBOUNCE_SYNC_DELAY * 1000;
    console.log(
        `[DEBOUNCE] Active sync worker (PID ${process.pid}) waiting for quiet period (${DEBOUNCE_SYNC_DELAY}s with no new uploads)...`
    );

    while (true) {
        await new Promise(resolve => setTimeout(resolve, 300));

        let shouldStart = false;
        withStateLock(() => {
            const state = readDebounceState();
            if (!state) {
                shouldStart = true;
                return;
            }
            const elapsed = Date.now() - state.lastTriggerTime;
            if (elapsed >= debounceMs) {
                state.status = "running";
                writeDebounceState(state);
                shouldStart = true;
            }
        });

        if (shouldStart) {
            break;
        }
    }

    const finalState = readDebounceState();
    const pendingFolders = finalState?.pendingFolders || (targetWebsite ? [targetWebsite.name] : []);
    console.log(
        `[DEBOUNCE] Quiet period satisfied (${DEBOUNCE_SYNC_DELAY}s). Processing pending folder(s): ${JSON.stringify(pendingFolders)}`
    );

    return {
        isLeader: true,
        pendingFolders
    };
}

export function clearDebounceState() {
    withStateLock(() => {
        const stateFile = path.join(ROOT_FOLDER, ".sftpgo_sync_state.json");
        try {
            if (fs.existsSync(stateFile)) {
                fs.unlinkSync(stateFile);
            }
        } catch {}
    });
}

// ============================================================
// Helpers
// ============================================================

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function encodePathSegment(value) {
    return encodeURIComponent(value);
}

// ============================================================
// Find www* folders
// ============================================================

export function findWebsiteFolders() {
    return fs
        .readdirSync(ROOT_FOLDER, { withFileTypes: true })
        .filter(
            entry =>
                entry.isDirectory() &&
                entry.name.toLowerCase().startsWith("www") &&
                entry.name.toLowerCase() !== "www"
        )
        .map(entry => ({
            name: entry.name,
            path: path.join(ROOT_FOLDER, entry.name)
        }))
        .sort((a, b) =>
            a.name.localeCompare(b.name, undefined, {
                numeric: true,
                sensitivity: "base"
            })
        );
}

// ============================================================
// Find most recently modified tournament folder
// ============================================================

export function findMostRecentlyModifiedWebsite(websites) {
    let newestWebsite = null;
    let newestMtime = 0;
    let newestFile = null;

    for (const website of websites) {
        try {
            const files = fs.readdirSync(website.path, { withFileTypes: true });
            for (const file of files) {
                // Ignore generated json files and log.txt to avoid self-trigger loops
                if (
                    file.name === "data.json" ||
                    file.name === "data_clean.json" ||
                    file.name === "log.txt" ||
                    file.name.startsWith(".")
                ) {
                    continue;
                }
                const fullPath = path.join(website.path, file.name);
                try {
                    const stat = fs.statSync(fullPath);
                    if (stat.mtimeMs > newestMtime) {
                        newestMtime = stat.mtimeMs;
                        newestWebsite = website;
                        newestFile = file.name;
                    }
                } catch { }
            }
        } catch { }
    }

    if (newestWebsite && newestMtime > 0) {
        const ageSec = Math.round((Date.now() - newestMtime) / 1000);
        // If a file inside this folder was modified within the last 15 minutes (900s)
        if (ageSec <= 900) {
            console.log(
                `Detected uploaded/modified folder by recent activity: "${newestWebsite.name}" (file: "${newestFile}", modified ${ageSec}s ago)`
            );
            return newestWebsite;
        }
    }

    return null;
}

// ============================================================
// Detect uploaded website from SFTPGo environment or arguments
// ============================================================

export function detectUploadedWebsite(websites) {
    // SFTPGo passes environment variables on file upload/action hooks:
    let rawTarget =
        process.argv.slice(2).find(arg => !arg.startsWith("-")) ||
        process.env.SFTPGO_EVENT_FS_PATH ||
        process.env.SFTPGO_EVENT_PATH ||
        process.env.SFTPGO_EVENT_VIRTUAL_PATH ||
        process.env.SFTPGO_ACTION_FS_PATH ||
        process.env.SFTPGO_ACTION_PATH ||
        process.env.SFTPGO_ACTION_VIRTUAL_PATH ||
        process.env.SFTPGO_ACTION_TARGET ||
        process.env.SFTPGO_ACTION_FS_TARGET ||
        process.env.SFTPGO_ACTION_FILE_PATH ||
        process.env.SFTPGO_FILE_PATH ||
        process.env.SFTPGO_VIRTUAL_PATH ||
        process.env.SFTPGO_TRANSFER_FILE_PATH ||
        process.env.TARGET_FOLDER ||
        process.env.FOLDER ||
        null;

    // Check SFTPGo event payload JSON if present in env vars
    if (!rawTarget) {
        for (const [key, val] of Object.entries(process.env)) {
            if (key.toUpperCase().includes("SFTPGO") && typeof val === "string" && val.trim().startsWith("{")) {
                try {
                    const parsed = JSON.parse(val.trim());
                    const candidate =
                        parsed.fs_path ||
                        parsed.path ||
                        parsed.virtual_path ||
                        parsed.target_path ||
                        parsed.file_path;
                    if (candidate) {
                        rawTarget = candidate;
                        console.log(`Found target in env var ${key}: "${rawTarget}"`);
                        break;
                    }
                } catch { }
            }
        }
    }

    if (!rawTarget) {
        // Fallback A: Check recent file modifications across website folders
        const recentWebsite = findMostRecentlyModifiedWebsite(websites);
        if (recentWebsite) {
            return recentWebsite;
        }

        // Fallback B: If there is only one tournament website folder in ROOT_FOLDER, auto-target it!
        if (websites.length === 1) {
            console.log(`Auto-targeting single website folder found in root: "${websites[0].name}"`);
            return websites[0];
        }
        return null;
    }

    console.log(`Detected upload target from event/args: "${rawTarget}"`);

    // 1. Direct exact match against website name or path
    const directMatch = websites.find(
        w =>
            w.name.toLowerCase() === rawTarget.toLowerCase() ||
            w.path.toLowerCase() === path.resolve(rawTarget).toLowerCase()
    );
    if (directMatch) {
        return directMatch;
    }

    // 2. Normalize segments (e.g. "/www2025HobsonsBayCup/pairs1.php" -> ['www2025hobsonsbaycup', 'pairs1.php'])
    const normalized = rawTarget.replace(/\\/g, "/");
    const segments = normalized
        .split("/")
        .map(s => s.trim())
        .filter(Boolean);

    // Look for exact segment match from right to left (deepest directory first)
    for (let i = segments.length - 1; i >= 0; i--) {
        const segment = segments[i].toLowerCase();
        const match = websites.find(w => w.name.toLowerCase() === segment);
        if (match) {
            return match;
        }
    }

    // 3. Try resolving path relative to ROOT_FOLDER
    const trimmedLeadingSlash = rawTarget.replace(/^[/\\]+/, "");
    const candidateRelative = path.resolve(ROOT_FOLDER, trimmedLeadingSlash);
    const candidateAbsolute = path.resolve(rawTarget);

    for (const cand of [candidateRelative, candidateAbsolute]) {
        const relFromRoot = path.relative(ROOT_FOLDER, cand);
        if (!relFromRoot.startsWith("..") && !path.isAbsolute(relFromRoot)) {
            const topFolder = relFromRoot.split(path.sep)[0];
            const match = websites.find(
                w => w.name.toLowerCase() === topFolder.toLowerCase()
            );
            if (match) {
                return match;
            }
        }
    }

    // 4. Fallback: match by segment substring with longest name first (to avoid "www" matching everything)
    const sortedWebsites = [...websites].sort(
        (a, b) => b.name.length - a.name.length
    );
    for (const w of sortedWebsites) {
        const regex = new RegExp(`(^|[/\\\\])${w.name}([/\\\\]|$)`, "i");
        if (regex.test(normalized)) {
            return w;
        }
    }

    // 5. If not in websites array, check if target points directly to an existing folder on disk
    try {
        for (const candidate of [candidateAbsolute, candidateRelative]) {
            if (fs.existsSync(candidate)) {
                const stat = fs.statSync(candidate);
                const dir = stat.isDirectory() ? candidate : path.dirname(candidate);
                return {
                    name: path.basename(dir),
                    path: dir
                };
            }
        }
    } catch {
        // ignore
    }

    // 6. Fallback: check most recently modified tournament folder
    const recent = findMostRecentlyModifiedWebsite(websites);
    if (recent) {
        return recent;
    }

    if (websites.length === 1) {
        console.log(`Auto-targeting single website folder found in root: "${websites[0].name}"`);
        return websites[0];
    }

    return null;
}

// ============================================================
// Recursively find PHP files
// ============================================================

export function findPhpFiles(directory) {
    const results = [];

    const entries = fs.readdirSync(directory, {
        withFileTypes: true
    });

    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            results.push(...findPhpFiles(fullPath));
            continue;
        }

        if (
            entry.isFile() &&
            path.extname(entry.name).toLowerCase() === ".php"
        ) {
            results.push(fullPath);
        }
    }

    return results;
}

// ============================================================
// Resolve simple PHP includes
// ============================================================

export function resolvePhpIncludes(filePath, stack = []) {
    const absolutePath = path.resolve(filePath);

    // Prevent circular includes
    if (stack.includes(absolutePath)) {
        console.warn(
            `WARNING: Circular include detected: ${absolutePath}`
        );

        return `<!-- Circular include ignored: ${path.basename(absolutePath)} -->`;
    }

    if (!fs.existsSync(absolutePath)) {
        console.warn(
            `WARNING: Include file not found: ${absolutePath}`
        );

        return `<!-- Include not found: ${absolutePath} -->`;
    }

    let content = fs.readFileSync(absolutePath, "utf8");
    const currentDirectory = path.dirname(absolutePath);
    const newStack = [...stack, absolutePath];

    const includeRegex =
        /<\?php\s*(?:include|include_once|require|require_once)\s*(?:\(\s*)?['"]([^'"]+)['"]\s*\)?\s*;\s*\?>/gi;

    content = content.replace(includeRegex, (match, includePath) => {
        const resolvedInclude = path.resolve(currentDirectory, includePath);

        console.log(`      include: ${includePath}`);

        return resolvePhpIncludes(resolvedInclude, newStack);
    });

    return content;
}

// ============================================================
// Rewrite PHP links to HTML links
// ============================================================

export function rewritePhpLinks(content) {
    return content.replace(
        /\b(href|src|action)\s*=\s*(["'])([^"']*?)\.php(?=([?#][^"']*)?\2)/gi,
        (match, attribute, quote, url) => {
            return `${attribute}=${quote}${url}.html`;
        }
    );
}

// ============================================================
// Convert PHP file -> HTML
// ============================================================

export function convertPhpFile(phpFile) {
    const relativePath = path.relative(ROOT_FOLDER, phpFile);
    const htmlFile = phpFile.replace(/\.php$/i, ".html");

    console.log(`  PHP:  ${relativePath}`);

    try {
        let html = resolvePhpIncludes(phpFile);
        html = rewritePhpLinks(html);
        // Strip remaining PHP tags (e.g. siteprivacy checks) for clean static HTML
        html = html.replace(/<\?php[\s\S]*?\?>/gi, "");
        fs.writeFileSync(htmlFile, html, "utf8");

        console.log(`  HTML: ${path.relative(ROOT_FOLDER, htmlFile)}`);

        return true;
    } catch (error) {
        console.error(`  ERROR converting ${relativePath}:`);
        console.error(error);

        return false;
    }
}

// ============================================================
// Build website: convert PHP -> HTML
// ============================================================

export function buildWebsite(website) {
    console.log("");
    console.log("------------------------------------------");
    console.log(`Building: ${website.name}`);
    console.log("------------------------------------------");

    const phpFiles = findPhpFiles(website.path);

    console.log(`Found ${phpFiles.length} PHP file(s)`);

    let success = 0;
    let failed = 0;

    for (const phpFile of phpFiles) {
        if (convertPhpFile(phpFile)) {
            success++;
        } else {
            failed++;
        }
    }

    console.log("");
    console.log(
        `Finished ${website.name}: ${success} converted, ${failed} failed`
    );

    return {
        phpFiles: phpFiles.length,
        success,
        failed
    };
}

// ============================================================
// Vega Parser: Generate data.json & data_clean.json for folder
// ============================================================

export async function regenerateWebsiteData(website) {
    console.log("");
    console.log("------------------------------------------");
    console.log(`Regenerating Vega data for: ${website.name}`);
    console.log("------------------------------------------");
    console.log(`Folder path: ${website.path}`);

    try {
        const result = await processFolder(website.path, {
            writeFiles: true,
            wwwFolder: ROOT_FOLDER
        });

        if (result) {
            console.log(
                `Successfully generated data.json & data_clean.json for ${website.name}:`
            );
            console.log(`  Category: ${result.category}`);
            console.log(`  Players:  ${result.players?.length || 0}`);
            console.log(`  MD5:      ${result.md5Hash}`);

            const repoCandidate = REPO_PATH || (ROOT_FOLDER && fs.existsSync(path.join(ROOT_FOLDER, "tournament.json")) ? path.dirname(ROOT_FOLDER) : null);
            if (repoCandidate) {
                try {
                    await upsertTournamentMasterData({
                        websiteName: website.name,
                        repoPath: repoCandidate,
                        result
                    });
                } catch (err) {
                    console.warn(`[Supabase] Warning during master upsert for ${website.name}:`, err.message);
                }
            }

            return result;
        } else {
            console.warn(
                `Warning: No player data found in index.html for ${website.name} (data.json skipped). Checked path: ${website.path}`
            );
            return null;
        }
    } catch (error) {
        console.error(
            `ERROR regenerating data.json for ${website.name}:`,
            error
        );
        return null;
    }
}

// ============================================================
// Upsert master files on REPO_PATH (tournament.json, v2 data.json, leaderboards)
// ============================================================

export async function upsertTournamentMasterData({ websiteName, repoPath, result }) {
    if (!repoPath || !result) {
        return;
    }

    const resolvedRepo = path.resolve(repoPath);
    const targetWww = path.basename(resolvedRepo).toLowerCase() === "www"
        ? resolvedRepo
        : path.join(resolvedRepo, "www");
    const targetTournamentFolder = path.join(targetWww, websiteName);

    console.log("");
    console.log("------------------------------------------");
    console.log(`Updating master files on REPO_PATH for: ${websiteName}`);
    console.log("------------------------------------------");

    // 1. Upsert tournament.json
    const tournamentJsonPath = path.join(targetWww, "tournament.json");
    let tournaments = [];
    try {
        if (fs.existsSync(tournamentJsonPath)) {
            tournaments = JSON.parse(fs.readFileSync(tournamentJsonPath, "utf8"));
        }
    } catch (err) {
        console.warn(`Warning: Could not read ${tournamentJsonPath}: ${err.message}`);
        tournaments = [];
    }

    const topPlayers = result.top_players || [];
    const tournamentEntry = {
        data: result.metadata || {},
        path: `${websiteName}/data.json`,
        category: result.category || result.metadata?.category || "Junior",
        ...(topPlayers.length > 0 ? { top_players: topPlayers } : {})
    };

    const existingIdx = tournaments.findIndex(
        t => t.path === tournamentEntry.path || t.path === `${websiteName}/data.json`
    );
    if (existingIdx >= 0) {
        tournaments[existingIdx] = tournamentEntry;
        console.log(`[MASTER] Updated existing entry in tournament.json for ${websiteName}`);
    } else {
        tournaments.push(tournamentEntry);
        console.log(`[MASTER] Added new entry in tournament.json for ${websiteName}`);
    }

    fs.writeFileSync(tournamentJsonPath, JSON.stringify(tournaments, null, 2), "utf8");
    console.log(`[MASTER] Saved ${tournamentJsonPath} (${tournaments.length} tournaments total)`);

    // Also sync tournament.json to ROOT_FOLDER if ROOT_FOLDER is different
    const rootTournamentJson = path.join(ROOT_FOLDER, "tournament.json");
    if (path.resolve(rootTournamentJson) !== path.resolve(tournamentJsonPath)) {
        try {
            fs.copyFileSync(tournamentJsonPath, rootTournamentJson);
        } catch {}
    }

    // 2. Upsert v2/public/data.json
    const v2DataPath = path.join(resolvedRepo, "v2", "public", "data.json");
    try {
        if (fs.existsSync(path.dirname(v2DataPath))) {
            let v2List = [];
            if (fs.existsSync(v2DataPath)) {
                v2List = JSON.parse(fs.readFileSync(v2DataPath, "utf8"));
            }
            const dateBegin = result.metadata?.["Date Begin"] || result.metadata?.["Date"] || "";
            const dateEnd = result.metadata?.["Date End"] || result.metadata?.["End Date"] || "";
            const ts = +dateBegin.split("/").reverse().join("") || 0;
            const year = dateEnd.split("/").pop() || dateBegin.split("/").pop() || "";
            const v2Item = {
                path: `www/${websiteName}`,
                url: websiteName,
                arbiter: result.metadata?.["Arbiter(s)"] || "",
                name: result.metadata?.["Tournament Name"] || result.metadata?.["Place"] || websiteName,
                site: result.metadata?.["Site"] || result.metadata?.["Place"] || "",
                start: dateBegin,
                ts: ts,
                end: dateEnd,
                year: year,
                round: result.metadata?.["Rounds"] || "0",
                category: (result.category || result.metadata?.category || "junior").toLowerCase()
            };

            const v2Idx = v2List.findIndex(t => t.url === websiteName || t.path === `www/${websiteName}`);
            if (v2Idx >= 0) {
                v2List[v2Idx] = v2Item;
            } else {
                v2List.push(v2Item);
            }
            v2List.sort((a, b) => b.ts - a.ts);
            fs.writeFileSync(v2DataPath, JSON.stringify(v2List, null, 2), "utf8");
            console.log(`[MASTER] Updated v2/public/data.json (${v2List.length} tournaments)`);
        }
    } catch (err) {
        console.warn(`Warning: Could not update ${v2DataPath}:`, err.message);
    }

    // 3. Update player leaderboards & summaries using existing data + upserted tournament
    try {
        console.log("[MASTER] Updating unique player files & leaderboards...");
        await generateUniquePlayersFiles(tournaments, targetWww);
        console.log("[MASTER] Player leaderboards successfully updated!");
    } catch (err) {
        console.warn("Warning: Could not update unique player files:", err.message);
    }

    // 4. Update rewards and navigation if applicable
    try {
        if (fs.existsSync(targetTournamentFolder)) {
            const playersCsv = path.join(targetTournamentFolder, "Players.csv");
            if (fs.existsSync(playersCsv)) {
                try {
                    generateRewardPage(targetTournamentFolder);
                    console.log(`[MASTER] Generated reward page for ${websiteName}`);
                } catch (err) {
                    console.warn(`Warning: generateRewardPage failed for ${websiteName}:`, err.message);
                }
            }
            try {
                updateNavigation(targetTournamentFolder);
                console.log(`[MASTER] Updated navigation for ${websiteName}`);
            } catch (err) {
                console.warn(`Warning: updateNavigation failed for ${websiteName}:`, err.message);
            }
        }
    } catch (err) {
        console.warn("Warning during rewards/navigation update:", err.message);
    }

    // 5. Upsert tournament and master players to Supabase
    try {
        if (isSupabaseConfigured()) {
            console.log(`[SUPABASE] Upserting tournament ${websiteName} to Supabase...`);
            const tourneyRes = await upsertTournamentToSupabase({
                websiteName,
                repoPath: resolvedRepo,
                result
            });
            if (tourneyRes.success) {
                console.log(`[SUPABASE] Successfully upserted tournament: ${websiteName}`);
            } else {
                console.warn(`[SUPABASE] Warning: Failed to upsert tournament:`, tourneyRes.error?.message || tourneyRes.reason);
            }

            console.log("[SUPABASE] Upserting master players to Supabase...");
            const playersRes = await upsertPlayersToSupabase({
                repoPath: resolvedRepo
            });
            if (playersRes.success) {
                console.log(`[SUPABASE] Successfully upserted ${playersRes.count} players to Supabase.`);
            } else {
                console.warn(`[SUPABASE] Warning: Failed to upsert players:`, playersRes.error?.message || playersRes.reason);
            }
        } else {
            console.log("[SUPABASE] Supabase credentials not found; skipping database sync.");
        }
    } catch (err) {
        console.warn("[SUPABASE] Warning: Error during Supabase upsert:", err.message);
    }
}

// ============================================================
// Sync to git repository (copy to REPO_PATH/www and commit/push)
// ============================================================

export async function syncFolderToRepo(website, repoPath) {
    if (!repoPath) {
        return false;
    }

    const resolvedRepo = path.resolve(repoPath);
    if (!fs.existsSync(resolvedRepo)) {
        console.error(`ERROR: REPO_PATH directory does not exist: ${resolvedRepo}`);
        return false;
    }

    const targetWww = path.join(resolvedRepo, "www");
    const targetFolder = path.join(targetWww, website.name);

    console.log("");
    console.log("------------------------------------------");
    console.log(`Syncing ${website.name} to git repository`);
    console.log("------------------------------------------");
    console.log(`Source:      ${website.path}`);
    console.log(`Destination: ${targetFolder}`);

    // 1. Copy delta folder to REPO_PATH/www/${website.name}
    if (path.resolve(website.path) !== path.resolve(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
        fs.cpSync(website.path, targetFolder, { recursive: true });
        console.log(`Copied folder to ${targetFolder}`);
    } else {
        console.log("Source and destination are the same path; skipping file copy.");
    }

    // 2. Generate Vega data directly on REPO_PATH/www/${website.name}
    let parsedResult = null;
    try {
        console.log(`Generating Vega data directly in repo: ${targetFolder}`);
        parsedResult = await processFolder(targetFolder, {
            writeFiles: true,
            wwwFolder: targetWww
        });
        if (parsedResult) {
            console.log(`Vega data successfully generated in repo for ${website.name}`);
            // Also sync data.json and data_clean.json back to ROOT_FOLDER if different
            if (path.resolve(website.path) !== path.resolve(targetFolder)) {
                const srcData = path.join(targetFolder, "data.json");
                const srcClean = path.join(targetFolder, "data_clean.json");
                const destData = path.join(website.path, "data.json");
                const destClean = path.join(website.path, "data_clean.json");
                if (fs.existsSync(srcData)) fs.copyFileSync(srcData, destData);
                if (fs.existsSync(srcClean)) fs.copyFileSync(srcClean, destClean);
            }
        }
    } catch (err) {
        console.error(`Error generating Vega data on REPO_PATH for ${website.name}:`, err.message);
    }

    // 3. Upsert master files on REPO_PATH (tournament.json, v2/public/data.json, leaderboards, rewards, nav)
    if (parsedResult) {
        await upsertTournamentMasterData({
            websiteName: website.name,
            repoPath: resolvedRepo,
            result: parsedResult
        });
    }

    return true;
}

export function pullLatestFromRepo(repoPath) {
    if (!repoPath) {
        return false;
    }

    const resolvedRepo = path.resolve(repoPath);
    if (!fs.existsSync(resolvedRepo)) {
        console.error(`ERROR: REPO_PATH directory does not exist: ${resolvedRepo}`);
        return false;
    }

    try {
        console.log("");
        console.log("------------------------------------------");
        console.log(`Checking and pulling latest changes: ${resolvedRepo}`);
        console.log("------------------------------------------");

        // Verify it is a git repo
        const isGit = spawnSync("git rev-parse --is-inside-work-tree", { cwd: resolvedRepo, shell: true });
        if (isGit.status !== 0) {
            console.warn(`Warning: ${resolvedRepo} is not a git repository.`);
            return false;
        }

        // 1. Recover from any unfinished/stuck rebase or merge state from previous runs
        const gitDir = path.join(resolvedRepo, ".git");
        if (fs.existsSync(path.join(gitDir, "rebase-merge")) || fs.existsSync(path.join(gitDir, "rebase-apply"))) {
            console.warn("Detected unfinished rebase state; clearing rebase to keep working directory clean...");
            try {
                execCommand("git rebase --abort", { cwd: resolvedRepo });
            } catch {
                try {
                    execCommand("git rebase --quit", { cwd: resolvedRepo });
                } catch {}
            }
        }
        if (fs.existsSync(path.join(gitDir, "MERGE_HEAD"))) {
            console.warn("Detected unfinished merge state; aborting merge to keep working directory clean...");
            try {
                execCommand("git merge --abort", { cwd: resolvedRepo });
            } catch {}
        }

        // 2. Fetch and pull with rebase & autostash to keep working directory clean
        try {
            execCommand("git pull --rebase --autostash", { cwd: resolvedRepo });
            console.log("Successfully pulled latest changes from remote repository.");
            return true;
        } catch (pullErr) {
            console.warn(`Warning: git pull --rebase failed: ${pullErr.message}`);
            // If rebase got stuck or paused during pull, abort immediately to keep working tree clean
            try {
                execCommand("git rebase --abort", { cwd: resolvedRepo });
            } catch {}
            return false;
        }
    } catch (err) {
        console.error("ERROR during git pull operation:", err.message);
        return false;
    }
}

export function commitAndPushToRepo(repoPath, commitSubject) {
    if (!ALLOW_COMMIT_PUSH) {
        console.log("ALLOW_COMMIT_PUSH is disabled (false); skipping git commit and push.");
        return true;
    }

    const resolvedRepo = path.resolve(repoPath);
    try {
        console.log("");
        console.log("------------------------------------------");
        console.log(`Committing and pushing changes: ${resolvedRepo}`);
        console.log("------------------------------------------");

        // Stage www folder and v2/public
        execCommand(`git add -A "www"`, { cwd: resolvedRepo });
        if (fs.existsSync(path.join(resolvedRepo, "v2", "public"))) {
            execCommand(`git add -A "v2/public"`, { cwd: resolvedRepo });
        }

        const diffCheck = spawnSync("git diff --cached --quiet", { cwd: resolvedRepo, shell: true });
        const hasStaged = diffCheck.status !== 0;

        if (hasStaged) {
            const commitMsg = commitSubject || "sync: update website and master data from SFTPGo";
            try {
                execCommand(`git commit -m "${commitMsg}"`, { cwd: resolvedRepo });
            } catch {
                execCommand(
                    `git -c user.name="SFTPGo Hook" -c user.email="sftpgo@hobsonsbaychess.com" commit -m "${commitMsg}"`,
                    { cwd: resolvedRepo }
                );
            }
        }

        // Check if there are unpushed commits on the current branch (from this commit or a previous run)
        let hasUnpushed = false;
        const unpushedCheck = spawnSync("git log @{u}..HEAD --oneline", {
            cwd: resolvedRepo,
            shell: true,
            encoding: "utf8"
        });
        if (unpushedCheck.status === 0) {
            hasUnpushed = unpushedCheck.stdout.trim().length > 0;
        } else {
            const branchCheck = spawnSync("git rev-parse --abbrev-ref HEAD", {
                cwd: resolvedRepo,
                shell: true,
                encoding: "utf8"
            });
            const currentBranch = branchCheck.stdout.trim() || "main";
            const fallbackCheck = spawnSync(`git log origin/${currentBranch}..HEAD --oneline`, {
                cwd: resolvedRepo,
                shell: true,
                encoding: "utf8"
            });
            if (fallbackCheck.status === 0) {
                hasUnpushed = fallbackCheck.stdout.trim().length > 0;
            }
        }

        if (hasStaged || hasUnpushed) {
            try {
                execCommand("git pull --rebase --autostash", { cwd: resolvedRepo });
            } catch (rebaseErr) {
                console.warn(`Warning: git pull --rebase failed: ${rebaseErr.message}`);
                try {
                    execCommand("git rebase --abort", { cwd: resolvedRepo });
                } catch {}
            }
            execCommand("git push", { cwd: resolvedRepo });
            console.log("Successfully committed and pushed changes to git!");
            return true;
        } else {
            console.log("No git changes detected to commit or push.");
            return true;
        }
    } catch (err) {
        console.error("ERROR during git operations:", err.message);
        return false;
    }
}

// ============================================================
// Generate root index.html
// ============================================================

export function generateRootIndex(websites) {
    const cards = websites.length
        ? websites
              .map(website => {
                  const safeName = escapeHtml(website.name);

                  const url =
                      "/" + encodePathSegment(website.name) + "/index.html";

                  return `
<div class="col-12 col-md-6 col-lg-4">
    <a href="${url}" class="text-decoration-none">
        <div class="card h-100 shadow-sm site-card">
            <div class="card-body">
                <div class="d-flex align-items-center gap-3">

                    <div class="site-icon">
                        🌐
                    </div>

                    <div>
                        <h5 class="card-title mb-1">
                            ${safeName}
                        </h5>

                        <div class="text-muted small">
                            Open website
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </a>
</div>`;
              })
              .join("\n")
        : `
<div class="col-12">
    <div class="alert alert-secondary">
        No www* websites found.
    </div>
</div>`;

    const html = `<!doctype html>
<html lang="en">

<head>

    <meta charset="utf-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    >

    <title>Websites</title>

    <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"
        rel="stylesheet"
    >

    <style>

        body {
            background: #f8f9fa;
        }

        .site-card {
            transition:
                transform .15s ease,
                box-shadow .15s ease;
        }

        .site-card:hover {
            transform: translateY(-3px);

            box-shadow:
                0 .5rem 1rem rgba(0,0,0,.12)
                !important;
        }

        .site-icon {
            font-size: 2rem;
        }

    </style>

</head>

<body>

    <div class="container py-5">

        <div class="mb-4">

            <h1 class="fw-bold">
                Websites
            </h1>

            <p class="text-muted">
                ${websites.length}
                website${websites.length === 1 ? "" : "s"}
                available
            </p>

        </div>

        <div class="row g-4">

            ${cards}

        </div>

    </div>

</body>

</html>`;

    // Note: REPO_PATH/www/index.html is maintained by sync.yml / src/sync.mjs and must NOT be overwritten.
    if (REPO_PATH) {
        const repoWww = path.join(path.resolve(REPO_PATH), "www");
        if (path.resolve(ROOT_FOLDER) === repoWww) {
            console.log("ROOT_FOLDER points to repo www; skipping index.html generation to preserve sync.yaml version.");
            return;
        }
    }

    const indexFile = path.join(ROOT_FOLDER, "index.html");
    fs.writeFileSync(indexFile, html, "utf8");
    console.log("");
    console.log(`Generated SFTPGo root index: ${indexFile}`);
}

// ============================================================
// Main Execution
// ============================================================

export async function main() {
    let websites = findWebsiteFolders();

    console.log(`Found ${websites.length} www* website folder(s)`);

    const uploadedWebsite = detectUploadedWebsite(websites);

    // Coordinate debounce across concurrent SFTPGo invocations
    const debounceResult = await coordinateDebounce(uploadedWebsite);
    if (!debounceResult || !debounceResult.isLeader) {
        return;
    }

    try {
        // Re-read website folders in case a new folder was created during uploads
        websites = findWebsiteFolders();

        // Pull latest changes from git repository before copying to keep working directory clean
        if (REPO_PATH) {
            pullLatestFromRepo(REPO_PATH);
        }

        const pendingFolders = debounceResult.pendingFolders || [];
        const targetFolders = pendingFolders.length > 0
            ? pendingFolders
            : (uploadedWebsite ? [uploadedWebsite.name] : []);

        if (targetFolders.length > 0) {
            console.log("");
            console.log(`Processing ${targetFolders.length} target website(s): ${targetFolders.join(", ")}`);

            let totalConverted = 0;
            let totalFailed = 0;

            for (const folderName of targetFolders) {
                const website = websites.find(w => w.name.toLowerCase() === folderName.toLowerCase());
                if (!website) {
                    console.warn(`Warning: Website folder "${folderName}" not found in root folders.`);
                    continue;
                }

                const buildResult = buildWebsite(website);
                totalConverted += buildResult.success;
                totalFailed += buildResult.failed;

                if (REPO_PATH) {
                    await syncFolderToRepo(website, REPO_PATH);
                } else {
                    await regenerateWebsiteData(website);
                }
            }

            // Update root index
            generateRootIndex(websites);

            // Commit and push once for all processed folders
            if (REPO_PATH) {
                const commitSubject = `sync: update ${targetFolders.join(", ")} and master data from SFTPGo`;
                commitAndPushToRepo(REPO_PATH, commitSubject);
            }

            console.log("");
            console.log("==========================================");
            console.log("Website build & sync complete");
            console.log("==========================================");
            console.log(`Target(s): ${targetFolders.join(", ")}`);
            console.log(`Converted: ${totalConverted}`);
            console.log(`Failed:    ${totalFailed}`);
            console.log("==========================================");

            if (totalFailed > 0) {
                process.exitCode = 1;
            }
            return;
        }

        // Fallback: If no specific folder was targeted, build all websites
        console.log("");
        console.log("No specific upload target detected; building all websites...");

        let totalPhp = 0;
        let totalSuccess = 0;
        let totalFailed = 0;

        for (const website of websites) {
            const result = buildWebsite(website);
            totalPhp += result.phpFiles;
            totalSuccess += result.success;
            totalFailed += result.failed;

            if (REPO_PATH) {
                await syncFolderToRepo(website, REPO_PATH);
            } else {
                await regenerateWebsiteData(website);
            }
        }

        generateRootIndex(websites);

        if (REPO_PATH) {
            commitAndPushToRepo(REPO_PATH, "sync: update all websites from SFTPGo");
        }

        console.log("");
        console.log("==========================================");
        console.log("All websites build complete");
        console.log("==========================================");
        console.log(`Websites:  ${websites.length}`);
        console.log(`PHP files: ${totalPhp}`);
        console.log(`Converted: ${totalSuccess}`);
        console.log(`Failed:    ${totalFailed}`);
        console.log("==========================================");

        if (totalFailed > 0) {
            process.exitCode = 1;
        }
    } finally {
        clearDebounceState();
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
    main().catch(err => {
        console.error("FATAL ERROR in scripts/index.js:", err);
        process.exit(1);
    });
}