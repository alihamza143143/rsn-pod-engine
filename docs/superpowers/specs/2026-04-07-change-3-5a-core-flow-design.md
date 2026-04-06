# Change 3.5A: Core Flow Fixes — Design Spec

**Date:** 2026-04-07
**Status:** Approved
**Scope:** 10 client-reported core flow issues from April 6th review (pod privacy, invites, notifications, navigation, onboarding, branding)
**Constraint:** Complete all remaining Stefan review items so full testing doc can be sent

---

## Problem Statement

Client review of April 6th identified issues across pod management, invitation system, notifications, navigation, and onboarding. These are non-event-flow issues that affect day-to-day platform usability.

---

## Section 1: Pod Invitation Permissions (#1)

### Problem
Invites hardcoded to director/host only. No way for pod owners to let members invite others.

### Fix

**New migration:** Add `allow_member_invites BOOLEAN DEFAULT false` to `pods` table.

**Server (`invite.service.ts`):** When creating an invite, check sender permissions:
- If sender is director/host → always allowed
- If sender is a regular member → check `pod.allow_member_invites === true` AND sender is a pod member
- Otherwise reject with 403

**Server (`pods.ts` route):** New PATCH endpoint or extend existing pod update to accept `allowMemberInvites` field. Only pod director can toggle.

**Client (`PodDetailPage.tsx`):** In pod settings section (visible to director only), add toggle: "Allow members to invite others".

**Client (`CreatePodModal.tsx`):** Add the toggle to pod creation form with default off.

---

## Section 2: Invite Flow Visibility & Tabs (#2, #9)

### Problem
After inviting people, can't see status breakdown. "All" tab doesn't work. No filter tabs.

### Fix

**Client (`InvitesPage.tsx`) overhaul:**
- Replace flat invite list with tabbed view: **All | Pending | Accepted | Declined**
- Each tab calls `GET /invites?status=X` (server already supports status filter at `invite.service.ts:461`)
- Add summary counts bar at top: "5 sent, 3 accepted, 1 pending, 1 declined"
- Invalidate invite queries after any invite action (send/revoke)

**Server:** No changes needed — status filtering already implemented.

---

## Section 3: Invite Accept Cache Fix (#3)

### Problem
Server auto-registers correctly on invite accept. But SessionDetailPage participants query cache may be stale — user could briefly see "Register" button.

### Fix

**Client (`InviteAcceptPage.tsx`):** After successful accept, add:
```typescript
qc.invalidateQueries({ queryKey: ['session-participants'] });
```

**Client (`NotificationBell.tsx`):** Same cache invalidation after invite accept.

One-line fix in each file.

---

## Section 4: Pod Creation Flow (#4)

### Problem
"Create Pod" from dashboard redirects incorrectly, user clicks twice.

### Fix

**Verify:** `CreatePodModal.tsx:86` already navigates to new pod after creation. `HostDashboardPage.tsx` has no "Create Pod" button — it's on `PodsPage.tsx`.

**Action:** Check if there's a dashboard quick-action or shortcut that links to pod creation incorrectly. Fix the navigation target if found. If the flow already works correctly from PodsPage, mark as verified.

---

## Section 5: Admin + User Notifications (#5)

### Problem
Admin not alerted about pending join requests. Users don't get in-app notification after approval.

### Fix

**Server (`join-request.service.ts` — `createJoinRequest()`):** After creating the join request, query all admin users and insert a notification for each:
```sql
INSERT INTO notifications (user_id, type, title, body, link)
SELECT id, 'join_request', 'New Join Request',
  '{displayName} wants to join RSN', '/admin/join-requests'
FROM users WHERE role IN ('admin', 'super_admin')
```

**Server (`join-request.service.ts` — `reviewJoinRequest()`):** When status = 'approved', insert notification for the applicant:
```sql
INSERT INTO notifications (user_id, type, title, body, link)
VALUES ($1, 'approval', 'Welcome to RSN!', 'Your request to join has been approved.', '/pods')
```

Uses existing notifications table — no schema changes needed.

---

## Section 6: Pod Navigation Order (#6)

### Problem
"Browse All" appears before "Active" in pods page. Users can't find their own pods first.

### Fix

**Client (`PodsPage.tsx:72-76`):** Change tab order:
```typescript
// BEFORE: ['browse', 'active', 'archived', 'all']
// AFTER:  ['active', 'browse', 'archived']
```

Remove 'all' tab (redundant with 'browse'). Default active tab = 'active'.

---

## Section 7: Onboarding Placement (#8)

### Problem
Onboarding appears at random moments (during event, after invite) because it triggers on profile incompleteness, not first login.

### Fix

**New migration:** Add `onboarding_completed BOOLEAN DEFAULT false` to `users` table. Set to `true` for all existing users (they've already been through the platform).

**Server:** New endpoint or extend profile update: when user completes onboarding form, set `onboarding_completed = true`.

**Server (`identity.service.ts`):** Include `onboarding_completed` in the user object returned by auth endpoints.

**Client (`App.tsx` or auth flow):** After login, check: if `!user.onboarding_completed` → redirect to `/onboarding`. After onboarding completion, set flag via API.

**Client (`NotificationBell.tsx:138`):** REMOVE the profile-incomplete redirect to onboarding. No more onboarding hijacking during invite accept.

**Client (`InviteAcceptPage.tsx:84-86`):** REMOVE the profile-incomplete redirect to onboarding. User goes straight to session/pod.

---

## Section 8: Event Invitation — Invite Pod Members (#10)

### Problem
Can only invite individual platform users to events. Missing: bulk invite pod members.

### Fix

**Server (`pods.ts` or `invites.ts`):** New endpoint `GET /api/pods/:podId/members/for-invite?sessionId=X`:
- Returns pod members who are NOT already registered/invited for this session
- Fields: `userId, displayName, email, avatarUrl`

**Client (`SessionDetailPage.tsx`):** In the invite modal, add a new section/tab: "Pod Members"
- Fetches pod members via the new endpoint
- Shows checkboxes for each member
- "Invite All" / "Invite Selected" button
- Calls existing `POST /invites` for each selected member (or a new bulk endpoint)
- After sending, invalidate relevant queries

---

## Section 9: Branding Cleanup (#21)

### Problem
Duplicate favicon file, potential inconsistency.

### Fix

- Delete `client/public/favicon_1.ico` (stale duplicate of the RSN black sheep favicon)
- Verify the black sheep logo renders correctly across `favicon.svg`, `favicon.png`, `favicon-64.png`, `favicon-192.png`
- Email templates already verified as consistent (Change 3.5B audit confirmed)

---

## What Does NOT Change

- Event flow (already hardened by Change 3.0)
- Live event UX (already fixed by Change 3.5B)
- Database schema for sessions, matches, ratings
- Socket.IO event architecture
- LiveKit integration

---

## Dr Architecture Compliance

| Change | Phase 2 (Redis) Ready? | Phase 3 (State Machine) Ready? | Phase 4 (100K) Ready? |
|--------|----------------------|-------------------------------|----------------------|
| Pod invite permission | Yes — DB column, no memory state | Yes — permission check is stateless | Yes — per-request query |
| Invite tabs | Yes — API-driven | N/A | Yes — paginated queries |
| Cache invalidation | Yes — React Query only | N/A | N/A |
| Admin notifications | Yes — DB insert, no in-memory | Yes | Yes — bulk insert |
| Onboarding flag | Yes — DB column | Yes — stateless check | Yes |
| Pod member invite | Yes — DB query | N/A | Yes — batch endpoint |
| Nav order | N/A | N/A | N/A |

---

## Success Criteria

1. Pod director can toggle "Allow members to invite others" — members can then send invites
2. Invite page shows tabs (All/Pending/Accepted/Declined) with correct counts
3. Accepting invite invalidates session participant cache — no stale "Register" button
4. Pod creation navigates directly to new pod — no double-click
5. Admin receives in-app notification when join request submitted
6. User receives in-app notification when join request approved
7. Pods page shows Active tab first, then Browse All, then Archived
8. Onboarding shows on first login ONLY — never during event or invite accept
9. Event host can bulk-invite pod members from invite modal
10. No stale favicon files in public directory
