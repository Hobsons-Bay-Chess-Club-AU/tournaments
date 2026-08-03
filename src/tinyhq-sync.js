import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const REQUIRED_ENVIRONMENT_VARIABLES = [
  "TIDYHQ_APPLICATION_ID",
  "TIDYHQ_APPLICATION_SECRET",
  "TIDYHQ_DOMAIN_PREFIX",
  "TIDYHQ_USERNAME",
  "TIDYHQ_API_KEY",
];

function loadEnvironment(content) {
  for (const line of content.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function loadEnvironmentFile() {
  try {
    loadEnvironment(await readFile(resolve(process.cwd(), ".env"), "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function requiredConfiguration() {
  const configuration = {};

  for (const key of REQUIRED_ENVIRONMENT_VARIABLES) {
    const value = process.env[key]?.trim();
    if (!value) throw new Error(`Missing required environment variable: ${key}`);
    configuration[key] = value;
  }

  return configuration;
}

async function requestJson(label, url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${label} request failed with HTTP ${response.status}`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`${label} request returned invalid JSON`);
  }
}

async function accessToken(configuration) {
  const response = await requestJson(
    "Token",
    "https://accounts.tidyhq.com/oauth/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: configuration.TIDYHQ_APPLICATION_ID,
        client_secret: configuration.TIDYHQ_APPLICATION_SECRET,
        domain_prefix: configuration.TIDYHQ_DOMAIN_PREFIX,
        username: configuration.TIDYHQ_USERNAME,
        password: configuration.TIDYHQ_API_KEY,
      }),
    },
  );

  if (!response.access_token) {
    throw new Error("Token response did not include an access token");
  }

  return response.access_token;
}

async function fetchJson(label, path, token) {
  return requestJson(label, `https://api.tidyhq.com/v1${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

function isUpcoming(event, now) {
  if (event.archived) return false;

  const relevantDate = event.end_at || event.start_at;
  return relevantDate && new Date(relevantDate) >= now;
}

async function writeSnapshot(filename, snapshot) {
  const outputDirectory = resolve(process.cwd(), "data");
  const outputPath = resolve(outputDirectory, filename);
  const temporaryPath = `${outputPath}.tmp`;

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  await rename(temporaryPath, outputPath);
}

function cleanEventSnapshot(rawSnapshot) {
  return {
    fetched_at: rawSnapshot.fetched_at,
    events: rawSnapshot.events.map(({ event, tickets }) => {
      const attendeeIds = new Set();
      for (const ticket of tickets) {
        if (ticket.contact_id != null) attendeeIds.add(String(ticket.contact_id));
      }

      const attendees = [...attendeeIds]
        .map((contactId) => rawSnapshot.contacts[contactId])
        .filter(Boolean)
        .map(({ first_name, last_name }) => ({ first_name, last_name }));

      return { ...event, attendees };
    }),
  };
}

async function main() {
  await loadEnvironmentFile();
  const token = await accessToken(requiredConfiguration());
  const now = new Date();
  const events = await fetchJson("Events", "/events", token);
  const upcomingEvents = events.filter((event) => isUpcoming(event, now));
  const eventSnapshots = [];
  const contactIds = new Set();

  for (const event of upcomingEvents) {
    const tickets = await fetchJson(
      `Sold tickets for event ${event.id}`,
      `/events/${event.id}/tickets/sold`,
      token,
    );

    for (const ticket of tickets) {
      if (ticket.contact_id != null) contactIds.add(String(ticket.contact_id));
    }

    eventSnapshots.push({ event, tickets });
  }

  const contacts = {};
  for (const contactId of contactIds) {
    contacts[contactId] = await fetchJson(
      `Contact ${contactId}`,
      `/contacts/${contactId}`,
      token,
    );
  }

  const ticketCount = eventSnapshots.reduce(
    (count, snapshot) => count + snapshot.tickets.length,
    0,
  );
  const rawSnapshot = {
    fetched_at: now.toISOString(),
    events: eventSnapshots,
    contacts,
  };
  const cleanSnapshot = cleanEventSnapshot(rawSnapshot);
  const attendeeCount = cleanSnapshot.events.reduce(
    (count, event) => count + event.attendees.length,
    0,
  );

  await writeSnapshot("tinyhq-upcoming-events.json", rawSnapshot);
  await writeSnapshot("tinyhq_event.json", cleanSnapshot);

  console.log(
    `TidyHQ snapshots written: ${eventSnapshots.length} events, ${ticketCount} tickets, ${contactIds.size} contacts, ${attendeeCount} clean attendees.`,
  );
}

main().catch((error) => {
  console.error(`TidyHQ sync failed: ${error.message}`);
  process.exitCode = 1;
});
