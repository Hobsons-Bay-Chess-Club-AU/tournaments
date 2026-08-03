# TidyHQ Clean Event Export

## Goal

Extend the existing TidyHQ sync so each successful raw snapshot also creates a clean event-attendee export for later v2 use. The raw private snapshot remains available unchanged.

## Output Files

- `data/tinyhq-upcoming-events.json`: full private TidyHQ API data, unchanged.
- `data/tinyhq_event.json`: clean event data with public-safe attendee names.

Both generated files remain ignored by Git and outside the published `www/` directory.

## Transformation

After assembling the raw snapshot, transform each event snapshot into one clean event object. Preserve all event metadata from the TidyHQ event object. Remove ticket records entirely.

Resolve each ticket's `contact_id` through the raw snapshot contact map. For every resolved contact, output only:

```json
{
  "first_name": "…",
  "last_name": "…"
}
```

Deduplicate attendees inside each event by contact ID. Tickets with missing contacts do not create an attendee record.

## Clean Snapshot Shape

```json
{
  "fetched_at": "2026-07-30T00:00:00.000Z",
  "events": [
    {
      "id": 80371,
      "name": "…",
      "location": "…",
      "start_at": "…",
      "end_at": "…",
      "body": "…",
      "image_url": "…",
      "public_url": "…",
      "attendees": [
        {
          "first_name": "…",
          "last_name": "…"
        }
      ]
    }
  ]
}
```

The actual event objects retain all event metadata fields supplied by TidyHQ, not only the fields shown in the example.

## Reliability and Verification

Generate both payloads in memory before writing either output. Write each through a temporary file and rename it only after successful serialization. On successful sync, log the clean event and attendee counts without printing personal data.

Manually run `npm run tinyhq:sync`, confirm both files exist, and inspect the clean export to ensure it contains no ticket data, contact IDs, emails, phone numbers, or contact fields other than attendee first and last names.

## Deferred Work

No v2 React page, GitHub Actions workflow, public deployment, additional data fields, or automated tests are included in this change.
