import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fetch from "node-fetch";
import unzipper from "unzipper";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_TMP_DIR = join(__dirname, "../tmp");
const FIDE_URL = "https://ratings.fide.com/download/players_list.zip";
const ACF_LISTING_URL = "https://auschess.org.au/rating-lists/";

function normaliseName(name = "") {
  return name.toLowerCase().replace(/\s+/g, "");
}

function findAcfMatch(attendee, map, nameKey) {
  if (!map) return null;

  if (attendee.acfId && map.has(attendee.acfId)) return map.get(attendee.acfId);
  if (attendee.fideId && map.has(attendee.fideId)) return map.get(attendee.fideId);
  return map.get(nameKey) || null;
}

function findFideMatch(attendee, fideMap, nameKey, acfClassicMatch, acfQuickMatch) {
  if (!fideMap) return null;

  const fideId = attendee.fideId || acfClassicMatch?.fideId || acfQuickMatch?.fideId;
  if (fideId && fideMap.has(fideId)) return fideMap.get(fideId);

  const candidates = fideMap.get(nameKey);
  const fideCandidates = Array.isArray(candidates) ? candidates : candidates ? [candidates] : [];
  return fideCandidates.find((candidate) => candidate.fed === "AUS") || null;
}

export function enrichAttendeeRatings(attendee, { fideMap, acfClassicMap, acfQuickMap }) {
  const nameKey = normaliseName(`${attendee.firstName || ""} ${attendee.lastName || ""}`);
  const acfClassicMatch = findAcfMatch(attendee, acfClassicMap, nameKey);
  const acfQuickMatch = findAcfMatch(attendee, acfQuickMap, nameKey);
  const fideMatch = findFideMatch(
    attendee,
    fideMap,
    nameKey,
    acfClassicMatch,
    acfQuickMatch,
  );

  return {
    ...attendee,
    fideId: fideMatch?.fideid || acfClassicMatch?.fideId || acfQuickMatch?.fideId || attendee.fideId,
    acfId: acfClassicMatch?.acfId || acfQuickMatch?.acfId || attendee.acfId,
    fideStandard: fideMatch?.rating || 0,
    fideRapid: fideMatch?.rapid_rating || 0,
    fideBlitz: fideMatch?.blitz_rating || 0,
    acfClassic: acfClassicMatch?.rating || 0,
    acfQuick: acfQuickMatch?.rating || 0,
  };
}

export function enrichEventSnapshots(eventSnapshots, ratingMaps) {
  return eventSnapshots.map((snapshot) => ({
    ...snapshot,
    contacts: snapshot.contacts.map((attendee) => enrichAttendeeRatings(attendee, ratingMaps)),
  }));
}

async function downloadFile(url, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download rating source: ${url}`);
  writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
}

async function unzipFile(zipPath, outputDirectory, extension) {
  await unzipper.Open.file(zipPath).then((directory) => directory.extract({
    path: outputDirectory,
    filter: (entry) => entry.path.endsWith(extension),
  }));
}

async function getAcfVegaLinks() {
  const response = await fetch(ACF_LISTING_URL);
  if (!response.ok) throw new Error("Failed to fetch ACF rating-list page");

  const html = await response.text();
  const classicMatch = html.match(/href=["']([^"']*vegamast\.zip)["']/i);
  const quickMatch = html.match(/href=["']([^"']*vegaquick\.zip)["']/i);
  if (!classicMatch || !quickMatch) throw new Error("Could not find ACF Vega file links");

  const absoluteUrl = (url) => url.startsWith("http")
    ? url
    : `https://auschess.org.au${url.startsWith("/") ? url : `/${url}`}`;
  return { classic: absoluteUrl(classicMatch[1]), quick: absoluteUrl(quickMatch[1]) };
}

function parseVegFile(vegPath) {
  const acfMap = new Map();
  for (const line of readFileSync(vegPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("Name")) continue;

    const parts = line.split(";");
    if (parts.length < 10) continue;

    const player = {
      name: parts[0].replace(/'/g, "").trim(),
      fideId: parts[5].trim(),
      acfId: parts[8].trim(),
      rating: Number(parts[9].trim()) || 0,
    };
    if (player.acfId) acfMap.set(player.acfId, player);
    if (player.fideId) acfMap.set(player.fideId, player);
    if (player.name) acfMap.set(normaliseName(player.name), player);
  }
  return acfMap;
}

function parseFideTxt(txtPath, wantedIds, wantedNames) {
  const lines = readFileSync(txtPath, "utf8").split(/\r?\n/);
  const header = lines[0] || "";
  const idIndex = header.indexOf("ID Number");
  const nameIndex = header.indexOf("Name");
  const federationIndex = header.indexOf("Fed");
  const standardIndex = header.indexOf("SRtng");
  const rapidIndex = header.indexOf("RRtng");
  const blitzIndex = header.indexOf("BRtng");
  if ([idIndex, nameIndex, federationIndex, standardIndex, rapidIndex, blitzIndex].some((index) => index < 0)) {
    throw new Error("FIDE rating list has an unexpected header");
  }

  const players = [];
  for (const line of lines.slice(1)) {
    if (line.length < 10) continue;
    const fideid = line.substring(idIndex, idIndex + 9).trim();
    const name = line.substring(nameIndex, federationIndex).trim();
    if (!wantedIds.has(fideid) && !wantedNames.has(normaliseName(name))) continue;

    players.push({
      fideid,
      name,
      fed: line.substring(federationIndex, federationIndex + 3).trim(),
      rating: Number(line.substring(standardIndex, standardIndex + 5).trim()) || 0,
      rapid_rating: Number(line.substring(rapidIndex, rapidIndex + 5).trim()) || 0,
      blitz_rating: Number(line.substring(blitzIndex, blitzIndex + 5).trim()) || 0,
    });
  }
  return players;
}

function buildFideMap(fidePlayers) {
  const fideMap = new Map();
  for (const player of fidePlayers) {
    fideMap.set(player.fideid, player);
    const nameKey = normaliseName(player.name);
    const existing = fideMap.get(nameKey);
    fideMap.set(nameKey, existing ? [...(Array.isArray(existing) ? existing : [existing]), player] : [player]);
  }
  return fideMap;
}

async function loadRatingSourceFiles(tmpDirectory) {
  await mkdir(tmpDirectory, { recursive: true });
  const fideZip = join(tmpDirectory, "players_list.zip");
  const fideTxt = join(tmpDirectory, "players_list_foa.txt");
  if (!existsSync(fideZip)) await downloadFile(FIDE_URL, fideZip);
  if (!existsSync(fideTxt)) await unzipFile(fideZip, tmpDirectory, ".txt");

  const classicZip = join(tmpDirectory, "vegamast.zip");
  const quickZip = join(tmpDirectory, "vegaquick.zip");
  const classicVeg = join(tmpDirectory, "acfmast.veg");
  const quickVeg = join(tmpDirectory, "acfquick.veg");
  if (!existsSync(classicVeg) || !existsSync(quickVeg)) {
    const links = await getAcfVegaLinks();
    if (!existsSync(classicZip)) await downloadFile(links.classic, classicZip);
    if (!existsSync(quickZip)) await downloadFile(links.quick, quickZip);
    if (!existsSync(classicVeg)) await unzipFile(classicZip, tmpDirectory, ".veg");
    if (!existsSync(quickVeg)) await unzipFile(quickZip, tmpDirectory, ".veg");
  }

  const vegFiles = new Set(readdirSync(tmpDirectory));
  if (!existsSync(fideTxt) || !vegFiles.has("acfmast.veg") || !vegFiles.has("acfquick.veg")) {
    throw new Error("Rating sources were downloaded but required files are missing");
  }
  return { fideTxt, classicVeg, quickVeg };
}

export async function loadRatingMaps(attendees, { tmpDirectory = DEFAULT_TMP_DIR } = {}) {
  const { fideTxt, classicVeg, quickVeg } = await loadRatingSourceFiles(tmpDirectory);
  const acfClassicMap = parseVegFile(classicVeg);
  const acfQuickMap = parseVegFile(quickVeg);
  const wantedIds = new Set();
  const wantedNames = new Set();

  for (const attendee of attendees) {
    const nameKey = normaliseName(`${attendee.firstName || ""} ${attendee.lastName || ""}`);
    if (nameKey) wantedNames.add(nameKey);
    if (attendee.fideId) wantedIds.add(attendee.fideId);

    for (const map of [acfClassicMap, acfQuickMap]) {
      const match = findAcfMatch(attendee, map, nameKey);
      if (match?.fideId && match.fideId !== "0") wantedIds.add(match.fideId);
    }
  }

  return {
    acfClassicMap,
    acfQuickMap,
    fideMap: buildFideMap(parseFideTxt(fideTxt, wantedIds, wantedNames)),
  };
}
