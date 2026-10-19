import { getSupabaseClient } from './supabase';
import type { TopPlayer, TournamentStatus } from '@/components/TournamentCard';

export type TournamentMeta = {
  [key: string]: string;
};

export type Tournament = {
  data: TournamentMeta;
  path: string;
  category: string;
  top_players?: TopPlayer[];
  status?: TournamentStatus;
};

export type TableCaption = string | {
  playerName?: string;
  id?: string | number;
  moreInfo?: {
    anchor?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type Header = { name: string; key: string };
export type MixedHeader = Header | string;

export type PageData = {
  pageHeading?: string;
  tables?: {
    headers?: MixedHeader[];
    rows?: Record<string, unknown>[];
    caption?: TableCaption;
    footer?: {
      text: string;
      html: string;
    };
    type?: string;
    tournamentType?: string;
    matches?: Array<{
      matchNumber: string;
      team1: { country: string; teamName: string; teamScore: string; matchScore: string; };
      team2: { country: string; teamName: string; teamScore: string; matchScore: string; };
      boardPairings: Array<{
        board: string;
        white: { name: string; rating: string; score: string; };
        black: { name: string; rating: string; score: string; };
      }>;
    }>;
  }[];
  pairingScheduleText?: string;
};

export type Player = {
  id: string;
  name: string;
  title: string;
  federation: string;
  fideId: string;
  fideRating: number | null;
  fideFederation: string;
  gender: string;
  href: string;
  origin: string;
};

export type MenuItem = {
  text?: string;
  href?: string;
  name?: string;
  url?: string;
  isDropdown?: boolean;
  children?: MenuItem[];
};

export type TournamentData = {
  generatedAt: string;
  tournament: {
    id: string;
    name: string;
    category: string;
    metadata: Record<string, unknown>;
  };
  players: Player[];
  pages: Record<string, PageData>;
  menu: MenuItem[];
};

export function parseAusDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
}

export function computeStatus(dateBeginStr: string, dateEndStr: string): TournamentStatus {
  const now = new Date();
  const beginDateObj = parseAusDate(dateBeginStr);
  const endDateObj = parseAusDate(dateEndStr || dateBeginStr);
  if (beginDateObj.getTime() > now.getTime()) {
    return 'Planned';
  } else if (beginDateObj.getTime() <= now.getTime() && endDateObj.getTime() >= now.getTime()) {
    return 'In Progress';
  }
  return 'Completed';
}

export function mapSupabaseRowToTournament(row: Record<string, unknown>): Tournament {
  const metadata = (row.metadata as Record<string, unknown>) || {};
  const dateBegin = String(row.date_begin || metadata['Date Begin'] || metadata['Date'] || '');
  const dateEnd = String(row.date_end || metadata['Date End'] || metadata['End Date'] || '');
  const slug = String(row.slug || '').replace(/^www/, '');

  const dataMap: TournamentMeta = {
    'Tournament Name': String(row.name || metadata['Tournament Name'] || slug),
    'Date Begin': dateBegin,
    'Date End': dateEnd,
    'Category': String(row.category || metadata['Category'] || 'Senior'),
    'Registered Players': String(row.player_count || metadata['Registered Players'] || '0'),
  };

  Object.entries(metadata).forEach(([k, v]) => {
    if (!(k in dataMap) && v !== null && v !== undefined) {
      dataMap[k] = String(v);
    }
  });

  return {
    path: `${slug}/data.json`,
    category: String(row.category || 'Senior'),
    data: dataMap,
    top_players: Array.isArray(row.top_players) ? (row.top_players as TopPlayer[]) : undefined,
    status: computeStatus(dateBegin, dateEnd),
  };
}

export function normalizeTournamentData(raw: unknown): TournamentData | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;

  const pages = (data.pages || data.page || {}) as Record<string, PageData>;
  const metadata = (data.metadata || {}) as Record<string, unknown>;
  const tournamentObj = (data.tournament as Record<string, unknown>) || {
    id: String(data.tournamentId || ''),
    name: String(metadata['Tournament Name'] || data.name || ''),
    category: String(data.category || 'Senior'),
    metadata: metadata,
  };

  let players: Player[] = [];
  if (Array.isArray(data.players)) {
    players = data.players as Player[];
  } else if (Array.isArray(data.playerLookup)) {
    players = data.playerLookup as Player[];
  } else if (data.playerLookup && typeof data.playerLookup === 'object') {
    players = Object.values(data.playerLookup) as Player[];
  }

  const menu = Array.isArray(data.menu) ? (data.menu as MenuItem[]) : [];
  const generatedAt = typeof data.generatedAt === 'string' ? data.generatedAt : '';

  return {
    generatedAt,
    tournament: tournamentObj as TournamentData['tournament'],
    players,
    pages,
    menu,
  };
}

export async function getTournaments(): Promise<Tournament[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tournaments')
      .select('slug, name, category, date_begin, date_end, year, status, player_count, top_players, metadata')
      .order('date_ts', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map(mapSupabaseRowToTournament);
    }
  } catch (err) {
    console.warn('[TournamentService] Supabase getTournaments query failed, falling back to tournament.json:', err);
  }

  // Fallback to static tournament.json
  try {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
    const res = await fetch(`${appUrl}/tournament.json?TS=${Date.now()}`);
    if (res.ok) {
      const json: Tournament[] = await res.json();
      return json.map((t) => {
        const dateBegin = t.data['Date Begin'] || t.data['Date'] || '';
        const dateEnd = t.data['Date End'] || t.data['End Date'] || '';
        return {
          ...t,
          status: computeStatus(dateBegin, dateEnd),
        };
      });
    }
  } catch (err) {
    console.error('[TournamentService] Fallback to tournament.json also failed:', err);
  }

  return [];
}

export async function getTournamentBySlug(tournamentSlug: string): Promise<TournamentData | null> {
  const cleanSlug = tournamentSlug.replace(/^www/, '');
  const folderName = `www${cleanSlug}`;

  // 1. Try Supabase
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tournaments')
      .select('data, metadata, name, category, status')
      .or(`slug.eq.${cleanSlug},slug.eq.${folderName}`)
      .maybeSingle();

    if (!error && data && data.data && typeof data.data === 'object' && Object.keys(data.data).length > 0) {
      const normalized = normalizeTournamentData(data.data);
      if (normalized) {
        return normalized;
      }
    }
  } catch (err) {
    console.warn(`[TournamentService] Supabase getTournamentBySlug for ${cleanSlug} failed:`, err);
  }

  // 2. Fallback to HTTP fetching data_clean.json then data.json
  const primaryBase = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');
  const cleanUrl = `${primaryBase}/${folderName}/data_clean.json?ts=${Date.now()}`;
  const fallbackUrl = `${primaryBase}/${folderName}/data.json?ts=${Date.now()}`;

  try {
    const res = await fetch(cleanUrl);
    if (res.ok) {
      const json = await res.json();
      return normalizeTournamentData(json);
    }
  } catch {}

  try {
    const resFallback = await fetch(fallbackUrl);
    if (resFallback.ok) {
      const json = await resFallback.json();
      return normalizeTournamentData(json);
    }
  } catch {}

  return null;
}

export async function getAllTournamentSlugs(): Promise<string[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('tournaments').select('slug');
    if (!error && Array.isArray(data) && data.length > 0) {
      return data
        .map((row) => String(row.slug || '').replace(/^www/, ''))
        .filter(Boolean);
    }
  } catch (err) {
    console.warn('[TournamentService] Supabase getAllTournamentSlugs failed, falling back to local tournament.json:', err);
  }

  // Fallback to local tournament.json if running in Node.js environment
  try {
    if (typeof window === 'undefined') {
      const fs = await import('fs');
      const path = await import('path');
      const tournamentJsonPath = path.join(process.cwd(), '..', 'www', 'tournament.json');
      if (fs.existsSync(tournamentJsonPath)) {
        const fileContent = fs.readFileSync(tournamentJsonPath, 'utf-8');
        const list: { path: string }[] = JSON.parse(fileContent);
        return list.map((item) => {
          const folder = item.path.split('/')[0];
          return folder.replace(/^www/, '');
        });
      }
    }
  } catch (err) {
    console.warn('[TournamentService] Local tournament.json fallback error:', err);
  }

  return [];
}
