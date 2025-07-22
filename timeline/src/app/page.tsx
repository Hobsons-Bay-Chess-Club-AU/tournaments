
"use client";
import dynamic from 'next/dynamic';
import useTournamentData from '../hooks/useTournamentData';

const VerticalTimelineEvents = dynamic(() => import('../components/VerticalTimelineEvents'), { ssr: false });

export default function Home() {
  const events = useTournamentData('./data.json');

  return (
    <div className="font-sans min-h-screen p-8 pb-20">
      <h1 className="text-2xl font-bold mb-8 text-center">Tournament Timeline</h1>
      <VerticalTimelineEvents events={events} />
    </div>
  );
}
