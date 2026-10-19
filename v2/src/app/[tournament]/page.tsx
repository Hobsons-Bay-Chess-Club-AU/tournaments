import { Suspense } from 'react';
import TournamentClient from './TournamentClient';
import { getAllTournamentSlugs } from '@/lib/tournamentService';

export async function generateStaticParams() {
    try {
        const slugs = await getAllTournamentSlugs();
        console.log(`Generated ${slugs.length} static params for tournaments from database/fallback`);
        return slugs.map((slug) => ({
            tournament: slug,
        }));
    } catch (error) {
        console.error('Error generating static params:', error);
        return [];
    }
}

export default function TournamentPage({ params }: { params: Promise<{ tournament: string }> }) {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100">
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading tournament...</p>
                    </div>
                </div>
            </div>
        }>
            <TournamentClient params={params} />
        </Suspense>
    );
}