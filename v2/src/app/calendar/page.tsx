
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Calendar | Hobsons Bay Chess Club",
    description: "Calendar of Hobsons Bay Chess Club events.",
};

export default function CalendarPage() {
    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="rounded-2xl bg-white shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200">
                    <h1 className="text-3xl font-bold text-primary-700">Calendar</h1>
                </div>
                <div className="w-full h-[80vh] bg-gray-50">
                    <iframe
                        title="HBCC Calendar"
                        src="https://docs.google.com/spreadsheets/d/e/2PACX-1vRIr-eFPQCMvn-TbOfLNzHheAVduNUKX2wOTsYjJOM8zf_uhqe3B3H8Z01bofnCPg/pubhtml?widget=true&headers=false"
                        className="w-full h-full border-0"
                    />
                </div>
            </div>
        </div>
    );
}
