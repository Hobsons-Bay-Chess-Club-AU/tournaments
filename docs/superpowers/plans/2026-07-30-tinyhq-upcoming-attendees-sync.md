# TidyHQ Upcoming Attendee Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an uncommitted local command that snapshots all current and upcoming TidyHQ event data, sold-ticket records, and referenced contact records into an internal JSON file.

**Architecture:** `src/tinyhq-sync.js` performs the OAuth password grant once, fetches the v1 event list, filters it in memory, then obtains each event's sold tickets and each unique attendee contact. It writes a complete payload through a temporary file in `data/` so a failed run never replaces the last good snapshot.

**Tech Stack:** Node.js ESM, native `fetch`, `node:fs/promises`, TidyHQ v1 Events and Contacts APIs.

## Global Constraints

- Read the five existing TidyHQ settings from `.env` without overriding shell environment variables.
- Use `/v1/events`, `/v1/events/:eventID/tickets/sold`, and `/v1/contacts/:contactID` with one OAuth password-grant bearer token.
- Include only non-archived events where `end_at`, or `start_at` when `end_at` is absent, is at or after the current run time.
- Preserve the complete API payloads in the JSON snapshot; do not build a public-facing shape in this task.
- Store the private snapshot at `data/tinyhq-upcoming-events.json`, never under `www/`.
- Do not add dependencies, automated tests, scheduler configuration, or commits.

---

### Task 1: Add the private event-attendee sync command

**Files:**
- Create: `src/tinyhq-sync.js`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: the existing five TidyHQ environment settings in `.env`.
- Produces: `npm run tinyhq:sync`, which creates `data/tinyhq-upcoming-events.json` and logs event, ticket, and contact counts.

- [ ] **Step 1: Keep generated private data out of Git and deployed assets**

Append this ignored generated-file path to `.gitignore`:

```gitignore
data/tinyhq-upcoming-events.json
```

- [ ] **Step 2: Add the command entry point**

Add this npm script beside `tidyhq:memberships` in `package.json`:

```json
"tinyhq:sync": "node src/tinyhq-sync.js"
```

- [ ] **Step 3: Implement `src/tinyhq-sync.js`**

Reuse the local `.env` parsing and OAuth password-grant request pattern from `src/tidyhq-memberships.mjs`. Add `fetchJson(label, path, token)` that calls `https://api.tidyhq.com/v1${path}` with an `Authorization: Bearer` header and throws status-only errors.

Define the upcoming predicate as:

```js
function isUpcoming(event, now) {
  if (event.archived) return false;
  const relevantDate = event.end_at ?? event.start_at;
  return relevantDate && new Date(relevantDate) >= now;
}
```

Fetch the selected event ticket payloads sequentially and keep each as `{ event, tickets }`. Deduplicate non-null `ticket.contact_id` values in a `Set`, then fetch each contact once and assign it to a `contacts` object keyed by the contact ID.

Build this payload:

```js
{
  fetched_at: new Date().toISOString(),
  events: eventSnapshots,
  contacts,
}
```

Create `data/` with `mkdir({ recursive: true })`; write formatted JSON to `data/tinyhq-upcoming-events.json.tmp`, then rename it to `data/tinyhq-upcoming-events.json`. Log only the final event, ticket, and contact counts.

- [ ] **Step 4: Manually run the live sync**

Run:

```bash
npm run tinyhq:sync
```

Expected: exit `0`, counts only in terminal output, and a formatted `data/tinyhq-upcoming-events.json` with the documented `fetched_at`, `events`, and `contacts` keys. Verify the file contains no archived or ended events.
