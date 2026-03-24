export function generateStaticParams() {
    return majorTournaments.map((event) => ({ slug: event.slug }));
}

import { notFound } from "next/navigation";
import { majorTournaments } from "../data";

export default async function MajorTournamentDetail({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const event = majorTournaments.find((e) => e.slug === slug);
    if (!event) return notFound();

    return (
        <div className="max-w-7xl mx-auto py-4">
            <h1 className="text-2xl font-bold mb-4 text-primary-700">{event.name}</h1>
            <div className="mb-2 text-gray-500 text-sm">
                {event.start_date} to {event.end_date}
            </div>
            <div className="mb-4 flex justify-end">
                <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition"
                >
                    Open in new tab
                </a>
            </div>
            <div className="aspect-video w-full rounded overflow-hidden border shadow">
                <iframe
                    src={event.url}
                    title={event.name}
                    className="w-full h-full min-h-[400px]"
                    allowFullScreen
                />
            </div>
        </div>
    );
}
