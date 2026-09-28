// Script to process Vega HTML tournament folders, extract tables, and generate data.json and data_clean.json
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import cheerio from 'cheerio';
import crypto from 'crypto';
import { IsSeniorPlayer } from './ref.mjs';

export const WWW_FOLDER = path.join(process.cwd(), 'www');

export async function extractMetadataFromTourstat(tourstatPath) {
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

// Function to calculate MD5 hash of data object excluding generatedAt, md5Hash, and non-serialized fields
export function calculateDataHash(data) {
    // Create a deep copy and remove the fields we want to exclude
    const dataCopy = JSON.parse(JSON.stringify(data));
    delete dataCopy.generatedAt;
    delete dataCopy.md5Hash;
    delete dataCopy.cleanData;
    delete dataCopy.cleanMd5Hash;
    delete dataCopy.folderName;
    delete dataCopy.folderPath;

    // Convert to string and calculate hash
    // Debug: verify whether dynamic fields like `test` are included
    try {
        if (typeof dataCopy === 'object' && dataCopy !== null) {
            console.log('[DEBUG] Hashing object keys count:', Object.keys(dataCopy), 'test value:', dataCopy.test);
        }
    } catch { }
    const dataString = JSON.stringify(dataCopy);
    return crypto.createHash('md5').update(dataString).digest('hex');
}

// Function to read existing file and get its hash
export async function getExistingHash(filePath) {
    try {
        const existingData = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(existingData);
        return parsed.md5Hash || null;
    } catch (error) {
        return null; // File doesn't exist or can't be parsed
    }
}

export async function getHtmlFiles(dir) {
    const files = await fs.readdir(dir);
    return files.filter(f => f.endsWith('.html'));
}

export function parseCaptionToPlayerInfo($caption) {
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
export function readPairPlayer($td) {
    let id = '';
    let gender = '';
    let playerName = '';
    let href = '';
    let title = '';

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

    // Look for title in span with title class
    const titleSpan = $td.find('span.title');
    if (titleSpan.length > 0) {
        title = titleSpan.text().trim();
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
        href,
        title
    };
}

// Function to parse Player column (standings tables)
export function readPlayer($td) {
    let id = '';
    let gender = '';
    let playerName = '';
    let href = '';
    let title = '';

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

    // Look for title in span with title class
    const titleSpan = $td.find('span.title');
    if (titleSpan.length > 0) {
        title = titleSpan.text().trim();
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

    return {
        id,
        playerName,
        gender,
        href,
        title
    };
}

export function parseTableToJson($table) {
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

                            let federationCode = '';
                            if (alt && alt.trim() !== '') {
                                // Use alt attribute if available
                                federationCode = alt.toUpperCase();
                            } else if (src && src.trim() !== '') {
                                // Extract federation code from src path (e.g., "FLAG/VIC.PNG" -> "VIC")
                                if (src.includes('/')) {
                                    const parts = src.split('/');
                                    if (parts.length > 1) {
                                        const fileName = parts[parts.length - 1]; // Get the last part (VIC.PNG)
                                        federationCode = fileName.split('.')[0].toUpperCase(); // Remove extension and convert to uppercase (VIC)
                                    } else {
                                        federationCode = src.toUpperCase();
                                    }
                                } else {
                                    federationCode = src.toUpperCase();
                                }
                            }

                            rowObj[headerKey] = federationCode.toUpperCase();
                        } else {
                            // Regular cell content
                            const cellText = $td.text().trim();

                            // Check if this looks like a federation code (2-3 letters) and convert to uppercase
                            if (/^[A-Za-z]{2,3}$/.test(cellText)) {
                                rowObj[headerKey] = cellText.toUpperCase();
                            } else {
                                rowObj[headerKey] = cellText;
                            }
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

export async function processHtmlFile(filePath) {
    const html = await fs.readFile(filePath, 'utf-8');
    const $ = cheerio.load(html);
    const tablesJson = [];

    // Detect tournament type
    const tournamentType = detectTournamentType(html);

    // Handle team tournament pairs specially
    if (tournamentType === 'team' && filePath.includes('pairs')) {
        const teamMatches = parseTeamTournamentPairs(html);
        tablesJson.push({
            type: 'team-pairs',
            tournamentType: 'team',
            matches: teamMatches
        });
    } else {
        // Handle individual tournament or other tables
        $('table').each((i, table) => {
            const parsedTable = parseTableToJson($(table));
            tablesJson.push(parsedTable);
        });
    }

    // Extract h1 title
    const pageHeading = $('h3').first().text().trim();
    const pairingScheduleText = $('.btn-toolbar h5').first().text().trim();
    return {
        pageHeading,
        tables: tablesJson,
        pairingScheduleText: pairingScheduleText || undefined,
        tournamentType
    };
}

export async function extractMenuStructure(indexHtmlPath) {
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

export async function extractMinimalMetadataFromIndex(indexHtmlPath) {
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
    if (!meta['Tournament Name']) {
        meta['Tournament Name'] = $("title").text().trim();
    }
    return meta;
}

// Function to build comprehensive player lookup from all sources
export function buildPlayerLookup(pageData, folderName, dataSource = null) {
    const playerMap = new Map(); // Key: player number (#), Value: enriched player data

    // Step 1: Collect basic player data from index.html
    const indexData = pageData['index.html'];
    if (indexData?.tables && indexData.tables.length > 0) {
        const playerTable = indexData.tables[0];
        if (playerTable.rows) {
            playerTable.rows.forEach(row => {
                const playerNumber = row['#'];
                const playerObj = row['Player'];
                const title = row['Title'];
                const federation = row['Fed'];
                const rating = row['Rtg'];

                // Handle both string and object Player data
                let playerName = '';
                let playerId = '';
                let gender = '';
                let href = '';

                if (typeof playerObj === 'string') {
                    playerName = playerObj;
                    playerId = String(playerNumber);
                } else if (typeof playerObj === 'object' && playerObj !== null) {
                    playerName = playerObj.playerName || '';
                    playerId = playerObj.id || String(playerNumber);
                    gender = playerObj.gender || '';
                    href = playerObj.href || `playercard.html#${playerNumber}`;
                }

                if (playerNumber && playerName) {
                    const playerData = {
                        id: playerId,
                        playerName: playerName,
                        title: title ? String(title) : '',
                        federation: federation ? String(federation) : '',
                        rating: rating ? String(rating) : '',
                        gender: gender,
                        fideId: '',
                        href: href,
                        moreInfo: {}
                    };
                    playerMap.set(String(playerNumber), playerData);
                }
            });
        }
    }

    // Step 2: Enrich with FIDE data from felovar.html
    const felovarData = pageData['felovar.html'];
    if (felovarData?.tables && felovarData.tables.length > 0) {
        const felovarTable = felovarData.tables[0];
        if (felovarTable.rows) {
            felovarTable.rows.forEach(row => {
                const playerNumber = row['#'];
                const playerData = row['Player'];
                const fideId = row['FIDE ID'];
                const fideRating = row['Rtg'];
                const federation = row['Fed'];

                if (playerNumber && playerData && fideId) {
                    const existingPlayer = playerMap.get(String(playerNumber));
                    if (existingPlayer) {
                        // Enrich existing player with FIDE data
                        existingPlayer.fideId = String(fideId);
                        existingPlayer.gender = playerData.gender || existingPlayer.gender;
                        existingPlayer.title = playerData.title || existingPlayer.title;
                        existingPlayer.federation = federation || existingPlayer.federation;
                        existingPlayer.rating = fideRating || existingPlayer.rating;
                        existingPlayer.moreInfo = {
                            ...existingPlayer.moreInfo,
                            fideId: String(fideId),
                            fideRating: fideRating ? String(fideRating) : '',
                            fideFederation: federation ? String(federation) : ''
                        };
                    } else {
                        // Create new player entry if not found in index
                        const newPlayer = {
                            id: String(playerNumber),
                            playerName: playerData.playerName || '',
                            title: playerData.title || '',
                            federation: federation || '',
                            rating: fideRating || '',
                            gender: playerData.gender || '',
                            fideId: String(fideId),
                            href: `playercard.html#${playerNumber}`,
                            moreInfo: {
                                fideId: String(fideId),
                                fideRating: fideRating ? String(fideRating) : '',
                                fideFederation: federation ? String(federation) : ''
                            }
                        };
                        playerMap.set(String(playerNumber), newPlayer);
                    }
                }
            });
        }
    }

    // Step 3: Collect additional player data from pairing tables
    Object.keys(pageData).forEach(fileName => {
        if (fileName !== 'index.html' && fileName !== 'felovar.html') {
            const pageTables = pageData[fileName]?.tables;
            if (pageTables) {
                pageTables.forEach(table => {
                    if (table.rows) {
                        table.rows.forEach(row => {
                            // Check all columns for player objects
                            Object.keys(row).forEach(columnKey => {
                                const value = row[columnKey];

                                // Check if this is a player object
                                if (typeof value === 'object' && value !== null && value.playerName && value.id) {
                                    const playerId = String(value.id);
                                    const existingPlayer = playerMap.get(playerId);

                                    if (existingPlayer) {
                                        // Merge additional data from pairing table
                                        existingPlayer.gender = value.gender || existingPlayer.gender;
                                        existingPlayer.title = value.title || existingPlayer.title;
                                        existingPlayer.href = value.href || existingPlayer.href;

                                        // Merge moreInfo
                                        existingPlayer.moreInfo = {
                                            ...existingPlayer.moreInfo,
                                            ...(value.moreInfo || {})
                                        };
                                    } else {
                                        // Create new player entry from pairing data
                                        const newPlayer = {
                                            id: playerId,
                                            playerName: value.playerName || '',
                                            title: value.title || '',
                                            federation: '',
                                            rating: '',
                                            gender: value.gender || '',
                                            fideId: '',
                                            href: value.href || `playercard.html#${playerId}`,
                                            moreInfo: value.moreInfo || {}
                                        };
                                        playerMap.set(playerId, newPlayer);
                                    }
                                }
                            });
                        });
                    }
                });
            }
        }
    });

    console.log(`[${folderName}] Built player lookup with ${playerMap.size} players`);

    if (dataSource) {
        enrichWithExternalDataSource(playerMap, dataSource);
    }

    return playerMap;
}

// Function to optionally enrich player lookup with external data source (players, ratings, FIDE)
export function enrichWithExternalDataSource(playerMap, dataSource) {
    if (!dataSource || !playerMap) return;

    let lookupMap = new Map();
    if (dataSource instanceof Map) {
        lookupMap = dataSource;
    } else if (Array.isArray(dataSource)) {
        for (const p of dataSource) {
            if (p.id) lookupMap.set(String(p.id), p);
            if (p.fideId) lookupMap.set(String(p.fideId), p);
            if (p.name) lookupMap.set(p.name.toLowerCase().replace(/\s+/g, ''), p);
            if (p.playerName) lookupMap.set(p.playerName.toLowerCase().replace(/\s+/g, ''), p);
        }
    } else if (typeof dataSource === 'object') {
        const playerList = Array.isArray(dataSource.players)
            ? dataSource.players
            : Object.values(dataSource);
        for (const p of playerList) {
            if (p && typeof p === 'object') {
                if (p.id) lookupMap.set(String(p.id), p);
                if (p.fideId) lookupMap.set(String(p.fideId), p);
                if (p.name) lookupMap.set(p.name.toLowerCase().replace(/\s+/g, ''), p);
                if (p.playerName) lookupMap.set(p.playerName.toLowerCase().replace(/\s+/g, ''), p);
            }
        }
    }

    for (const player of playerMap.values()) {
        const normName = player.playerName ? player.playerName.toLowerCase().replace(/\s+/g, '') : '';
        const match =
            (player.fideId && lookupMap.get(String(player.fideId))) ||
            (player.id && lookupMap.get(String(player.id))) ||
            (normName && lookupMap.get(normName));

        if (match) {
            player.fideId = player.fideId || match.fideId || match.fideid || '';
            player.rating = player.rating || (match.rating ? String(match.rating) : '') || '';
            player.title = player.title || match.title || '';
            player.federation = player.federation || match.fed || match.federation || '';
            if (match.gender && (!player.gender || player.gender === 'notitle')) {
                player.gender = match.gender;
            }
            if (match.moreInfo) {
                player.moreInfo = { ...player.moreInfo, ...match.moreInfo };
            }
            if (match.fideRating || match.rating) {
                player.moreInfo = {
                    ...player.moreInfo,
                    fideRating: player.moreInfo?.fideRating || match.fideRating || match.rating
                };
            }
        }
    }
}

// Function to enrich all tables with standardized player data
export function enrichTablesWithPlayerData(pageData, playerLookup) {
    const enrichedPageData = {};

    Object.keys(pageData).forEach(fileName => {
        const page = pageData[fileName];
        enrichedPageData[fileName] = {
            ...page,
            tables: page.tables?.map(table => {
                if (!table.rows) return table;

                const enrichedRows = table.rows.map(row => {
                    const enrichedRow = { ...row };

                    // Enrich all player fields in the row
                    Object.keys(row).forEach(key => {
                        const value = row[key];

                        // Check if this is a player object
                        if (typeof value === 'object' && value !== null && value.playerName && value.id) {
                            const playerId = String(value.id);
                            const fullPlayerData = playerLookup.get(playerId);

                            if (fullPlayerData) {
                                // Merge the original player data with the enriched data
                                enrichedRow[key] = { ...value, ...fullPlayerData };
                            }
                        }
                    });

                    return enrichedRow;
                });

                return { ...table, rows: enrichedRows };
            })
        };
    });

    return enrichedPageData;
}

// Function to transform data to normalized structure
export function transformToNormalizedData(pageData, playerLookup, metadata, menu, category) {
    // Create normalized player array
    const players = Array.from(playerLookup.values()).map(player => ({
        id: player.id,
        name: player.playerName,
        title: player.title || '',
        federation: player.federation || '',
        fideId: player.fideId || '',
        fideRating: player.moreInfo?.fideRating ? parseInt(player.moreInfo.fideRating) : null,
        fideFederation: player.moreInfo?.fideFederation || '',
        gender: player.gender || 'notitle',
        href: player.href || `playercard.html#${player.id}`,
        origin: player.moreInfo?.origin || ''
    }));

    // Create player lookup map for quick access
    const playerMap = new Map();
    players.forEach(player => {
        playerMap.set(player.id, player);
    });

    // Transform tables
    const transformedPages = {};

    Object.keys(pageData).forEach(fileName => {
        const page = pageData[fileName];
        const transformedTables = page.tables?.map(table => {
            // Handle team tournament pairs specially
            if (table.type === 'team-pairs') {
                return {
                    ...table,
                    type: 'team-pairs'
                };
            }

            if (!table.rows) return table;

            // Determine table type
            const tableType = determineTableType(table, fileName);

            const transformedRows = table.rows.map(row => {
                const transformedRow = { ...row };

                // Transform player references to IDs
                Object.keys(row).forEach(key => {
                    const value = row[key];

                    // Check if this is a player object
                    if (typeof value === 'object' && value !== null && value.playerName && value.id) {
                        // Replace player object with just the ID reference
                        transformedRow[key] = value.id;
                    }
                });

                return transformedRow;
            });

            return {
                ...table,
                type: tableType,
                rows: transformedRows
            };
        });

        transformedPages[fileName] = {
            ...page,
            tables: transformedTables
        };
    });

    // Create normalized tournament structure
    const normalizedData = {
        generatedAt: new Date().toISOString(),
        tournament: {
            id: metadata['Tournament Name']?.replace(/\s+/g, '-').toLowerCase() || 'unknown',
            name: metadata['Tournament Name'] || 'Unknown Tournament',
            category: category,
            metadata: {
                ...metadata,
                // Normalize metadata keys to camelCase
                tournamentName: metadata['Tournament Name'],
                federation: metadata['Federation'],
                dateBegin: metadata['Date Begin'],
                dateEnd: metadata['Date End'],
                arbiters: metadata['Arbiter(s)'],
                playSystem: metadata['Play System'],
                rounds: metadata['Rounds'] ? parseInt(metadata['Rounds']) : 0,
                scoreGame: metadata['Score game'],
                tieBreak: metadata['Tie break'],
                registeredPlayers: metadata['Registered Players'] ? parseInt(metadata['Registered Players']) : 0,
                averageRating: metadata['Average Rating (all)'] ? parseInt(metadata['Average Rating (all)']) : 0,
                averageRatingFide: metadata['Average Rating (only FIDE rated)'] ? parseInt(metadata['Average Rating (only FIDE rated)']) : 0,
                fideRatedPlayers: metadata['FIDE rated players'] ? parseInt(metadata['FIDE rated players']) : 0,
                unratedPlayers: metadata['unrated players'] ? parseInt(metadata['unrated players']) : 0,
                fideTitledPlayers: metadata['FIDE titled players'] ? parseInt(metadata['FIDE titled players']) : 0
            }
        },
        players: players,
        pages: transformedPages,
        menu: menu
    };

    return normalizedData;
}

// Function to detect tournament type based on HTML structure
export function detectTournamentType(html) {
    const $ = cheerio.load(html);

    // Check for team tournament indicators
    const hasTeamMatches = $('.match-item').length > 0;
    const hasCollapsibleBoards = $('.stat-collapse').length > 0;
    const hasTeamCards = $('.card.stat-card').length > 0;
    const hasTeamPairingScript = $('script[src*="pairingteam"]').length > 0;

    if (hasTeamMatches && hasCollapsibleBoards && hasTeamCards && hasTeamPairingScript) {
        return 'team';
    }

    // Check for individual tournament indicators
    const hasStandardTable = $('table.table-striped tbody tr').length > 0;
    const hasPlayerColumns = $('th').text().includes('White Player') && $('th').text().includes('Black Player');

    if (hasStandardTable && hasPlayerColumns) {
        return 'individual';
    }

    return 'unknown';
}

// Function to parse team tournament pairs
export function parseTeamTournamentPairs(html) {
    const $ = cheerio.load(html);
    const teamMatches = [];

    $('.match-item').each((index, matchElement) => {
        const $match = $(matchElement);
        const matchData = {
            matchNumber: $match.find('h2').text().trim(),
            team1: extractTeamData($match, 'left'),
            team2: extractTeamData($match, 'right'),
            boardPairings: extractBoardPairings($match, $)
        };
        teamMatches.push(matchData);
    });

    return teamMatches;
}

// Helper function to extract team data from match
export function extractTeamData($match, side) {
    const selector = side === 'left' ? '.w-50:first' : '.w-50:last';
    const $teamDiv = $match.find(selector);

    return {
        country: $teamDiv.find('.fs-6.fw-bold').text().trim(),
        teamName: $teamDiv.find('h5 span').text().trim(),
        teamScore: $teamDiv.find('.text-success').text().trim(),
        matchScore: $teamDiv.find('.text-primary').text().trim()
    };
}

// Helper function to extract board pairings from team match
export function extractBoardPairings($match, $) {
    const boardPairings = [];

    $match.find('.stat-collapse').each((index, boardElement) => {
        const $board = $(boardElement);
        const boardNumber = $board.find('strong').first().text().trim();

        // Extract white and black players
        const whitePlayer = extractPlayerFromBoard($board, 'white', $);
        const blackPlayer = extractPlayerFromBoard($board, 'black', $);

        boardPairings.push({
            board: boardNumber,
            white: whitePlayer,
            black: blackPlayer
        });
    });

    return boardPairings;
}

// Helper function to extract player data from board pairing
export function extractPlayerFromBoard($board, color, $) {
    const isWhite = color === 'white';

    if (isWhite) {
        // White player is in the first .d-flex section within .player-stat-row
        const $whiteSection = $board.find('.player-stat-row > .d-flex:first');
        const name = $whiteSection.find('.flex-fill.py-2.px-3 span').text().trim();
        const rating = $whiteSection.find('.w-20.py-2.px-3 span').text().trim();
        const score = $whiteSection.find('.player-score strong').text().trim();

        return {
            name: name,
            rating: rating,
            score: score
        };
    } else {
        // Black player is in the second .d-flex section within .player-stat-row
        const $blackSection = $board.find('.player-stat-row > .d-flex:last');
        const name = $blackSection.find('.flex-fill.py-2.px-3 span').text().trim();
        const rating = $blackSection.find('.w-20.py-2.px-3 span').text().trim();
        const score = $blackSection.find('.player-score strong').text().trim();

        return {
            name: name,
            rating: rating,
            score: score
        };
    }
}

// Function to determine table type
export function determineTableType(table, fileName) {
    // Handle team tournament pairs
    if (table.type === 'team-pairs') {
        return 'team-pairs';
    }

    const headers = table.headers?.map(h => typeof h === 'string' ? h : h.name) || [];
    const headerKeys = headers.map(h => h.toLowerCase());

    // Check for pairing table indicators
    const hasWhite = headerKeys.some(key =>
        key.includes('white') || key === 'white' || key === 'w'
    );
    const hasBlack = headerKeys.some(key =>
        key.includes('black') || key === 'black' || key === 'b'
    );

    if (hasWhite && hasBlack) {
        return 'pairing';
    }

    // Check for standings table indicators
    if (headerKeys.includes('player') && headerKeys.includes('pts')) {
        return 'standings';
    }

    // Check for crosstable indicators
    if (fileName.includes('crosstable') || headerKeys.some(key => key.match(/^\d+$/))) {
        return 'crosstable';
    }

    // Check for statistics indicators
    if (headerKeys.includes('statistics') || fileName.includes('stat')) {
        return 'statistics';
    }

    return 'other';
}

export function extractTopPlayers(pageData) {
    const standingsTable = pageData['standings.html']?.tables?.find((table) => {
        const headers = table.headers?.map((header) =>
            typeof header === 'string' ? header : header.name
        ) || [];
        return headers.includes('Player') && headers.includes('Pts');
    });

    if (!standingsTable?.rows) return [];

    return standingsTable.rows
        .map((row) => {
            const player = row.Player;
            const point = Number.parseFloat(String(row.Pts ?? ''));
            const position = Number.parseInt(String(row.Pos ?? ''), 10);

            if (!player?.playerName || !Number.isFinite(point)) return null;

            return {
                name: player.playerName.trim(),
                point,
                elo: String(player.rating || ''),
                title: String(player.title || ''),
                position: Number.isFinite(position) ? position : Number.MAX_SAFE_INTEGER,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.position - b.position || b.point - a.point || a.name.localeCompare(b.name))
        .slice(0, 3)
        .map(({ position, ...player }) => player);
}

// Function to extract unique players from tournament data
export function extractUniquePlayers(tournamentData) {
    const players = new Map(); // Use Map to ensure uniqueness by player name

    // Extract players from standings table
    const standingsTable = tournamentData.page?.['standings.html']?.tables?.[0];

    if (standingsTable && standingsTable.rows) {
        standingsTable.rows.forEach((row, index) => {
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
export function isCurrentYearTournament(metadata) {
    const currentYear = new Date().getFullYear().toString();

    // Check various date fields in metadata
    if (metadata['Date']) {
        const dateStr = metadata['Date'];
        if (dateStr.includes(currentYear)) return true;
    }

    if (metadata['Date Begin']) {
        const dateBegin = metadata['Date Begin'];
        if (dateBegin.includes(currentYear)) return true;
    }

    if (metadata['Date End']) {
        const dateEnd = metadata['Date End'];
        if (dateEnd.includes(currentYear)) return true;
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

// Function to extract player points from tournament data
export function extractPlayerPoints(tournamentData) {
    // Extract tournament name from metadata
    const tournamentName = tournamentData.metadata?.['Tournament Name'] || 'Unknown Tournament';

    // Extract total rounds from metadata or default to 0
    const totalRounds = tournamentData.metadata?.['Rounds'] || 0;

    // Parse standings table to get player points
    const playerPoints = new Map();

    // Extract players and points from standings table (first table is usually standings)
    const standingsTable = tournamentData.page?.['standings.html']?.tables?.[0];
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
export function getTournamentRatingType(metadata) {
    const tournamentName = (metadata?.['Tournament Name'] || '').toLowerCase();
    const timeControl = (metadata?.['Time Control'] || '').toLowerCase();

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

/**
 * Process a single tournament folder:
 * - Reads all HTML files and parses tables
 * - Enriches data with player lookups and metadata
 * - Normalizes data and calculates MD5 hashes
 * - Optionally writes data.json and data_clean.json
 * - Returns the complete parsed tournament data object
 * 
 * @param {string} folderPathOrName - Tournament folder name (e.g. 'www2025HobsonsBayCup') or path
 * @param {Object} [options={}] - Options object
 * @param {boolean} [options.writeFiles=true] - Whether to write data.json and data_clean.json to disk
 * @param {string|null} [options.wwwFolder=null] - Base www/ftp folder if folderPathOrName is relative
 * @param {Object|Array|Map|null} [options.dataSource=null] - Optional external data source (players, ratings, FIDE)
 * @returns {Promise<Object|null>} Full tournament data object or null if no players
 */
export async function processFolder(folderPathOrName, options = {}) {
    const {
        writeFiles = true,
        wwwFolder = null,
        dataSource = null
    } = options;

    if (!folderPathOrName) {
        throw new Error('processFolder: folderPathOrName argument is required');
    }

    let targetPath;
    if (path.isAbsolute(folderPathOrName)) {
        targetPath = folderPathOrName;
    } else if (wwwFolder) {
        targetPath = path.resolve(wwwFolder, folderPathOrName);
    } else {
        const candidatePath = path.resolve(process.cwd(), folderPathOrName);
        try {
            const stat = await fs.stat(candidatePath);
            if (stat.isDirectory()) {
                targetPath = candidatePath;
            } else {
                targetPath = path.join(WWW_FOLDER, folderPathOrName);
            }
        } catch {
            targetPath = path.join(WWW_FOLDER, folderPathOrName);
        }
    }

    const folderName = path.basename(targetPath);
    const outputFile = path.join(targetPath, 'data.json');
    const cleanOutputFile = path.join(targetPath, 'data_clean.json');
    const htmlFiles = await getHtmlFiles(targetPath);
    const result = {
        generatedAt: new Date().toISOString(),
    };

    // First pass: collect all page data
    result.page = {};
    for (const file of htmlFiles) {
        const filePath = path.join(targetPath, file);
        try {
            const pageData = await processHtmlFile(filePath);
            result.page[file] = pageData;
            // console.log(`[${folderName}] Processed: ${file}`);
        } catch (err) {
            console.error(`[${folderName}] Error processing ${file}:`, err);
        }
    }

    // Second pass: build comprehensive player lookup and enrich all data (using tournament HTML + optional external dataSource)
    const playerLookup = buildPlayerLookup(result.page, folderName, dataSource);
    result.page = enrichTablesWithPlayerData(result.page, playerLookup);
    result.top_players = extractTopPlayers(result.page);

    // Store the player lookup for reference
    result.playerLookup = Object.fromEntries(playerLookup);

    // Extract menu structure from index.html
    const indexHtmlPath = path.join(targetPath, 'index.html');
    let menu = [];
    try {
        menu = await extractMenuStructure(indexHtmlPath);
        result['menu'] = menu;
        console.log(`[${folderName}] Menu structure extracted.`);
    } catch (err) {
        console.error(`[${folderName}] Error extracting menu:`, err);
    }

    // Extract metadata from tourstat.html, fallback to index.html if not exist
    const tourstatPath = path.join(targetPath, 'tourstat.html');
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

    // Categorize tournament as Senior or Junior.
    // Prefer explicit keywords in folder/tournament name (e.g. Juniors/Rookies) over roster heuristics.
    let category = 'Junior';
    const players = result.page['index.html']?.tables?.[0]?.rows;
    const tournamentName = (metadata?.['Tournament Name'] || '').toLowerCase();
    const folderNameLower = folderName.toLowerCase();
    const isJuniorEvent = /\b(junior|juniors|rookie|rookies)\b/i.test(tournamentName) || /\b(junior|juniors|rookie|rookies)\b/i.test(folderNameLower);

    if (!isJuniorEvent && players) {
        for (const player of players) {
            if (IsSeniorPlayer(player.Player) || IsSeniorPlayer(player.Player?.playerName)) {
                category = 'Senior';
                break;
            }
        }
    }

    result['players'] = players;
    result['category'] = category;
    if (metadata) metadata['category'] = category;
    result['metadata'] = metadata;

    if (players) {
        // Calculate MD5 hash for original data
        const originalHash = calculateDataHash(result);
        const existingOriginalHash = await getExistingHash(outputFile);
        console.log("HASH", originalHash, existingOriginalHash);
        // Only write if data has changed
        if (originalHash !== existingOriginalHash) {
            result.md5Hash = originalHash;
            if (writeFiles) {
                await fs.writeFile(outputFile, JSON.stringify(result, null, 2), 'utf-8');
                console.log(`[${folderName}] Data written to ${outputFile} (hash: ${originalHash})`);
            }
        } else {
            result.md5Hash = originalHash;
            console.log(`[${folderName}] Original data unchanged, skipping write to ${outputFile}`);
        }

        // Generate clean data
        const cleanData = transformToNormalizedData(result.page, playerLookup, metadata, menu, category);

        // Calculate MD5 hash for clean data
        const cleanHash = calculateDataHash(cleanData);
        cleanData.md5Hash = cleanHash;
        if (writeFiles) {
            const existingCleanHash = await getExistingHash(cleanOutputFile);
            console.log("HASH", cleanHash, existingCleanHash);
            // Only write if clean data has changed
            if (cleanHash !== existingCleanHash) {
                await fs.writeFile(cleanOutputFile, JSON.stringify(cleanData, null, 2), 'utf-8');
                console.log(`[${folderName}] Clean data written to ${cleanOutputFile} (hash: ${cleanHash})`);
            } else {
                console.log(`[${folderName}] Clean data unchanged, skipping write to ${cleanOutputFile}`);
            }
        }

        // Attach full processed structures for caller consumption
        result.cleanData = cleanData;
        result.cleanMd5Hash = cleanHash;
        result.folderName = folderName;
        result.folderPath = targetPath;

        return result;
    }
    return null;
}

export default processFolder;

// CLI entrypoint support: node src/vega-parser.mjs <folder>
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const targetFolder = process.argv[2];
    if (!targetFolder) {
        console.error('Usage: node src/vega-parser.mjs <folderName or folderPath>');
        process.exit(1);
    }
    try {
        const result = await processFolder(targetFolder);
        if (result) {
            console.log(`Successfully processed "${targetFolder}"`);
            console.log(`  Tournament: ${result.metadata?.['Tournament Name'] || 'Unknown'}`);
            console.log(`  Category: ${result.category}`);
            console.log(`  Players: ${result.players?.length || 0}`);
            console.log(`  Hash: ${result.md5Hash}`);
        } else {
            console.log(`No player data found in "${targetFolder}"`);
        }
    } catch (err) {
        console.error(`Error processing "${targetFolder}":`, err);
        process.exit(1);
    }
}
