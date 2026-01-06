"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FaTrophy, FaChessKing, FaChessPawn, FaUsers, FaChartLine, FaMedal } from "react-icons/fa";
import CountUp from "@/components/CountUp";

interface Player {
  name: string;
  id: string;
  fideId: string;
  gender: string;
  href: string;
  tournamentCount: number;
  tournaments: string[];
  title: string;
  birthYear: number | null;
  fideStandard: number;
  fideRapid: number;
  fideBlitz: number;
  acfClassic: number;
  acfQuick: number;
  acfId: string;
}

interface LeaderboardData {
  count: number;
  totalTournaments: number;
  players: Player[];
}

export default function LeaderboardPage() {
  const [juniorData, setJuniorData] = useState<LeaderboardData | null>(null);
  const [openData, setOpenData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [juniorResponse, openResponse] = await Promise.all([
          fetch('/junior-ratings.json'),
          fetch('/open-ratings.json')
        ]);

        if (juniorResponse.ok && openResponse.ok) {
          const junior = await juniorResponse.json();
          const open = await openResponse.json();
          setJuniorData(junior);
          setOpenData(open);
        }
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    // Auto-scroll to main content after 3 seconds
    const timer = setTimeout(() => {
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Calculate total players
  const totalPlayers = (juniorData?.count || 0) + (openData?.count || 0);
  const totalTournaments = juniorData?.totalTournaments || openData?.totalTournaments || 0;

  return (
    <div className="font-sans min-h-screen bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm0 0c0 11.046 8.954 20 20 20s20-8.954 20-20-8.954-20-20-20-20 8.954-20 20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Main Title */}
            <div className="flex justify-center mb-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                <FaTrophy className="text-6xl text-yellow-300" />
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Hobsons Bay Club Leaderboard
            </h1>

            <p className="text-xl md:text-2xl text-primary-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              Discover the top performers in our chess community. Track ratings, achievements, and tournament success across different categories.
            </p>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                <div className="flex items-center justify-center mb-3">
                  <FaUsers className="text-3xl text-primary-200" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {loading ? (
                    <div className="animate-pulse">...</div>
                  ) : (
                    <CountUp
                      end={totalPlayers}
                      duration={2000}
                      delay={500}
                      suffix="+"
                    />
                  )}
                </div>
                <div className="text-primary-100">Active Players</div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                <div className="flex items-center justify-center mb-3">
                  <FaChartLine className="text-3xl text-green-200" />
                </div>
                <div className="text-2xl font-bold text-white">
                  <CountUp
                    end={5}
                    duration={1500}
                    delay={1000}
                  />
                </div>
                <div className="text-primary-100">Rating Categories</div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                <div className="flex items-center justify-center mb-3">
                  <FaMedal className="text-3xl text-yellow-200" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {loading ? (
                    <div className="animate-pulse">...</div>
                  ) : (
                    <CountUp
                      end={totalTournaments}
                      duration={2000}
                      delay={1500}
                      suffix="+"
                    />
                  )}
                </div>
                <div className="text-primary-100">Tournaments</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div id="main-content" className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Choose Your Category
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore leaderboards tailored to different player categories and age groups.
            Each category showcases the best performers in their respective divisions.
          </p>
        </div>

        {/* Leaderboard Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Open Leaderboard Card */}
          <div className="group relative">
            <Link href="/leaderboard/open" className="block">
              <div className="relative overflow-hidden bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M20 20c0-5.523-4.477-10-10-10S0 14.477 0 20s4.477 10 10 10 10-4.477 10-10zm0 0c0 5.523 4.477 10 10 10s10-4.477 10-10-4.477-10-10-10-10 4.477-10 10z'/%3E%3C/g%3E%3C/svg%3E")`,
                  }}></div>
                </div>

                <div className="relative p-8">
                  {/* Icon */}
                  <div className="flex justify-center mb-6">
                    <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full p-6 shadow-lg">
                      <FaChessKing className="text-4xl text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-yellow-800 mb-4 group-hover:text-yellow-700 transition-colors">
                      Open Leaderboard
                    </h3>
                    <p className="text-yellow-700 mb-6 leading-relaxed">
                      Comprehensive rankings of all players across open tournaments.
                      Features players of all ages with multiple tournament participation.
                    </p>

                    {/* Features */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {loading ? (
                            <div className="animate-pulse">...</div>
                          ) : (
                            <CountUp
                              end={openData?.count || 0}
                              duration={1500}
                              delay={200}
                            />
                          )}
                        </div>
                        <div className="text-sm text-yellow-700">Players</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          <CountUp
                            end={5}
                            duration={1000}
                            delay={400}
                          />
                        </div>
                        <div className="text-sm text-yellow-700">Rating Types</div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-lg shadow-lg group-hover:from-yellow-600 group-hover:to-orange-600 transition-all duration-300 transform group-hover:scale-105">
                      View Rankings
                      <FaTrophy className="ml-2 text-lg" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Junior Leaderboard Card */}
          <div className="group relative">
            <Link href="/leaderboard/junior" className="block">
              <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M20 20c0-5.523-4.477-10-10-10S0 14.477 0 20s4.477 10 10 10 10-4.477 10-10zm0 0c0 5.523 4.477 10 10 10s10-4.477 10-10-4.477-10-10-10-10 4.477-10 10z'/%3E%3C/g%3E%3C/svg%3E")`,
                  }}></div>
                </div>

                <div className="relative p-8">
                  {/* Icon */}
                  <div className="flex justify-center mb-6">
                    <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-full p-6 shadow-lg">
                      <FaChessPawn className="text-4xl text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-green-800 mb-4 group-hover:text-green-700 transition-colors">
                      Junior Leaderboard
                    </h3>
                    <p className="text-green-700 mb-6 leading-relaxed">
                      Rising stars in junior tournaments. Track the development of young players
                      with age-appropriate filtering and focused competition.
                    </p>

                    {/* Features */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {loading ? (
                            <div className="animate-pulse">...</div>
                          ) : (
                            <CountUp
                              end={juniorData?.count || 0}
                              duration={1500}
                              delay={200}
                            />
                          )}
                        </div>
                        <div className="text-sm text-green-700">Players</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          <CountUp
                            end={6}
                            duration={1000}
                            delay={400}
                          />
                        </div>
                        <div className="text-sm text-green-700">Age Groups</div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg shadow-lg group-hover:from-green-600 group-hover:to-emerald-600 transition-all duration-300 transform group-hover:scale-105">
                      View Rankings
                      <FaTrophy className="ml-2 text-lg" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-16">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Leaderboard Features
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our comprehensive leaderboard system provides detailed insights into player performance and achievements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FaChartLine className="text-2xl text-primary-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Multiple Ratings</h4>
              <p className="text-sm text-gray-600">FIDE Standard, Rapid, Blitz, ACF Classic & Quick ratings</p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FaUsers className="text-2xl text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Age Filtering</h4>
              <p className="text-sm text-gray-600">Filter players by age groups and categories</p>
            </div>

            <div className="text-center">
              <div className="bg-yellow-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FaMedal className="text-2xl text-yellow-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Tournament Tracking</h4>
              <p className="text-sm text-gray-600">See how many tournaments each player participated in</p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FaTrophy className="text-2xl text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Real-time Data</h4>
              <p className="text-sm text-gray-600">Updated with latest tournament results and ratings</p>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}


