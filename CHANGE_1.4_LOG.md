# Change 1.4 — RSN Platform Fixes & Features

Source: Shradha call (March 15, 2026) + Dr Prompt spec
Status: Phase 1 & 2 complete, Phase 3-6 pending

---

## Phase 1: Core Reliability (COMPLETE)

### Brand Colors
- [x] Replaced all indigo/purple with RSN red #DE322E across 31+ client files
- [x] Tailwind config: rsn-red color scale (DEFAULT, hover, light, 50-700)
- [x] Primary buttons → rsn-red (was dark black)
- [x] Sidebar active state → red left border + light red background
- [x] Mobile bottom nav active → rsn-red text
- [x] Settings toggles → rsn-red when ON
- [x] Admin filter tabs → rsn-red when active
- [x] Glow animations → rsn-red
- [x] Login page CTA → rsn-red

### Email Branding
- [x] All 7 email templates rebranded: indigo gradients → RSN red #DE322E
- [x] Tagline: "Raw Speed Networking" → "Connect with Reason"
- [x] Magic link, invite, recap (participant + host), join request emails all updated

### Auth & Session
- [x] Logout confirmation dialog: "Are you sure?" modal (desktop + mobile)
- [x] No auto-logout: removed `logout()` from token refresh catch block
- [x] Access token expiry: 15m → 7d
- [x] Refresh token expiry: 7d → 30d
- [x] Users only log out manually via the Log Out button

### LinkedIn Field
- [x] Accept username-only input, auto-prepend `https://linkedin.com/in/`
- [x] Handles: full URL, username, @username, /in/username
- [x] Applied to both ProfilePage and RequestToJoinPage
- [x] Placeholder: "username or full LinkedIn URL"

### Invite System
- [x] Error messages: 8 API error codes mapped to friendly messages
- [x] Validation order: membership check before duplicate invite check
- [x] Error mapping applied to CreateInviteModal, PodDetailPage, SessionDetailPage
- [x] Invite landing page: shows inviter name, event/pod name, description, date/time
- [x] Server enrichment: GET /invites/:code returns inviterName, podName, sessionTitle, etc.

### Lobby & Host Presence
- [x] Lobby gate: participants see "Waiting for host..." screen before event starts
- [x] No video tiles in pre-lobby state
- [x] Host presence debounce: 5s grace period for online→offline transitions only
- [x] No false "online" on first join (immediate offline if host never there)
- [x] No false "offline" on rejoin (participant list fallback)
- [x] Participant count: correct math using actual array, not debounced status

### Live Event UX
- [x] Host tile first in video grid (local participant sorted to position 0)
- [x] Host badge: amber "Host" pill on video tile name label
- [x] Mute/Unmute + Mute All controls on host's own tile (not floating above grid)
- [x] Host-specific transition messages ("Generating matches..." vs "Preparing your first match...")
- [x] Event detail button: "Start Event" → "Go Live" (navigation vs actual start)

### Trio Support Fixes
- [x] All 3 participants receive rating:window_open (was only 2)
- [x] Rating unique constraint: UNIQUE(match_id, from_user_id, to_user_id) — allows rating 2 partners
- [x] Trio reconnect: partner data restored on mid-round/mid-rating reconnect
- [x] Orchestration: roundsCompleted incremented for participant C
- [x] DB migration: 014_fix_rating_unique_constraint.sql

### Rating & Recap Fixes
- [x] Encounter history: fixed times_met double-counting (missing last_session_id in SELECT)
- [x] Session stats: mutual meet-again count query fixed to filter by session
- [x] Rating SQL: CROSS JOIN LATERAL syntax fix for getPeopleMet
- [x] Recap resilience: Promise.allSettled so partial failures show data instead of error
- [x] Participants see recap with zeros instead of "Could not load event recap"

### Shared Types
- [x] rating:window_open: added partners[] array for trio support
- [x] Added partnerDisplayName field

---

## Phase 2: Live Event Quality (COMPLETE)

### Chat System (NEW)
- [x] Real-time text messaging via Socket.IO
- [x] In-memory message storage (50 msg cap per session, cleared on session end)
- [x] Scope awareness: "Everyone" in lobby, "Room" in breakout
- [x] ChatPanel component: side panel on desktop, full overlay on mobile
- [x] Floating chat FAB button (rsn-red) with unread badge (amber)
- [x] Host messages: amber left border + "HOST" label
- [x] Message bubbles: own messages right-aligned (red tint), others left (gray)
- [x] Chat input: forced black text for visibility
- [x] Auto-scroll on new messages
- [x] Chat history sent on join (last 50 messages)

### Announcement System (RENAMED)
- [x] Host broadcast renamed to "Announcement"
- [x] Amber background with label: "visible as a banner to all participants"
- [x] Input text forced black
- [x] Clearly differentiated from chat (banner vs panel)

### Host Match Review (FIXED)
- [x] Match preview already existed — fixed 3 bugs:
  - Duplicate preview builder without trio support → consolidated to sendMatchPreview helper
  - Missing hostUserId in swap/exclude handlers → host appeared in bye list
  - Stale variable reference after refactor
- [x] Flow: Match People → Preview → Approve/Shuffle/Cancel → Start Round
- [x] Participants don't see preview

### Post-Round Flow (NEW)
- [x] "Rating submitted!" confirmation with checkmark animation (1.8s)
- [x] "Meet again" signal: "We'll let you know if it's mutual" message (2.5s)
- [x] Last round: "Last round complete! Event wrapping up..." with spinner
- [x] Auto-transition back to lobby

### Recap Enhancement (NEW)
- [x] InterestBadge component on both RecapPage and SessionComplete
- [x] Mutual match: heart icon + "Mutual Match!" (rsn-red badge)
- [x] One-sided: "You expressed interest" (amber) / "They expressed interest" (blue)
- [x] Participation summary: "You attended X rounds out of Y total"
- [x] Server: getPeopleMet now returns theirMeetAgain, totalRounds, roundsAttended
- [x] Mutual connections section with rsn-red styling

### Participant Status Tracking (NEW)
- [x] GET /sessions/:id/participant-counts endpoint
- [x] Returns counts per status + pending invites count
- [x] SessionDetailPage: filterable status tabs (All, Checked In, In Lobby, etc.)
- [x] Only statuses with count > 0 shown
- [x] Host/admin access only

---

## Phase 3: Pod System Overhaul (NOT STARTED)

- [ ] Pod types → purpose-based (reason, conversational, speed_networking, webinar, physical_event, chat, two_sided, one_sided)
- [ ] Max members decoupled from pod type
- [ ] Full pod editing (type, capacity, invitation behavior, access rules)
- [ ] Pod copy (duplicate pod with pre-filled create form)
- [ ] Member states: add declined, no_response
- [ ] Pod browse UX: "Browse All" vs "My Pods" visual distinction
- [ ] Pod access models: public_with_approval, request_to_join
- [ ] Request to join: screening questions, agreement checkboxes, rules acknowledgement

## Phase 4: Profile & Matching Data (NOT STARTED)

- [ ] Expanded profile fields (whatICareAbout, whatICanHelpWith, whoIWantToMeet, etc.)
- [ ] Expertise/interests as free text + tags
- [ ] Profile card component (scannable for matching)
- [ ] Premium pre-selection (pick up to 12 people)

## Phase 5: Search, Invites & Permissions (NOT STARTED)

- [ ] User search in invite flow
- [ ] Enforce invite limits (max_invites_per_day)
- [ ] Role-based invite permissions
- [ ] User invitation preferences in settings
- [ ] Configurable invite limits in admin

## Phase 6: Admin Power-Up & Branding (NOT STARTED)

- [ ] Admin bulk actions (approve/decline/invite)
- [ ] Matching templates UI
- [ ] Violations/moderation
- [ ] Platform stats dashboard
- [ ] Email/automation controls
- [ ] Limits/permissions settings

---

## Files Changed (Phase 1 + 2)

### New Files
- client/src/features/live/ChatPanel.tsx
- server/src/db/migrations/014_fix_rating_unique_constraint.sql

### Modified (Client)
- client/src/components/layout/AppLayout.tsx
- client/src/components/ui/Badge.tsx
- client/src/components/ui/Button.tsx
- client/src/components/ui/Spinner.tsx
- client/src/features/admin/AdminDashboardPage.tsx
- client/src/features/admin/AdminJoinRequestsPage.tsx
- client/src/features/admin/AdminPodsPage.tsx
- client/src/features/admin/AdminSessionsPage.tsx
- client/src/features/admin/AdminUsersPage.tsx
- client/src/features/auth/LoginPage.tsx
- client/src/features/auth/RequestToJoinPage.tsx
- client/src/features/auth/VerifyPage.tsx
- client/src/features/home/HomePage.tsx
- client/src/features/host/HostDashboardPage.tsx
- client/src/features/invites/CreateInviteModal.tsx
- client/src/features/invites/InviteAcceptPage.tsx
- client/src/features/invites/InvitesPage.tsx
- client/src/features/live/HostControls.tsx
- client/src/features/live/HostRoundDashboard.tsx
- client/src/features/live/LiveSessionPage.tsx
- client/src/features/live/Lobby.tsx
- client/src/features/live/RatingPrompt.tsx
- client/src/features/live/SessionComplete.tsx
- client/src/features/live/VideoRoom.tsx
- client/src/features/onboarding/OnboardingPage.tsx
- client/src/features/pods/PodDetailPage.tsx
- client/src/features/pods/PodsPage.tsx
- client/src/features/profile/ProfilePage.tsx
- client/src/features/sessions/CreateSessionPage.tsx
- client/src/features/sessions/EncounterHistoryPage.tsx
- client/src/features/sessions/RecapPage.tsx
- client/src/features/sessions/SessionDetailPage.tsx
- client/src/features/settings/SettingsPage.tsx
- client/src/features/support/SupportPage.tsx
- client/src/hooks/useSessionSocket.ts
- client/src/index.css
- client/src/lib/api.ts
- client/src/stores/sessionStore.ts
- client/tailwind.config.js

### Modified (Server)
- server/src/config/index.ts
- server/src/routes/invites.ts
- server/src/routes/sessions.ts
- server/src/services/email/email.service.ts
- server/src/services/invite/invite.service.ts
- server/src/services/orchestration/orchestration.service.ts
- server/src/services/rating/rating.service.ts
- server/src/services/session/session.service.ts

### Modified (Shared)
- shared/src/types/events.ts
- shared/src/types/match.ts
