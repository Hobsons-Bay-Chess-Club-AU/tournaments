import { readFileSync, writeFileSync, readdirSync, createReadStream, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import unzipper from 'unzipper';
import fetch from 'node-fetch';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIDE_URL = 'http://ratings.fide.com/download/players_list.zip';
const TMP_DIR = join(__dirname, '../tmp');
const ZIP_PATH = join(TMP_DIR, 'players_list.zip');
const ACF_LISTING_URL = 'https://auschess.org.au/rating-lists/';

async function getAcfVegaLinks() {
  console.log('Fetching ACF rating-lists page...');
  const res = await fetch(ACF_LISTING_URL);
  if (!res.ok) throw new Error('Failed to fetch ACF rating-lists page');
  const html = await res.text();
  // Find vegamast.zip and vegaquick.zip links
  const classicMatch = html.match(/href=["']([^"']*vegamast\.zip)["']/i);
  const quickMatch = html.match(/href=["']([^"']*vegaquick\.zip)["']/i);
  if (!classicMatch || !quickMatch) throw new Error('Could not find ACF Vega file links');
  // Make absolute URLs if needed
  const toAbs = url => url.startsWith('http') ? url : 'https://auschess.org.au' + (url.startsWith('/') ? url : '/' + url);
  return {
    classic: toAbs(classicMatch[1]),
    quick: toAbs(quickMatch[1])
  };
}



async function downloadFile(url, dest) {
  console.log('Downloading file:', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to download file: ' + url);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log('Download complete:', dest);
}

async function unzipFile(zipPath, outDir, ext = '.txt') {
  console.log('Unzipping file:', zipPath);
  await unzipper.Open.file(zipPath)
    .then(d => d.extract({ path: outDir, filter: entry => entry.path.endsWith(ext) }));
  console.log('Unzip complete:', zipPath);
}

function findFile(dir, ext) {
  const files = readdirSync(dir);
  return files.find(f => f.endsWith(ext)) ? join(dir, files.find(f => f.endsWith(ext))) : null;
}

function normaliseName(name) {
  return name.toLowerCase().replace(/\s+/g, '');
}

function parseFideTxt(txtPath, wantedIds, wantedNames) {
  console.log('Parsing FIDE TXT...');
  const start = Date.now();
  const lines = readFileSync(txtPath, 'utf8').split(/\r?\n/);
  const players = [];
  // Find header line and column positions
  const header = lines[0];
  const idIdx = header.indexOf('ID Number');
  const nameIdx = header.indexOf('Name');
  const fedIdx = header.indexOf('Fed');
  const sexIdx = header.indexOf('Sex');
  const titleIdx = header.indexOf('Tit');
  const srIdx = header.indexOf('SRtng');
  const rrIdx = header.indexOf('RRtng');
  const brIdx = header.indexOf('BRtng');
  // Parse each line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 10) continue;
    const fideid = line.substring(idIdx, idIdx + 9).trim();
    const name = line.substring(nameIdx, fedIdx).trim();
    const fed = line.substring(fedIdx, sexIdx).trim();
    const title = titleIdx >= 0 ? line.substring(titleIdx, titleIdx + 3).trim() : '';
    const srating = Number(line.substring(srIdx, srIdx + 5).trim()) || 0;
    const rrating = Number(line.substring(rrIdx, rrIdx + 5).trim()) || 0;
    const brating = Number(line.substring(brIdx, brIdx + 5).trim()) || 0;
    // Only keep if in wantedIds or wantedNames, or if no filters provided (parse all)
    if (wantedIds.size === 0 && wantedNames.size === 0 || wantedIds.has(fideid) || wantedNames.has(normaliseName(name))) {
      players.push({ fideid, name, fed, title, rating: srating, rapid_rating: rrating, blitz_rating: brating });
    }
  }
  console.log(`Parsed ${players.length} matching FIDE players in ${(Date.now() - start) / 1000}s.`);
  return players;
}

function parseVegFile(vegPath) {
  console.log('Parsing ACF Vega file:', vegPath);
  const start = Date.now();
  const lines = readFileSync(vegPath, 'utf8').split(/\r?\n/);
  const acfMap = new Map();
  for (const line of lines) {
    if (!line || line.startsWith('Name')) continue;
    // Format: Name;Fed;DOB;gender;title;fide_id;...;acf_id;rating;...
    const parts = line.split(';');
    if (parts.length < 10) continue;
    const name = parts[0].replace(/'/g, '').trim();
    const dob = parts[2] ? parts[2].trim() : '';
    const title = parts[4] ? parts[4].trim() : '';
    const fideId = parts[5].trim();
    const acfId = parts[8].trim();
    const rating = Number(parts[9].trim()) || 0;

    // Extract birth year from DOB
    let birthYear = null;
    if (dob) {
      // Handle different date formats: DD/MM/YYYY, YYYY-MM-DD, etc.
      const yearMatch = dob.match(/(\d{4})/);
      if (yearMatch) {
        birthYear = parseInt(yearMatch[1]);
      }
    }

    const playerData = { name, title, fideId, acfId, rating, birthYear };
    acfMap.set(acfId, playerData);
    if (fideId) acfMap.set(fideId, playerData);
    acfMap.set(normaliseName(name), playerData);
  }
  console.log(`Parsed ${acfMap.size} ACF players in ${(Date.now() - start) / 1000}s.`);
  return acfMap;
}

function buildFideMap(fidePlayers) {
  console.log('Building FIDE map...');
  const start = Date.now();
  const fideMap = new Map();
  fidePlayers.forEach(p => {
    fideMap.set(p.fideid, p);
    fideMap.set(normaliseName(p.name), p);
  });
  console.log(`FIDE map built with ${fideMap.size} keys in ${(Date.now() - start) / 1000}s.`);
  return fideMap;
}

async function enrichRatings(inputPath, outputPath, fideMap = null, acfClassicMap = null, acfQuickMap = null) {
  const data = JSON.parse(readFileSync(inputPath, 'utf8'));
  console.log(`Enriching ${data.players.length} players from ${inputPath}...`);
  const start = Date.now();
  const seenNames = new Set();
  let enrichedPlayers = [];
  data.players.forEach(player => {
    const normName = normaliseName(player.name);
    if (seenNames.has(normName)) return;
    seenNames.add(normName);
    let fideMatch = null;
    let acfClassicMatch = null;
    let acfQuickMatch = null;

    // Step 1: Try ACF mapping first (since ACF data often contains FIDE IDs)
    if (acfClassicMap) {
      if (player.acfId && acfClassicMap.has(player.acfId)) {
        acfClassicMatch = acfClassicMap.get(player.acfId);
      } else if (player.fideId && acfClassicMap.has(player.fideId)) {
        acfClassicMatch = acfClassicMap.get(player.fideId);
      } else if (acfClassicMap.has(normName)) {
        acfClassicMatch = acfClassicMap.get(normName);
      }
    }
    if (acfQuickMap) {
      if (player.acfId && acfQuickMap.has(player.acfId)) {
        acfQuickMatch = acfQuickMap.get(player.acfId);
      } else if (player.fideId && acfQuickMap.has(player.fideId)) {
        acfQuickMatch = acfQuickMap.get(player.fideId);
      } else if (acfQuickMap.has(normName)) {
        acfQuickMatch = acfQuickMap.get(normName);
      }
    }

    // Step 2: Try FIDE mapping
    if (fideMap) {
      // First try by FIDE ID (from local data or ACF match)
      const fideIdToTry = player.fideId || (acfClassicMatch && acfClassicMatch.fideId) || (acfQuickMatch && acfQuickMatch.fideId);
      if (fideIdToTry && fideMap.has(fideIdToTry)) {
        fideMatch = fideMap.get(fideIdToTry);
      } else if (fideMap.has(normName)) {
        fideMatch = fideMap.get(normName);

        // Edge case: If no FIDE ID but name match + FED = AUS, consider the player data
        if (!player.fideId && fideMatch && fideMatch.fed === 'AUS') {
          // This is an Australian player found by name match, accept the data
          console.log(`🇦🇺 Australian player found by name match: ${player.name} (FIDE ID: ${fideMatch.fideid})`);
        } else if (fideMatch && fideMatch.fed === 'AUS') {
          // Log all Australian players found (for debugging)
          console.log(`🇦🇺 Australian player matched: ${player.name} (FIDE ID: ${fideMatch.fideid}, Rating: ${fideMatch.rating})`);
        }
      }


    }
    // Update FIDE ID if we found a match
    let updatedFideId = player.fideId || "";
    if (fideMatch && fideMatch.fideid) {
      updatedFideId = fideMatch.fideid;
    } else if (acfClassicMatch && acfClassicMatch.fideId) {
      updatedFideId = acfClassicMatch.fideId;
    } else if (acfQuickMatch && acfQuickMatch.fideId) {
      updatedFideId = acfQuickMatch.fideId;
    }

    // Debug: Show when FIDE ID is being updated
    if (updatedFideId && updatedFideId !== player.fideId) {
      console.log(`🆔 Updated FIDE ID for ${player.name}: "${player.fideId}" -> "${updatedFideId}"`);
    }

    let acfId = player.acfId || "";
    if (acfClassicMatch && acfClassicMatch.acfId) acfId = acfClassicMatch.acfId;
    else if (acfQuickMatch && acfQuickMatch.acfId) acfId = acfQuickMatch.acfId;

    // Extract title with priority: FIDE title > ACF title
    let title = '';
    if (fideMatch && fideMatch.title) {
      title = fideMatch.title;
    } else if (acfClassicMatch && acfClassicMatch.title) {
      title = acfClassicMatch.title;
    } else if (acfQuickMatch && acfQuickMatch.title) {
      title = acfQuickMatch.title;
    }

    // Extract birth year with priority: ACF Classic > ACF Quick
    let birthYear = null;
    if (acfClassicMatch && acfClassicMatch.birthYear) {
      birthYear = acfClassicMatch.birthYear;
    } else if (acfQuickMatch && acfQuickMatch.birthYear) {
      birthYear = acfQuickMatch.birthYear;
    }

    enrichedPlayers.push({
      ...player,
      fideId: updatedFideId, // Update with the found FIDE ID
      title,
      birthYear,
      fideStandard: fideMatch ? fideMatch.rating : 0,
      fideRapid: fideMatch ? fideMatch.rapid_rating : 0,
      fideBlitz: fideMatch ? fideMatch.blitz_rating : 0,
      acfClassic: acfClassicMatch ? acfClassicMatch.rating : 0,
      acfQuick: acfQuickMatch ? acfQuickMatch.rating : 0,
      acfId
    });
  });
  const enriched = {
    ...data,
    players: enrichedPlayers
  };
  writeFileSync(outputPath, JSON.stringify(enriched, null, 2));
  console.log(`Enrichment complete for ${inputPath} in ${(Date.now() - start) / 1000}s.`);
}

async function main() {
  // Ensure tmp dir exists
  await mkdirSync(TMP_DIR, { recursive: true });
  // FIDE
  if (!existsSync(ZIP_PATH)) {
    await downloadFile(FIDE_URL, ZIP_PATH);
  } else {
    console.log('Using local FIDE ZIP file:', ZIP_PATH);
  }
  await unzipFile(ZIP_PATH, TMP_DIR, '.txt');
  const txtFile = findFile(TMP_DIR, '.txt');
  if (!txtFile) throw new Error('No TXT file found in tmp folder');
  // Dynamically get ACF Vega file URLs
  const acfLinks = await getAcfVegaLinks();
  const ACF_CLASSIC_ZIP = join(TMP_DIR, 'vegamast.zip');
  const ACF_QUICK_ZIP = join(TMP_DIR, 'vegaquick.zip');
  // ACF Classic
  if (!existsSync(ACF_CLASSIC_ZIP)) {
    await downloadFile(acfLinks.classic, ACF_CLASSIC_ZIP);
  } else {
    console.log('Using local ACF Classic ZIP:', ACF_CLASSIC_ZIP);
  }
  await unzipFile(ACF_CLASSIC_ZIP, TMP_DIR, '.veg');
  const acfClassicVeg = findFile(TMP_DIR, '.veg');
  if (!acfClassicVeg) throw new Error('No Classic .veg file found');
  // ACF Quick
  if (!existsSync(ACF_QUICK_ZIP)) {
    await downloadFile(acfLinks.quick, ACF_QUICK_ZIP);
  } else {
    console.log('Using local ACF Quick ZIP:', ACF_QUICK_ZIP);
  }
  await unzipFile(ACF_QUICK_ZIP, TMP_DIR, '.veg');
  // Find quick file (may be overwritten, so search all .veg files)
  const vegFiles = readdirSync(TMP_DIR).filter(f => f.endsWith('.veg'));
  let acfQuickVeg = null;
  if (vegFiles.length > 1) {
    acfQuickVeg = vegFiles.find(f => f !== acfClassicVeg.split('/').pop());
    acfQuickVeg = acfQuickVeg ? join(TMP_DIR, acfQuickVeg) : null;
  } else {
    acfQuickVeg = acfClassicVeg;
  }
  if (!acfQuickVeg) throw new Error('No Quick .veg file found');
  // Build wanted sets from local player files
  const juniorPath = join(__dirname, '../www/junior-players.json');
  const seniorPath = join(__dirname, '../www/senior-players.json');
  const juniorOut = join(__dirname, '../www/junior-ratings.json');
  const seniorOut = join(__dirname, '../www/open-ratings.json');
  const juniorData = JSON.parse(readFileSync(juniorPath, 'utf8'));
  const seniorData = JSON.parse(readFileSync(seniorPath, 'utf8'));
  const wantedIds = new Set();
  const wantedNames = new Set();
  [...juniorData.players, ...seniorData.players].forEach(p => {
    if (p.fideId) wantedIds.add(p.fideId);
    if (p.acfId) wantedIds.add(p.acfId);
    if (p.name) wantedNames.add(normaliseName(p.name));
  });

  // Parse FIDE players for enrichment
  const fidePlayers = parseFideTxt(txtFile, wantedIds, wantedNames);
  const fideMap = buildFideMap(fidePlayers);

  // Parse ACF Classic and Quick
  const acfClassicMap = parseVegFile(acfClassicVeg);
  const acfQuickMap = parseVegFile(acfQuickVeg);
  await enrichRatings(juniorPath, juniorOut, fideMap, acfClassicMap, acfQuickMap);
  await enrichRatings(seniorPath, seniorOut, fideMap, acfClassicMap, acfQuickMap);
  console.log('Ratings enrichment complete.');
}

main();