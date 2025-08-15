async function extractMetadataFromTourstat(tourstatPath) {
    const html = await fs.readFile(tourstatPath, 'utf-8');
    const $ = cheerio.load(html);
    const metadata = {};
    $('table.table-striped tbody tr').each((i, tr) => {
        const tds = $(tr).find('td');
        if (tds.length === 2) {
            const key = $(tds[0]).text().replace(/\s+/g, ' ').trim();
            const value = $(tds[1]).text().replace(/\s+/g, ' ').trim();
            metadata[key] = value;
        }
    });
    return metadata;
}
// Script to process HTML files in www2025HobsonsBayCup folder, extract Bootstrap tables, and write to data.json
import fs from 'fs/promises';
import path from 'path';
import cheerio from 'cheerio';
import { IsSeniorPlayer } from './ref.mjs';

const WWW_FOLDER = path.join(process.cwd(), 'www');

async function getHtmlFiles(dir) {
    const files = await fs.readdir(dir);
    return files.filter(f => f.endsWith('.html'));
}

function parseCaptionToPlayerInfo($caption) {
    // Check if caption has HTML content or is just text
    const hasHTML = $caption.find('*').length > 0;
    
    if (!hasHTML) {
        // Caption contains only text
        return $caption.text().trim();
    }
    
    // Caption contains HTML, try to extract player information
    const captionText = $caption.text();
    const captionHtml = $caption.html();
    
    // Extract player name from <strong> tag
    const playerName = $caption.find('strong').text().trim();
    
    // Extract ID using regex from the full text
    // Looking for patterns like "ID=3217475"
    const idMatch = captionText.match(/ID\s*=\s*(\d+)/i);
    const playerId = idMatch ? idMatch[1] : '';
    
    // Extract other information (K, Elo, etc.)
    const moreInfo = {};
    
    // Extract K value
    const kMatch = captionText.match(/K\s*=\s*([^,]+)/i);
    if (kMatch) moreInfo.K = kMatch[1].trim();
    
    // Extract Elo value  
    const eloMatch = captionText.match(/Elo\s*=\s*([^,]+)/i);
    if (eloMatch) moreInfo.Elo = eloMatch[1].trim();
    
    // Extract anchor name if present
    const anchorName = $caption.find('a.anchor').attr('name');
    if (anchorName) moreInfo.anchor = anchorName;
    
    return {
        playerName,
        id: playerId,
        moreInfo,
        rawText: captionText.trim(),
        rawHtml: captionHtml
    };
}

// Function to parse White Player and Black Player columns (pairing tables)
function readPairPlayer($td) {
    let id = '';
    let gender = '';
    let playerName = '';
    let href = '';
    
    // Look for ID in various locations
    const idSpan = $td.find('span.idwhite, span.idblack');
    if (idSpan.length > 0) {
        id = idSpan.text().trim();
    } else {
        // Look for ID in sort-num div (newer format)
        const sortNumDiv = $td.find('.sort-num');
        if (sortNumDiv.length > 0) {
            id = sortNumDiv.text().trim();
        }
    }
    
    // Look for gender in various locations
    const genderSpan = $td.find('span.male, span.female, span.notitle');
    if (genderSpan.hasClass('male')) {
        gender = 'male';
    } else if (genderSpan.hasClass('female')) {
        gender = 'female';
    } else if (genderSpan.hasClass('notitle')) {
        gender = 'notitle';
    } else {
        // Look for gender in div classes (newer format)
        const genderDiv = $td.find('.male, .female, .notitle2');
        if (genderDiv.hasClass('male')) {
            gender = 'male';
        } else if (genderDiv.hasClass('female')) {
            gender = 'female';
        } else if (genderDiv.hasClass('notitle2')) {
            gender = 'notitle';
        } else {
            gender = 'notitle'; // default
        }
    }
    
    // Look for player name
    const anchor = $td.find('a');
    if (anchor.length > 0) {
        href = anchor.attr('href') || '';
        // Try to get player name from anchor text first
        playerName = anchor.text().trim();
        
        // If anchor text is empty, look for player name in player-name-box2 span
        if (!playerName) {
            const nameSpan = $td.find('.player-name-box2 span');
            if (nameSpan.length > 0) {
                playerName = nameSpan.text().trim();
            }
        }
    }
    
    return {
        id,
        playerName,
        gender,
        href
    };
}

// Function to parse Player column (standings tables)
function readPlayer($td) {
    let id = '';
    let gender = '';
    let playerName = '';
    let href = '';
    
    // Pattern 1: <span class="idn"> 3 </span> <span class="notitle male"> </span> <a href="playercard.html#3"> Name</a>
    let idSpan = $td.find('span.idn');
    if (idSpan.length > 0) {
        id = idSpan.text().trim();
    } else {
        // Pattern 2: Complex div structure - look for .sort-num
        const sortNumDiv = $td.find('.sort-num');
        if (sortNumDiv.length > 0) {
            id = sortNumDiv.text().trim();
        } else {
            // Pattern 3: Badge with ID - <span class="badge text-bg-primary"> &nbsp;&nbsp;8 </span>
            const badgeSpan = $td.find('span.badge');
            if (badgeSpan.length > 0) {
                id = badgeSpan.text().replace(/\s+/g, ' ').trim();
            }
        }
    }
    
    // Look for gender in span classes
    const genderSpan = $td.find('span.male, span.female, span.notitle, .male, .female, .notitle2');
    if (genderSpan.hasClass('male') || (genderSpan.hasClass('notitle') && genderSpan.hasClass('male'))) {
        gender = 'male';
    } else if (genderSpan.hasClass('female') || (genderSpan.hasClass('notitle') && genderSpan.hasClass('female'))) {
        gender = 'female';
    } else if (genderSpan.hasClass('notitle') || genderSpan.hasClass('notitle2')) {
        gender = 'notitle';
    } else {
        gender = 'notitle'; // default
    }
    
    // Look for player name in anchor tag or span within player-name-box2
    let anchor = $td.find('a');
    if (anchor.length > 0) {
        playerName = anchor.text().trim();
        href = anchor.attr('href') || '';
    }
    
    // If no player name from anchor, check for player name in nested span (Pattern 2)
    if (!playerName || playerName === '') {
        const nameSpan = $td.find('.player-name-box2 span');
        if (nameSpan.length > 0) {
            playerName = nameSpan.text().trim();
        }
    }
    
    // Debug logging for standings parsing - removed for production
    
    return {
        id,
        playerName,
        gender,
        href
    };
}

function parseTableToJson($table) {
    // Parse caption if it exists
    let caption = null;
    const $caption = $table.find('caption');
    if ($caption.length > 0) {
        caption = parseCaptionToPlayerInfo($caption);
    }
    
    const headers = [];
    $table.find('thead tr th').each((i, el) => {
        headers.push(cheerio(el).text().trim().replace("↕ ", ""));
    });
    const rows = [];
    $table.find('tbody tr').each((i, tr) => {
        const rowObj = {};
        cheerio(tr).find('td').each((j, td) => {
            // Special handling for player cells
            const header = headers[j] || `col${j + 1}`;
            if (header === 'White Player' || header === 'Black Player' || header === 'Player') {
                const $td = cheerio(td);
                
                // Check if the cell has structured content (child elements)
                const hasChildElements = $td.find('span, a').length > 0;
                
                if (hasChildElements) {
                    // Use specialized parsing functions
                    if (header === 'Player') {
                        // Standings tables - use readPlayer function
                        rowObj[header] = readPlayer($td);
                    } else {
                        // Pairing tables (White Player/Black Player) - use readPairPlayer function
                        rowObj[header] = readPairPlayer($td);
                    }
                } else {
                    // Fallback: cell only contains text (e.g., "( half point bye )")
                    rowObj[header] = $td.text().trim();
                }
            } else {
                rowObj[header] = cheerio(td).text().trim();
            }
        });
        rows.push(rowObj);
    });
    
    // Return table data with caption if it exists
    const result = { headers, rows };
    if (caption) {
        result.caption = caption;
    }
    return result;
}

async function processHtmlFile(filePath) {
    const html = await fs.readFile(filePath, 'utf-8');
    const $ = cheerio.load(html);
    const tablesJson = [];
    $('table').each((i, table) => {
        tablesJson.push(parseTableToJson($(table)));
    });
    // Extract h1 title
    const pageHeading = $('h3').first().text().trim();
    return { pageHeading, tables: tablesJson };
}

async function extractMenuStructure(indexHtmlPath) {
    const html = await fs.readFile(indexHtmlPath, 'utf-8');
    const $ = cheerio.load(html);
    const menu = [];
    $('ul.navbar-nav.me-auto.mb-2.mb-lg-0 > li').each((i, li) => {
        const $li = $(li);
        const link = $li.find('> a.nav-link, > a.nav-link.dropdown-toggle').first();
        const text = link.text().trim();
        const href = link.attr('href') || null;
        const isDropdown = $li.hasClass('dropdown') || link.hasClass('dropdown-toggle');
        let children = [];
        if (isDropdown) {
            $li.find('ul.dropdown-menu > li > a').each((j, a) => {
                children.push({
                    text: $(a).text().trim(),
                    href: $(a).attr('href') || null
                });
            });
        }
        menu.push({ text, href, isDropdown, children });
    });
    return menu;
}

async function extractMinimalMetadataFromIndex(indexHtmlPath) {
    const html = await fs.readFile(indexHtmlPath, 'utf-8');
    const $ = cheerio.load(html);
    const meta = {};
    const div = $('div.flex.flex-column.justify-content-center.text-center.text-white');
    if (div.length) {
        const h1 = div.find('h1').first().text().trim();
        const h5s = div.find('h5');
        meta['Tournament Name'] = h1;
        if (h5s.length >= 1) meta['Federation'] = h5s.eq(0).text().trim();
        if (h5s.length >= 2) meta['Date'] = h5s.eq(1).text().trim();
    } else {
        // fallback: try to get h1 and h5 anywhere
        const h1 = $('h1').first().text().trim();
        const h5s = $('h5');
        if (h1) meta['Tournament Name'] = h1;
        if (h5s.length >= 1) meta['Federation'] = h5s.eq(0).text().trim();
        if (h5s.length >= 2) meta['Date'] = h5s.eq(1).text().trim();
    }
    if(!meta['Tournament Name']) {
        meta['Tournament Name'] = $("title").text().trim();
    }
    return meta;
}

async function processFolder(folderName) {
    const TARGET_PATH = path.join(WWW_FOLDER, folderName);
    const OUTPUT_FILE = path.join(TARGET_PATH, 'data.json');
    const htmlFiles = await getHtmlFiles(TARGET_PATH);
    const result = {};
    result.page = {};
    for (const file of htmlFiles) {
        const filePath = path.join(TARGET_PATH, file);
        try {
            const pageData = await processHtmlFile(filePath);
            result.page[file] = pageData;
            console.log(`[${folderName}] Processed: ${file}`);
        } catch (err) {
            console.error(`[${folderName}] Error processing ${file}:`, err);
        }
    }
    // Extract menu structure from index.html
    const indexHtmlPath = path.join(TARGET_PATH, 'index.html');
    try {
        const menu = await extractMenuStructure(indexHtmlPath);
        result['menu'] = menu;
        console.log(`[${folderName}] Menu structure extracted.`);
    } catch (err) {
        console.error(`[${folderName}] Error extracting menu:`, err);
    }
    // Extract metadata from tourstat.html, fallback to index.html if not exist
    const tourstatPath = path.join(TARGET_PATH, 'tourstat.html');
    let metadata = {};
    try {
        metadata = await extractMetadataFromTourstat(tourstatPath);
        console.log(`[${folderName}] Metadata extracted from tourstat.html.`);
    } catch (err) {
        console.warn(`[${folderName}] tourstat.html not found or error, extracting minimal metadata from index.html.`);
        try {
            metadata = await extractMinimalMetadataFromIndex(indexHtmlPath);
            console.log(`[${folderName}] Minimal metadata extracted from index.html.`);
        } catch (err2) {
            console.error(`[${folderName}] Error extracting minimal metadata from index.html:`, err2);
        }
    }
    // Categorize tournament as Senior or Junior
    let category = 'Junior';
        const players =  result.page['index.html']?.tables?.[0]?.rows;
        if(players) {
        for (const player of players) {
            if (IsSeniorPlayer(player.Player) || IsSeniorPlayer(player.Player?.playerName)) {
                category = 'Senior';
                break;
            }
        }}
        // If any player is senior, set category to Senior
        result['players'] = players;
   
    result['category'] = category;
    if (metadata) metadata['category'] = category;
    result['metadata'] = metadata;
    if(players) {
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
        console.log(`[${folderName}] Data written to ${OUTPUT_FILE}`);
        return result
    }
    return null;
}

const debugTournament = ""; // Set to empty to process all tournaments
async function main() {
    const allFolders = await fs.readdir(WWW_FOLDER, { withFileTypes: true });
    const wwwFolders = allFolders.filter(dirent => dirent.isDirectory() && dirent.name.startsWith('www')).map(dirent => dirent.name);
    const tournaments = [];
    for (const folderName of wwwFolders) {
        if(debugTournament !== "" && !folderName.includes(debugTournament)) continue;
        const result = await processFolder(folderName);
        if(result) {
        // Read data.json just written
        try {
            if (result.metadata) {
                tournaments.push({
                    data: result.metadata,
                    path: `${folderName}/data.json`,
                    category: result.category || result.metadata.category || 'Junior'
                });
            }
            } catch (err) {
                console.error(`[${folderName}] Error reading data.json for tournament.json:`, err);
            }
        }
    }
    // Write tournament.json in www folder
    const tournamentJsonPath = path.join(WWW_FOLDER, 'tournament.json');
    await fs.writeFile(tournamentJsonPath, JSON.stringify(tournaments, null, 2), 'utf-8');
    console.log(`All tournaments metadata written to ${tournamentJsonPath}`);
    if(debugTournament!==   "") {
        console.log(tournaments);
    }
}

main();
