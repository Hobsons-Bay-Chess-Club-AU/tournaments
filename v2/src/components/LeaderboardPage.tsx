"use client";
import React, { useState } from "react";
import Link from "next/link";
import FilterTabs from "@/components/FilterTabs";
import LeaderboardTable from "@/app/components/LeaderboardTable";
import { useLeaderboard } from "@/app/hooks/useLeaderboard";
import { Player } from "@/utils/ratingLoader";

const RATING_CATEGORIES = ["Points", "Standard", "Rapid", "Blitz", "ACF Classic", "ACF Quick"];

interface LeaderboardPageProps {
  category: "junior" | "open";
}

export default function LeaderboardPage({ category }: LeaderboardPageProps) {
  const { players, loading, error } = useLeaderboard(category);
  const [activeCategory, setActiveCategory] = useState<string>("Points");

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

  const sortedPlayers = [...players].sort((a, b) => {
    const ratingA = getRatingForCategory(a, activeCategory);
    const ratingB = getRatingForCategory(b, activeCategory);
    return ratingB - ratingA; // Sort by rating descending
  });

  const categoryConfig = {
    junior: {
      title: "Junior  & Rookies Leaderboard",
      description: "These young players have shown exceptional dedication by participating in multiple junior tournaments throughout the year, demonstrating their growing skills and passion for chess.",
      gradient: "from-green-400 to-green-600",
      textColor: "text-green-100",
      buttonColor: "text-green-600",
      buttonHover: "hover:bg-green-50",
      infoBg: "bg-green-50",
      infoTitle: "text-green-900",
      infoText: "text-green-800",
      infoList: "text-green-700",
      loadingColor: "border-green-600",
      eligibility: [
        "Multiple tournament participation",
        "Junior category tournaments",
        "Active in current year"
      ],
      ratingCategories: [
        "Points",
        "Standard",
        "Rapid",
        "Blitz",
        "ACF Classic",
        "ACF Quick"
      ],
      developmentFocus: [
        "Skill development",
        "Tournament experience",
        "Rating progression"
      ]
    },
    open: {
      title: "Open Leaderboard",
      description: "These players have demonstrated consistent participation in open tournaments throughout the year, showing their dedication and competitive spirit in the chess community.",
      gradient: "from-yellow-400 to-yellow-600",
      textColor: "text-yellow-100",
      buttonColor: "text-yellow-600",
      buttonHover: "hover:bg-yellow-50",
      infoBg: "bg-yellow-50",
      infoTitle: "text-yellow-900",
      infoText: "text-yellow-800",
      infoList: "text-yellow-700",
      loadingColor: "border-yellow-600",
      eligibility: [
        "Multiple tournament participation",
        "Open category tournaments",
        "Active in current year"
      ],
      ratingCategories: [
        "Points",
        "Standard",
        "Rapid",
        "Blitz",
        "ACF Classic",
        "ACF Quick"
      ],
      developmentFocus: [
        "Tournament standings",
        "FIDE rating links",
        "Multiple tournament tracking"
      ]
    }
  };

  const config = categoryConfig[category];

  if (loading) {
    return (
      <div className="font-sans min-h-screen bg-gradient-to-br from-primary-50 to-primary-200">
        <div className="bg-white min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${config.loadingColor} mx-auto mb-4`}></div>
            <p className="text-gray-600">Loading {category} leaderboard...</p>
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
        <div className={`bg-gradient-to-r ${config.gradient} text-white py-8`}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">{config.title}</h1>
                <p className={`${config.textColor} mt-2`}>
                  {players.length} players • {sortedPlayers[0]?.tournamentCount || 0} tournaments max participation
                </p>
              </div>
              <Link href="/leaderboard" className={`bg-white ${config.buttonColor} px-4 py-2 rounded-lg font-semibold ${config.buttonHover} transition-colors`}>
                ← Back
              </Link>
            </div>
          </div>
        </div>

        {/* Rating Category Tabs */}
        <div className="max-w-7xl mx-auto px-4 ">
          <FilterTabs
            options={RATING_CATEGORIES}
            activeOption={activeCategory}
            onOptionChange={setActiveCategory}
          />
          {activeCategory === "Points" && (
            <div className="mt-3 p-3 bg-primary-50 border border-primary-200 rounded-lg">
              <p className="text-sm text-primary-800">
                <span className="font-semibold">Points:</span> Total accumulated points from all standard (classical) games across tournaments
              </p>
            </div>
          )}
        </div>

        {/* Leaderboard Table */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <LeaderboardTable players={sortedPlayers} activeCategory={activeCategory} getRatingForCategory={getRatingForCategory} />
            </div>
          </div>

          {/* Info Section */}
          <div className={`mt-8 ${config.infoBg} rounded-lg p-6`}>
            <h3 className={`text-lg font-semibold ${config.infoTitle} mb-3`}>
              About {category === "junior" ? "Junior" : "Open"} Players
            </h3>
            <p className={`${config.infoText} mb-4`}>
              {config.description}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className={config.infoList}>
                <strong>Eligibility:</strong>
                <ul className="list-disc list-inside mt-1 ml-4">
                  {config.eligibility.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className={config.infoList}>
                <strong>Rating Categories:</strong>
                <ul className="list-disc list-inside mt-1 ml-4">
                  {config.ratingCategories.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className={config.infoList}>
                <strong>{category === "junior" ? "Development Focus:" : "Data Source:"}</strong>
                <ul className="list-disc list-inside mt-1 ml-4">
                  {config.developmentFocus.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
