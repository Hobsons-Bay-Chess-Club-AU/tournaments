"use client";
import React, { useEffect, useState } from "react";
import HomeHero from "@/components/HomeHero";
import FilterTabs from "@/components/FilterTabs";
import TournamentCard, { type TopPlayer, type TournamentStatus } from "@/components/TournamentCard";

type TournamentMeta = {
  [key: string]: string;
};
type Tournament = {
  data: TournamentMeta;
  path: string;
  category: string;
  top_players?: TopPlayer[];
  status?: TournamentStatus;
};
function getYear(dateStr: string): string {
  if (!dateStr) return new Date().getFullYear().toString(); // Default to current year
  const match = dateStr.match(/(\d{4})/);
  return match ? match[1] : new Date().getFullYear().toString(); // Default to current year if no match
}

const CATEGORY_OPTIONS = ["All", "Senior", "Junior", "Rapid", "Blitz", "Planned", "In Progress"];

export default function Home() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeOption, setActiveOption] = useState<string>("All");
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [years, setYears] = useState<string[]>([]);
  // const [menuOpen, setMenuOpen] = useState(false); // Unused for now

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_APP_URL + "/tournament.json?TS=" + new Date().getTime())
      .then((res) => res.json())
      .then((data: Tournament[]) => {
        // Add status field to each tournament
        const now = new Date();
        const withStatus = data.map((t) => {
          const date = t.data["Date Begin"] || t.data["Date"] || "";
          const endDate = t.data["Date End"] || t.data["End Date"] || "";
          const beginDateObj = parseAusDate(date);
          const endDateObj = parseAusDate(endDate);
          let status: TournamentStatus = "Completed";
          if (beginDateObj.getTime() > now.getTime()) {
            status = "Planned";
          } else if (beginDateObj.getTime() <= now.getTime() && endDateObj.getTime() >= now.getTime()) {
            status = "In Progress";
          }
          return { ...t, status };
        });
        setTournaments(withStatus);
        const allYears = Array.from(
          new Set(
            withStatus.map((t) => {
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

  // Sort tournaments by Date Begin descending
  // Helper to parse Australian date format DD/MM/YYYY
  function parseAusDate(dateStr: string): Date {
    if (!dateStr) return new Date(0);
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      // DD/MM/YYYY
      const [day, month, year] = parts.map(Number);
      return new Date(year, month - 1, day);
    }
    // fallback to default parsing
    return new Date(dateStr);
  }

  const sortedTournaments = [...tournaments].sort((a, b) => {
    const dateA = a.data["Date Begin"] || a.data["Date"] || "";
    const dateB = b.data["Date Begin"] || b.data["Date"] || "";
    const dA = parseAusDate(dateA);
    const dB = parseAusDate(dateB);
    return dB.getTime() - dA.getTime();
  });

  const filtered = sortedTournaments.filter((t) => {
    const tYear = getYear(t.data["Date Begin"] || t.data["Date"] || "");
    const yearMatch = year === "All" || tYear === year;
    let match = false;
    if (activeOption === "All") {
      match = true;
    } else if (activeOption === "Planned" || activeOption === "In Progress") {
      match = t.status === activeOption;
    } else {
      match = t.category === activeOption || t.data["Tournament Name"]?.toLowerCase().includes(activeOption.toLowerCase());
    }
    return match && yearMatch;
  });

  // Pagination for years
  const yearIdx = years.indexOf(year);
  const tournamentCountLabel = `${filtered.length} ${filtered.length === 1 ? "tournament" : "tournaments"}`;

  return (
    <div className="min-h-screen font-sans">
      <HomeHero />

      <section id="tournament-catalogue" className="bg-[var(--color-calendar-paper)] py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[var(--radius-calendar-lg)] border border-[var(--color-calendar-rule)] bg-[var(--color-calendar-surface)] p-5 shadow-[0_16px_40px_var(--color-calendar-shadow)] sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-primary-700">Tournament archive</p>
                <h2 className="mt-1 text-3xl font-black tracking-tight text-primary-900">Tournaments</h2>
                <p aria-live="polite" className="mt-1 text-sm font-medium text-[var(--color-calendar-muted)]">
                  {tournamentCountLabel} in the current view
                </p>
              </div>
              <div aria-label="Tournament year" className="inline-flex min-h-11 items-center self-start rounded-full border border-primary-100 bg-white p-1 sm:self-auto">
                <button
                  aria-label="Previous tournament year"
                  className="grid size-10 place-items-center rounded-full text-primary-800 transition-colors duration-200 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 motion-reduce:transition-none"
                  disabled={yearIdx <= 0}
                  onClick={() => yearIdx > 0 && setYear(years[yearIdx - 1])}
                >
                  <span aria-hidden="true">←</span>
                </button>
                <span className="min-w-20 px-3 text-center text-sm font-black text-primary-900">{year}</span>
                <button
                  aria-label="Next tournament year"
                  className="grid size-10 place-items-center rounded-full text-primary-800 transition-colors duration-200 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 motion-reduce:transition-none"
                  disabled={yearIdx >= years.length - 1}
                  onClick={() => yearIdx < years.length - 1 && setYear(years[yearIdx + 1])}
                >
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>

            <div className="mt-6">
              <FilterTabs
                options={CATEGORY_OPTIONS}
                activeOption={activeOption}
                onOptionChange={setActiveOption}
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3">
            {filtered.length === 0 && (
              <div className="col-span-full rounded-[var(--radius-calendar-md)] border border-[var(--color-calendar-rule)] bg-[var(--color-calendar-surface)] px-6 py-12 text-center text-[var(--color-calendar-muted)]">
                No tournaments found for selected filters.
              </div>
            )}
            {filtered.map((t) => {
              const title = t.data["Tournament Name"] || t.data["Place"] || "Untitled";
              const date = t.data["Date Begin"] || t.data["Date"] || "";
              const endDate = t.data["Date End"] || t.data["End Date"] || "";
              const site = t.data["Site"] || t.data["Place"] || "";
              const slug = t.path.replace(/^www/, "").replace(/\/data\.json$/, "");
              // Use the same parseAusDate helper
              const beginDateObj = parseAusDate(date);
              const endDateObj = parseAusDate(endDate);
              const now = new Date();
              let status: TournamentStatus = "Completed";
              // Future tournament: begin date > now
              if (beginDateObj.getTime() > now.getTime()) {
                status = "Planned";
              }
              // In-progress: now between begin and end
              else if (beginDateObj.getTime() <= now.getTime() && endDateObj.getTime() >= now.getTime()) {
                status = "In Progress";
              }
              // If completed, go to standings page
              const linkUrl = status === "Completed" ? `/${slug}?page=standings.html` : `/${slug}`;
              return (
                <TournamentCard
                  key={t.path}
                  title={title}
                  date={date}
                  endDate={endDate}
                  site={site}
                  category={t.category}
                  status={status}
                  href={linkUrl}
                  topPlayers={t.top_players}
                />
              );
            })}
          </div>
        </div>
      </section>
      <iframe
        src="https://game-processor.fly.dev/ftp-sync-v1?ago=30"
        style={{ width: 0, height: 0, border: 'none', visibility: 'hidden', position: 'absolute' }}
        title="bytehost-caller"
      ></iframe>

    </div>
  );
}
