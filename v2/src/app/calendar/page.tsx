
import type { Metadata } from "next";
import CalendarClient from "./CalendarClient";

export const metadata: Metadata = {
    title: "Calendar | Hobsons Bay Chess Club",
    description: "Calendar of Hobsons Bay Chess Club events.",
};

export default function CalendarPage() {
    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="rounded-2xl bg-white shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200">
                    <h1 className="text-3xl font-bold text-primary-700">Calendar</h1>
                </div>
                <div className="bg-gray-50">
                    <CalendarClient />
                </div>
            </div>
        </div>
    );
}
