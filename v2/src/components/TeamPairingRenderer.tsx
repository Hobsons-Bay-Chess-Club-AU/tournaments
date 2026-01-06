"use client";
import React from 'react';

interface TeamPairingData {
    type: string;
    tournamentType: string;
    matches: Array<{
        matchNumber: string;
        team1: {
            country: string;
            teamName: string;
            teamScore: string;
            matchScore: string;
        };
        team2: {
            country: string;
            teamName: string;
            teamScore: string;
            matchScore: string;
        };
        boardPairings: Array<{
            board: string;
            white: {
                name: string;
                rating: string;
                score: string;
            };
            black: {
                name: string;
                rating: string;
                score: string;
            };
        }>;
    }>;
}

interface TeamPairingRendererProps {
    data: TeamPairingData;
}

const TeamPairingRenderer: React.FC<TeamPairingRendererProps> = ({ data }) => {
    if (!data || !data.matches) {
        return (
            <div className="text-center py-12">
                <div className="text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No team pairings found</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {data.matches.map((match, matchIndex) => (
                <div key={matchIndex} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    {/* Match Header */}
                    <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-white/20 rounded-lg p-3">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Match {match.matchNumber}</h3>
                                    <p className="text-primary-100">Team vs Team</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Team Scores */}
                    <div className="p-6 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-900">{match.team1.teamName}</div>
                                    <div className="text-sm text-gray-600">{match.team1.country}</div>
                                    <div className="text-lg font-semibold text-green-600">{match.team1.teamScore}</div>
                                </div>
                                <div className="text-2xl font-bold text-gray-500">vs</div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-900">{match.team2.teamName}</div>
                                    <div className="text-sm text-gray-600">{match.team2.country}</div>
                                    <div className="text-lg font-semibold text-green-600">{match.team2.teamScore}</div>
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-primary-600">{match.team1.matchScore} - {match.team2.matchScore}</div>
                                <div className="text-sm text-gray-600">Match Score</div>
                            </div>
                        </div>
                    </div>

                    {/* Board Pairings */}
                    <div className="p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Board Pairings</h4>
                        <div className="space-y-4">
                            {match.boardPairings.map((pairing, pairingIndex) => (
                                <div key={pairingIndex} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-primary-100 text-primary-800 px-3 py-1 rounded-lg font-semibold text-sm">
                                                Board {pairing.board}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* White Player */}
                                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 bg-white border border-gray-400 rounded-sm"></div>
                                                    <span className="text-sm font-medium text-gray-600">White</span>
                                                </div>
                                                <div className="text-lg font-bold text-gray-900">{pairing.white.score}</div>
                                            </div>
                                            <div className="text-lg font-semibold text-gray-900">{pairing.white.name}</div>
                                            <div className="text-sm text-gray-600">Rating: {pairing.white.rating}</div>
                                        </div>

                                        {/* Black Player */}
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 bg-gray-800 border border-gray-400 rounded-sm"></div>
                                                    <span className="text-sm font-medium text-gray-600">Black</span>
                                                </div>
                                                <div className="text-lg font-bold text-gray-900">{pairing.black.score}</div>
                                            </div>
                                            <div className="text-lg font-semibold text-gray-900">{pairing.black.name}</div>
                                            <div className="text-sm text-gray-600">Rating: {pairing.black.rating}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TeamPairingRenderer;

