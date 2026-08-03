# TidyHQ Clean Event Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the local TidyHQ sync to create a clean event-attendee JSON export alongside the existing private raw snapshot.

**Architecture:** The sync continues assembling its raw snapshot in memory first. A pure transformation derives a second payload by copying all event metadata and resolving each event's ticket contact IDs through the raw contact map, exposing only each attendee's first and last name. Both snapshots use atomic file writes.

**Tech Stack:** Node.js ESM, native `node:fs/promises`, existing TidyHQ sync data structures.

## Global Constraints

- Retain `data/tinyhq-upcoming-events.json` as the unchanged full private source snapshot.
- Write the clean export to `data/tinyhq_event.json`, outside `www/` and ignored by Git.
- Copy full TidyHQ event metadata and omit ticket records from the clean export.
- Every attendee object contains exactly `first_name` and `last_name`.
- Deduplicate attendees by `contact_id` inside each event and omit tickets whose contact data is unavailable.
- Do not add dependencies, automated tests, scheduler configuration, or commits.

---

### Task 1: Generate the clean event-attendee export

**Files:**
- Modify: `src/tinyhq-sync.js`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: raw snapshot object `{ fetched_at, events: [{ event, tickets }], contacts }` already assembled by `tinyhq-sync.js`.
- Produces: `data/tinyhq_event.json` with `{ fetched_at, events }`, where every event includes `attendees: [{ first_name, last_name }]`.

- [ ] **Step 1: Ignore the generated clean export**

Append this path to `.gitignore`:

```gitignore
data/tinyhq_event.json
```

- [ ] **Step 2: Add the pure transform function**

Add `cleanEventSnapshot(rawSnapshot)`. For each `{ event, tickets }`, spread the complete `event` object, then build `attendees` from ticket contact IDs:

```js
const attendeeIds = new Set();
for (const ticket of tickets) {
  if (ticket.contact_id != null) attendeeIds.add(String(ticket.contact_id));
}

const attendees = [...attendeeIds]
  .map((contactId) => rawSnapshot.contacts[contactId])
  .filter(Boolean)
  .map(({ first_name, last_name }) => ({ first_name, last_name }));
```

Return:

```js
{
  fetched_at: rawSnapshot.fetched_at,
  events: rawSnapshot.events.map(/* transformed event */),
}
```

- [ ] **Step 3: Write both snapshots atomically after a successful sync**

Generalise `writeSnapshot(snapshot)` to accept an output file name. Create the raw snapshot once, pass it to `cleanEventSnapshot`, then write:

```js
await writeSnapshot("tinyhq-upcoming-events.json", rawSnapshot);
await writeSnapshot("tinyhq_event.json", cleanSnapshot);
```

Retain the existing raw event, ticket, and contact count log and add clean attendee count without printing any names.

- [ ] **Step 4: Manually verify the clean privacy boundary**

Run:

```bash
npm run tinyhq:sync
```

Then inspect only schema information:

```bash
node --input-type=module -e 'import { readFile } from "node:fs/promises"; const data = JSON.parse(await readFile("data/tinyhq_event.json", "utf8")); const text = JSON.stringify(data); if (/(email_address|phone_number|ticket_id|contact_id|code)/.test(text)) throw new Error("Sensitive ticket or contact field found"); console.log(data.events.length);'
```

Expected: exit `0`, event count matches the raw snapshot, and clean attendees have only `first_name` and `last_name` fields.
