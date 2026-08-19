import Link from "next/link";
import Image from "next/image";
import { loadUpcomingEvents, makeSlug } from "@/lib/upcoming-events";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", {
    timeZone: "Australia/Melbourne",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function UpcomingPage() {
  const allEvents = loadUpcomingEvents();
  const events = allEvents.filter(
    (e) => e.event.public && !e.event.archived
  );

  events.sort(
    (a, b) =>
      new Date(a.event.start_at).getTime() -
      new Date(b.event.start_at).getTime()
  );

  return (
    <section className="py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-primary-700">
            What&rsquo;s next
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-primary-900">
            Upcoming Events
          </h1>
          <p className="mt-1 text-sm font-medium text-gray-500">
            {events.length} {events.length === 1 ? "event" : "events"} scheduled
          </p>
        </div>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center text-gray-500">
            No upcoming events at this time.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {events.map((e) => {
              const slug = makeSlug(e.event);
              const startDate = formatDate(e.event.start_at);
              const endDate = formatDate(e.event.end_at);
              const participantCount = e.contacts.filter(
                (c) => c.status !== "Cancelled"
              ).length;

              return (
                <Link
                  key={e.event.id}
                  href={`/upcoming/${slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-lg"
                >
                  <div className="relative h-44 w-full overflow-hidden bg-primary-100">
                    {e.event.image_url &&
                    !e.event.image_url.includes("missing_show") ? (
                      <Image
                        src={e.event.image_url}
                        alt={e.event.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl text-primary-300">
                        ♟
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="text-lg font-bold text-primary-900 group-hover:text-primary-700 transition-colors">
                      {e.event.name}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {startDate} &ndash; {endDate}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {e.event.location}
                    </p>
                    <div className="mt-auto pt-4">
                      <span className="inline-block rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                        {participantCount}{" "}
                        {participantCount === 1 ? "participant" : "participants"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
