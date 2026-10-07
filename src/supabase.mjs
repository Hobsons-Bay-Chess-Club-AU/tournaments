import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Load environment variables from scripts/.env or root .env
function loadEnv() {
    const envPaths = [
        path.join(ROOT_DIR, 'scripts', '.env'),
        path.join(ROOT_DIR, '.env'),
        path.join(process.cwd(), 'scripts', '.env'),
        path.join(process.cwd(), '.env')
    ];

    for (const envPath of envPaths) {
        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath, quiet: true });
        }
    }
}

loadEnv();

let _supabaseClient = null;

export function getSupabase() {
    if (_supabaseClient) {
        return _supabaseClient;
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.warn('[Supabase] Warning: Missing SUPABASE_URL or SUPABASE_SECRET_KEY in environment.');
        return null;
    }

    _supabaseClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });

    return _supabaseClient;
}

export function isSupabaseConfigured() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
    return Boolean(supabaseUrl && supabaseKey);
}

/**
 * Format tournament metadata and full blob for Supabase 'tournaments' table
 */
export function formatTournamentRow(websiteName, result = {}, fullData = null) {
    const metadata = result.metadata || fullData?.metadata || {};
    const dateBegin = metadata['Date Begin'] || metadata['Date'] || '';
    const dateEnd = metadata['Date End'] || metadata['End Date'] || '';
    const ts = +dateBegin.split('/').reverse().join('') || 0;
    const year = dateEnd.split('/').pop() || dateBegin.split('/').pop() || '';
    const topPlayers = result.top_players || fullData?.top_players || [];
    const registeredPlayers = parseInt(metadata['Registered Players'], 10) ||
        (Array.isArray(fullData?.players) ? fullData.players.length : 0);

    const category = (result.category || metadata.category || fullData?.category || 'Junior').trim();
    const cleanCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

    return {
        slug: websiteName,
        name: metadata['Tournament Name'] || metadata['Place'] || websiteName,
        path: `${websiteName}/data.json`,
        category: cleanCategory,
        site: metadata['Site'] || metadata['Place'] || '',
        date_begin: dateBegin,
        date_end: dateEnd,
        year: year ? String(year) : '',
        date_ts: ts,
        rounds: String(metadata['Rounds'] || '0'),
        arbiter: metadata['Arbiter(s)'] || '',
        status: 'completed',
        player_count: registeredPlayers,
        top_players: topPlayers,
        metadata: metadata,
        data: fullData || result.data || {}
    };
}

/**
 * Upsert tournament to Supabase 'tournaments' table
 */
export async function upsertTournamentToSupabase({ websiteName, repoPath, result = {}, fullData = null }) {
    const supabase = getSupabase();
    if (!supabase) {
        return { success: false, reason: 'Supabase client not configured' };
    }

    try {
        let tournamentBlob = fullData;

        // If fullData is not passed, attempt to read data.json from disk
        if (!tournamentBlob && repoPath && websiteName) {
            const dataPath = path.join(repoPath, 'www', websiteName, 'data.json');
            if (fs.existsSync(dataPath)) {
                try {
                    tournamentBlob = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                } catch (err) {
                    console.warn(`[Supabase] Could not read ${dataPath}: ${err.message}`);
                }
            }
        }

        const row = formatTournamentRow(websiteName, result, tournamentBlob);

        console.log(`[Supabase] Upserting tournament: ${websiteName} (${row.name})...`);

        const { data, error } = await supabase
            .from('tournaments')
            .upsert(row, { onConflict: 'slug' })
            .select('id, slug, name');

        if (error) {
            console.error(`[Supabase] Error upserting tournament ${websiteName}:`, error.message);
            return { success: false, error };
        }

        console.log(`[Supabase] Successfully upserted tournament: ${websiteName}`);
        return { success: true, data };
    } catch (err) {
        console.error(`[Supabase] Exception upserting tournament ${websiteName}:`, err.message);
        return { success: false, error: err };
    }
}

/**
 * Format player master data row for Supabase 'players' table
 */
export function formatPlayerRow(player, defaultCategory = 'Unified') {
    const name = (player.name || '').trim();
    return {
        name: name,
        player_id: String(player.id || player.player_id || '').trim(),
        fide_id: String(player.fideId || player.fide_id || '').trim(),
        gender: player.gender || '',
        href: player.href || '',
        category: player.category || defaultCategory,
        tournament_count: Number(player.tournamentCount ?? (player.tournaments?.length || 0)),
        points: player.points || { standard: 0, rapid: 0, blitz: 0 },
        tournaments: Array.isArray(player.tournaments) ? player.tournaments : [],
        raw_data: player
    };
}

/**
 * Upsert players array to Supabase 'players' table in batches
 */
export async function upsertPlayersToSupabase({ players = [], repoPath = null, batchSize = 100 }) {
    const supabase = getSupabase();
    if (!supabase) {
        return { success: false, reason: 'Supabase client not configured' };
    }

    try {
        let playerList = players;

        // If no players array passed, try loading www/players.json from repoPath
        if ((!playerList || playerList.length === 0) && repoPath) {
            const playersJsonPath = path.join(repoPath, 'www', 'players.json');
            if (fs.existsSync(playersJsonPath)) {
                try {
                    const parsed = JSON.parse(fs.readFileSync(playersJsonPath, 'utf8'));
                    playerList = parsed.players || parsed;
                } catch (err) {
                    console.warn(`[Supabase] Could not read ${playersJsonPath}: ${err.message}`);
                }
            }
        }

        if (!Array.isArray(playerList) || playerList.length === 0) {
            console.log('[Supabase] No players to upsert.');
            return { success: true, count: 0 };
        }

        // Deduplicate players by name
        const uniqueMap = new Map();
        for (const p of playerList) {
            if (!p || !p.name) continue;
            const formatted = formatPlayerRow(p);
            uniqueMap.set(formatted.name, formatted);
        }

        const rows = Array.from(uniqueMap.values());
        console.log(`[Supabase] Upserting ${rows.length} players to Supabase in batches of ${batchSize}...`);

        let insertedCount = 0;
        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            const { error } = await supabase
                .from('players')
                .upsert(batch, { onConflict: 'name' });

            if (error) {
                console.error(`[Supabase] Error upserting players batch ${i} - ${i + batch.length}:`, error.message);
                return { success: false, count: insertedCount, error };
            }
            insertedCount += batch.length;
        }

        console.log(`[Supabase] Successfully upserted ${insertedCount} players.`);
        return { success: true, count: insertedCount };
    } catch (err) {
        console.error('[Supabase] Exception upserting players:', err.message);
        return { success: false, error: err };
    }
}

/**
 * Backfill / Sync all existing tournaments and players from repo files to Supabase
 */
export async function syncAllToSupabase(repoPath = ROOT_DIR) {
    const supabase = getSupabase();
    if (!supabase) {
        console.error('[Supabase] Cannot sync: Supabase client is not configured.');
        return { success: false, reason: 'Supabase client not configured' };
    }

    const wwwPath = path.join(repoPath, 'www');
    const tournamentJsonPath = path.join(wwwPath, 'tournament.json');

    console.log('========================================================');
    console.log('Starting full sync to Supabase: Tournaments & Players');
    console.log('========================================================');

    let tournamentsUpserted = 0;
    if (fs.existsSync(tournamentJsonPath)) {
        try {
            const tournaments = JSON.parse(fs.readFileSync(tournamentJsonPath, 'utf8'));
            console.log(`[Supabase] Found ${tournaments.length} tournaments in ${tournamentJsonPath}`);

            for (const item of tournaments) {
                if (!item.path) continue;
                const websiteName = item.path.replace(/\/data\.json$/, '');
                const tournamentFolder = path.join(wwwPath, websiteName);
                const dataJsonPath = path.join(tournamentFolder, 'data.json');

                let fullData = null;
                if (fs.existsSync(dataJsonPath)) {
                    try {
                        fullData = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
                    } catch {}
                }

                const resultObj = {
                    metadata: item.data || fullData?.metadata || {},
                    category: item.category || fullData?.category,
                    top_players: item.top_players || fullData?.top_players || []
                };

                const res = await upsertTournamentToSupabase({
                    websiteName,
                    repoPath,
                    result: resultObj,
                    fullData: fullData
                });

                if (res.success) {
                    tournamentsUpserted++;
                }
            }
        } catch (err) {
            console.error('[Supabase] Error syncing tournaments:', err.message);
        }
    } else {
        console.warn(`[Supabase] ${tournamentJsonPath} not found.`);
    }

    // Sync master players
    const playersRes = await upsertPlayersToSupabase({ repoPath });

    console.log('========================================================');
    console.log(`Sync complete: ${tournamentsUpserted} tournaments, ${playersRes.count || 0} players.`);
    console.log('========================================================');

    return {
        success: true,
        tournamentsCount: tournamentsUpserted,
        playersCount: playersRes.count || 0
    };
}
