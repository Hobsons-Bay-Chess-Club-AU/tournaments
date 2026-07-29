# TidyHQ Membership Smoke Test

## Goal

Provide a local Node.js command that proves the configured TidyHQ application credentials can obtain an OAuth access token and read the current organisation's memberships. This is a standalone proof of connection; scheduler and workflow integration are explicitly out of scope.

## Interface

Add `src/tidyhq-memberships.mjs` and expose it as `npm run tidyhq:memberships`.

The command reads these environment variables from a local `.env` file:

- `TIDYHQ_APPLICATION_ID`
- `TIDYHQ_APPLICATION_SECRET`

It uses Node's native `fetch`; no new runtime dependency is required. A committed `.env.example` will list the variable names with empty values. The real `.env` remains local and ignored.

## Request Flow

1. Load `.env` into `process.env` without overriding variables already supplied by the shell.
2. Validate that both TidyHQ credentials are present.
3. Send a client-credentials OAuth token request to `https://accounts.tidyhq.com/oauth/token`.
4. Send `GET https://api.tidyhq.com/v2/memberships` with the returned bearer token.
5. Print a short success summary followed by formatted membership JSON to stdout.

The token, application secret, and any credentials are never printed or written to disk.

## Error Handling

The command exits non-zero with a concise error when credentials are absent, the token request is rejected, or the memberships request is unsuccessful. HTTP error messages may include status and safe server response details, but must not expose the application secret or access token.

## Tests

Use Node's built-in test runner. Tests will cover missing credentials, a successful token-plus-memberships sequence, and a failed HTTP response. Network calls will be injected or mocked at the boundary so tests never contact TidyHQ or require real credentials.

## Deferred Work

No scheduled workflow, data persistence, membership transformation, pagination strategy, or downstream integration is included in this change.
