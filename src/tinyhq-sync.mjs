import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import axios from "axios";
import cheerio from "cheerio";
import "dotenv/config";

function extractContacts(html) {
  const $ = cheerio.load(html);

  const contacts = [];

  $('[data-scanning-attendees-target="row"]').each((_, row) => {
    const $row = $(row);

    const contactLink = $row.find('a[href^="/contacts/"]').first();
    const href = contactLink.attr('href') || '';
    const contactId = href.match(/\/contacts\/(\d+)/)?.[1] || null;

    // Extract custom fields generically
    const fields = {};
    const cleanText = (value = '') =>
      value.replace(/^:\s*/, '').replace(/\s+/g, ' ').trim();
    $row
      .find('[data-scanning-attendees-target="customFields"] > div')
      .each((_, field) => {
        const $field = $(field);

        const label = $field.find('span.font-medium').text().trim();

        // Clone so we can remove the label and keep only value
        const $clone = $field.clone();
        $clone.find('span.font-medium').remove();

        const value = $clone
          .text()
          .replace(/^:\s\\n*/g, '')
          .trim();


        if (label) {
          fields[label] = cleanText(value) || null;
        }
      });

    // Ticket type
    const ticketType = $row
      .find('.text-sm.text-gray-700.truncate')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim();

    // Scan time
    const scannedAt = $row
      .find('[data-scanning-attendees-target="scannedAt"]')
      .first()
      .text()
      .trim();

    contacts.push({
      contactId,
      contactUrl: href || null,

      assignedTo: contactLink.text().trim(),

      certCode: $row.attr('data-cert-code')?.trim() || null,
      orderCode: $row.attr('data-code')?.trim() || null,
      scanned: $row.attr('data-scanned') === 'true',

      ticketType,
      status: $row.text().includes('Cancelled') ? 'Cancelled' : 'Paid',
      scannedAt: scannedAt === '--' ? null : scannedAt,

      firstName: fields['First Name']?.trim() || null,
      lastName: fields['Last Name']?.trim() || null,
      dob: fields['Date of Birth (DOB)']?.trim() || null,
      gender: fields['Gender']?.trim() || null,
      email: fields['Email Address']?.trim() || null,
      mobile: fields['Mobile Phone Number']?.trim() || null,
      fideId: fields['FIDE ID']?.trim() || null,
      residencyStatus: fields['Residency Status']?.trim() || null,
      emergencyContactPerson:
        fields['Emergency Contact Person']?.trim() || null,
      emergencyContactNumber:
        fields['Emergency Contact Number']?.trim() || null,
      country: fields['Country']?.trim() || null,
      school: fields['School']?.trim() || null,
      address1: fields['Address1']?.trim() || null,

      // Keep everything too, in case new fields are added later
      fields,
    });
  });

  return contacts;
}


async function fetchAttendees(tinyHqEvent) {
  const baseUrl = tinyHqEvent.public_url.replace("https://portal.hobsonsbaychess.com/public", "https://hbcc.tidyhq.com/schedule/");
  const headers = {
    'accept': 'text/html',
    'accept-language': 'en-AU,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'sec-ch-ua': '"Not=A?Brand";v="99", "Google Chrome";v="151", "Chromium";v="151"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    'x-requested-with': 'XMLHttpRequest',
    'Cookie': process.env.TINYHQ_COOKIE || ''
  };

  const allAttendees = [];
  let page = 1;

  while (true) {
    const url = `${baseUrl}?scan_type_id=399&filter=all&page=${page}`;
    const { data } = await axios.request({
      responseType: 'text',
      method: 'get',
      url,
      headers,
    });

    const pageAttendees = extractContacts(data);
    if (pageAttendees.length === 0) break;

    allAttendees.push(...pageAttendees);
    console.log(`  Event ${tinyHqEvent.id}: fetched page ${page} (${pageAttendees.length} attendees)`);
    page++;
  }

  console.log(`  Event ${tinyHqEvent.id}: total ${allAttendees.length} attendees across ${page - 1} pages`);
  return allAttendees;
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

async function getTinyHQAccessToken() {
  const response = await requestJson(
    "Token",
    "https://accounts.tidyhq.com/oauth/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: process.env.TIDYHQ_APPLICATION_ID,
        client_secret: process.env.TIDYHQ_APPLICATION_SECRET,
        domain_prefix: process.env.TIDYHQ_DOMAIN_PREFIX,
        username: process.env.TIDYHQ_USERNAME,
        password: process.env.TIDYHQ_API_KEY,
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

  const token = await getTinyHQAccessToken();
  const now = new Date();
  const events = await fetchJson("Events", "/events", token);
  const upcomingEvents = events.filter((event) => isUpcoming(event, now));
  const eventSnapshots = [];
  const contactIds = new Set();

  for await (const event of upcomingEvents) {
    const contacts = await fetchAttendees(event);
    // const tickets = await fetchJson(
    //   `Sold tickets for event ${event.id}`,
    //   `/events/${event.id}/tickets/sold`,
    //   token,
    // );

    // for (const ticket of tickets) {
    //   if (ticket.contact_id != null) contactIds.add(String(ticket.contact_id));
    // }

    eventSnapshots.push({ event, contacts });
  }

  //const contacts = {};
  // for (const contactId of contactIds) {
  //   contacts[contactId] = await fetchJson(
  //     `Contact ${contactId}`,
  //     `/contacts/${contactId}`,
  //     token,
  //   );
  // }

  // const ticketCount = eventSnapshots.reduce(
  //   (count, snapshot) => count + snapshot.tickets.length,
  //   0,
  // );
  // const rawSnapshot = {
  //   fetched_at: now.toISOString(),
  //   events: eventSnapshots,
  //   contacts,
  // };
  // const cleanSnapshot = cleanEventSnapshot(rawSnapshot);
  // const attendeeCount = cleanSnapshot.events.reduce(
  //   (count, event) => count + event.attendees.length,
  //   0,
  // );

  await writeSnapshot("tinyhq-upcoming-events.json", eventSnapshots);
  // await writeSnapshot("tinyhq_event.json", cleanSnapshot);

  // console.log(
  //   `TidyHQ snapshots written: ${eventSnapshots.length} events, ${ticketCount} tickets, ${contactIds.size} contacts, ${attendeeCount} clean attendees.`,
  // );
}

main().catch((error) => {
  console.error(`TidyHQ sync failed: ${error.message}`);
  process.exitCode = 1;
});
