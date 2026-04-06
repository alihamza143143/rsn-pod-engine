# Change 3.5B: Live Event UX Fixes — Design Spec

**Date:** 2026-04-07
**Status:** Approved
**Approach:** B — Fix + Harden Rating Architecture
**Scope:** 7 client-reported live event UX issues from April 6th review
**Constraint:** Next live event imminent — ship fast, stability first

---

## Problem Statement

Client review of April 6th identified 7 live event UX issues affecting every participant's experience during events. Most critical: trio rating flow is architecturally broken (shared timer, mid-submission errors, no recovery for missed ratings).

---

## Section 1: Remove Stale Messages (#7, #19)

Remove or replace hardcoded strings that were supposed to be removed:

| Current String | File:Line | Replacement |
|---------------|-----------|-------------|
| "Main Room" | `Lobby.tsx:462` | "Lobby" |
| "You're in the main room. The host will start matching shortly." | `Lobby.tsx:466` | Remove entirely |
| "All Rounds Complete!" | `Lobby.tsx:407` | "Event wrapping up" |
| "Take a moment to say your goodbyes…" | `Lobby.tsx:408` | "Say your goodbyes before the event ends." |
| "Last round complete! Returning to main room..." | `RatingPrompt.tsx:126` | "Returning to lobby..." |
| "main room" | `VideoRoom.tsx:299,430,448,453,455` | "lobby" |
| "in main room" | `HostControls.tsx:339,347` | "in lobby" |
| "Main Room — waiting for host to start round" | `LiveSessionPage.tsx:264` | "Lobby — waiting for host to start round" |

All instances of "main room" across client codebase → "lobby".

---

## Section 2: Camera Toggle Fix (#11)

### Problem
- `Lobby.tsx:226-244`: Error handler reverts UI state without verifying actual LiveKit track state
- `VideoRoom.tsx:181-184`: Zero error handling on camera toggle
- Camera state not synced from LiveKit on mount

### Fix
- Both toggles sync state FROM actual LiveKit track after attempt: `setCamEnabled(localParticipant.isCameraEnabled)`
- Add retry logic from Lobby to VideoRoom (currently only Lobby has it)
- On mount, read initial camera state from LiveKit: `setCamEnabled(localParticipant.isCameraEnabled)` in useEffect
- After ANY toggle error, re-read actual track state instead of guessing

---

## Section 3: Heart → Handshake (#12)

### Recap Page (`RecapPage.tsx`)
- Mutual Matches stat card icon: `Heart` → `Handshake` (from lucide-react)
- "MUTUAL MATCHES — YOU BOTH SAID 'MEET AGAIN'!" header: red heart → `Handshake` icon
- Each mutual match row: heart badge → handshake icon
- Per-round "Mutual Match!" badge: heart → handshake
- Color: pink/red → indigo (professional)

### Rating Flow (`RatingPrompt.tsx`)
- Line 83: "Would you meet again?" button icon: `Heart` → `Handshake`
- Line 117: Confirmation: `Heart` → `Handshake`
- Color: `pink-500` → `indigo-500` (professional, not romantic)
- Text: "Would you meet again?" stays (good wording)

### Recap Email (`email.service.ts`)
- Any heart emoji/icon in mutual match email sections → handshake emoji (🤝) or neutral "Mutual Match" text

---

## Section 4: Breakout Room Layout (#13)

### Problem
`VideoRoom.tsx:130` uses `grid-cols-1 sm:grid-cols-2` for trio connected state. 3rd tile wraps and requires scrolling.

### Fix
Change trio grid in connected state to match waiting state:
```
isTrio ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
```

This ensures all 3 participants (2 remote + 1 self-view) fit on screen without scrolling on desktop/tablet.

---

## Section 5: Timer Visibility Fix (#16)

### Problem
- Store default is `'last_10s'` but CreateSessionPage default is `'always_visible'` — mismatch
- No explicit "Last 30 seconds!" warning banner

### Fix
- Change store default (`sessionStore.ts`) from `'last_10s'` to `'always_visible'` to match creation page
- Add pulse animation + "Last 30 seconds!" text overlay in VideoRoom when timer crosses 30s threshold
- Timer already syncs from server via `timer:sync` events — no server changes needed

---

## Section 6: Rating Flow Overhaul (#17)

### Problem (3 confirmed bugs)
1. **Shared timer kills trios**: 30s window shared for ALL partners. Trio user rates Partner A in 20s, only 10s left for Partner B
2. **Mid-submission error**: `rating:window_closed` fires while user submitting Partner B → clears match data → API fails → error toast → kicked to lobby
3. **No recovery**: Missed ratings are permanently lost

### Fix A: Extended timer for trios (server)

In `round-lifecycle.ts` `endRound()`, when emitting `rating:window_open`:
- Calculate effective duration: `ratingWindowSeconds * partnerCount`
- Send: `{ matchId, durationSeconds: effectiveDuration, partners, partnerCount }`
- So trios get 60s (30 × 2), duos get 30s (30 × 1)

### Fix B: Guard rating:window_closed against mid-submission (client)

In `useSessionSocket.ts` `rating:window_closed` handler:
- Do NOT immediately clear match data
- Set `lastRatedRound` to prevent re-entry
- Add 3-second grace period before cleanup to allow in-flight API calls to complete
- Only transition to lobby after grace period, and only if still in rating phase

```typescript
socket.on('rating:window_closed', () => {
  clearTimer();
  clearRatingFallback();
  clearByeTimeout();
  const state = useSessionStore.getState();
  store.setLastRatedRound(state.currentRound);
  // 3s grace for in-flight submissions
  setTimeout(() => {
    const current = useSessionStore.getState();
    if (current.phase === 'rating') {
      store.setLiveKitToken(null, null);
      store.setByeRound(false);
      store.setPartnerDisconnected(false);
      store.setMatch(null);
      store.setRoomId(null);
      store.setTransitionStatus(null);
      store.setPhase('lobby');
    }
  }, 3000);
});
```

### Fix C: Late rating in Recap page (server + client)

**Server**: New endpoint `GET /api/ratings/unrated?sessionId=X` (authenticated, returns only the requesting user's unrated partners)
- Query matches where user was participant but has no rating row for that partner
- Return: `[ { matchId, partnerId, partnerDisplayName, roundNumber } ]`
- Only works for completed sessions (status = 'completed' or 'closing_lobby')

**Client** (`RecapPage.tsx`): At top of recap, if unrated partners exist:
- Show "You have unrated conversations" section
- Render `PartnerRatingForm` component for each unrated partner
- On submit, remove from list. When all rated, section disappears.

---

## Section 7: End of Event Countdown (#18)

### Problem
Closing lobby phase has no visible countdown — ending feels abrupt.

### Fix
In `Lobby.tsx` closing lobby section, show the countdown timer from store:
- Server already broadcasts `timer:sync` during CLOSING_LOBBY phase
- Display: "Event ending in {timerSeconds}s — say your goodbyes!"
- Timer already ticks down via `store.tickTimer()` interval
- When timer hits 0, server sends `session:completed` → normal flow

---

## What Does NOT Change

- All socket event names and data shapes (except `rating:window_open` adds `partnerCount` field — backward compatible)
- Database schema (no new migrations except the unrated ratings endpoint query)
- Orchestration module structure (post Change 3.0 split stays intact)
- Matching engine, pod system, invite system, notification system
- All other pages and features

---

## Dr Architecture Compliance

Every change is forward-compatible with the 4-phase architecture plan:

| Change | Phase 2 (Redis) Ready? | Phase 3 (State Machine) Ready? | Phase 4 (100K) Ready? |
|--------|----------------------|-------------------------------|----------------------|
| Message text changes | N/A | N/A | N/A |
| Camera sync from track | Yes — no state persistence needed | Yes — track is source of truth | Yes — per-client |
| Heart → Handshake | N/A | N/A | N/A |
| Grid layout fix | N/A | N/A | N/A |
| Timer default unify | Yes — server-authoritative | Yes — config-driven | Yes |
| Rating timer × partnerCount | Yes — timer duration from server config | Yes — state machine can enforce per-partner | Yes — stateless calculation |
| rating:window_closed grace | Yes — server is still authoritative, grace is client-only | Yes — state machine transition stays clean | Yes — no cross-instance state |
| Late rating endpoint | Yes — DB query only, no in-memory state | Yes — independent of session state | Yes — read-only query |
| Closing lobby countdown | Yes — uses existing timer:sync | Yes — CLOSING_LOBBY is already a state | Yes |

---

## Success Criteria

1. Zero "main room" text anywhere in live event UI
2. Camera toggle restores correctly on Lobby AND VideoRoom after error
3. Zero heart icons in Recap page and Rating flow — all handshake
4. Trio breakout room: all 3 participants visible without scrolling on desktop
5. Timer visible by default for all participants
6. Trio rating window: 60s (2 × 30s), not 30s shared
7. Rating submission mid-window-close: no error, no kick — 3s grace
8. Recap page shows "Rate Now" for any unrated partners
9. Closing lobby shows countdown timer
10. All changes pass full client + server build
