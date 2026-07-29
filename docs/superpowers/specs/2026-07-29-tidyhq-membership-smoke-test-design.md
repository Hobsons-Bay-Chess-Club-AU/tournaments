# TidyHQ Membership Smoke Test

## Goal

Provide a local Node.js command that proves the configured TidyHQ application credentials can obtain an OAuth access token and read the current organisation's memberships. This is a standalone proof of connection; scheduler and workflow integration are explicitly out of scope.

## Interface

Add `src/tidyhq-memberships.mjs` and expose it as `npm run tidyhq:memberships`.

The command reads these environment variables from a local `.env` file:

- `TIDYHQ_APPLICATION_ID`
- `TIDYHQ_APPLICATION_SECRET`
- `TIDYHQ_DOMAIN_PREFIX`
- `TIDYHQ_USERNAME`
- `TIDYHQ_API_KEY`

It uses Node's native `fetch`; no new runtime dependency is required. A committed `.env.example` will list the variable names with empty values. The real `.env` remains local and ignored.

## Request Flow

1. Load `.env` into `process.env` without overriding variables already supplied by the shell.
2. Validate that all five TidyHQ configuration values are present.
3. Send a password-grant OAuth token request to `https://accounts.tidyhq.com/oauth/token`, using the organisation domain prefix, user email, and user API key.
4. Send `GET https://api.tidyhq.com/v2/memberships` with the returned bearer token.
5. Print a short success summary followed by formatted membership JSON to stdout.

The token, application secret, and any credentials are never printed or written to disk.

## Error Handling

The command exits non-zero with a concise error when credentials are absent, the token request is rejected, or the memberships request is unsuccessful. HTTP error messages may include status and safe server response details, but must not expose the application secret or access token.

## Manual Verification

No automated tests are required for this local proof. After creating `.env` with valid credentials, run the npm command locally and confirm that it prints a successful request summary followed by membership JSON.

## Deferred Work

No scheduled workflow, data persistence, membership transformation, pagination strategy, or downstream integration is included in this change.
