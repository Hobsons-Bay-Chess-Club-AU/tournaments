// Script to orchestrate processing tournament folders, generating tournament.json and unique player leaderboards
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    processFolder,
    WWW_FOLDER,
    extractUniquePlayers,
    isCurrentYearTournament,
    extractPlayerPoints,
    getTournamentRatingType
} from './vega-parser.mjs';

// Helper to load no-tournament-player.json
export async function loadNoTournamentPlayers(baseWwwFolder = WWW_FOLDER) {
    const filePath = path.join(baseWwwFolder, 'no-tournament-player.json');
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// Function to generate unique players files
export async function generateUniquePlayersFiles(tournaments, baseWwwFolder = WWW_FOLDER) {
    const currentYear = new Date().getFullYear().toString();
    // Leaderboard participation threshold: "more than 2 tournaments" => at least 3.
    // Early-year fallback: if fewer than this many tournaments exist in the year so far,
    // include all players (otherwise no one would qualify yet).
    const MIN_TOURNAMENTS_FOR_LEADERBOARD = 0;
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
        const tournamentPath = path.join(baseWwwFolder, tournament.path.replace('/data.json', ''));
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

    // Add no-tournament players to senior/junior lists
    const noTournamentPlayers = await loadNoTournamentPlayers(baseWwwFolder);
    for (const p of noTournamentPlayers) {
        const playerKey = p.name;
        const playerObj = {
            player: p,
            tournaments: [],
            points: { standard: 0, rapid: 0, blitz: 0 }
        };
        if (p.category === 'Senior') {
            if (!seniorPlayers.has(playerKey)) {
                seniorPlayers.set(playerKey, playerObj);
            }
        } else if (p.category === 'Junior') {
            if (!juniorPlayers.has(playerKey)) {
                juniorPlayers.set(playerKey, playerObj);
            }
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
    // Apply strict threshold only once the year has "enough" tournaments.
    // With MIN=3, we start enforcing once there are 4+ tournaments.
    const earlyYearFallback = totalTournaments <= MIN_TOURNAMENTS_FOR_LEADERBOARD;

    // Second pass: filter players based on participation criteria for each category
    const seniorPlayersArray = [];
    const juniorPlayersArray = [];

    // Process senior players
    for (const [playerName, playerData] of seniorPlayers) {
        const uniqueTournaments = [...new Set(playerData.tournaments.map(t => t.tournament))]; // Remove duplicate tournament entries
        const tournamentCount = uniqueTournaments.length;

        // Keep player if:
        // 1. They played in more than 2 senior tournaments (>= 3), OR
        // 2. There are fewer than 3 tournaments total for the year so far (beginning of year case)
        if (tournamentCount >= MIN_TOURNAMENTS_FOR_LEADERBOARD || earlyYearFallback) {
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
        // 1. They played in more than 2 junior tournaments (>= 3), OR
        // 2. There are fewer than 3 tournaments total for the year so far (beginning of year case)
        if (tournamentCount >= MIN_TOURNAMENTS_FOR_LEADERBOARD || earlyYearFallback) {
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
    const seniorPlayersPath = path.join(baseWwwFolder, 'senior-players.json');
    await fs.writeFile(seniorPlayersPath, JSON.stringify({
        generatedAt: new Date().toISOString(),
        year: currentYear,
        count: seniorPlayersArray.length,
        totalTournaments: totalTournaments,
        players: seniorPlayersArray
    }, null, 2), 'utf-8');

    // Write junior players file
    const juniorPlayersPath = path.join(baseWwwFolder, 'junior-players.json');
    await fs.writeFile(juniorPlayersPath, JSON.stringify({
        generatedAt: new Date().toISOString(),
        year: currentYear,
        count: juniorPlayersArray.length,
        totalTournaments: totalTournaments,
        players: juniorPlayersArray
    }, null, 2), 'utf-8');

    // Write unified players file (combine senior and junior)
    const combinedPlayersMap = new Map();
    const mergePlayerEntry = (player) => {
        const key = player.name;
        if (!combinedPlayersMap.has(key)) {
            // Clone to avoid mutating original arrays/objects
            combinedPlayersMap.set(key, {
                ...player,
                tournaments: Array.isArray(player.tournaments) ? [...player.tournaments] : [],
                points: player.points ? { ...player.points } : { standard: 0, rapid: 0, blitz: 0 },
            });
            return;
        }
        const existing = combinedPlayersMap.get(key);
        // Merge primitive fields preferring existing non-empty, otherwise take from incoming
        existing.id = existing.id || player.id || '';
        existing.fideId = existing.fideId || player.fideId || '';
        existing.gender = existing.gender || player.gender || '';
        existing.href = existing.href || player.href || '';
        // Merge tournaments (dedupe by tournament path)
        const allTournaments = [...(existing.tournaments || []), ...(player.tournaments || [])];
        const byTournament = new Map();
        for (const t of allTournaments) {
            if (!t || !t.tournament) continue;
            if (!byTournament.has(t.tournament)) {
                byTournament.set(t.tournament, t);
            } else {
                // If duplicate, prefer the one with defined score or ratingType
                const cur = byTournament.get(t.tournament);
                const better = (t.score ?? -Infinity) > (cur.score ?? -Infinity) ? t : cur;
                byTournament.set(t.tournament, better);
            }
        }
        existing.tournaments = Array.from(byTournament.values());
        // Merge points by rating type
        existing.points = existing.points || { standard: 0, rapid: 0, blitz: 0 };
        const incomingPoints = player.points || { standard: 0, rapid: 0, blitz: 0 };
        existing.points.standard = (existing.points.standard || 0) + (incomingPoints.standard || 0);
        existing.points.rapid = (existing.points.rapid || 0) + (incomingPoints.rapid || 0);
        existing.points.blitz = (existing.points.blitz || 0) + (incomingPoints.blitz || 0);
        // Recompute tournamentCount based on unique tournaments
        existing.tournamentCount = existing.tournaments.length;
        combinedPlayersMap.set(key, existing);
    };
    // Merge senior first then junior
    for (const p of seniorPlayersArray) mergePlayerEntry(p);
    for (const p of juniorPlayersArray) mergePlayerEntry(p);
    // Exclude no-tournament players from leaderboard (players.json)
    // noTournamentPlayers already declared above
    const noTournamentNames = new Set(noTournamentPlayers.map(p => p.name));
    const combinedPlayersArray = Array.from(combinedPlayersMap.values())
        .filter(player => !noTournamentNames.has(player.name))
        .sort((a, b) => a.name.localeCompare(b.name));
    const unifiedPlayersPath = path.join(baseWwwFolder, 'players.json');
    await fs.writeFile(unifiedPlayersPath, JSON.stringify({
        generatedAt: new Date().toISOString(),
        year: currentYear,
        count: combinedPlayersArray.length,
        seniorCount: seniorPlayersArray.length,
        juniorCount: juniorPlayersArray.length,
        totalTournaments: totalTournaments,
        players: combinedPlayersArray
    }, null, 2), 'utf-8');

    console.log(`\nUnique Players Summary for ${currentYear}:`);
    console.log(`Total tournaments in ${currentYear}: ${totalTournaments}`);
    console.log(`Senior Players (played in >=${MIN_TOURNAMENTS_FOR_LEADERBOARD} tournaments, or early-year fallback): ${seniorPlayersArray.length} players written to ${seniorPlayersPath}`);
    console.log(`Junior Players (played in >=${MIN_TOURNAMENTS_FOR_LEADERBOARD} tournaments, or early-year fallback): ${juniorPlayersArray.length} players written to ${juniorPlayersPath}`);
    console.log(`Unified Players: ${combinedPlayersArray.length} players written to ${unifiedPlayersPath}`);

    return {
        senior: seniorPlayersArray,
        junior: juniorPlayersArray,
        totalTournaments: totalTournaments
    };
}

// Process a single tournament folder and update tournament.json and player summaries
export async function processSingleTournament(targetFolder, baseWwwFolder = WWW_FOLDER) {
    console.log(`Processing single tournament: ${targetFolder}`);
    const result = await processFolder(targetFolder, { wwwFolder: baseWwwFolder });
    if (!result) {
        console.warn(`No valid tournament data produced for ${targetFolder}`);
        return null;
    }

    const folderName = result.folderName || path.basename(targetFolder);
    const topPlayers = result.top_players || [];
    const tournamentEntry = {
        data: result.metadata,
        path: `${folderName}/data.json`,
        category: result.category || result.metadata?.category || 'Junior',
        ...(topPlayers.length > 0 ? { top_players: topPlayers } : {})
    };

    // Update existing tournament.json preserving other tournaments
    const tournamentJsonPath = path.join(baseWwwFolder, 'tournament.json');
    let tournaments = [];
    try {
        const data = await fs.readFile(tournamentJsonPath, 'utf-8');
        tournaments = JSON.parse(data);
    } catch {
        tournaments = [];
    }

    const existingIdx = tournaments.findIndex(t => t.path === tournamentEntry.path);
    if (existingIdx >= 0) {
        tournaments[existingIdx] = tournamentEntry;
    } else {
        tournaments.push(tournamentEntry);
    }

    await fs.writeFile(tournamentJsonPath, JSON.stringify(tournaments, null, 2), 'utf-8');
    console.log(`Tournament metadata updated in ${tournamentJsonPath}`);

    // Regenerate unique players files
    console.log('\nUpdating unique players files...');
    await generateUniquePlayersFiles(tournaments, baseWwwFolder);

    return result;
}

// Process all tournament folders in WWW_FOLDER
export async function processAllTournaments(baseWwwFolder = WWW_FOLDER) {
    const allFolders = await fs.readdir(baseWwwFolder, { withFileTypes: true });
    const wwwFolders = allFolders
        .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('www'))
        .map(dirent => dirent.name);
    const tournaments = [];

    for (const folderName of wwwFolders) {
        const result = await processFolder(folderName, { wwwFolder: baseWwwFolder });
        if (result && result.metadata) {
            const topPlayers = result.top_players || [];
            tournaments.push({
                data: result.metadata,
                path: `${folderName}/data.json`,
                category: result.category || result.metadata.category || 'Junior',
                ...(topPlayers.length > 0 ? { top_players: topPlayers } : {})
            });
        }
    }

    // Write tournament.json in www folder
    const tournamentJsonPath = path.join(baseWwwFolder, 'tournament.json');
    await fs.writeFile(tournamentJsonPath, JSON.stringify(tournaments, null, 2), 'utf-8');
    console.log(`All tournaments metadata written to ${tournamentJsonPath}`);

    // Generate unique players files for current year
    console.log('\nGenerating unique players files...');
    await generateUniquePlayersFiles(tournaments, baseWwwFolder);

    return tournaments;
}

// const debugTournament = "www2025HobsonsBayKoshnitskyCupJuniors"; // Set to empty to process all tournaments
const debugTournament = ""; // Set to empty to process all tournaments

export async function main(folderOverride, baseWwwFolder = WWW_FOLDER) {
    // Check CLI argument: node src/prepare-data.mjs [folder] or --folder=[folder]
    const cliFolder = process.argv.slice(2).find(arg => !arg.startsWith('-')) ||
        process.argv.slice(2).find(arg => arg.startsWith('--folder='))?.split('=')[1];

    const targetFolder = folderOverride || cliFolder || debugTournament || "";

    if (targetFolder) {
        return await processSingleTournament(targetFolder, baseWwwFolder);
    } else {
        return await processAllTournaments(baseWwwFolder);
    }
}

// Execute when run directly from Node
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch(err => {
        console.error('Fatal error in prepare-data.mjs:', err);
        process.exit(1);
    });
}
