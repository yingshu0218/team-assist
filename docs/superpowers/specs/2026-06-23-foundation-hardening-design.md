# Foundation Hardening Design

## Goal

Make the application safe to start from a blank local state, buildable as the provided Docker image, and suitable for being placed under Git and later connected to Gitea.

## Scope

This change clears the user-approved test database, initializes a Git repository, ignores local runtime artifacts, aligns the SQLite path configuration with Docker, enables Next.js standalone output, and replaces the reversible session-token construction with HMAC-SHA-256.

It also corrects Agent Chat deployment examples so they include the required `ledger_id`.

## Architecture

The database client has one resolved database path: `SQLITE_DB_PATH` when it is set, otherwise `DATA_DIR/ledger-crm.db`. The parent directory of that resolved path is created at initialization.

Session tokens retain the existing compact three-segment layout and 24-hour expiry, but their third segment becomes an HMAC-SHA-256 signature over `header.payload`. A secret must be provided through `ADMIN_SESSION_SECRET`; the application does not provide an insecure fallback.

## Error handling

Creating or verifying a session token without `ADMIN_SESSION_SECRET` produces an explicit configuration error. Malformed or tampered tokens remain unauthenticated rather than throwing out of request handling.

## Validation

Node's test runner, via `tsx`, will verify that session signatures are HMAC-sized, round-trip correctly, and reject tampering. Type checking, linting, the test suite, and a production build will be run after dependencies are available.
