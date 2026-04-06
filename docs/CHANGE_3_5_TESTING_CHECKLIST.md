# RSN Platform — Change 3.0 + 3.5B Testing Checklist

**Date:** April 7, 2026
**Scope:** Architecture stability + Live Event UX fixes
**How to use:** Test each item and mark Pass/Fail. Add notes for anything unexpected.

---

## SECTION A: Event Stability (Architecture Upgrade)

These fixes address the core event flow breaking during live events.

| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| A1 | Host starts event with 4+ participants | Event starts without errors, all participants enter lobby | | |
| A2 | Two participants click "Join" at the exact same time | Both join successfully, no duplicate entries, correct participant count | | |
| A3 | Host clicks "Match People" — wait for matches to appear | Matches generate within 60 seconds. If it takes longer, host sees "Matching took too long" error and can retry | | |
| A4 | Host clicks "Start Round" twice quickly (double-click) | Only one round starts — no duplicate rounds, no errors | | |
| A5 | Participant disconnects during a round (close browser tab) | Partner sees "Your partner left" message. After 15 seconds, disconnected user is marked as no-show. Partner is reassigned or gets bye round | | |
| A6 | Disconnected participant rejoins within 15 seconds | Reconnect succeeds. Partner sees "Partner reconnected." No false no-show. Original match continues | | |
| A7 | Host pauses event, then resumes | Timer pauses and resumes correctly. No errors for any participant | | |
| A8 | Run a full 3-round event end-to-end | All rounds complete, all ratings submitted, recap page loads with correct data | | |
| A9 | Check that "Something went wrong" errors no longer appear randomly | No unexpected error messages during normal event flow | | |
| A10 | Participant refreshes browser during active round | Participant reconnects and is placed back in their current match | | |

---

## SECTION B: Messaging & Text Cleanup

| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| B1 | Enter event lobby as participant | Screen shows "Lobby" — NOT "Main Room" | | |
| B2 | Check lobby text | No message saying "You're in the main room. The host will start matching shortly." — that text is removed | | |
| B3 | Host ends event (all rounds complete) | Closing screen shows "Event wrapping up" — NOT "All Rounds Complete!" | | |
| B4 | During closing lobby | Shows "Say your goodbyes before the event ends." — NOT "Take a moment to say your goodbyes…" | | |
| B5 | Click "Return to Lobby" button in breakout room | Button says "Return to Lobby" — NOT "Return to Main Room" | | |
| B6 | Check host controls during round | Shows participants "in lobby" — NOT "in main room" | | |

---

## SECTION C: Timer & Round Behavior

| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| C1 | Start a round and check timer visibility | Timer is visible to all participants from the start (not hidden until last 10 seconds) | | |
| C2 | Watch timer countdown to 30 seconds | An amber "Last 30 seconds!" pulse overlay appears | | |
| C3 | Watch timer countdown to 10 seconds | Timer text turns red and pulses with "Ending soon" | | |
| C4 | Round ends and transitions to rating | Transition is smooth, no delay or stuck state | | |
| C5 | Closing lobby phase | Countdown timer visible: "Ending in Xs" with live countdown | | |

---

## SECTION D: Rating Flow

| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| D1 | After a 2-person round, rating window opens | Rating prompt appears with 30 seconds to rate 1 partner | | |
| D2 | After a 3-person round (trio), rating window opens | Rating prompt appears with ~60 seconds to rate BOTH partners (progress dots show 2 steps) | | |
| D3 | Rate first partner in trio, then rate second | Both ratings submit successfully. User returns to lobby after both are done | | |
| D4 | Start rating, then let the window timer expire mid-submission | Rating submission completes (3-second grace period). User is NOT kicked out with an error | | |
| D5 | Skip rating on purpose (don't submit during window) | User returns to lobby after window closes — no error, no crash | | |
| D6 | After event ends, go to Recap page | If you missed any ratings, a "You have unrated conversations" section appears at the top | | |
| D7 | Rate a missed partner from the Recap page | Star rating + "Would you meet again?" (handshake icon) + Submit button. Rating saves successfully | | |
| D8 | Check "Would you meet again?" button | Shows a handshake icon (NOT a heart) with indigo/blue color (NOT pink) | | |

---

## SECTION E: Recap Page & Mutual Matches

| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| E1 | Open Recap page after event | Stats show: People Met, Mutual Matches (handshake icon), Avg Rating, Total Ratings | | |
| E2 | Check Mutual Matches section | Header shows handshake icon with "Mutual Matches — You both said 'meet again'!" — NO heart icon | | |
| E3 | Check mutual match badges | Each mutual match shows a handshake badge — NOT a heart | | |
| E4 | Check colors | Mutual match section uses indigo/blue colors — NOT pink/red | | |
| E5 | Per-round "Mutual Match!" badge | Shows handshake icon next to name — NOT heart | | |

---

## SECTION F: Camera & Video

| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| F1 | In lobby, turn camera off then back on | Camera restores correctly. User sees their own preview | | |
| F2 | In breakout room, turn camera off then back on | Camera restores correctly. Partner still sees video when turned back on | | |
| F3 | 3-person breakout room (trio) | All 3 participants visible on screen WITHOUT scrolling on desktop | | |
| F4 | 2-person breakout room | Both participants visible side by side on desktop | | |

---

## SECTION G: End of Event Experience

| # | Test Step | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| G1 | Last round ends → closing lobby | Smooth transition. Message says "Event wrapping up" with countdown | | |
| G2 | Closing lobby countdown reaches 0 | Event completes. Transition to Recap page is smooth, no black screen | | |
| G3 | Check completion screen | Shows "Event Complete!" with stats and "View Full Recap" button | | |
| G4 | Overall end-of-event feel | Ending feels calm and natural — no pressure messaging, no abrupt cuts | | |

---

## KNOWN ITEMS — NOT YET ADDRESSED (Coming in Change 3.5A)

These items from the April 6th review will be fixed in the next change:

| # | Item | Status |
|---|------|--------|
| Fix 1 | Pod Privacy & Invitation Logic | Pending |
| Fix 2 | Invite Flow Visibility & Tracking | Pending |
| Fix 3 | Invite Accept → Registration (already works, may need UX polish) | Verify |
| Fix 4 | Pod Creation Flow (Dashboard) | Pending |
| Fix 5 | Notifications (Admin + User) | Pending |
| Fix 6 | Navigation Structure (Active before Browse All) | Pending |
| Fix 8 | Onboarding Journey Placement | Pending |
| Fix 9 | Invite Tabs & Data Accuracy | Pending |
| Fix 10 | Event Invitation Options (Invite pod members) | Pending |
| Fix 21 | Branding (Email + Favicon cleanup) | Pending |

---

**Tested by:** _______________
**Date:** _______________
**Overall Result:** _______________
