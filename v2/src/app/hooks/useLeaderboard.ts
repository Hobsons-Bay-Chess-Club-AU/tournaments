import { useEffect, useState } from "react";
import type { Player } from "@/utils/ratingLoader";

export function useLeaderboard(type: "junior" | "open") {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLeaderboardData = async () => {
      try {
        setLoading(true);
        const fileName = `${type}-ratings.json`;
        const response = await fetch(`/${fileName}?t=${Date.now()}`);
        if (!response.ok) {
          throw new Error(`Failed to load ${type} ratings data`);
        }
        const data = await response.json();
        setPlayers(data.players || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    loadLeaderboardData();
  }, [type]);

  return { players, loading, error };
}
