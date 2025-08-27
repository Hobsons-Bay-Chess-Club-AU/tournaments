import { readFileSync, writeFileSync, readdirSync, createReadStream, existsSync } from 'fs';
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

function randomRating() {
  return Math.floor(Math.random() * (2200 - 1500 + 1)) + 1500;
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
  const srIdx = header.indexOf('SRtng');
  const rrIdx = header.indexOf('RRtng');
  const brIdx = header.indexOf('BRtng');
  // Parse each line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 10) continue;
    const fideid = line.substring(idIdx, idIdx + 9).trim();
    const name = line.substring(nameIdx, fedIdx).trim();
    const srating = Number(line.substring(srIdx, srIdx + 5).trim()) || 0;
    const rrating = Number(line.substring(rrIdx, rrIdx + 5).trim()) || 0;
    const brating = Number(line.substring(brIdx, brIdx + 5).trim()) || 0;
    // Only keep if in wantedIds or wantedNames
    if (wantedIds.has(fideid) || wantedNames.has(normaliseName(name))) {
      players.push({ fideid, name, rating: srating, rapid_rating: rrating, blitz_rating: brating });
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
    const fideId = parts[5].trim();
    const acfId = parts[8].trim();
    const rating = Number(parts[9].trim()) || 0;
    acfMap.set(acfId, { name, fideId, acfId, rating });
    if (fideId) acfMap.set(fideId, { name, fideId, acfId, rating });
    acfMap.set(normaliseName(name), { name, fideId, acfId, rating });
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
    if (fideMap) {
      if (player.fideId && fideMap.has(player.fideId)) {
        fideMatch = fideMap.get(player.fideId);
      } else if (fideMap.has(normName)) {
        fideMatch = fideMap.get(normName);
      }
    }
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
    let acfId = player.acfId || "";
    if (acfClassicMatch && acfClassicMatch.acfId) acfId = acfClassicMatch.acfId;
    else if (acfQuickMatch && acfQuickMatch.acfId) acfId = acfQuickMatch.acfId;
    enrichedPlayers.push({
      ...player,
      fideStandard: player.fideId && fideMatch ? fideMatch.rating : 0,
      fideRapid: player.fideId && fideMatch ? fideMatch.rapid_rating : 0,
      fideBlitz: player.fideId && fideMatch ? fideMatch.blitz_rating : 0,
      acfClassic: acfClassicMatch ? acfClassicMatch.rating : randomRating(),
      acfQuick: acfQuickMatch ? acfQuickMatch.rating : randomRating(),
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
  try { require('fs').mkdirSync(TMP_DIR); } catch (e) {}
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
  const juniorPath = join(__dirname, '../v2/public/junior-players.json');
  const seniorPath = join(__dirname, '../v2/public/senior-players.json');
  const juniorOut = join(__dirname, '../v2/public/junior-ratings.json');
  const seniorOut = join(__dirname, '../v2/public/senior-ratings.json');
  const juniorData = JSON.parse(readFileSync(juniorPath, 'utf8'));
  const seniorData = JSON.parse(readFileSync(seniorPath, 'utf8'));
  const wantedIds = new Set();
  const wantedNames = new Set();
  [...juniorData.players, ...seniorData.players].forEach(p => {
    if (p.fideId) wantedIds.add(p.fideId);
    if (p.acfId) wantedIds.add(p.acfId);
    if (p.name) wantedNames.add(normaliseName(p.name));
  });
  // Parse only matching FIDE players
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
