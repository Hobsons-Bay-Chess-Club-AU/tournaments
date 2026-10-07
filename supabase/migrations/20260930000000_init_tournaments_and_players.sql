-- Migration: 20260930000000_init_tournaments_and_players.sql
-- Description: Create migrations tracking, tournaments and players tables with metadata, JSON blobs, indexes, and RLS

-- ============================================================
-- 1. Schema Migrations Tracking & RPC for future migrations
-- ============================================================
CREATE TABLE IF NOT EXISTS public._migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Record this initial migration
INSERT INTO public._migrations (version, name)
VALUES ('20260930000000', 'init_tournaments_and_players')
ON CONFLICT (version) DO NOTHING;

-- Migration executor function for subsequent migrations
CREATE OR REPLACE FUNCTION public.run_migration(migration_version TEXT, migration_name TEXT, sql_content TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public._migrations WHERE version = migration_version) THEN
        RETURN jsonb_build_object('status', 'skipped', 'version', migration_version, 'message', 'Migration already applied');
    END IF;

    EXECUTE sql_content;

    INSERT INTO public._migrations (version, name)
    VALUES (migration_version, migration_name);

    RETURN jsonb_build_object('status', 'applied', 'version', migration_version, 'name', migration_name);
END;
$$;

-- Restrict migration execution strictly to service_role
REVOKE EXECUTE ON FUNCTION public.run_migration(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_migration(TEXT, TEXT, TEXT) TO service_role;

-- ============================================================
-- 2. Helper function for updated_at timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. Tournaments Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,                         -- e.g. 'www2026VictorianWomensChampionship' or '2026VictorianWomensChampionship'
    name TEXT NOT NULL,                                -- Tournament display name
    path TEXT,                                         -- e.g. 'www2026VictorianWomensChampionship/data.json'
    category TEXT DEFAULT 'Junior',                    -- 'Junior', 'Senior', etc.
    site TEXT,                                         -- Host location / venue
    date_begin TEXT,                                   -- Start date string (DD/MM/YYYY)
    date_end TEXT,                                     -- End date string (DD/MM/YYYY)
    year TEXT,                                         -- Tournament year e.g. '2026'
    date_ts BIGINT DEFAULT 0,                          -- Numeric timestamp e.g. 20260912 for fast ordering
    rounds TEXT,                                       -- Number of rounds
    arbiter TEXT,                                      -- Arbiter name(s)
    status TEXT DEFAULT 'completed',                   -- 'completed', 'ongoing', 'upcoming'
    player_count INTEGER DEFAULT 0,                    -- Total registered players
    top_players JSONB DEFAULT '[]'::jsonb,             -- Summary of top players & podium
    metadata JSONB DEFAULT '{}'::jsonb,                -- Raw tournament header / metadata
    data JSONB DEFAULT '{}'::jsonb,                    -- Complete tournament JSON blob (standings, pages, players, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for tournaments updated_at
DROP TRIGGER IF EXISTS trigger_tournaments_updated_at ON public.tournaments;
CREATE TRIGGER trigger_tournaments_updated_at
    BEFORE UPDATE ON public.tournaments
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Indexes for tournaments
CREATE INDEX IF NOT EXISTS idx_tournaments_slug ON public.tournaments(slug);
CREATE INDEX IF NOT EXISTS idx_tournaments_date_ts ON public.tournaments(date_ts DESC);
CREATE INDEX IF NOT EXISTS idx_tournaments_year ON public.tournaments(year);
CREATE INDEX IF NOT EXISTS idx_tournaments_category ON public.tournaments(category);

-- ============================================================
-- 4. Players Table (Master player data)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,                         -- Master player name (unique key for upsert)
    player_id TEXT,                                    -- Local / ACF player ID
    fide_id TEXT,                                      -- FIDE ID
    gender TEXT,                                       -- 'male', 'female', etc.
    href TEXT,                                         -- Player card link
    category TEXT DEFAULT 'Unified',                   -- 'Senior', 'Junior', 'Unified'
    tournament_count INTEGER DEFAULT 0,                -- Number of tournaments played
    points JSONB DEFAULT '{"standard": 0, "rapid": 0, "blitz": 0}'::jsonb, -- Points breakdown
    tournaments JSONB DEFAULT '[]'::jsonb,             -- Array of tournament records & scores
    raw_data JSONB DEFAULT '{}'::jsonb,                -- Extra raw player attributes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for players updated_at
DROP TRIGGER IF EXISTS trigger_players_updated_at ON public.players;
CREATE TRIGGER trigger_players_updated_at
    BEFORE UPDATE ON public.players
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Indexes for players
CREATE INDEX IF NOT EXISTS idx_players_name ON public.players(name);
CREATE INDEX IF NOT EXISTS idx_players_tournament_count ON public.players(tournament_count DESC);
CREATE INDEX IF NOT EXISTS idx_players_fide_id ON public.players(fide_id);
CREATE INDEX IF NOT EXISTS idx_players_player_id ON public.players(player_id);

-- ============================================================
-- 5. Enable Row Level Security (RLS)
-- ============================================================
ALTER TABLE public._migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- _migrations policies
DROP POLICY IF EXISTS "Allow service_role full access on _migrations" ON public._migrations;
CREATE POLICY "Allow service_role full access on _migrations"
    ON public._migrations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Tournaments RLS Policies
DROP POLICY IF EXISTS "Allow public read access on tournaments" ON public.tournaments;
CREATE POLICY "Allow public read access on tournaments"
    ON public.tournaments FOR SELECT TO anon, authenticated, service_role USING (true);

DROP POLICY IF EXISTS "Allow service_role full access on tournaments" ON public.tournaments;
CREATE POLICY "Allow service_role full access on tournaments"
    ON public.tournaments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Players RLS Policies
DROP POLICY IF EXISTS "Allow public read access on players" ON public.players;
CREATE POLICY "Allow public read access on players"
    ON public.players FOR SELECT TO anon, authenticated, service_role USING (true);

DROP POLICY IF EXISTS "Allow service_role full access on players" ON public.players;
CREATE POLICY "Allow service_role full access on players"
    ON public.players FOR ALL TO service_role USING (true) WITH CHECK (true);
