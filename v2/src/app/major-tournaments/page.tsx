
import Link from "next/link";
import { majorTournaments } from "./data";

export default function MajorTournamentsPage() {
    return (
        <div className="max-w-2xl mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6 text-primary-700">Major Tournaments</h1>
            <ul className="space-y-4">
                {majorTournaments.map((event) => (
                    <li key={event.slug} className="border rounded p-4 bg-white shadow-sm hover:shadow-md transition">
                        <Link href={`/major-tournaments/${event.slug}`} className="text-xl font-semibold text-primary-700 hover:underline">
                            {event.name}
                        </Link>
                        <div className="text-gray-500 text-sm mt-1">
                            {event.start_date} to {event.end_date}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
