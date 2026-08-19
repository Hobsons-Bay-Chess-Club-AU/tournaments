import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type UpcomingContact = {
  firstName: string;
  lastName: string;
  fideId: string;
  status?: string;
  [key: string]: unknown;
};

export type UpcomingEvent = {
  event: {
    id: number;
    name: string;
    location: string;
    start_at: string;
    end_at: string;
    body: string;
    image_url: string;
    public_url: string;
    public: boolean;
    archived: boolean;
  };
  contacts: UpcomingContact[];
};

export function loadUpcomingEvents(): UpcomingEvent[] {
  try {
    const filePath = resolve(process.cwd(), "../data/tinyhq-upcoming-events.json");
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as UpcomingEvent[];
  } catch {
    return [];
  }
}

export function makeSlug(event: UpcomingEvent["event"]): string {
  return `${event.id}-${event.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}
