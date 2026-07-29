# TidyHQ Membership Smoke Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local Node.js command that obtains a TidyHQ password-grant token and prints the current organisation's memberships.

**Architecture:** A single ESM script owns `.env` loading, configuration validation, OAuth password-grant exchange, and the memberships request. It uses Node's native `fetch` and writes only to stdout/stderr; the local `.env` carries placeholders and is ignored by Git.

**Tech Stack:** Node.js ESM, native `fetch`, native `URLSearchParams`, npm scripts.

## Global Constraints

- Use TidyHQ API v2 endpoint `https://api.tidyhq.com/v2/memberships`.
- Obtain the token with `POST https://accounts.tidyhq.com/oauth/token` and grant type `password`.
- Require `TIDYHQ_APPLICATION_ID`, `TIDYHQ_APPLICATION_SECRET`, `TIDYHQ_DOMAIN_PREFIX`, `TIDYHQ_USERNAME`, and `TIDYHQ_API_KEY`.
- Do not log tokens, the application secret, or the API key.
- Do not add dependencies or automated tests; user will run the local smoke test manually.

---

### Task 1: Local TidyHQ membership smoke-test command

**Files:**
- Create: `.env`
- Create: `.env.example`
- Create: `src/tidyhq-memberships.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `.env` configuration values listed in Global Constraints.
- Produces: `npm run tidyhq:memberships`, which exits `0` after printing the memberships payload and exits `1` after reporting a safe error.

- [ ] **Step 1: Add local configuration placeholders**

Create `.env` and `.env.example` with the same empty values:

```dotenv
TIDYHQ_APPLICATION_ID=
TIDYHQ_APPLICATION_SECRET=
TIDYHQ_DOMAIN_PREFIX=
TIDYHQ_USERNAME=
TIDYHQ_API_KEY=
```

- [ ] **Step 2: Add the npm command**

Add this script beside the existing `dev` script in `package.json`:

```json
"tidyhq:memberships": "node src/tidyhq-memberships.mjs"
```

- [ ] **Step 3: Implement the ESM script**

Implement `src/tidyhq-memberships.mjs` to parse `KEY=VALUE` lines from `.env` without replacing pre-existing shell environment variables. Require all five configuration keys. Post URL-encoded data to the token endpoint:

```js
new URLSearchParams({
  grant_type: 'password',
  client_id: applicationId,
  client_secret: applicationSecret,
  domain_prefix: domainPrefix,
  username,
  password: apiKey,
})
```

Read `access_token` from the successful JSON response. Fetch memberships using:

```js
headers: {
  Accept: 'application/json',
  Authorization: `Bearer ${accessToken}`,
}
```

For failed HTTP responses, throw an error containing only the request label and status; do not include request bodies or token response data. On success, print `TidyHQ authentication succeeded; memberships fetched.` and `JSON.stringify(memberships, null, 2)`.

- [ ] **Step 4: Manually validate configuration handling**

Run:

```bash
npm run tidyhq:memberships
```

Expected with untouched placeholders: non-zero exit and a message naming the missing configuration key, with no secret values printed.

- [ ] **Step 5: Manually validate against TidyHQ**

Fill the five values in the ignored `.env`, then run:

```bash
npm run tidyhq:memberships
```

Expected: the success summary followed by formatted memberships JSON. If TidyHQ rejects the request, the command exits non-zero with a status-only error that does not expose credentials.

- [ ] **Step 6: Commit tracked implementation files**

```bash
git add .env.example package.json src/tidyhq-memberships.mjs
git commit -m "feat: add TidyHQ memberships smoke test"
```

Do not stage `.env`.
