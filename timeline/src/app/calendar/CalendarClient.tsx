
"use client";
import { useState, useMemo } from "react";
import useTournamentData from "../../hooks/useTournamentData";
import useOrigin from "../../hooks/useOrigin";
import { TimelineEvent } from "../../types/timeline";
import Timeline from "react-calendar-timeline";
import moment from "moment";
import "react-calendar-timeline/style.css";

//
export default function CalendarClient() {
    const events = useTournamentData("../data.json") as TimelineEvent[];
    // Remove year navigation, show all events
    const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

    // 6 groups: junior/senior + ratingType
    const groups = useMemo(() => {
        const cats = Array.from(new Set(events.map((ev) => ev.splitCategory || "other-standard")));
        return cats.map((cat, idx) => ({
            id: idx + 1,
            title: cat
        }));
    }, [events]);

    const items = useMemo(() => {
        return events
            .filter((ev) => ev.StartDate)
            .map((ev: TimelineEvent, idx: number) => {
                let bgColor = "#38bdf8"; // default blue for standard
                if (ev.ratingType === "rapid") {
                    bgColor = "#fbbf24"; // amber for rapid
                } else if (ev.ratingType === "blitz") {
                    bgColor = "#ef4444"; // red for blitz
                }
                return {
                    id: idx + 1,
                    ratingType: ev.ratingType,
                    group: groups.find((g) => g.title === ev.splitCategory)?.id || 1,
                    title: ev.name,
                    start_time: moment(ev.StartDate),
                    end_time: moment(ev.EndDate || ev.StartDate),
                    bgColor,
                    site: ev.site,
                    arbiter: ev.arbiter,
                    url: ev.url,
                    category: ev.category,
                    splitCategory: ev.splitCategory
                };
            });
    }, [events, groups]);

    const origin = useOrigin();

    return (
        <div className="font-sans min-h-screen w-full h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-900">
            <h1 className="text-2xl font-bold mb-8 text-center">Tournament Timeline</h1>
            <div className="w-full flex-1 flex flex-col items-center justify-center">
                <div className="w-full h-full max-w-6xl">
                    <Timeline
                        groups={groups}
                        items={items}
                        defaultTimeStart={items.length > 0 ? items.reduce((min, item) => item.start_time.isBefore(min) ? item.start_time : min, items[0].start_time).valueOf() : moment().startOf('year').valueOf()}
                        defaultTimeEnd={items.length > 0 ? items.reduce((max, item) => item.end_time.isAfter(max) ? item.end_time : max, items[0].end_time).valueOf() : moment().endOf('year').valueOf()}
                        sidebarWidth={180}
                        lineHeight={120}
                        itemRenderer={({ item, getItemProps }) => (
                            <div {...getItemProps({ style: { background: item.bgColor, color: 'black', borderRadius: 8, boxShadow: '0 2px 8px #0002', padding: '12px 16px', minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' } })}>
                                <div className="font-bold text-blue-700 text-xs truncate">{item.title}</div>
                            </div>
                        )}
                        onItemSelect={itemId => {
                            const item = items.find(i => i.id === itemId);
                            // Find the original TimelineEvent from events for full details
                            const event = item ? events.find(ev => ev.name === item.title && ev.splitCategory === item.splitCategory) : null;
                            setSelectedEvent(event || null);
                        }}
                    />
                </div>
                {selectedEvent && (
                    <div className="mt-8 w-full max-w-xl">
                        <h2 className="text-lg font-semibold mb-4 text-center">
                            {selectedEvent.title}
                        </h2>
                        <div className="border rounded-lg p-4 bg-white shadow">
                            <div className="font-bold text-blue-700">
                                {selectedEvent.title}
                            </div>
                            <div className="text-base text-gray-600">
                                {selectedEvent.category ? selectedEvent.category.charAt(0).toUpperCase() + selectedEvent.category.slice(1) : ''}
                                {selectedEvent.site ? ` | ${selectedEvent.site}` : ""}
                            </div>
                            <div className="text-sm text-gray-500">
                                Arbiter: {selectedEvent.arbiter}
                            </div>
                            {selectedEvent.url && (
                                <a
                                    href={`${origin}/${selectedEvent.url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 underline text-sm mt-2 inline-block"
                                >
                                    View Detail
                                </a>
                            )}
                            <button
                                className="mt-4 px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                                onClick={() => setSelectedEvent(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

}