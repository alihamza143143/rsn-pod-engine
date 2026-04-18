# RSN E2E Test Suite

Playwright + Socket.IO end-to-end tests against live `app.rsn.network`.

## Setup

```bash
cd e2e
npm install
npx playwright install chromium
```

## Run

```bash
# JWT_SECRET from Render env vars (JWT_SECRET key on rsn-api service)
export JWT_SECRET=$(cat .jwt_secret)
export DATABASE_URL=$(grep DATABASE_URL ../server/.env | cut -d= -f2-)
npx playwright test
```

## Test users

Users created via `helpers/auth.ts:createTestUser()` — directly in DB with email pattern `e2etest-*-{timestamp}@example.com`.

`cleanupTestData()` runs after each test suite — deletes:
- Test users (matched by email pattern)
- Sessions hosted by those users (cascades matches/ratings/participants)
- Pods owned by those users
- audit_log, refresh_tokens, notifications, encounter_history, invites tied to those users

## What's tested

- **manual-rooms.spec.ts** — ghost room disappears after match completes, bulk create works

## Adding tests

1. Use `createTestUser` to spin up users with valid JWT tokens
2. Use `helpers/api.ts` for REST calls
3. Use `socket.io-client` for live event flows (host:create_breakout_bulk, participant:leave_conversation, etc.)
4. Always end with cleanup — afterAll hook
