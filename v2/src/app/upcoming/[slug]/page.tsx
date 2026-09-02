import { notFound } from "next/navigation";
import Image from "next/image";
import { loadUpcomingEvents, makeSlug, type UpcomingEvent } from "@/lib/upcoming-events";
import UpcomingAttendeesTable from "@/components/UpcomingAttendeesTable";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", {
    timeZone: "Australia/Melbourne",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getPublicEvents(): UpcomingEvent[] {
  return loadUpcomingEvents().filter(
    (e) => e.event.public && !e.event.archived
  );
}

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublicEvents().map((e) => ({ slug: makeSlug(e.event) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getPublicEvents().find(
    (e) => makeSlug(e.event) === slug
  );
  if (!entry) return { title: "Event Not Found" };
  return {
    title: `${entry.event.name} — Hobsons Bay Chess Club`,
    description: `${entry.event.name} at ${entry.event.location}`,
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getPublicEvents().find(
    (e) => makeSlug(e.event) === slug
  );

  if (!entry) notFound();

  const { event, contacts: allContacts } = entry;
  const contacts = allContacts
    .filter((c) => c.status !== "Cancelled")
    .sort((a, b) => {
      const acfDifference = (b.acfClassic || 0) - (a.acfClassic || 0);
      if (acfDifference !== 0) return acfDifference;

      const fideDifference = (b.fideStandard || 0) - (a.fideStandard || 0);
      if (fideDifference !== 0) return fideDifference;

      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });

  return (
    <article className="py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {event.image_url && !event.image_url.includes("missing_show") && (
          <div className="relative mb-8 h-56 w-full overflow-hidden rounded-2xl sm:h-72">
            <Image
              src={event.image_url}
              alt={event.name}
              fill
              className="object-cover"
              sizes="(max-width: 896px) 100vw, 896px"
              priority
            />
          </div>
        )}

        <header className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-primary-900 sm:text-4xl">
            {event.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-primary-800">
            <span>{formatDate(event.start_at)} &ndash; {formatDate(event.end_at)}</span>
            <span className="text-primary-800">{event.location}</span>
          </div>
          {event.public_url && (
            <a
              href={event.public_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block rounded-full bg-primary-700 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-800"
            >
              Registration
            </a>
          )}
        </header>

        {event.body && (
          <section className="prose prose-sm max-w-none mb-10 rounded-xl border border-gray-200 bg-white p-6 text-primary-900 prose-headings:text-primary-900 prose-p:text-gray-800 prose-a:text-primary-700 prose-strong:text-primary-900">
            <div dangerouslySetInnerHTML={{ __html: event.body }} />
          </section>
        )}

        <section>
          <h2 className="mb-4 text-xl font-bold text-primary-900">
            Participants ({contacts.length})
          </h2>
          {contacts.length === 0 ? (
            <p className="text-gray-700">No participants registered yet.</p>
          ) : (
            <UpcomingAttendeesTable contacts={contacts} />
          )}
        </section>
      </div>
    </article>
  );
}
