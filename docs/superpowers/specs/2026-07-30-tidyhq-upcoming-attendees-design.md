# TidyHQ Upcoming Event Attendee Snapshot

## Goal

Create `src/tinyhq-sync.js`, a local Node.js command that produces a complete, internal JSON snapshot of upcoming TidyHQ events, their sold tickets, and the full contact records referenced by those tickets. This snapshot is preparation for a later v2 React attendee page; rendering and public-data cleanup are out of scope.

## Input and Authentication

The command reuses the existing TidyHQ password-grant configuration from `.env`:

- `TIDYHQ_APPLICATION_ID`
- `TIDYHQ_APPLICATION_SECRET`
- `TIDYHQ_DOMAIN_PREFIX`
- `TIDYHQ_USERNAME`
- `TIDYHQ_API_KEY`

It authenticates once per run and sends the bearer token to the TidyHQ v1 Event and Contact endpoints.

## Data Flow

1. Fetch `GET /v1/events`.
2. Retain events that are not archived and whose `end_at` is at or after the run time. If an event lacks `end_at`, use `start_at` instead.
3. For every retained event, fetch `GET /v1/events/:eventID/tickets/sold` and preserve its full response.
4. Collect unique `contact_id` values from all sold-ticket records, then fetch each contact once via `GET /v1/contacts/:contactID`.
5. Write the finished snapshot atomically to `data/tinyhq-upcoming-events.json`.

## Snapshot Shape

```json
{
  "fetched_at": "2026-07-30T00:00:00.000Z",
  "events": [
    {
      "event": {},
      "tickets": []
    }
  ],
  "contacts": {
    "123": {}
  }
}
```

The `event`, `tickets`, and contact values remain full TidyHQ API payloads. Contacts are deduplicated by ID at the top level so a person attending multiple events is stored once.

## Reliability and Privacy

The command logs counts only, never credentials or bearer tokens. It builds the complete snapshot in memory and writes only after every request succeeds, so a failed run cannot replace the prior JSON. The JSON may contain personal data and is an internal source file under `data/`, outside the published `www/` directory; sanitising it for public v2 rendering is a separate later task.

## Manual Verification

Run the command with the existing populated `.env`. Confirm it creates `data/tinyhq-upcoming-events.json`, reports its event/ticket/contact counts, and includes only current or future non-archived events.

## Deferred Work

No scheduler configuration, GitHub Actions secrets, v2 React page, data filtering, or public exposure is included in this change.
