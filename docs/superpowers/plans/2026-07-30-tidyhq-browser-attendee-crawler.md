# TidyHQ Browser Attendee Crawler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use the TidyHQ admin attendee pages, rather than purchaser API data, to generate the attendee list in `data/tinyhq_event.json`.

**Architecture:** A new Puppeteer script authenticates to the local HBCC TidyHQ dashboard with a persistent local profile, navigates the current/upcoming event pages, and follows attendee pagination. It uses the existing raw snapshot for the complete event metadata and replaces only the attendee source with the admin-page records.

**Tech Stack:** Node.js ESM, existing Puppeteer dependency, native `node:fs/promises`, existing local `.env` loader pattern.

## Global Constraints

- Require `TIDYHQ_WEB_USERNAME` and `TIDYHQ_WEB_PASSWORD` in ignored `.env`; never log either value.
- Persist authentication only in `tmp/tidyhq-browser-profile`, ignored by Git.
- Use `data/tinyhq-upcoming-events.json` for the selected event metadata, retaining only its current/upcoming events.
- Scrape attendees only from each authenticated admin event page’s `#attendees` view and every pagination page.
- Write `data/tinyhq_event.json` atomically only after every event succeeds.
- Attendee objects contain exactly `first_name` and `last_name`; do not output purchaser, ticket, or contact fields.
- Stop without replacing the clean export if login, a human challenge, selector discovery, or pagination fails.
- Do not add dependencies, scheduler configuration, automated tests, or commits.

---

### Task 1: Add persistent browser-login configuration and crawler command

**Files:**
- Modify: `.env.example`
- Modify: `.gitignore`
- Modify: `package.json`
- Create: `src/tinyhq-browser-attendees.js`

**Interfaces:**
- Consumes: `data/tinyhq-upcoming-events.json`, `.env` web-login values, and TidyHQ admin pages.
- Produces: `npm run tinyhq:browser-attendees`, which atomically refreshes `data/tinyhq_event.json`.

- [ ] **Step 1: Declare local-only browser configuration**

Append these empty placeholders to `.env.example`:

```dotenv
TIDYHQ_WEB_USERNAME=
TIDYHQ_WEB_PASSWORD=
```

Append the persistent-profile path to `.gitignore`:

```gitignore
tmp/tidyhq-browser-profile/
```

Add this script to `package.json`:

```json
"tinyhq:browser-attendees": "node src/tinyhq-browser-attendees.js"
```

- [ ] **Step 2: Implement login and authenticated-page detection**

Implement the `.env` loader and required configuration validation as in `src/tinyhq-sync.js`. Launch Puppeteer with:

```js
puppeteer.launch({
  headless: false,
  userDataDir: resolve(process.cwd(), "tmp/tidyhq-browser-profile"),
  args: ["--no-sandbox"],
})
```

Navigate to `https://hbcc.tidyhq.com/dashboard`. If the URL or visible page contains a login form, fill the email/username and password fields from `TIDYHQ_WEB_USERNAME` and `TIDYHQ_WEB_PASSWORD`, submit once, and wait for a page outside the accounts-login host. If an input for a verification code, a passkey control, CAPTCHA content, or a failed-login notice remains, throw a challenge-specific error before crawling.

- [ ] **Step 3: Discover event and attendee DOM selectors from authenticated pages**

Load `data/tinyhq-upcoming-events.json`, then use its selected event IDs to create event URLs from `event.public_url` when available or `https://hbcc.tidyhq.com/schedule/events/${event.id}` otherwise. Navigate to each event URL with `#attendees`, wait for the attendee table/list container, and inspect its rows. Extract a stable attendee contact-link or row identifier when present, and the displayed first and last name columns. If a row structure lacks two name values, throw an error naming the event ID instead of emitting potentially incorrect attendees.

For pagination, inspect the attendee view for a next-page link or button. Repeatedly navigate or click until no enabled next control remains. Track visited page URLs; throw if a URL repeats before pagination ends.

- [ ] **Step 4: Build and atomically write the clean export**

For each raw event, preserve its event metadata and replace `attendees` with the deduplicated browser rows:

```js
{
  ...event,
  attendees: [{ first_name, last_name }],
}
```

Build `{ fetched_at: new Date().toISOString(), events }`. Write it to `data/tinyhq_event.json.tmp` and rename it to `data/tinyhq_event.json` only after all pages have been crawled. Log counts only, then close the browser in `finally`.

- [ ] **Step 5: Run the visible local login-and-crawl validation**

Put the website username and password in ignored `.env`, then run:

```bash
npm run tinyhq:browser-attendees
```

Expected: Chromium logs in to the HBCC TidyHQ dashboard, crawls each attendee page and its pagination, writes `data/tinyhq_event.json`, and logs event/attendee counts without credentials or names. Verify a known child attendee appears under the child’s name rather than the purchaser’s name.
