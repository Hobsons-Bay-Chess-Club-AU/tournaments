# TidyHQ Browser Attendee Crawler

## Goal

Add `src/tinyhq-browser-attendees.js`, a local Puppeteer crawler that logs in to the HBCC TidyHQ admin site, reads the admin attendee lists for current and upcoming events, and writes the correct attendee names to `data/tinyhq_event.json`.

## Authentication

The crawler uses these local `.env` values:

- `TIDYHQ_WEB_USERNAME`
- `TIDYHQ_WEB_PASSWORD`

It launches a visible Chromium browser for the initial login test and stores its authenticated profile in `tmp/tidyhq-browser-profile`. Credentials, cookies, and browser-profile files remain local and ignored. The crawler fails without writing output if it detects a challenge that cannot be automated, including a one-time-code, passkey, CAPTCHA, or unexpected login form.

## Crawl Flow

1. Launch Puppeteer with the persistent local profile.
2. Visit `https://hbcc.tidyhq.com/dashboard`; if unauthenticated, fill and submit the login form using the web credentials.
3. Visit `https://hbcc.tidyhq.com/schedule/events` and collect current/upcoming event links.
4. Visit each event page and use its `#attendees` view.
5. Follow attendee pagination until no next page remains, accumulating the attendee rows from each HTML response.
6. Read event metadata from the event page and write the completed clean export atomically to `data/tinyhq_event.json`.

## Output

The crawler owns the attendee list in `data/tinyhq_event.json`. Every output event retains its non-sensitive TidyHQ event metadata and has:

```json
{
  "attendees": [
    {
      "first_name": "…",
      "last_name": "…"
    }
  ]
}
```

The crawler must use the admin attendee rows, not the REST `tickets/sold` purchaser contact IDs. It deduplicates attendees within an event using a stable attendee-page identifier when available, otherwise the exact first-and-last-name pair.

## Reliability and Verification

The crawler discovers selectors from the rendered page rather than hard-coding assumptions from the REST API. It verifies that the authenticated page is reached before crawling and logs event and attendee counts only. It builds the full result in memory and atomically replaces `data/tinyhq_event.json` only when every event and attendee page has been read successfully.

## Deferred Work

No scheduler configuration, headless-run optimisation, 2FA/CAPTCHA bypass, public deployment, or v2 React page is included. The existing REST raw snapshot remains available for comparison but is not treated as the attendee source.
