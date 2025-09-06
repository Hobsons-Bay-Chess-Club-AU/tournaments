import React from "react";
import { Player } from "@/utils/ratingLoader";

export type LeaderboardTableProps = {
  players: Player[];
  activeCategory: string;
  getRatingForCategory: (player: Player, category: string) => number;
};

function getBadge(idx: number) {
  if (idx === 0) return <span className="inline-block px-2 py-1 rounded bg-yellow-400 text-white font-bold text-xs mr-2">1st</span>;
  if (idx === 1) return <span className="inline-block px-2 py-1 rounded bg-gray-400 text-white font-bold text-xs mr-2">2nd</span>;
  if (idx === 2) return <span className="inline-block px-2 py-1 rounded bg-orange-400 text-white font-bold text-xs mr-2">3rd</span>;
  return null;
}

function getIdCell(player: Player, activeCategory: string) {
  if (activeCategory === "Points") {
    return <span className="text-gray-400">—</span>;
  } else if (activeCategory === "Standard" || activeCategory === "Rapid" || activeCategory === "Blitz") {
    return player.fideId ? (
      <a
        href={`https://ratings.fide.com/profile/${player.fideId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-700 underline hover:text-blue-900"
      >
        {player.fideId}
      </a>
    ) : <span className="text-gray-400">—</span>;
  } else {
    return player.acfId ? (
      <span className="text-green-700 font-semibold">{player.acfId}</span>
    ) : <span className="text-gray-400">—</span>;
  }
}

export default function LeaderboardTable({ players, activeCategory, getRatingForCategory }: LeaderboardTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border border-gray-200 rounded-lg shadow-md bg-white">
        <thead>
          <tr className="bg-gradient-to-r from-blue-100 to-blue-300 text-blue-900">
            <th className="px-4 py-3 font-semibold text-left">#</th>
            <th className="px-4 py-3 font-semibold text-left">Name</th>
            <th className="px-4 py-3 font-semibold text-left">ID</th>
            <th className="px-4 py-3 font-semibold text-left">Gender</th>
            <th className="px-4 py-3 font-semibold text-left">Tournaments</th>
            <th className="px-4 py-3 font-semibold text-left">{activeCategory}</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, idx) => (
            <tr key={player.id || player.fideId || player.name || idx} className={idx % 2 === 0 ? "bg-white" : "bg-blue-50 hover:bg-blue-100 transition-colors"}>
              <td className="px-4 py-2 text-gray-500 font-medium">{getBadge(idx)}{idx + 1}</td>
              <td className="px-4 py-2 text-blue-900 font-semibold whitespace-nowrap">
                {player.title && (
                  <span className="inline-block px-2 py-1 rounded bg-purple-600 text-white font-bold text-xs mr-2">
                    {player.title}
                  </span>
                )}
                {player.name}
              </td>
              <td className="px-4 py-2">{getIdCell(player, activeCategory)}</td>
              <td className="px-4 py-2 text-gray-700 capitalize">{player.gender}</td>
              <td className="px-4 py-2 text-gray-700">{player.tournamentCount}</td>
              <td className="px-4 py-2 text-blue-700 font-bold">{getRatingForCategory(player, activeCategory)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
