
import type { Metadata } from "next";
import CalendarClient from "./CalendarClient";
import "./calendar.css";

export const metadata: Metadata = {
    title: "Calendar | Hobsons Bay Chess Club",
    description: "Calendar of Hobsons Bay Chess Club events.",
};

export default function CalendarPage() {
    return (
        <div className="calendar-page">
            <div className="calendar-page__inner">
                <header className="calendar-page__intro">
                    <p className="calendar-page__eyebrow">Hobsons Bay Chess Club</p>
                    <h1>Plan your chess year</h1>
                    <p>Find upcoming club events, browse a month, or choose a day to see every detail.</p>
                </header>
                <div className="calendar-page__content">
                    <CalendarClient />
                </div>
            </div>
        </div>
    );
}
