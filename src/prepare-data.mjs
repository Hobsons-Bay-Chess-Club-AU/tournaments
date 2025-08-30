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
    
    let playerName = '';
    let playerId = '';
    let moreInfo = {};
    
    // Pattern 1: Extract player name from <strong> tag (original format)
    playerName = $caption.find('strong').text().trim();
    
    // Pattern 2: Extract player name from FIDE rating link (new format)
    // <a href="http://ratings.fide.com/card.phtml?event=3244806" target="X"> Annapureddy, Rheyansh Reddy </a>
    if (!playerName) {
        const fideLink = $caption.find('a[href*="ratings.fide.com"]');
        if (fideLink.length > 0) {
            playerName = fideLink.text().trim();
            // Extract FIDE ID from href
            const fideIdMatch = fideLink.attr('href').match(/event=(\d+)/);
            if (fideIdMatch) {
                moreInfo.FIDE_ID = fideIdMatch[1];
            }
        }
    }
    
    // Extract ID using regex from the full text
    // Looking for patterns like "ID=3217475"
    const idMatch = captionText.match(/ID\s*=\s*(\d+)/i);
    playerId = idMatch ? idMatch[1] : '';
    
    // Extract N value (player number) - new format
    const nMatch = captionText.match(/N\s*=\s*(\d+)/i);
    if (nMatch) moreInfo.N = nMatch[1].trim();
    
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
    
    // Pattern 4: Unrated players - <td> <span class="notitle male"> </span> Balaji,Sai Sivesh </td>
    // The player name is direct text content after the gender span
    if (!playerName || playerName === '') {
        // Get all text content and remove the gender span text
        const allText = $td.text().trim();
        const genderSpanText = $td.find('span.male, span.female, span.notitle, .male, .female, .notitle2').text().trim();
        
        // Remove the gender span text from the total text to get just the player name
        if (genderSpanText && allText !== genderSpanText) {
            playerName = allText.replace(genderSpanText, '').trim();
        } else if (allText) {
            // If no gender span found or they're the same, use all text
            playerName = allText;
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
    } else {
        // If no caption, look for h5 element before the table
        // First try direct previous sibling
        let $prevH5 = $table.prev('h5');
        
        // If not found, try looking for h5 in the same container
        if ($prevH5.length === 0) {
            const $parent = $table.parent();
            if ($parent.length > 0) {
                // Look for h5 elements that come before this table in the same parent
                const tableIndex = $parent.children().index($table);
                $parent.children().each((i, el) => {
                    if (i < tableIndex && cheerio(el).is('h5')) {
                        $prevH5 = cheerio(el);
                        return false; // break the loop
                    }
                });
            }
        }
        
        // If still not found, try looking for h5 in the parent's parent
        if ($prevH5.length === 0) {
            const $grandParent = $table.parent().parent();
            if ($grandParent.length > 0) {
                const tableParentIndex = $grandParent.children().index($table.parent());
                $grandParent.children().each((i, el) => {
                    if (i < tableParentIndex && cheerio(el).is('h5')) {
                        $prevH5 = cheerio(el);
                        return false; // break the loop
                    }
                });
            }
        }
        
        if ($prevH5.length > 0) {
            const h5Text = $prevH5.text().trim();
            if (h5Text) {
                // Create a caption object from the h5 text
                caption = {
                    playerName: h5Text,
                    id: '',
                    moreInfo: {},
                    rawText: h5Text,
                    rawHtml: $prevH5.html().trim()
                };
            }
        }
    }
    
    // Parse footer if it exists
    let footer = null;
    const $tfoot = $table.find('tfoot');
    if ($tfoot.length > 0) {
        const $footerRow = $tfoot.find('tr').first();
        const $footerCell = $footerRow.find('td').first();
        if ($footerCell.length > 0) {
            footer = {
                text: $footerCell.text().trim(),
                html: $footerCell.html().trim()
            };
        }
    }
    
    // Build headers with unique keys to avoid overwriting duplicate column names
    const headers = [];
    const headerNameCount = new Map();
    $table.find('thead tr th, thead tr td').each((i, el) => {
        const nameRaw = cheerio(el).text().trim().replace("↕ ", "");
        const baseName = nameRaw || `col${i + 1}`;
        const count = headerNameCount.get(baseName) || 0;
        const key = count === 0 ? baseName : `${baseName}_${count}`;
        headerNameCount.set(baseName, count + 1);
        headers.push({ name: baseName, key });
    });
    const rows = [];
    $table.find('tbody tr').each((i, tr) => {
        const rowObj = {};
        cheerio(tr).find('td').each((j, td) => {
            // Improved column mapping - ensure we don't exceed header count
            const headerObj = j < headers.length ? headers[j] : { name: `col${j + 1}`, key: `col${j + 1}` };
            const headerName = typeof headerObj === 'string' ? headerObj : headerObj.name;
            const headerKey = typeof headerObj === 'string' ? headerObj : headerObj.key;
            const $td = cheerio(td);
            
            if (headerName === 'White Player' || headerName === 'Black Player' || headerName === 'Player') {
                // Check if the cell has structured content (child elements)
                const hasChildElements = $td.find('span').length > 0 || $td.find('a').length > 0;
                
                if (hasChildElements) {
                    // Use specialized parsing functions
                    if (headerName === 'Player') {
                        // Standings tables - use readPlayer function
                        rowObj[headerKey] = readPlayer($td);
                    } else {
                        // Pairing tables (White Player/Black Player) - use readPairPlayer function
                        rowObj[headerKey] = readPairPlayer($td);
                    }
                } else {
                    // Fallback: cell only contains text (e.g., "( half point bye )")
                    rowObj[headerKey] = $td.text().trim();
                }
            } else {
                // Special handling for crosstable cells with result and opponent info
                const resDiv = $td.find('div.res');
                const cwDiv = $td.find('div.cw');
                const cbDiv = $td.find('div.cb');
                
                if (resDiv.length > 0) {
                    // This is a crosstable cell with result and opponent info
                    const result = resDiv.text().trim();
                    const whiteOpponent = cwDiv.length > 0 ? cwDiv.text().trim() : null;
                    const blackOpponent = cbDiv.length > 0 ? cbDiv.text().trim() : null;
                    
                    rowObj[headerKey] = {
                        result,
                        whiteOpponent,
                        blackOpponent
                    };
                } else {
                    // Check if this is a hole cell (self-pairing)
                    if ($td.hasClass('hole')) {
                        rowObj[headerKey] = "×";
                    } else {
                        // Check if this cell contains an image (flag)
                        const $img = $td.find('img');
                        if ($img.length > 0) {
                            // Extract flag information from image
                            const alt = $img.attr('alt');
                            const src = $img.attr('src');
                            // Use alt attribute if available, otherwise use src, and convert to uppercase
                            rowObj[headerKey] = (alt || src || '').toUpperCase();
                        } else {
                            // Regular cell content
                            rowObj[headerKey] = $td.text().trim();
                        }
                    }
                }
            }
        });
        
        // Post-process the row to fix common mapping issues
        // Only apply this fix to standings tables (tables with Player column)
        const headerNames = headers.map(h => typeof h === 'string' ? h : h.name);
        const hasPlayerColumn = headerNames.includes('Player') || headerNames.includes('NAME');
        const colKeys = Object.keys(rowObj).filter(key => key.startsWith('col'));
        
        if (colKeys.length > 0 && hasPlayerColumn) {
            // Log when we detect potential column misalignment in standings tables
            if (colKeys.length === 1 && colKeys[0] === 'col13' && (!rowObj['Pts'] || rowObj['Pts'] === '')) {
                console.log(`[DEBUG] Detected col13 with value "${rowObj['col13']}" - mapping to Pts`);
                rowObj['Pts'] = rowObj['col13'];
                delete rowObj['col13'];
            }
            
            // More general fix: if we have any col* keys and missing Pts, map the first one
            if (!rowObj['Pts'] || rowObj['Pts'] === '') {
                const firstColKey = colKeys.sort()[0];
                if (firstColKey && rowObj[firstColKey]) {
                    console.log(`[DEBUG] Mapping ${firstColKey}="${rowObj[firstColKey]}" to Pts`);
                    rowObj['Pts'] = rowObj[firstColKey];
                    delete rowObj[firstColKey];
                }
            }
        }
        
        rows.push(rowObj);
    });
    
    // Return table data with caption and footer if they exist
    const result = { headers, rows };
    if (caption) {
        result.caption = caption;
    }
    if (footer) {
        result.footer = footer;
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
    const pairingScheduleText = $('.btn-toolbar h5').first().text().trim();
    return { pageHeading, tables: tablesJson , pairingScheduleText: pairingScheduleText || undefined};
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
    const result = {
        generatedAt: new Date().toISOString(),
    };
    result.page = {};
    for (const file of htmlFiles) {
        const filePath = path.join(TARGET_PATH, file);
        try {
            const pageData = await processHtmlFile(filePath);
            result.page[file] = pageData;
            // console.log(`[${folderName}] Processed: ${file}`);
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

// Function to extract unique players from tournament data
function extractUniquePlayers(tournamentData) {
    const players = new Map(); // Use Map to ensure uniqueness by player name
    
    // Extract players from standings table (first table is usually standings)
    const standingsTable = tournamentData.page['index.html']?.tables?.[0];
    if (standingsTable && standingsTable.rows) {
        standingsTable.rows.forEach(row => {
            const playerData = row.Player;
            if (playerData && typeof playerData === 'object' && playerData.playerName) {
                const playerName = playerData.playerName.trim();
                if (playerName && !players.has(playerName)) {
                    // Extract FIDE ID from href if available
                    let fideId = '';
                    if (playerData.href && playerData.href.includes('ratings.fide.com')) {
                        const fideIdMatch = playerData.href.match(/event=(\d+)/);
                        if (fideIdMatch) {
                            fideId = fideIdMatch[1];
                        }
                    }
                    
                    players.set(playerName, {
                        name: playerName,
                        id: playerData.id || '',
                        fideId: fideId,
                        gender: playerData.gender || '',
                        href: playerData.href || ''
                    });
                }
            }
        });
    }
    
    return Array.from(players.values());
}

// Function to check if tournament is from current year
function isCurrentYearTournament(metadata) {
    const currentYear = new Date().getFullYear().toString();
    
    // Check various date fields in metadata
    if (metadata['Date']) {
        const dateStr = metadata['Date'];
        if (dateStr.includes(currentYear)) return true;
    }
    
    if (metadata['Start Date']) {
        const startDate = metadata['Start Date'];
        if (startDate.includes(currentYear)) return true;
    }
    
    if (metadata['End Date']) {
        const endDate = metadata['End Date'];
        if (endDate.includes(currentYear)) return true;
    }
    
    // Check tournament name for year
    if (metadata['Tournament Name']) {
        const tournamentName = metadata['Tournament Name'];
        if (tournamentName.includes(currentYear)) return true;
    }
    
    return false;
}

// Function to extract player points from existing tournament data
function extractPlayerPoints(tournamentData) {
    // Extract tournament name from metadata
    const tournamentName = tournamentData.metadata['Tournament Name'] || 'Unknown Tournament';
    
    // Extract total rounds from metadata or default to 0
    const totalRounds = tournamentData.metadata['Rounds'] || 0;
    
    // Parse standings table to get player points
    const playerPoints = new Map();
    
    // Extract players and points from standings table (first table is usually standings)
    const standingsTable = tournamentData.page['standings.html']?.tables?.[0];
    if (standingsTable && standingsTable.rows) {
        standingsTable.rows.forEach(row => {
            const playerData = row.Player;
            const pointsData = row.Pts; // Points column
            
            if (playerData && typeof playerData === 'object' && playerData.playerName) {
                const playerName = playerData.playerName.trim();
                let points = 0;
                
                // Extract points from the Pts column
                if (pointsData) {
                    if (typeof pointsData === 'string') {
                        points = parseFloat(pointsData) || 0;
                    } else if (typeof pointsData === 'number') {
                        points = pointsData;
                    }
                }
                
                if (playerName && points >= 0) {
                    playerPoints.set(playerName, points);
                }
            }
        });
    }
    
    return {
        tournamentName,
        totalRounds,
        playerPoints
    };
}

// Function to determine tournament rating type from metadata
function getTournamentRatingType(metadata) {
    const tournamentName = (metadata['Tournament Name'] || '').toLowerCase();
    const timeControl = (metadata['Time Control'] || '').toLowerCase();
    
    // Check tournament name for rating type indicators
    if (tournamentName.includes('blitz') || timeControl.includes('blitz')) {
        return 'blitz';
    }
    if (tournamentName.includes('rapid') || timeControl.includes('rapid')) {
        return 'rapid';
    }
    // Default to standard for classical tournaments
    return 'standard';
}

// Function to generate unique players files
async function generateUniquePlayersFiles(tournaments) {
    const currentYear = new Date().getFullYear().toString();
    const seniorPlayers = new Map(); // Map to track senior tournament participation
    const juniorPlayers = new Map(); // Map to track junior tournament participation
    
    console.log(`Processing tournaments for year ${currentYear}...`);
    
    // First pass: collect all players and their tournament participation by category
    for (const tournament of tournaments) {
        // Check if tournament is from current year
        if (!isCurrentYearTournament(tournament.data)) {
            continue;
        }
        
        // Load tournament data
        const tournamentPath = path.join(WWW_FOLDER, tournament.path.replace('/data.json', ''));
        const dataJsonPath = path.join(tournamentPath, 'data.json');
        
        try {
            const dataJson = await fs.readFile(dataJsonPath, 'utf-8');
            const tournamentData = JSON.parse(dataJson);
            
            // Extract players from this tournament
            const players = extractUniquePlayers(tournamentData);
            
            // Extract standings data
            const standingsData = extractPlayerPoints(tournamentData);
            
            // Determine tournament rating type
            const ratingType = getTournamentRatingType(tournamentData.metadata);
            
            // Track tournament participation by category
            players.forEach(player => {
                const playerKey = player.name;
                const playerPoints = standingsData.playerPoints.get(player.name) || 0;
                
                const tournamentInfo = {
                    tournament: tournament.path,
                    score: playerPoints,
                    name: standingsData.tournamentName,
                    totalRounds: standingsData.totalRounds,
                    ratingType: ratingType
                };
                
                if (tournament.category === 'Senior') {
                    // Track senior tournament participation
                    if (!seniorPlayers.has(playerKey)) {
                        seniorPlayers.set(playerKey, {
                            player: player,
                            tournaments: [],
                            points: {
                                standard: 0,
                                rapid: 0,
                                blitz: 0
                            }
                        });
                    }
                    seniorPlayers.get(playerKey).tournaments.push(tournamentInfo);
                    seniorPlayers.get(playerKey).points[ratingType] += playerPoints;
                } else {
                    // Track junior tournament participation
                    if (!juniorPlayers.has(playerKey)) {
                        juniorPlayers.set(playerKey, {
                            player: player,
                            tournaments: [],
                            points: {
                                standard: 0,
                                rapid: 0,
                                blitz: 0
                            }
                        });
                    }
                    juniorPlayers.get(playerKey).tournaments.push(tournamentInfo);
                    juniorPlayers.get(playerKey).points[ratingType] += playerPoints;
                }
            });
            
            console.log(`[${tournament.path}] Processed ${players.length} players for ${tournament.category} category (${ratingType})`);
            
        } catch (err) {
            console.error(`Error processing tournament ${tournament.path}:`, err);
        }
    }
    
    // Count total tournaments for the year
    const allTournaments = new Set();
    for (const tournament of tournaments) {
        if (isCurrentYearTournament(tournament.data)) {
            allTournaments.add(tournament.path);
        }
    }
    const totalTournaments = allTournaments.size;
    console.log(`Total tournaments in ${currentYear}: ${totalTournaments}`);
    
    // Second pass: filter players based on participation criteria for each category
    const seniorPlayersArray = [];
    const juniorPlayersArray = [];
    
    // Process senior players
    for (const [playerName, playerData] of seniorPlayers) {
        const uniqueTournaments = [...new Set(playerData.tournaments.map(t => t.tournament))]; // Remove duplicate tournament entries
        const tournamentCount = uniqueTournaments.length;
        
        // Keep player if:
        // 1. They played in more than 1 senior tournament, OR
        // 2. There's only 1 tournament total for the year (beginning of year case)
        if (tournamentCount > 1 || totalTournaments === 1) {
            const player = {
                ...playerData.player,
                tournamentCount: tournamentCount,
                tournaments: playerData.tournaments,
                points: playerData.points
            };
            seniorPlayersArray.push(player);
        }
    }
    
    // Process junior players
    for (const [playerName, playerData] of juniorPlayers) {
        const uniqueTournaments = [...new Set(playerData.tournaments.map(t => t.tournament))]; // Remove duplicate tournament entries
        const tournamentCount = uniqueTournaments.length;
        
        // Keep player if:
        // 1. They played in more than 1 junior tournament, OR
        // 2. There's only 1 tournament total for the year (beginning of year case)
        if (tournamentCount > 1 || totalTournaments === 1) {
            const player = {
                ...playerData.player,
                tournamentCount: tournamentCount,
                tournaments: playerData.tournaments,
                points: playerData.points
            };
            juniorPlayersArray.push(player);
        }
    }
    
    // Sort arrays by name
    seniorPlayersArray.sort((a, b) => a.name.localeCompare(b.name));
    juniorPlayersArray.sort((a, b) => a.name.localeCompare(b.name));
    
    // Write senior players file
    const seniorPlayersPath = path.join(WWW_FOLDER, 'senior-players.json');
    await fs.writeFile(seniorPlayersPath, JSON.stringify({
        generatedAt: new Date().toISOString(),
        year: currentYear,
        count: seniorPlayersArray.length,
        totalTournaments: totalTournaments,
        players: seniorPlayersArray
    }, null, 2), 'utf-8');
    
    // Write junior players file
    const juniorPlayersPath = path.join(WWW_FOLDER, 'junior-players.json');
    await fs.writeFile(juniorPlayersPath, JSON.stringify({
        generatedAt: new Date().toISOString(),
        year: currentYear,
        count: juniorPlayersArray.length,
        totalTournaments: totalTournaments,
        players: juniorPlayersArray
    }, null, 2), 'utf-8');
    
    console.log(`\nUnique Players Summary for ${currentYear}:`);
    console.log(`Total tournaments in ${currentYear}: ${totalTournaments}`);
    console.log(`Senior Players (played in >1 tournament or only tournament): ${seniorPlayersArray.length} players written to ${seniorPlayersPath}`);
    console.log(`Junior Players (played in >1 tournament or only tournament): ${juniorPlayersArray.length} players written to ${juniorPlayersPath}`);
    
    return {
        senior: seniorPlayersArray,
        junior: juniorPlayersArray,
        totalTournaments: totalTournaments
    };
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
    
    // Generate unique players files for current year
    console.log('\nGenerating unique players files...');
    await generateUniquePlayersFiles(tournaments);
    
    if(debugTournament!==   "") {
        console.log(tournaments);
    }
}

main();
