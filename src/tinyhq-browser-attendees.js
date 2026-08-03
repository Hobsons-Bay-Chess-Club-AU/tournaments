import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import puppeteer from "puppeteer";

const SITE_ORIGIN = "https://hbcc.tidyhq.com";
const REQUIRED_ENVIRONMENT_VARIABLES = [
  "TIDYHQ_WEB_USERNAME",
  "TIDYHQ_WEB_PASSWORD",
];

function loadEnvironment(content) {
  for (const line of content.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
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
  return Object.fromEntries(
    REQUIRED_ENVIRONMENT_VARIABLES.map((key) => {
      const value = process.env[key]?.trim();
      if (!value) throw new Error(`Missing required environment variable: ${key}`);
      return [key, value];
    }),
  );
}

function isTidyHqAccountsPage(page) {
  return new URL(page.url()).host === "accounts.tidyhq.com";
}

async function assertNoHumanChallenge(page) {
  const hasVerificationInput = await page.$(
    'input[autocomplete="one-time-code"], input[name*="verification" i], input[name*="otp" i]',
  );
  const text = (await page.$eval("body", (body) => body.innerText)).toLowerCase();
  if (hasVerificationInput || /enter the code|check your email|two-factor/.test(text)) {
    throw new Error("TidyHQ requires an interactive verification challenge; automated login stopped");
  }
}

async function loginIfRequired(page, configuration) {
  await page.goto(`${SITE_ORIGIN}/dashboard`, { waitUntil: "networkidle2" });
  if (!isTidyHqAccountsPage(page)) return;

  const usernameSelector = 'input[type="email"], input[name*="email" i], input[name*="username" i]';
  const passwordSelector = 'input[type="password"]';
  const submitSelector = 'button[type="submit"], input[type="submit"]';

  await page.waitForSelector(usernameSelector, { visible: true });
  await page.type(usernameSelector, configuration.TIDYHQ_WEB_USERNAME);
  await page.click(submitSelector);
  await page.waitForSelector(passwordSelector, { visible: true, timeout: 15000 }).catch(async () => {
    await assertNoHumanChallenge(page);
    throw new Error("TidyHQ did not present a password form after the email step");
  });

  await page.type(passwordSelector, configuration.TIDYHQ_WEB_PASSWORD);
  await page.click(submitSelector);
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 15000 }).catch(() => {});

  if (isTidyHqAccountsPage(page)) {
    await assertNoHumanChallenge(page);
    throw new Error("TidyHQ login was not accepted");
  }
}

function eventUrl(event) {
  const slug = event.public_url?.split("/").pop();
  if (!slug) throw new Error(`Event ${event.id} has no public URL slug`);
  return `${SITE_ORIGIN}/schedule/events/${slug}#attendees`;
}

async function attendeeRows(page, eventId) {
  const attendees = await page.$$eval('a[href*="/contacts/"]', (links) =>
    links.map((link) => ({
      id: link.getAttribute("href")?.match(/\/contacts\/(\d+)/)?.[1],
      name: link.textContent?.trim(),
    }))
      .filter((link) => link.id && link.name),
  );

  if (!attendees.length) {
    throw new Error(`No attendee contact rows found for event ${eventId}`);
  }

  return attendees.map(({ id, name }) => {
    const [first_name = "", ...lastNameParts] = name.split(/\s+/);
    return { id, first_name, last_name: lastNameParts.join(" ") };
  });
}

async function nextPageUrl(page) {
  return page.$eval(
    'a[rel="next"], .pagination .next:not(.disabled) a, a[aria-label="Next"]',
    (link) => link.href,
  ).catch(() => null);
}

async function crawlAttendees(page, event) {
  const visitedUrls = new Set();
  const attendees = new Map();
  let url = eventUrl(event);

  while (url) {
    if (visitedUrls.has(url)) throw new Error(`Pagination repeated for event ${event.id}`);
    visitedUrls.add(url);

    await page.goto(url, { waitUntil: "networkidle2" });
    await assertNoHumanChallenge(page);
    for (const attendee of await attendeeRows(page, event.id)) {
      attendees.set(attendee.id, {
        first_name: attendee.first_name,
        last_name: attendee.last_name,
      });
    }

    url = await nextPageUrl(page);
  }

  return [...attendees.values()];
}

async function writeCleanSnapshot(snapshot) {
  const outputDirectory = resolve(process.cwd(), "data");
  const outputPath = resolve(outputDirectory, "tinyhq_event.json");
  const temporaryPath = `${outputPath}.tmp`;

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  await rename(temporaryPath, outputPath);
}

async function main() {
  await loadEnvironmentFile();
  const configuration = requiredConfiguration();
  const rawSnapshot = JSON.parse(
    await readFile(resolve(process.cwd(), "data/tinyhq-upcoming-events.json"), "utf8"),
  );
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: resolve(process.cwd(), "tmp/tidyhq-browser-profile"),
    args: ["--no-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await loginIfRequired(page, configuration);

    const events = [];
    for (const { event } of rawSnapshot.events) {
      events.push({ ...event, attendees: await crawlAttendees(page, event) });
    }

    const snapshot = { fetched_at: new Date().toISOString(), events };
    await writeCleanSnapshot(snapshot);
    const attendeeCount = events.reduce((count, event) => count + event.attendees.length, 0);
    console.log(`TidyHQ browser attendee snapshot written: ${events.length} events, ${attendeeCount} attendees.`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`TidyHQ browser attendee crawl failed: ${error.message}`);
  process.exitCode = 1;
});
