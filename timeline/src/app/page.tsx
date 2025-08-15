
"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import HomeHero from "@/components/HomeHero";
import FilterTabs from "@/components/FilterTabs";

type TournamentMeta = {
  [key: string]: string;
};
type Tournament = {
  data: TournamentMeta;
  path: string;
  category: string;
};
function getYear(dateStr: string): string {
  if (!dateStr) return new Date().getFullYear().toString(); // Default to current year
  const match = dateStr.match(/(\d{4})/);
  return match ? match[1] : new Date().getFullYear().toString(); // Default to current year if no match
}

const CATEGORIES = ["All", "Senior", "Junior"];

export default function Home() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [category, setCategory] = useState<string>("All");
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [years, setYears] = useState<string[]>([]);
  // const [menuOpen, setMenuOpen] = useState(false); // Unused for now

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_APP_URL + "/tournament.json?TS=" + new Date().getTime())
      .then((res) => res.json())
      .then((data: Tournament[]) => {
        setTournaments(data);
        const allYears = Array.from(
          new Set(
            data.map((t) => {
              const d = t.data["Date Begin"] || t.data["Date"] || "";
              return getYear(d);
            })
          )
        ) as string[];
        setYears(allYears.sort((a, b) => parseInt(b) - parseInt(a)));
        // Default to current year if available
        if (allYears.includes(new Date().getFullYear().toString())) {
          setYear(new Date().getFullYear().toString());
        } else if (allYears.length > 0) {
          setYear(allYears[0]);
        }
      });
  }, []);

  const filtered = tournaments.filter((t) => {
    const tYear = getYear(t.data["Date Begin"] || t.data["Date"] || "");
    const catMatch = category === "All" || t.category === category;
    const yearMatch = year === "All" || tYear === year;
    return catMatch && yearMatch;
  });

  // Pagination for years
  const yearIdx = years.indexOf(year);

  return (
    <div className="font-sans min-h-screen bg-gradient-to-br from-blue-50 to-blue-200">
      {/* Hero section for home page */}
      <HomeHero />

      {/* Main content wrapper with white background */}
      <div className="bg-white min-h-screen">
        {/* Category Filter Tabs */}
        <FilterTabs 
          categories={CATEGORIES} 
          activeCategory={category} 
          onCategoryChange={setCategory} 
        />

        {/* Tournament Cards */}
        <div className="py-8 px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-gray-500">No tournaments found for selected filters.</div>
        )}
        {filtered.map((t, idx) => {
          const title = t.data["Tournament Name"] || t.data["Place"] || "Untitled";
          const date = t.data["Date Begin"] || t.data["Date"] || "";
          const site = t.data["Site"] || t.data["Place"] || "";
          const slug = t.path.replace(/^www/, "").replace(/\/data\.json$/, "");
          return (
            <Link
              key={idx}
              href={`/${slug}`}
              className="block bg-white rounded-xl shadow-lg hover:shadow-2xl transition border border-blue-100 p-6 text-center group"
            >
              <div className="mb-2 text-lg font-bold text-blue-800 group-hover:text-blue-600 truncate">{title}</div>
              <div className="mb-1 text-sm text-gray-500">{date}</div>
              {site && <div className="mb-1 text-xs text-gray-400 italic">Site: {site}</div>}
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${t.category === "Senior" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>{t.category}</span>
            </Link>
          );
        })}
          </div>
        </div>

        {/* Year Paginator at Bottom */}
        <div className="px-4 pb-8">
          <div className="flex justify-center gap-2 pt-8 border-t border-gray-100">
            <button
              className="px-3 py-2 rounded border bg-gray-50 text-blue-700 font-semibold shadow-sm disabled:opacity-50 hover:bg-gray-100 transition-colors"
              disabled={yearIdx <= 0}
              onClick={() => yearIdx > 0 && setYear(years[yearIdx - 1])}
            >
              &larr;
            </button>
            {years.map((y) => (
              <button
                key={y}
                className={`px-4 py-2 rounded-full font-semibold border transition shadow-sm ${year === y ? "bg-blue-600 text-white border-blue-700" : "bg-gray-50 text-blue-700 border-gray-200 hover:bg-gray-100"}`}
                onClick={() => setYear(y)}
              >
                {y}
              </button>
            ))}
            <button
              className="px-3 py-2 rounded border bg-gray-50 text-blue-700 font-semibold shadow-sm disabled:opacity-50 hover:bg-gray-100 transition-colors"
              disabled={yearIdx >= years.length - 1}
              onClick={() => yearIdx < years.length - 1 && setYear(years[yearIdx + 1])}
            >
              &rarr;
            </button>
          </div>
        </div>
      </div>
      </div>
  );
}
