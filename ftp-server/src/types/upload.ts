export interface TournamentUploadItem {
  id: string;
  tournamentName: string;
  folder: string;
  timestamp: string;
  playerCount?: number;
  category?: string;
  supabaseStatus?: string;
  githubStatus?: string;
  filesGenerated?: string[];
  success: boolean;
  message?: string;
}
