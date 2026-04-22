# Plan — 22nd April Review: Architectural Fixes (Dr Arch Mode)

## Context

On 2026-04-22 the user filed a structured review (`assets/review - 22nd April _ RSN Platform.pdf`) listing 14 active issues across identity, real-time sync, matching, roles, mobile/UI/video. Five parallel deep audits (one per domain) were dispatched. Their findings converge on **five architectural deficiencies** that surface as ~14 user-visible symptoms:

1. **State authority gap** — system broadcasts state changes (server-push) but has no authoritative client-pull endpoint for new joiners or reconnects → causes Issues 3, 4, 7, 8.
2. **Match validation gap** — no central validator before INSERT/UPDATE on `matches` → causes Issues 5, 6.
3. **Identity/onboarding misalignment** — onboarding gate misplaced in `ProtectedRoute`, invite acceptance not atomic, no email verification → causes Issues 1, 2.
4. **Role model fragmentation** — four independent role systems (`users.role`, `pod_members.role`, `sessions.host_user_id`, `session_cohosts`) with no unified resolver → causes Issue 9.
5. **Encounter scope ambiguity** — `getEncounterHistoryForUsers` is global, has no `sessionId` filter → causes Issue 11.

Plus five concrete localized bugs in mobile/UI/video (issues 13, 14, 15).

This plan groups fixes by user impact (P0 / P1 / P2), maps each to the architectural root cause, and recommends a sequencing that respects internal dependencies. **Behavior preservation is the constraint** — every fix preserves documented behaviour from commit `d6fcb80` (current HEAD) except where explicitly documented.

**This plan is not approval-ready code.** It's the architectural roadmap. Each item below would be implemented with TDD + per-commit rollback during execution.

**Issue 16 (Onboarding rewrite)** — explicitly excluded by the user ("currently under work — ignore for now").

---

## Tier 0 — Production-blocking (must ship before next live event)

These four issues can crash an event mid-session or block users from entering. Fix order matters: T0-1 unblocks T0-2 and T0-3 because all three need the same `match-validator.service.ts` foundation.

### T0-1. Central match validator (issue 5 + 6)

**Root cause**
Two manual-write handlers (`handleHostCreateBreakout` at `host-actions.ts:1542-1620`, `handleHostSwapMatch` at `matching-flow.ts:243-295`) bypass the validation done in `handleHostCreateBreakoutBulk`. Migration 042's trigger only validates inserts where `status = 'active'` — so a non-active insert that later transitions to active is unprotected. There's no application-layer pre-INSERT check. Result: a participant ending up in two active matches is technically possible despite the partial-unique indices.

**Architectural fix**
Create `server/src/services/matching/match-validator.service.ts` with a single function `validateMatchAssignment(sessionId, roundNumber, participantIds, excludeMatchId?)` that:
- Asserts 2-3 distinct participant IDs (no duplicates within a match)
- Queries for existing active matches in this round overlapping with these participants
- Returns `{ valid: boolean; errors: string[] }` — never throws, returns structured errors so handlers emit proper `INVALID_MATCH_ASSIGNMENT` socket errors

Wire it into every match write site:
- `host-actions.ts:1579` (handleHostCreateBreakout INSERT) — guard before INSERT
- `breakout-bulk.ts:227` (handleHostCreateBreakoutBulk INSERT loop) — guard each iteration
- `matching-flow.ts:283-286` (handleHostSwapMatch UPDATE) — guard before both UPDATEs
- `matching-flow.ts:317-336` (handleHostExcludeFromRound UPDATE/DELETE) — guard before mutation

**Files**
- New: `server/src/services/matching/match-validator.service.ts`
- Modified: `host-actions.ts`, `breakout-bulk.ts`, `matching-flow.ts`
- New tests: `__tests__/services/matching/match-validator.test.ts` covering the 4 invariants (count, uniqueness, conflicts, status transitions)

**Risk**
Low. The validator is pure validation — no schema changes, no behaviour change for valid writes. Invalid writes that previously succeeded silently now fail with a clear error. If a real-world flow we don't know about depended on the old permissive behaviour, host gets a `INVALID_MATCH_ASSIGNMENT` error and can retry.

**Behavior preservation**
All current valid match assignments continue to work. Invalid assignments that previously corrupted state now fail loudly with a host-visible error.

### T0-2. Breakout state machine — explicit ready signal (issue 7)

**Root cause**
The host UI shows a breakout as "active" the moment matches are inserted (`breakout-bulk.ts:188-290`). But participants haven't actually connected to LiveKit yet — token fetch + WebSocket setup is async (`useSessionSocket.ts:31-42`). `emitHostDashboard` at `matching-flow.ts:718-735` reports `isConnected: activeSession.presenceMap.has(userId)` — but `presenceMap` is updated on socket-level `session:join`, NOT on actual room presence.

**Architectural fix**
Add an explicit "I'm in the room" handshake:
1. Client side (`VideoRoom.tsx`): after LiveKit `room.connect()` resolves successfully, emit `presence:room_joined { sessionId, matchId, roomId }`.
2. Server side: new handler in `participant-flow.ts` updates a `roomParticipants: Map<sessionId, Map<userId, {matchId, roomId, joinedAt}>>` on the ActiveSession.
3. `emitHostDashboard` reads from `roomParticipants` (NOT `presenceMap`) for the `isConnected` flag in the per-room participant list.
4. State machine columns become: `ASSIGNED` (match row inserted, token issued) → `MOVED` (`presence:room_joined` received) → `ACTIVE` (host sees ≥1 participant in room).

**Files**
- New socket event registration in `orchestration.service.ts`
- Modified: `participant-flow.ts` (new handler + new map on ActiveSession), `matching-flow.ts:718-735` (use roomParticipants), `client/src/features/live/VideoRoom.tsx` (emit signal post-connect)
- Modified type: `ActiveSession` in `session-state.ts` adds `roomParticipants: Map<userId, RoomPresence>` field

**Risk**
Medium — race window exists where match transition fires but no participant joins (e.g., everyone disconnected). Need a fallback: after 30s of no `presence:room_joined`, the room counts as "empty" and host sees red dot, can manually intervene. This actually improves on current state where host sees a false green dot.

**Behavior preservation**
Host dashboard's `isConnected` becomes more accurate (true room presence vs socket presence). Pre-A1 polling cadence (1/sec coalesce) preserved.

### T0-3. Authoritative session-state REST endpoint (issue 4 — major)

**Root cause**
Today, state propagation is broadcast-only. When round 2 ends and round 3 starts, `session:status_changed` fires to the session room, but a client that reconnects 2 seconds later misses it entirely. They rely on the `session:state` socket emit during `session:join` (`participant-flow.ts:279-288`), which reads from `activeSession` (in-memory) — accurate IF the server didn't restart. If the server did restart, `activeSession` may not have been recovered yet and the client gets stale DB status.

**Architectural fix**
Add `GET /api/sessions/:id/state` REST endpoint returning a single authoritative snapshot:
```typescript
{
  sessionStatus: SessionStatus,
  currentRound: number,
  isPaused: boolean,
  timerEndsAt: ISO | null,
  pendingRoundNumber: number | null,
  participantMetrics: { connected: 8, registered: 10, active: 8 },
  rooms: [{ matchId, roomId, status, participants: [...] }],
  hostUserId: string,
  cohosts: string[],
}
```

Source of truth: read from `activeSession` if present, else fall back to DB. Reuse the data shape from `host:round_dashboard` so client code can apply it via the same handler.

Client changes:
- `useSessionSocket.ts` calls this endpoint on mount AND on every `connect` (including reconnects), then dispatches the result to `sessionStore.applyFullState(state)`.
- New action `applyFullState` on the store sets all state fields atomically (round, status, timerEndsAt, paused, etc.)
- Drift detection: every 30s, client compares its state to server's; if divergent, refetches.

**Files**
- New: `server/src/routes/sessions.ts` — `GET /:id/state` route + handler
- Modified: `client/src/hooks/useSessionSocket.ts` (call on mount + reconnect)
- Modified: `client/src/stores/sessionStore.ts` (add `applyFullState` action)
- Modified: `participant-flow.ts:279-288` — share helper that builds the state shape (used by both REST and socket)

**Risk**
Low. New REST endpoint is additive; existing socket flow continues unchanged. Client just gains a fallback path for state recovery.

**Behavior preservation**
All existing socket events keep working. New endpoint is the safety net, not the primary path.

### T0-4. Atomic invite acceptance (issue 2)

**Root cause**
`invite.service.ts:326-476` commits the invite-status update inside a transaction, then runs `podService.addMember()` and `sessionService.registerParticipant()` AFTER the transaction commits. If session registration fails (capacity full, invalid state, etc.), the invite is permanently marked accepted but the user is not registered. Next attempt: client gets `INVITE_ALREADY_USED` and recovery code wrongly assumes they're a member.

**Architectural fix**
Move all registration logic INSIDE the existing transaction:
1. SELECT FOR UPDATE invite row (already done at line 327-331)
2. Validate user identity matches `invitee_email` if set (NEW — see T1-1)
3. INSERT/UPDATE `pod_members` row
4. INSERT/UPDATE `session_participants` row
5. UPDATE invite to `accepted` + bump `use_count`
6. COMMIT — only succeeds if all above succeeded

If any step fails: ROLLBACK + return clear error to client. Client sees a definitive success/failure, no orphaned state.

Server returns response shape:
```typescript
{
  success: true,
  registeredFor: { sessionId?: string, podId?: string },
  redirectTo: '/sessions/:id/live' | '/pods/:id'
}
```

Client uses `redirectTo` directly — no client-side guessing about where to navigate.

**Files**
- Modified: `server/src/services/invite/invite.service.ts:326-476` — restructure transaction
- Modified: `server/src/routes/invites.ts` — clarify response shape
- Modified: `client/src/features/invites/InviteAcceptPage.tsx:96-117` — use `redirectTo` from server response, drop the recovery-fallback chain

**Risk**
Medium — restructuring the invite transaction. Existing tests + careful TDD. Specifically need to handle "user already a member" (idempotent re-acceptance) without rollback.

**Behavior preservation**
Successful invite acceptance still registers users immediately. Idempotent re-acceptance returns same `redirectTo`. Multi-use invites continue to work.

---

## Tier 1 — Major UX impact (ship after T0, before next batch event)

### T1-1. Email verification on invite + identity-match guard (issue 1)

**Root cause**
`POST /invites/:code/accept` doesn't check whether the authenticated user's email matches the invite's `invitee_email`. Multi-device users land in confusing states (logged in as A on phone, click invite addressed to B from desktop → B's invite gets marked accepted by A's account).

**Architectural fix**
- In the invite acceptance transaction (T0-4), if `invite.invitee_email` is non-null, assert it matches `req.user.email` (case-insensitive). Return `IDENTITY_MISMATCH` error with both emails so client UI can prompt account switch.
- For invite EMAIL flow (when invitee doesn't yet have an account), magic-link verify already routes through `verifyMagicLink()` which reads invite context. Pass invite code into the verify response so client auto-redirects to `/invite/:code` to complete acceptance using the same identity that just verified.

**Files**
- Modified: `server/src/services/invite/invite.service.ts` (acceptance) + `server/src/routes/invites.ts`
- Modified: `server/src/services/identity/identity.service.ts` (verifyMagicLink response)
- Modified: client invite + login pages

**Risk**
Low — adds a guard. Worst case: false-positive identity mismatch when user has multiple emails. Mitigation: only enforce when `invitee_email` is explicitly set, not for "any user with this code" public invites.

### T1-2. Decouple onboarding gate from auth (issue 1, the rest)

**Root cause**
`ProtectedRoute.tsx` blocks ALL protected pages on `onboarding_completed === true`. New users invited to an event are redirected to `/onboarding` even though they need to enter the event NOW. Returning users on a fresh device whose onboarding flag is somehow false get re-onboarded.

**Architectural fix**
- Remove the `onboarding_completed` gate from `ProtectedRoute`.
- Create a new `<OnboardingGate>` wrapper applied ONLY to pages that need profile data (matching, profile-rich pages). Live sessions, lobby, invites, and event participation BYPASS the gate.
- For new users created via invite, set `onboarding_completed = true` at user creation. Track profile-completeness separately via a `profile_complete` flag (already exists). Show non-blocking "complete your profile" prompts inside the app, not as a hard gate.
- For Google OAuth path (`identity.service.ts:474-591`), do NOT default new users to `onboarding_completed = false` if they were created via an invite code — set it to true and surface a soft prompt later.

**Files**
- Modified: `client/src/components/layout/ProtectedRoute.tsx` (remove gate)
- New: `client/src/components/layout/OnboardingGate.tsx` (replacement for specific routes)
- Modified: `server/src/services/identity/identity.service.ts` (createUser + findOrCreateGoogleUser — invite-aware default)
- Migration considered: optionally backfill `onboarding_completed = true` for users who already have meaningful profile data

**Risk**
Medium — biggest behavior change in this plan. Existing returning users with `onboarding_completed = false` will no longer be re-onboarded. They might have intentionally been gated for re-onboarding (unlikely but possible). Need user confirmation that this is intended.

**Behavior preservation**
Everyone who currently has `onboarding_completed = true` is unaffected. Only the gate's enforcement scope shrinks.

### T1-3. Pod join → auto-redirect to active session (issue 3)

**Root cause**
`PodDetailPage.tsx:224-233` handles pod join with toast + cache invalidation. No redirect. User has to manually navigate to events tab.

**Architectural fix**
- New endpoint `GET /api/pods/:id/active-session` returns the current/next live session (status in `lobby_open`, `round_active`, `round_rating`, `round_transition`, `closing_lobby`).
- After successful pod join, client calls this endpoint. If a session exists, navigate directly to `/sessions/:id/live`. Else show toast + leave on pod page.
- Alternative for non-live sessions starting soon: surface a prominent "Event starting in X minutes — Join Now" CTA card.

**Files**
- New endpoint: `server/src/routes/pods.ts`
- Modified: `client/src/features/pods/PodDetailPage.tsx:224-233`

**Risk**
Trivial. Pure UX addition.

### T1-4. Participant-count clarity (issue 8)

**Root cause**
Five different sources compute participant counts: socket presence (`participant-flow.ts:251`), DB row count (`session.service.ts:363`), `presenceMap.size` (matching-flow.ts:101), and DB rows in REST endpoints. Host inclusion is inconsistent. No filter for ghost/test/no-show users.

**Architectural fix**
Define three canonical metrics returned by the new `GET /api/sessions/:id/state` endpoint (T0-3) and by socket emits:
- `connected`: real-time socket presence (from `presenceMap`/`roomParticipants`)
- `registered`: DB rows in `session_participants` with status NOT IN ('removed', 'no_show', 'left')
- `active`: registered AND (connected OR within `STALE_HEARTBEAT_MS` last-seen window)

All exclude host by default; expose `includeHost` option for admin views. Filter test accounts by `email NOT LIKE '%@rsn-test.invalid' AND email NOT LIKE '%@example.test'` (and any future test-domain pattern).

UI displays `"8 networking · 1 host · 10 registered"` so users can see at a glance.

**Files**
- Modified: `server/src/services/session/session.service.ts:363` (new fn returning three counts + filters)
- Modified: `server/src/services/orchestration/handlers/participant-flow.ts:250-251` (emit all three)
- Modified: `client/src/stores/sessionStore.ts` + `client/src/components/ParticipantList.tsx` to display

**Risk**
Low — display change with backend additive.

### T1-5. Unified role resolver (issue 9)

**Root cause**
Four role systems (`users.role`, `pod_members.role`, `sessions.host_user_id`, `session_cohosts`) checked independently in 8+ functions. Pod director can't host sessions they create unless explicitly set as `host_user_id`. Co-host assignment doesn't push permission updates to the assigned user's UI.

**Architectural fix**
- New `server/src/services/roles/effective-role.service.ts` exporting `getEffectiveRole(userId, globalRole, { podId?, sessionId? }): Promise<EffectiveRole>` returning `'pod_admin' | 'event_host' | 'cohost' | 'participant' | 'unauthorized'`.
- Hierarchy: global admin/super_admin → always `pod_admin`; else pod creator/director → `pod_admin`; else session host → `event_host`; else session co-host → `cohost`; else session participant → `participant`.
- Refactor `verifyHost`, `requireRole`, `requirePodRole`, etc. to call this resolver internally. APIs unchanged; internals unified.
- New socket event `permissions:updated { context, sessionId, effectiveRole, permissions }` emitted directly to `userRoom(userId)` whenever a role change happens (`handleAssignCohost`, `handleRemoveCohost`, host transfer).
- New host-transfer handler `handlePromoteCohost(sessionId, cohostUserId)` so the original host can pass the baton (currently impossible — host can never leave gracefully).

**Files**
- New: `server/src/services/roles/effective-role.service.ts` + tests
- Modified: `host-actions.ts` (verifyHost + handleAssignCohost), `pod.service.ts`, `session.service.ts`
- Client: `useSessionSocket.ts` listens for `permissions:updated`, dispatches to store; UI re-renders host-only buttons

**Risk**
Medium — touches role checks across many files. Refactor is mostly mechanical (same checks, new wrapper). Comprehensive tests of every path required. Behaviour preserves: everyone who could do X before still can; people who SHOULD be able to (pod directors creating sessions) now CAN.

### T1-6. Encounter history session-scoped query (issue 11)

**Root cause**
`matching.service.ts:370-381` (`getEncounterHistoryForUsers`) reads ALL `encounter_history` rows for a user pair across ALL events. The matching engine penalizes pairs based on this. Result: in a NEW event, pairs who met in a PRIOR event get penalised as "already met" even though they haven't met in this event yet.

**Architectural fix**
Two-part:
1. Add `sessionId` parameter to `getEncounterHistoryForUsers(userIds, sessionId)`. Query joins `encounter_history` to `matches` (or a `last_session_id` column on `encounter_history` — verify schema) and excludes encounters from the SAME session.
2. Decision: should past-event encounters STILL down-weight in this event?
   - **YES** — that's the desired "fresh meetings" behaviour at PROD scale (200+ unique users, you don't want to pair people who met last week)
   - **NO for small repeat-attendance pods** — pod creators may want repeat pairings
3. Recommendation: keep cross-event memory ON by default but expose a pod config flag `matching.crossEventMemory: boolean` (default true). Within a single session, NEVER use this session's own past rounds as "already met" — the matching engine's `usedPairs` Set already handles within-session.

Verify: `usedPairs` in `matching.engine.ts:51-58` correctly builds from `previousRounds` passed via `input.previousRounds`. The bug per the audit is that `encounter_history` provides cross-event data with no scoping option. Fix is at the query layer, not the engine layer.

**Files**
- Modified: `server/src/services/matching/matching.service.ts:370-381` (add sessionId param)
- Modified: `server/src/services/matching/matching.engine.ts` (accept the scoped data)
- Modified: `server/src/services/pod/pod.service.ts` if pod config gets the flag
- Migration if `encounter_history` needs `last_session_id` column for scoping (verify first — may already exist via rating service)

**Risk**
Low to medium. Behavior change is the point — if "no longer flagging as already met" reveals other matching engine assumptions, we discover them via tests.

---

## Tier 2 — UI polish (parallel-shippable, low risk)

### T2-1. Lobby camera tile uses `object-contain` (issue 13.1)

**Root cause**
`Lobby.tsx:115` always renders local + remote tiles with `<VideoTrack className="object-cover" />`. The April 18 Dr Arch fix (`index.css:5-18`) established that desktop tiles should use `object-contain` (preserves full frame) while mobile PIP uses `object-cover`. Lobby never adopted that pattern — that's the "main room camera too zoomed" the user reports.

**Fix**
Refactor Lobby to use the same `fillMode` prop pattern as `VideoRoom.tsx:79-111`. Wrap with `.rsn-tile-contain` parent class. PIP tiles in lobby (if any) keep `cover`.

**Files**
- Modified: `client/src/features/live/Lobby.tsx:115`

**Risk**
Trivial.

### T2-2. Mirror scope: local self-view only (issue 13.2)

**Root cause**
`index.css:134-139` blanket-removes ALL `transform: scaleX` from any video element — including LiveKit's local self-view mirroring. Result: pre-join preview (where DeviceTest manually applies mirror) shows correctly mirrored, but published feed in lobby/breakout shows un-mirrored, creating preview-vs-actual mismatch.

**Fix**
Narrow the CSS rule. Either:
- (preferred) Remove the blanket rule and rely on LiveKit's `<VideoTrack mirror={isLocal}>` prop on `@livekit/components-react`. Apply `mirror={true}` only to local participant tiles.
- OR scope CSS to remote-only: `[data-lk-source="camera"][data-lk-local="false"] { transform: none !important; }` (verify LiveKit DOM attributes).

**Files**
- Modified: `client/src/index.css:134-139`
- Modified: `client/src/features/live/VideoRoom.tsx`, `Lobby.tsx`, possibly a shared `VideoTile.tsx` component to add explicit `mirror` prop

**Risk**
Low — visual change, easy to verify by joining a session yourself.

### T2-3. Responsive layouts for 2/3/4 participants (issue 13.3)

**Root cause**
Desktop pair grid (`VideoRoom.tsx:153-156`) uses `grid-cols-2` even when only 1 remote partner exists, leaving wasted cells. Tablet (768-1024px) underserved between md and lg breakpoints. Mobile landscape with trio overflows due to gap-2.

**Fix**
- Pair (you + 1 partner): `grid-cols-1 lg:grid-cols-2` so smaller-desktop gets full-width tiles.
- Trio (3+): add `md:grid-cols-2` for tablet between sm-mobile and lg-desktop.
- Mobile landscape: reduce `gap-2 → gap-1` or use horizontal scroll for trio.
- Document a test matrix (mobile portrait/landscape × tablet × desktop × laptop) and verify each.

**Files**
- Modified: `client/src/features/live/VideoRoom.tsx:152-275`

**Risk**
Trivial — pure CSS class changes.

### T2-4. Rating UI star color (issue 14.1)

**Root cause**
`RatingPrompt.tsx:77` uses `text-gray-600` for unselected stars on a dark `bg-[#292a2d]` background. Dark text on dark bg = nearly invisible.

**Fix**
Change unselected color to `text-white/60 hover:text-white/80`. Selected stars (`text-amber-400 fill-amber-400`) stay as-is.

**Files**
- Modified: `client/src/features/live/RatingPrompt.tsx:77`

**Risk**
Trivial.

### T2-5. Persistent session badge in breakout video area (issue 14.2)

**Root cause**
When user is in breakout `VideoRoom`, the event title and round number are not visible — top bar is obscured by full-flex video.

**Fix**
Add a small overlay in top-left of `VideoRoom.tsx`: `[Session Title] · Round X/Y` with `bg-black/40 text-white text-xs` styling. Same pattern as existing "Breakout Room" timer badge.

**Files**
- Modified: `client/src/features/live/VideoRoom.tsx`

**Risk**
Trivial.

### T2-6. Background blur — fix enum mismatch + bump strength (issue 15)

**Root cause**
Two bugs:
1. `Lobby.tsx:404` and `VideoRoom.tsx:335` compare `p.source === 'camera'` but `p.source` is a `Track.Source` enum, not a string. The lookup returns undefined → blur never applies.
2. Blur strength hardcoded to `10` (very light) on a 0-100 scale. Even when wired correctly, users perceive no effect.

**Fix**
- Replace `p.source === 'camera'` with `p.source === Track.Source.Camera` (Track is already imported from `livekit-client`).
- Bump blur strength from 10 to 25-30 for visible effect, OR expose a slider.
- Add error handling around `setProcessor()` so failure shows a toast instead of silent no-op.
- Verify `@livekit/track-processors` is in `package.json` dependencies.

**Files**
- Modified: `client/src/features/live/Lobby.tsx:400-413`
- Modified: `client/src/features/live/VideoRoom.tsx:331-362`

**Risk**
Low. Bug fix to a feature that doesn't currently work — worst case it still doesn't work due to a separate bug we discover, in which case we revert to current state.

---

## Sequencing & dependencies

```
T0-1 (validator) ──┐
                   ├──► T0-2 (state machine, uses validator)
T0-3 (state REST) ─┤   T0-4 (atomic invite)
                   │
T1-1 (email check) ──► (depends on T0-4 transaction shape)
T1-2 (onboarding gate) ─── independent ─── T1-3 (pod auto-redirect)
T1-4 (counts) ──► (uses T0-3 state endpoint)
T1-5 (roles) ─── independent
T1-6 (encounter scope) ─── independent

T2-* (UI polish) all parallel-shippable, no cross-dependencies
```

**Recommended commit order:**
1. **Sprint A (Tier 0, ~3-4 days):** T0-1, T0-3, T0-2, T0-4 in that order. T0-1 is foundation.
2. **Sprint B (Tier 1, ~3-4 days):** T1-2 (high-impact UX), T1-1, T1-3, T1-4, T1-5, T1-6.
3. **Sprint C (Tier 2, ~1-2 days):** All T2-* in parallel — six small commits.

Total estimated effort: **~7-10 focused engineering days**.

---

## Behavior-preservation contract

These behaviors are non-negotiable — every fix preserves them:

1. **Existing successful invite acceptances continue to work** — happy path unchanged.
2. **Admin/super_admin global bypass remains** — they can do anything anywhere.
3. **Pod visibility rules** — private/invite-only pods still gate access via membership.
4. **Session capacity** — maxParticipants still enforced.
5. **Co-host scope** — per-session, never inherits across pod's other sessions.
6. **Encounter history is still global by default** — pod owners opt-in per-pod for cross-event-only matching.
7. **All Tier-1 load-handling code (A1-A9 from 2026-04-20)** — untouched.
8. **Onboarding flow itself** — issue 16 is excluded; we're only changing WHEN it's gated.

---

## Risk register

| Item | Risk | Mitigation |
|---|---|---|
| T0-1 validator | Real-world flow we don't know about hits new error | TDD all 4 invariants; comprehensive integration tests |
| T0-2 state machine | Race window where transition fires but no participant joins | 30s fallback timer flips room to "empty" indicator |
| T0-3 REST endpoint | Drift between socket and REST sources of truth | Both read from same helper; integration test compares outputs |
| T0-4 atomic invite | Existing recovery code in client breaks | Drop client-side retry chain; rely on server-returned `redirectTo` |
| T1-1 email check | Multi-email user blocked from accepting their own invite | Only enforce when `invitee_email` is set, not for public/code invites |
| T1-2 onboarding gate | Users with stale `onboarding_completed=false` no longer re-onboarded | Surface a banner prompt; don't gate access |
| T1-5 role resolver | Refactor breaks an obscure permission check | Comprehensive RBAC tests covering current behaviour first, then refactor |
| T1-6 encounter scope | Existing pod owners expected old behavior | Default flag preserves cross-event memory; opt-out per pod |

---

## Rollback strategy

Each item is committed independently. Rollback target: `d6fcb80` (current HEAD as of 2026-04-22). Single-item rollback via `git revert <sha>` + push. Full plan rollback (worst case) via `git reset --hard d6fcb80` on both branches.

Feature flags for risky items:
- T0-2 breakout state machine: `BREAKOUT_REQUIRE_ROOM_JOINED=true` (off → revert to socket presence)
- T0-3 state endpoint: client uses if available, falls back to socket-only if endpoint returns 404
- T1-2 onboarding gate: `ONBOARDING_GATE_ENFORCED=true` env (off → restore old gating)

---

## Out of scope

- **Issue 10, 12** — skipped in the user's review document (gaps in numbering).
- **Issue 16 — Onboarding rewrite** — explicitly deferred by the user.
- **Tier-2 horizontal scaling** (Redlock, Redis state read-through, cron leader election) — separate roadmap.
- **Render plan upgrade to Standard** — Stefan's task on Wed 2026-04-22; tracked in `project_tier1_phase_c_pending.md`.

---

## Verification approach

Per the OSP + Dr Arch + max-effort directive:

For each item:
1. **TDD first** — write the pinning test that fails today
2. **Implement** — minimal code to make test pass
3. **Existing tests stay green** — 502/502 must remain at 502/502+N
4. **Full `check whole`** after each commit
5. **Manual verification** for UI changes (start dev server, exercise the flow)
6. **No item ships to main without staging soak ≥30 minutes** (less if tightly bounded fix)

End-state success criteria: 14 user-reported symptoms eliminated, no Sentry regressions, no 502 errors in Render logs, full test suite green.

---

## Critical files referenced

- `server/src/services/identity/identity.service.ts` — T0-4, T1-1, T1-2
- `server/src/services/invite/invite.service.ts` — T0-4, T1-1
- `server/src/routes/invites.ts` — T0-4, T1-1
- `server/src/routes/sessions.ts` — T0-3
- `server/src/routes/pods.ts` — T1-3
- `server/src/services/orchestration/handlers/host-actions.ts` — T0-1, T0-2, T1-5
- `server/src/services/orchestration/handlers/breakout-bulk.ts` — T0-1
- `server/src/services/orchestration/handlers/matching-flow.ts` — T0-1, T0-2, T0-3
- `server/src/services/orchestration/handlers/participant-flow.ts` — T0-2, T0-3, T1-4
- `server/src/services/matching/matching.service.ts` — T1-6
- `server/src/services/matching/matching.engine.ts` — T1-6
- `server/src/services/session/session.service.ts` — T0-3, T1-4, T1-5
- `server/src/services/pod/pod.service.ts` — T1-3, T1-5
- `client/src/components/layout/ProtectedRoute.tsx` — T1-2
- `client/src/features/invites/InviteAcceptPage.tsx` — T0-4, T1-1
- `client/src/features/pods/PodDetailPage.tsx` — T1-3
- `client/src/hooks/useSessionSocket.ts` — T0-3, T1-5
- `client/src/stores/sessionStore.ts` — T0-3, T1-4
- `client/src/features/live/Lobby.tsx` — T2-1, T2-6
- `client/src/features/live/VideoRoom.tsx` — T0-2, T2-1, T2-2, T2-3, T2-5, T2-6
- `client/src/features/live/RatingPrompt.tsx` — T2-4
- `client/src/index.css` — T2-2

New files:
- `server/src/services/matching/match-validator.service.ts` (T0-1)
- `server/src/services/roles/effective-role.service.ts` (T1-5)
- `client/src/components/layout/OnboardingGate.tsx` (T1-2)

---

## What I will NOT do without further approval

- Change behaviour of issue 16 (onboarding rewrite — explicitly deferred)
- Change role/permission for any user without per-item RBAC test confirming intent
- Migrate any data without a backup snapshot first
- Skip tests or shortcut TDD for any P0/P1 item
- Push to `main` without ≥30 min staging soak
- Touch the Tier-1 load-handling code (A1-A9) — it's locked in and validated
