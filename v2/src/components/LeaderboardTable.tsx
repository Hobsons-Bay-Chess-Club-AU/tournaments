"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import FilterTabs from "@/components/FilterTabs";
import { Player, calculateAge, getAgeGroup } from "@/utils/ratingLoader";
import PlayerModal from "@/components/PlayerModal";

type LeaderboardData = {
  generatedAt: string;
  year: string;
  count: number;
  totalTournaments: number;
  players: Player[];
};

const RATING_CATEGORIES = ["Points", "Standard", "Rapid", "Blitz", "ACF Classic", "ACF Quick"];

type LeaderboardType = 'open' | 'junior';

interface LeaderboardTableProps {
  type: LeaderboardType;
}

export default function LeaderboardTable({ type }: LeaderboardTableProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("Points");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ageFilter, setAgeFilter] = useState<string>("under18");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [genderFilter, setGenderFilter] = useState<string>("all");

  const isJunior = type === 'junior';
  const dataFile = isJunior ? 'junior-ratings.json' : 'open-ratings.json';
  const title = isJunior ? 'Junior Leaderboard' : 'Open Leaderboard';
  const loadingColor = isJunior ? 'green' : 'yellow';

  useEffect(() => {
    const loadLeaderboardData = async () => {
      try {
        setLoading(true);

        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/${dataFile}?t=${Date.now()}`);
        if (!response.ok) {
          throw new Error(`Failed to load ${type} players data`);
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
  }, [dataFile, type]);

  const getRatingForCategory = (player: Player, category: string): number => {
    switch (category) {
      case "Points":
        // Calculate total points from classical (standard) games only
        if (!player.tournaments || player.tournaments.length === 0) return 0;
        return player.tournaments
          .filter(tournament => tournament.ratingType === 'standard')
          .reduce((total, tournament) => total + tournament.score, 0);
      case "Standard":
        return player.fideStandard || 0;
      case "Rapid":
        return player.fideRapid || 0;
      case "Blitz":
        return player.fideBlitz || 0;
      case "ACF Classic":
        return player.acfClassic || 0;
      case "ACF Quick":
        return player.acfQuick || 0;
      default:
        return 0;
    }
  };

  const filterPlayersByAge = (players: Player[], filter: string): Player[] => {
    if (!isJunior) return players; // No filtering for open leaderboard

    return players.filter(player => {
      // Gender filter: only apply for junior and when girls selected
      if (genderFilter === 'girls') {
        const isFemale = (player.gender || '').toLowerCase() === 'female';
        if (!isFemale) return false;
      }

      if (!player.birthYear) return true; // Include players without birth year

      const age = calculateAge(player.birthYear);

      // For Junior  & Rookies Leaderboard, always filter out players 18 and older
      if (age >= 18) return false;

      switch (filter) {
        case "under18":
          return age < 18;
        case "under16":
          return age < 16;
        case "under14":
          return age < 14;
        case "under12":
          return age < 12;
        case "under10":
          return age < 10;
        case "under8":
          return age < 8;
        case "all":
          return true; // This will now only include players under 18 due to the filter above
        default:
          return age < 18;
      }
    });
  };

  const filteredPlayers = filterPlayersByAge(players, ageFilter);

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const ratingA = getRatingForCategory(a, activeCategory);
    const ratingB = getRatingForCategory(b, activeCategory);
    return ratingB - ratingA; // Sort by rating descending
  });

  const getRatingColor = (rating: number): string => {
    if (isJunior) {
      if (rating >= 1600) return "text-purple-600 font-bold";
      if (rating >= 1400) return "text-primary-600 font-semibold";
      if (rating >= 1200) return "text-green-600 font-semibold";
      if (rating >= 1000) return "text-yellow-600";
      return "text-gray-600";
    } else {
      if (rating >= 2000) return "text-purple-600 font-bold";
      if (rating >= 1800) return "text-primary-600 font-semibold";
      if (rating >= 1600) return "text-green-600 font-semibold";
      if (rating >= 1400) return "text-yellow-600";
      return "text-gray-600";
    }
  };

  const getAgeColor = (birthYear: number): string => {
    const age = calculateAge(birthYear);
    if (isJunior) {
      if (age < 8) return "text-purple-600 bg-purple-100";
      if (age < 10) return "text-primary-600 bg-primary-100";
      if (age < 12) return "text-green-600 bg-green-100";
      if (age < 14) return "text-yellow-600 bg-yellow-100";
      if (age < 16) return "text-orange-600 bg-orange-100";
      return "text-red-600 bg-red-100";
    } else {
      if (age < 18) return "text-green-600 bg-green-100";
      if (age < 25) return "text-primary-600 bg-primary-100";
      if (age < 35) return "text-yellow-600 bg-yellow-100";
      return "text-purple-600 bg-purple-100";
    }
  };

  const getAvatarColor = () => {
    return isJunior ? 'bg-green-100' : 'bg-yellow-100';
  };

  const getAvatarTextColor = () => {
    return isJunior ? 'text-green-600' : 'text-yellow-600';
  };

  const getHeaderGradient = () => {
    return isJunior
      ? 'bg-gradient-to-r from-green-400 to-green-600'
      : 'bg-gradient-to-r from-yellow-400 to-yellow-600';
  };

  const getHeaderTextColor = () => {
    return isJunior ? 'text-green-100' : 'text-yellow-100';
  };

  const getBackButtonColor = () => {
    return isJunior ? 'text-green-600 hover:bg-green-50' : 'text-yellow-600 hover:bg-yellow-50';
  };

  const getInfoSectionColor = () => {
    return isJunior ? 'bg-green-50' : 'bg-yellow-50';
  };

  const getInfoTextColor = () => {
    return isJunior ? 'text-green-900' : 'text-yellow-900';
  };

  const getInfoContentColor = () => {
    return isJunior ? 'text-green-800' : 'text-yellow-800';
  };

  const getInfoListColor = () => {
    return isJunior ? 'text-green-700' : 'text-yellow-700';
  };

  if (loading) {
    return (
      <div className="font-sans min-h-screen bg-gradient-to-br from-primary-50 to-primary-200">
        <div className="bg-white min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-${loadingColor}-600 mx-auto mb-4`}></div>
            <p className="text-gray-600">Loading {type} leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="font-sans min-h-screen bg-gradient-to-br from-primary-50 to-primary-200">
        <div className="bg-white min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <p className="text-red-600 mb-4">Error loading leaderboard</p>
            <p className="text-gray-600">{error}</p>
            <Link href="/leaderboard" className="mt-4 inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              Back to Leaderboards
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen bg-gradient-to-br from-primary-50 to-primary-200">

      <div className="bg-white min-h-screen">
        {/* Header */}
        <div className={`${getHeaderGradient()} text-white py-8`}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">{title}</h1>
                <p className={`${getHeaderTextColor()} mt-2`}>
                  {filteredPlayers.length} players • {sortedPlayers[0]?.tournamentCount || 0} tournaments max participation
                </p>
              </div>
              <Link href="/leaderboard" className={`bg-white ${getBackButtonColor()} px-4 py-2 rounded-lg font-semibold transition-colors`}>
                ← Back
              </Link>
            </div>
          </div>
        </div>

        {/* Rating Category Tabs */}
        <div className="max-w-7xl mx-auto px-0 md:px-4">
          <FilterTabs
            options={RATING_CATEGORIES}
            activeOption={activeCategory}
            onOptionChange={setActiveCategory}
          />
          {activeCategory === "Points" && (
            <div className="mt-3 p-3 bg-primary-50 border border-primary-200 rounded-lg mx-2 md:mx-0">
              <p className="text-sm text-primary-800">
                <span className="font-semibold">Points:</span> Total accumulated points from all standard (classical) games across tournaments
              </p>
            </div>
          )}
        </div>

        {/* Age Filter - Only for Junior */}
        {isJunior && (
          <div className="max-w-7xl mx-auto px-2 md:px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 w-full sm:w-auto">
                <label className="text-sm font-medium text-green-800 mb-2 sm:mb-0">Age Filter:</label>
                <select
                  value={ageFilter}
                  onChange={(e) => setAgeFilter(e.target.value)}
                  className="border border-green-300 rounded-md px-3 py-2 text-sm bg-white text-green-800 w-full sm:w-56"
                >
                  <option value="under18">Under 18</option>
                  <option value="under16">Under 16</option>
                  <option value="under14">Under 14</option>
                  <option value="under12">Under 12</option>
                  <option value="under10">Under 10</option>
                  <option value="under8">Under 8</option>
                  <option value="all">All Junior Players</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 w-full sm:w-auto">
                <label className="text-sm font-medium text-green-800 mb-2 sm:mb-0">Gender:</label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="border border-green-300 rounded-md px-3 py-2 text-sm bg-white text-green-800 w-full sm:w-56"
                >
                  <option value="all">All</option>
                  <option value="girls">Girls</option>
                </select>
              </div>
              <div className="text-sm text-green-700 w-full sm:w-auto sm:text-right">
                Showing {filteredPlayers.length} of {players.length} players
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-6 sm:py-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activeCategory === "Points" ? "Total Points" : `${activeCategory} Rating`}
                    </th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Age
                    </th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Tournaments
                    </th>
                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
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
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`text-lg font-bold ${rank === 1 ? 'text-yellow-500' :
                              rank === 2 ? 'text-gray-400' :
                                rank === 3 ? 'text-yellow-600' : 'text-gray-600'
                              }`}>
                              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4">
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => setSelectedPlayer(player)}
                              className="flex items-center text-left"
                            >
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className={`h-10 w-10 rounded-full ${getAvatarColor()} flex items-center justify-center`}>
                                  <span className={`font-semibold ${getAvatarTextColor()}`}>
                                    {player.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 hover:text-primary-600 cursor-pointer" onClick={() => setSelectedPlayer(player)}>
                                  {player.name}
                                  {player.title && <span className="ml-2 text-xs text-primary-600 font-semibold">{player.title}</span>}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {player.gender === 'male' ? '♂' : player.gender === 'female' ? '♀' : '⚪'} {player.gender}
                                </div>
                                {/* Mobile-only extra info */}
                                <div className="mt-1 flex items-center gap-3 sm:hidden text-xs text-gray-500">
                                  <span className="">
                                    Rating: <span className={`font-semibold ${getRatingColor(rating)}`}>{rating > 0 ? rating : 'N/A'}</span>
                                  </span>
                                  {age ? (
                                    <span className="">
                                      Age: <span className={`inline-block px-2 py-0.5 rounded-full ${getAgeColor(player.birthYear!)}`}>{age}</span>
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                          <span className={`text-lg font-semibold ${getRatingColor(rating)}`}>
                            {rating > 0 ? rating : 'N/A'}
                          </span>
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap hidden sm:table-cell">
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
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap hidden md:table-cell">
                          <div className="text-sm text-gray-900 font-medium">
                            {player.tournamentCount}
                          </div>
                          <div className="text-xs text-gray-500">
                            tournaments
                          </div>
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                          {player.fideId ? (
                            <a
                              href={`https://ratings.fide.com/profile/${player.fideId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-primary-600 hover:text-primary-800 hover:underline transition-colors font-medium"
                              title={`View ${player.name}'s FIDE Profile`}
                            >
                              {player.fideId}
                              <span className="ml-1 text-xs opacity-70">↗</span>
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info Section */}
          <div className={`mt-8 ${getInfoSectionColor()} rounded-lg p-6`}>
            <h3 className={`text-lg font-semibold ${getInfoTextColor()} mb-3`}>
              About {isJunior ? 'Junior' : 'Open'} Players
            </h3>
            <p className={`${getInfoContentColor()} mb-4`}>
              {isJunior
                ? 'These young players have shown exceptional dedication by participating in multiple junior tournaments throughout the year, demonstrating their growing skills and passion for chess.'
                : 'These players have demonstrated consistent participation in open tournaments throughout the year, showing their dedication and competitive spirit in the chess community.'
              }
            </p>
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 text-sm ${getInfoListColor()}`}>
              <div>
                <strong>Eligibility:</strong>
                <ul className="list-disc list-inside mt-1 ml-4">
                  <li>Multiple tournament participation</li>
                  <li>{isJunior ? 'Junior' : 'Open'} category tournaments</li>
                  <li>Active in current year</li>
                </ul>
              </div>
              <div>
                <strong>Rating Categories:</strong>
                <ul className="list-disc list-inside mt-1 ml-4">
                  <li>Points (Classical Games)</li>
                  <li>Standard</li>
                  <li>Rapid</li>
                  <li>Blitz</li>
                  <li>ACF Classic</li>
                  <li>ACF Quick</li>
                </ul>
              </div>
              <div>
                <strong>Age Groups:</strong>
                <ul className="list-disc list-inside mt-1 ml-4">
                  <li>U8, U10, U12, U14, U16, U18</li>
                  {isJunior ? (
                    <>
                      <li>Filter by age range</li>
                      <li>Focus on development</li>
                    </>
                  ) : (
                    <>
                      <li>U21, Open</li>
                      <li>Filter by age range</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      {selectedPlayer && (
        <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}
    </div>
  );
}
