"use client";
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import useTournamentData from '../../../hooks/useTournamentData';

const VerticalTimelineEvents = dynamic(() => import('../../../components/VerticalTimelineEvents'), { ssr: false });

export default function YearTimelinePage() {
    const params = useParams();
    const year = typeof params.year === 'string' ? params.year : Array.isArray(params.year) ? params.year[0] : '';
    const events = useTournamentData('./data.json', year);

    return (
        <div className="font-sans min-h-screen p-8 pb-20">
            <h1 className="text-2xl font-bold mb-8 text-center" >Tournament Timeline {year}</h1>
            <VerticalTimelineEvents events={events} />
        </div>
    );
}
