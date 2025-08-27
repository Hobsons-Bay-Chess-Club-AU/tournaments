// Utility function to load rating data from separate JSON files
// This is a placeholder for when you have actual rating files

export type RatingData = {
  [playerName: string]: {
    standard_rating?: number;
    rapid_rating?: number;
    blitz_rating?: number;
    acf_rating?: number;
    acf_quick_rating?: number;
  };
};

export type Player = {
  name: string;
  title?: string;
  id: string;
  fideId: string;
  acfId?: string;
  gender: string;
  href: string;
  tournamentCount: number;
  tournaments: string[];
  fideStandard?: number;
  fideRapid?: number;
  fideBlitz?: number;
  acfClassic?: number;
  acfQuick?: number;
};

export type PlayerRatings = Record<string, number | undefined>;

// Simulated rating data for development
export function generateSimulatedRatings(players: Player[], isSenior: boolean = true): Player[] {
  const baseRating = isSenior ? 1200 : 800;
  const range = isSenior ? 500 : 400;
  
  return players.map((player) => ({
    ...player,
    standard_rating: Math.floor(Math.random() * range) + baseRating,
    rapid_rating: Math.floor(Math.random() * range) + baseRating,
    blitz_rating: Math.floor(Math.random() * range) + baseRating,
    acf_rating: Math.floor(Math.random() * range) + baseRating,
    acf_quick_rating: Math.floor(Math.random() * range) + baseRating,
  }));
}

