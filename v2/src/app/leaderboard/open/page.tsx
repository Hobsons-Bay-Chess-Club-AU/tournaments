"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import HomeHero from "@/components/HomeHero";
import FilterTabs from "@/components/FilterTabs";
import { Player, calculateAge, isAdult, getAgeGroup } from "@/utils/ratingLoader";

type LeaderboardData = {
  generatedAt: string;
  year: string;
  count: number;
  totalTournaments: number;
  players: Player[];
};

const RATING_CATEGORIES = ["FIDE Standard", "FIDE Rapid", "FIDE Blitz", "ACF Classic", "ACF Quick"];

export default function OpenLeaderboardPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("FIDE Standard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const loadLeaderboardData = async () => {
      try {
        setLoading(true);
        
        // Load open players data
        const response = await fetch(`/open-ratings.json?t=${Date.now()}`);
        if (!response.ok) {
          throw new Error('Failed to load open players data');
        }
        
        const data: LeaderboardData = await response.json();
        setPlayers(data.players);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboardData();
  }, []);

  const getRatingForCategory = (player: Player, category: string): number => {
    switch (category) {
      case "FIDE Standard":
        return player.fideStandard || 0;
      case "FIDE Rapid":
        return player.fideRapid || 0;
      case "FIDE Blitz":
        return player.fideBlitz || 0;
      case "ACF Classic":
        return player.acfClassic || 0;
      case "ACF Quick":
        return player.acfQuick || 0;
      default:
        return 0;
    }
  };


  
  const sortedPlayers = [...players].sort((a, b) => {
    const ratingA = getRatingForCategory(a, activeCategory);
    const ratingB = getRatingForCategory(b, activeCategory);
    return ratingB - ratingA; // Sort by rating descending
  });

  const getRatingColor = (rating: number): string => {
    if (rating >= 2000) return "text-purple-600 font-bold";
    if (rating >= 1800) return "text-blue-600 font-semibold";
    if (rating >= 1600) return "text-green-600 font-semibold";
    if (rating >= 1400) return "text-yellow-600";
    return "text-gray-600";
  };

  const getAgeColor = (birthYear: number): string => {
    const age = calculateAge(birthYear);
    if (age < 18) return "text-green-600 bg-green-100";
    if (age < 25) return "text-blue-600 bg-blue-100";
    if (age < 35) return "text-yellow-600 bg-yellow-100";
    return "text-purple-600 bg-purple-100";
  };

  if (loading) {
    return (
      <div className="font-sans min-h-screen bg-gradient-to-br from-blue-50 to-blue-200">
        <HomeHero />
        <div className="bg-white min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading open leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="font-sans min-h-screen bg-gradient-to-br from-blue-50 to-blue-200">
        <HomeHero />
        <div className="bg-white min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <p className="text-red-600 mb-4">Error loading leaderboard</p>
            <p className="text-gray-600">{error}</p>
            <Link href="/leaderboard" className="mt-4 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Back to Leaderboards
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen bg-gradient-to-br from-blue-50 to-blue-200">
      <HomeHero />
      
      <div className="bg-white min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white py-8">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Open Leaderboard</h1>
                <p className="text-yellow-100 mt-2">
                  {players.length} players • {sortedPlayers[0]?.tournamentCount || 0} tournaments max participation
                </p>
              </div>
              <Link href="/leaderboard" className="bg-white text-yellow-600 px-4 py-2 rounded-lg font-semibold hover:bg-yellow-50 transition-colors">
                ← Back
              </Link>
            </div>
          </div>
        </div>

        {/* Rating Category Tabs */}
        <FilterTabs
          options={RATING_CATEGORIES}
          activeOption={activeCategory}
          onOptionChange={setActiveCategory}
        />



        {/* Leaderboard Table */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activeCategory} Rating
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Age
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tournaments
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      FIDE ID
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedPlayers.map((player, index) => {
                    const rating = getRatingForCategory(player, activeCategory);
                    const rank = index + 1;
                    const age = player.birthYear ? calculateAge(player.birthYear) : null;
                    const ageGroup = player.birthYear ? getAgeGroup(player.birthYear) : null;
                    
                    return (
                      <tr key={player.name} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`text-lg font-bold ${
                              rank === 1 ? 'text-yellow-500' : 
                              rank === 2 ? 'text-gray-400' : 
                              rank === 3 ? 'text-yellow-600' : 'text-gray-600'
                            }`}>
                              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                                <span className="text-yellow-600 font-semibold">
                                  {player.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {player.name}
                                {player.title && <span className="ml-2 text-xs text-blue-600 font-semibold">{player.title}</span>}
                              </div>
                              <div className="text-sm text-gray-500">
                                {player.gender === 'male' ? '♂' : player.gender === 'female' ? '♀' : '⚪'} {player.gender}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-lg font-semibold ${getRatingColor(rating)}`}>
                            {rating > 0 ? rating : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {age ? (
                            <div>
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getAgeColor(player.birthYear!)}`}>
                                {age} ({ageGroup})
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">
                            {player.tournamentCount}
                          </div>
                          <div className="text-xs text-gray-500">
                            tournaments
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {player.fideId || 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-8 bg-yellow-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">
              About Open Players
            </h3>
            <p className="text-yellow-800 mb-4">
              These players have demonstrated consistent participation in open tournaments throughout the year, 
              showing their dedication and competitive spirit in the chess community.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-yellow-700">
              <div>
                <strong>Eligibility:</strong>
                <ul className="list-disc list-inside mt-1 ml-4">
                  <li>Multiple tournament participation</li>
                  <li>Open category tournaments</li>
                  <li>Active in current year</li>
                </ul>
              </div>
              <div>
                <strong>Rating Categories:</strong>
                <ul className="list-disc list-inside mt-1 ml-4">
                  <li>FIDE Standard (Classical)</li>
                  <li>FIDE Rapid</li>
                  <li>FIDE Blitz</li>
                  <li>ACF Classic</li>
                  <li>ACF Quick</li>
                </ul>
              </div>
              <div>
                <strong>Age Groups:</strong>
                <ul className="list-disc list-inside mt-1 ml-4">
                  <li>U8, U10, U12, U14, U16, U18</li>
                  <li>U21, Open</li>
                  <li>Filter by age range</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
