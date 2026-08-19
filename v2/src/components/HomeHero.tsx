import React from "react";
import Link from "next/link";

const HomeHero: React.FC = () => {
  return (
    <section id="tournaments" className="relative overflow-hidden bg-primary-900 text-white">
      <div aria-hidden="true" className="home-hero-pattern pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary-100">
          Hobsons Bay Chess Club
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
          Current &amp; Archived Tournaments
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-primary-100 sm:text-lg">
          Find upcoming events, revisit championship results, and follow the club&apos;s competitive history.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
          <a
            href="#tournament-catalogue"
            className="inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 font-bold text-primary-800 transition-colors duration-200 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
          >
            Browse tournaments
          </a>
          <Link
            href="/timeline"
            className="inline-flex min-h-11 items-center font-bold text-primary-100 underline-offset-4 transition-colors duration-200 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
          >
            Tournament timeline
          </Link>
          <Link
            href="/leaderboard/overall"
            className="inline-flex min-h-11 items-center font-bold text-primary-100 underline-offset-4 transition-colors duration-200 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
          >
            Overall rankings
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
