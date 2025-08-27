"use client";
import React from "react";
import Link from "next/link";
import HomeHero from "@/components/HomeHero";

export default function LeaderboardPage() {
  return (
    <div className="font-sans min-h-screen bg-gradient-to-br from-blue-50 to-blue-200">
      {/* Hero section */}
      <HomeHero />

      {/* Main content wrapper with white background */}
      <div className="bg-white min-h-screen">
        <div className="px-4 py-8 md:px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Hobsons Bay Chess Club Leaderboards
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Open Leaderboard Card */}
              <Link href="/leaderboard/open" className="block">
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 text-center group">
                  <div className="text-6xl mb-4">👑</div>
                  <h2 className="text-2xl font-bold text-yellow-800 mb-4 group-hover:text-yellow-700">
                    Open Leaderboard
                  </h2>
                  <p className="text-yellow-700 mb-6">
                    Top players in open tournaments with multiple tournament participation
                  </p>
                  <div className="inline-block px-6 py-3 bg-yellow-600 text-white rounded-lg font-semibold group-hover:bg-yellow-700 transition-colors">
                    View Rankings
                  </div>
                </div>
              </Link>

              {/* Junior Leaderboard Card */}
              <Link href="/leaderboard/junior" className="block">
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 text-center group">
                  <div className="text-6xl mb-4">🌟</div>
                  <h2 className="text-2xl font-bold text-green-800 mb-4 group-hover:text-green-700">
                    Junior Leaderboard
                  </h2>
                  <p className="text-green-700 mb-6">
                    Rising stars in junior tournaments with multiple tournament participation
                  </p>
                  <div className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg font-semibold group-hover:bg-green-700 transition-colors">
                    View Rankings
                  </div>
                </div>
              </Link>
            </div>

            {/* Info Section */}
            <div className="mt-12 bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                About the Leaderboards
              </h3>
              <p className="text-blue-800 mb-4">
                These leaderboards feature players who have participated in multiple tournaments throughout the year, 
                showing their performance across different rating categories.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                <div>
                  <strong>Rating Categories:</strong>
                  <ul className="list-disc list-inside mt-1 ml-4">
                    <li>Standard Rating</li>
                    <li>Rapid Rating</li>
                    <li>Blitz Rating</li>
                    <li>ACF Rating</li>
                    <li>ACF Quick Rating</li>
                  </ul>
                </div>
                <div>
                  <strong>Eligibility:</strong>
                  <ul className="list-disc list-inside mt-1 ml-4">
                    <li>Multiple tournament participation</li>
                    <li>Current year tournaments only</li>
                    <li>Active players with ratings</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

