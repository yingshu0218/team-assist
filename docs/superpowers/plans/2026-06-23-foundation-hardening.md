# Foundation Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a clean, version-controlled, Docker-buildable application with securely signed administrator sessions.

**Architecture:** Resolve SQLite to a single environment-aware path. Keep the existing JWT-like transport format while replacing its signature with Node HMAC-SHA-256 and requiring an explicit production secret. Build standalone Next.js output because the existing Docker image packages that artifact.

**Tech Stack:** Next.js 16, TypeScript 5, Node `crypto`, Docker, SQLite, Node test runner, tsx.

---

### Task 1: Establish clean local and Git state

**Files:**
- Create: `.gitignore`
- Delete: `data/ledger-crm.db`, `data/ledger-crm.db-wal`, `data/ledger-crm.db-shm`

- [x] Add ignore rules for dependencies, build output, local SQLite files, CLI configuration, and environment files.
- [x] Remove the user-approved local test database files from the project workspace.
- [x] Verify `git status --short` does not list runtime data or `node_modules`.

### Task 2: Define session-token behavior with a failing test

**Files:**
- Create: `test/auth.test.ts`
- Modify: `package.json`

- [x] Add the Node test script: `node --import tsx --test`.
- [x] Add a test that expects generated signatures to be one base64url-encoded SHA-256 digest, authenticates the untouched token, and rejects an altered token.
- [x] Run the isolated test with the bundled `tsx` loader; before the implementation it failed because the session-token module did not exist.

### Task 3: Secure the session signer

**Files:**
- Modify: `src/lib/auth.ts`

- [x] Replace the static fallback secret with a function that requires `ADMIN_SESSION_SECRET`.
- [x] Replace the current base64 concatenation with `createHmac('sha256', secret).update(header + '.' + body).digest('base64url')`.
- [x] Verify the expected signature with a timing-safe comparison and retain expiry verification.
- [x] Re-run the isolated test with the bundled `tsx` loader; both tests pass.

### Task 4: Align runtime configuration and packaging

**Files:**
- Modify: `next.config.ts`
- Modify: `src/storage/database/sqlite-client.ts`
- Modify: `docker-compose.yml`

- [x] Set `output: 'standalone'` in the Next.js configuration.
- [x] Make `SQLITE_DB_PATH` override the default database path and create the directory of the resolved path.
- [x] Require `ADMIN_SESSION_SECRET` in Compose rather than supplying an insecure default.
- [x] Statically confirm that Docker and the SQLite client use the same `SQLITE_DB_PATH` variable.

### Task 5: Repair Agent Chat contract examples

**Files:**
- Modify: `src/app/api/auth/agent/deploy/route.ts`

- [x] Include `ledger_id` in each Agent Chat curl body.
- [x] Mark `ledger_id` required in the OpenClaw tool schema and state that it is required in the prompt.

### Task 6: Verify and commit

**Files:**
- Verify: `package.json`, `test/auth.test.ts`, `src/lib/auth.ts`, `src/storage/database/sqlite-client.ts`, `next.config.ts`, `docker-compose.yml`, `src/app/api/auth/agent/deploy/route.ts`

- [ ] Run `pnpm test`, `pnpm validate`, and `pnpm next build` (blocked until pnpm can finish dependency linking without network policy interference).
- [x] Inspect `git diff --check` and `git status --short`.
- [ ] Create the initial local commit with the clean baseline and hardening changes.
