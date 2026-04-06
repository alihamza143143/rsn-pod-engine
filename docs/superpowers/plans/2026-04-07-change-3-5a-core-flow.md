# Change 3.5A: Core Flow Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 10 client-reported core flow issues: pod invite permissions, invite tabs, cache fix, notifications, nav order, onboarding flag, pod member invite, branding cleanup.

**Architecture:** DB migrations for new columns (allow_member_invites, onboarding_completed), server-side permission checks and notification creation, client-side UI improvements. All changes forward-compatible with Phase 2 (Redis).

**Tech Stack:** Node.js, Express, PostgreSQL, React 18, Zustand, TanStack Query

**Spec:** `docs/superpowers/specs/2026-04-07-change-3-5a-core-flow-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `server/src/db/migrations/032_pod_member_invites.sql` | Add `allow_member_invites` column to pods |
| `server/src/db/migrations/033_onboarding_completed.sql` | Add `onboarding_completed` column to users |

### Modified Files — Server
| File | Changes |
|------|---------|
| `server/src/services/invite/invite.service.ts` | Check allow_member_invites permission when member sends invite |
| `server/src/routes/pods.ts` | Accept allowMemberInvites in update schema, add GET /pods/:id/members/for-invite endpoint |
| `server/src/services/pod/pod.service.ts` | Add getPodMembersForInvite() query |
| `server/src/services/join-request/join-request.service.ts` | Create admin notification on join request, user notification on approval |
| `server/src/services/identity/identity.service.ts` | Include onboarding_completed in user auth response |
| `server/src/routes/ratings.ts` | No changes (endpoint added in 3.5B) |

### Modified Files — Client
| File | Changes |
|------|---------|
| `client/src/features/pods/PodsPage.tsx` | Reorder tabs: Active first |
| `client/src/features/pods/PodDetailPage.tsx` | Add "Allow members to invite" toggle |
| `client/src/features/pods/CreatePodModal.tsx` | Add "Allow members to invite" toggle |
| `client/src/features/invites/InvitesPage.tsx` | Add status filter tabs with counts |
| `client/src/features/invites/InviteAcceptPage.tsx` | Add session-participants cache invalidation, remove onboarding redirect |
| `client/src/components/ui/NotificationBell.tsx` | Add session-participants cache invalidation, remove onboarding redirect |
| `client/src/features/sessions/SessionDetailPage.tsx` | Add "Invite Pod Members" section in invite modal |
| `client/src/App.tsx` | Add onboarding gate check on login |
| `client/src/stores/authStore.ts` | Include onboarding_completed in user type |

### Deleted Files
| File | Reason |
|------|--------|
| `client/public/favicon_1.ico` | Stale duplicate |

---

## Task 1: Pod Navigation Order (#6) + Branding Cleanup (#21)

**Files:**
- Modify: `client/src/features/pods/PodsPage.tsx:26,72-77`
- Delete: `client/public/favicon_1.ico`

Quick wins first.

- [ ] **Step 1: Reorder pod tabs**

In `PodsPage.tsx`, find the tabs array (around line 72-77) and change the order. Also change the default filter state (line 26):

```typescript
// Line 26 — change default from 'browse' to 'active':
const [filter, setFilter] = useState<PodFilter>('active');

// Lines 72-77 — reorder tabs:
const TABS = [
  { key: 'active',   label: 'Active',     icon: null },
  { key: 'browse',   label: 'Browse All', icon: Globe },
  { key: 'archived', label: 'Archived',   icon: null },
];
```

Remove the 'all' tab entirely (redundant with 'browse').

- [ ] **Step 2: Delete stale favicon**

```bash
rm client/public/favicon_1.ico
```

- [ ] **Step 3: Verify + commit**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
git add client/src/features/pods/PodsPage.tsx
git rm client/public/favicon_1.ico
git commit -m "fix: pods page shows Active tab first, remove stale favicon duplicate"
```

---

## Task 2: Invite Accept Cache Fix (#3)

**Files:**
- Modify: `client/src/features/invites/InviteAcceptPage.tsx:74-89`
- Modify: `client/src/components/ui/NotificationBell.tsx:120-140`

- [ ] **Step 1: Add cache invalidation in InviteAcceptPage.tsx**

Find the onSuccess handler after accept (around line 79). Add cache invalidation:

```typescript
// After the successful accept API call, before navigation:
import { useQueryClient } from '@tanstack/react-query';
// In the component:
const qc = useQueryClient();

// In the accept success handler, add:
qc.invalidateQueries({ queryKey: ['session-participants'] });
qc.invalidateQueries({ queryKey: ['session-detail'] });
```

Check if `useQueryClient` is already imported — if so, just add the invalidation lines.

- [ ] **Step 2: Add cache invalidation in NotificationBell.tsx**

Find `handleAcceptInvite` (around line 120). After the successful accept, add:

```typescript
qc.invalidateQueries({ queryKey: ['session-participants'] });
qc.invalidateQueries({ queryKey: ['session-detail'] });
```

Check if these invalidations already exist in the `invalidateInviteCaches` function (lines 114-118). If so, add to that function.

- [ ] **Step 3: Verify + commit**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
git add client/src/features/invites/InviteAcceptPage.tsx client/src/components/ui/NotificationBell.tsx
git commit -m "fix: invalidate session-participants cache after invite accept — no stale Register button"
```

---

## Task 3: DB Migrations (allow_member_invites + onboarding_completed)

**Files:**
- Create: `server/src/db/migrations/032_pod_member_invites.sql`
- Create: `server/src/db/migrations/033_onboarding_completed.sql`

- [ ] **Step 1: Create migration 032**

```sql
-- 032_pod_member_invites.sql
-- Allow pod directors to enable member-sent invitations

ALTER TABLE pods ADD COLUMN IF NOT EXISTS allow_member_invites BOOLEAN DEFAULT false;

COMMENT ON COLUMN pods.allow_member_invites IS 'When true, regular pod members can send invites (not just directors/hosts)';
```

- [ ] **Step 2: Create migration 033**

```sql
-- 033_onboarding_completed.sql
-- Track whether user has completed the onboarding flow

ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Mark all existing users as completed (they've already been through the platform)
UPDATE users SET onboarding_completed = true WHERE onboarding_completed = false;

COMMENT ON COLUMN users.onboarding_completed IS 'Set true after user completes onboarding. Gates onboarding to first login only.';
```

- [ ] **Step 3: Verify migrations parse**

```bash
cd server && node -e "const fs=require('fs'); console.log(fs.readFileSync('src/db/migrations/032_pod_member_invites.sql','utf8')); console.log(fs.readFileSync('src/db/migrations/033_onboarding_completed.sql','utf8'));"
```

- [ ] **Step 4: Commit**

```bash
git add server/src/db/migrations/032_pod_member_invites.sql server/src/db/migrations/033_onboarding_completed.sql
git commit -m "feat: add allow_member_invites + onboarding_completed DB columns"
```

---

## Task 4: Pod Invite Permissions (#1)

**Files:**
- Modify: `server/src/services/invite/invite.service.ts`
- Modify: `server/src/routes/pods.ts:27-41,139-153`
- Modify: `server/src/services/pod/pod.service.ts:88-136`
- Modify: `client/src/features/pods/PodDetailPage.tsx`
- Modify: `client/src/features/pods/CreatePodModal.tsx`

- [ ] **Step 1: Server — add allowMemberInvites to pod update schema**

In `pods.ts`, find the `updatePodSchema` (lines 27-41). Add the new field:

```typescript
allowMemberInvites: z.boolean().optional(),
```

In `pod.service.ts` `updatePod()` function (lines 100-111), add to the field mapping:

```typescript
if (data.allowMemberInvites !== undefined) { fields.push('allow_member_invites'); values.push(data.allowMemberInvites); }
```

- [ ] **Step 2: Server — check permission when member sends invite**

In `invite.service.ts`, find where invites are created (the function that checks if sender is director/host). Add a check:

```typescript
// If sender is NOT director/host, check if pod allows member invites
if (!isDirectorOrHost) {
  const podResult = await query('SELECT allow_member_invites FROM pods WHERE id = $1', [podId]);
  const pod = podResult.rows[0];
  if (!pod?.allow_member_invites) {
    throw new ForbiddenError('Only pod directors can send invites for this pod');
  }
  // Also verify sender is a pod member
  const memberResult = await query(
    'SELECT id FROM pod_members WHERE pod_id = $1 AND user_id = $2 AND status = $3',
    [podId, userId, 'active']
  );
  if (memberResult.rows.length === 0) {
    throw new ForbiddenError('You must be a pod member to send invites');
  }
}
```

Read the actual invite creation code first to find the exact location for this check.

- [ ] **Step 3: Client — add toggle to CreatePodModal**

In `CreatePodModal.tsx`, add to the PodForm interface (line 18-26):
```typescript
allowMemberInvites?: boolean;
```

Add to DEFAULT_VALUES:
```typescript
allowMemberInvites: false,
```

In the form JSX (after the visibility select, around line 151), add:
```typescript
<label className="flex items-center gap-3 cursor-pointer">
  <input
    type="checkbox"
    checked={watch('allowMemberInvites') || false}
    onChange={(e) => setValue('allowMemberInvites', e.target.checked)}
    className="h-4 w-4 rounded border-gray-600 bg-[#35363a] text-indigo-500 focus:ring-indigo-500"
  />
  <span className="text-sm text-gray-300">Allow members to invite others</span>
</label>
```

- [ ] **Step 4: Client — add toggle to PodDetailPage edit form**

In `PodDetailPage.tsx`, find the edit form state (lines 86-95). Add `allowMemberInvites` field. In the edit form JSX, add the same checkbox toggle. In the update mutation, include the field.

- [ ] **Step 5: Verify + commit**

```bash
cd server && npx tsc --noEmit 2>&1 | head -20
cd client && npx tsc --noEmit 2>&1 | head -20
git add server/src/services/invite/invite.service.ts server/src/routes/pods.ts server/src/services/pod/pod.service.ts client/src/features/pods/PodDetailPage.tsx client/src/features/pods/CreatePodModal.tsx
git commit -m "feat: pod directors can toggle 'Allow members to invite' — members can send invites"
```

---

## Task 5: Invite Status Tabs (#2, #9)

**Files:**
- Modify: `client/src/features/invites/InvitesPage.tsx`

- [ ] **Step 1: Add status filter tabs to sent invites section**

In `InvitesPage.tsx`, find the "Invite List" section (around line 499-559). Add tab filtering above the list:

```typescript
// Add state for active tab
const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'revoked'>('all');

// Query sent invites with optional status filter
const { data: sentInvites } = useQuery({
  queryKey: ['sent-invites', statusFilter],
  queryFn: () => api.get(`/invites${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`).then(r => r.data.data),
});

// Summary counts
const counts = {
  all: sentInvites?.length || 0,
  pending: sentInvites?.filter((i: any) => i.status === 'pending' || i.status === 'active').length || 0,
  accepted: sentInvites?.filter((i: any) => i.status === 'accepted').length || 0,
  revoked: sentInvites?.filter((i: any) => i.status === 'revoked').length || 0,
};
```

Add tab bar UI:
```typescript
<div className="flex gap-2 mb-4">
  {(['all', 'pending', 'accepted', 'revoked'] as const).map(tab => (
    <button
      key={tab}
      onClick={() => setStatusFilter(tab)}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        statusFilter === tab
          ? 'bg-white/10 text-white'
          : 'text-gray-400 hover:text-gray-300'
      }`}
    >
      {tab.charAt(0).toUpperCase() + tab.slice(1)} ({counts[tab]})
    </button>
  ))}
</div>
```

Filter the list display based on `statusFilter`.

- [ ] **Step 2: Verify + commit**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
git add client/src/features/invites/InvitesPage.tsx
git commit -m "feat: invite page with status tabs — All, Pending, Accepted, Declined with counts"
```

---

## Task 6: Admin + User Notifications (#5)

**Files:**
- Modify: `server/src/services/join-request/join-request.service.ts:60-85,138-177`

- [ ] **Step 1: Add admin notification on join request creation**

In `createJoinRequest()` (lines 60-85), after the join request is created (after line 77), add:

```typescript
// Notify all admins about the new join request
try {
  await query(
    `INSERT INTO notifications (user_id, type, title, body, link, created_at)
     SELECT id, 'join_request', 'New Join Request',
       $1 || ' wants to join RSN', '/admin/join-requests', NOW()
     FROM users WHERE role IN ('admin', 'super_admin')`,
    [displayName || email]
  );
} catch (notifErr) {
  logger.warn({ err: notifErr }, 'Failed to create admin notifications for join request — non-fatal');
}
```

- [ ] **Step 2: Add user notification on approval**

In `reviewJoinRequest()` (lines 138-177), inside the `decision === 'approved'` block (around line 165), add:

```typescript
// In-app notification for the approved user
try {
  await query(
    `INSERT INTO notifications (user_id, type, title, body, link, created_at)
     VALUES ($1, 'approval', 'Welcome to RSN!', 'Your request to join has been approved. Start exploring!', '/pods', NOW())`,
    [joinRequest.userId]
  );
} catch (notifErr) {
  logger.warn({ err: notifErr }, 'Failed to create approval notification — non-fatal');
}
```

- [ ] **Step 3: Verify + commit**

```bash
cd server && npx tsc --noEmit 2>&1 | head -20
git add server/src/services/join-request/join-request.service.ts
git commit -m "feat: admin gets notification on join request, user gets notification on approval"
```

---

## Task 7: Onboarding Placement (#8)

**Files:**
- Modify: `server/src/services/identity/identity.service.ts`
- Modify: `client/src/stores/authStore.ts`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/ui/NotificationBell.tsx:138`
- Modify: `client/src/features/invites/InviteAcceptPage.tsx:84-86`

- [ ] **Step 1: Server — include onboarding_completed in user auth response**

In `identity.service.ts`, find where the user object is built for auth responses. Read the `getUserById` function (lines 65-93) and add `onboarding_completed` to the SELECT columns. Also ensure it's included in the auth token payload or user response.

Find `generateTokenPair` (lines 391-427) and check what user fields are returned. Add `onboardingCompleted` to the response.

- [ ] **Step 2: Server — endpoint to mark onboarding complete**

Check if there's already an onboarding completion endpoint. If not, add to an appropriate route (users or auth):

```typescript
router.post('/onboarding/complete', authenticate, async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    await query('UPDATE users SET onboarding_completed = true WHERE id = $1', [userId]);
    res.json({ data: { onboardingCompleted: true } });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 3: Client — add onboardingCompleted to auth store**

In `authStore.ts`, find the user type definition. Add:
```typescript
onboardingCompleted?: boolean;
```

- [ ] **Step 4: Client — add onboarding gate in App.tsx**

In `App.tsx`, find the `ProtectedRoute` component or create an `OnboardingGate` wrapper. After auth check, add:

```typescript
// Inside ProtectedRoute or as a wrapper:
const user = useAuthStore(s => s.user);
const location = useLocation();
if (user && !user.onboardingCompleted && location.pathname !== '/onboarding') {
  return <Navigate to="/onboarding" replace />;
}
```

- [ ] **Step 5: Client — remove onboarding hijacking from NotificationBell**

In `NotificationBell.tsx` line 138, remove the profile-incomplete onboarding redirect:

```typescript
// BEFORE:
window.location.href = profileIncomplete ? `/onboarding?redirect=${encodeURIComponent(dest)}` : dest;
// AFTER:
window.location.href = dest;
```

- [ ] **Step 6: Client — remove onboarding hijacking from InviteAcceptPage**

In `InviteAcceptPage.tsx` lines 84-86, remove the profile-incomplete check:

```typescript
// BEFORE: checks profileIncomplete and redirects to onboarding
// AFTER: always navigate to destination
navigate(dest);
```

- [ ] **Step 7: Verify + commit**

```bash
cd server && npx tsc --noEmit 2>&1 | head -20
cd client && npx tsc --noEmit 2>&1 | head -20
git add server/src/services/identity/identity.service.ts server/src/routes/auth.ts client/src/stores/authStore.ts client/src/App.tsx client/src/components/ui/NotificationBell.tsx client/src/features/invites/InviteAcceptPage.tsx
git commit -m "feat: onboarding gates to first login only — never interrupts events or invites"
```

---

## Task 8: Event Invitation — Invite Pod Members (#10)

**Files:**
- Modify: `server/src/routes/pods.ts`
- Modify: `server/src/services/pod/pod.service.ts`
- Modify: `client/src/features/sessions/SessionDetailPage.tsx`

- [ ] **Step 1: Server — add pod members for invite endpoint**

In `pod.service.ts`, add a new query function:

```typescript
export async function getPodMembersForInvite(podId: string, sessionId: string): Promise<{
  userId: string; displayName: string; email: string; avatarUrl: string | null;
}[]> {
  const result = await query<{
    user_id: string; display_name: string; email: string; avatar_url: string | null;
  }>(`
    SELECT u.id AS user_id, u.display_name, u.email, u.avatar_url
    FROM pod_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.pod_id = $1
      AND pm.status = 'active'
      AND pm.user_id NOT IN (
        SELECT sp.user_id FROM session_participants sp WHERE sp.session_id = $2
      )
      AND pm.user_id NOT IN (
        SELECT i.accepted_by_user_id FROM invites i 
        WHERE i.session_id = $2 AND i.status IN ('pending', 'active', 'accepted')
        AND i.accepted_by_user_id IS NOT NULL
      )
    ORDER BY u.display_name
  `, [podId, sessionId]);

  return result.rows.map(r => ({
    userId: r.user_id,
    displayName: r.display_name,
    email: r.email,
    avatarUrl: r.avatar_url,
  }));
}
```

In `pods.ts`, add the route:

```typescript
router.get('/:id/members/for-invite', authenticate, async (req, res, next) => {
  try {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) return res.status(400).json({ error: { message: 'sessionId required' } });
    const members = await podService.getPodMembersForInvite(req.params.id, sessionId);
    res.json({ data: members });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 2: Client — add "Invite Pod Members" section in SessionDetailPage**

In `SessionDetailPage.tsx`, find the invite modal section (around line 362). Read the existing invite modal structure. Add a new section for pod members:

```typescript
// Query pod members available for invite
const { data: podMembers } = useQuery({
  queryKey: ['pod-members-for-invite', session?.podId, sessionId],
  queryFn: () => api.get(`/pods/${session?.podId}/members/for-invite?sessionId=${sessionId}`).then(r => r.data.data),
  enabled: !!session?.podId && !!sessionId && isHost,
});

// In the invite modal, add a section before or after the platform user search:
{podMembers && podMembers.length > 0 && (
  <div className="mb-6">
    <h4 className="text-sm font-medium text-gray-300 mb-3">Pod Members ({podMembers.length} available)</h4>
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {podMembers.map((m: any) => (
        <div key={m.userId} className="flex items-center justify-between p-2 rounded-lg bg-[#35363a]">
          <div className="flex items-center gap-3">
            {m.avatarUrl ? (
              <img src={m.avatarUrl} className="h-8 w-8 rounded-full" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-sm text-indigo-400">
                {m.displayName?.[0] || '?'}
              </div>
            )}
            <span className="text-sm text-white">{m.displayName}</span>
          </div>
          <Button
            size="sm"
            onClick={() => invitePodMember(m.userId, m.email)}
            disabled={invitingMember === m.userId}
          >
            Invite
          </Button>
        </div>
      ))}
    </div>
  </div>
)}
```

Add the invite handler:
```typescript
const [invitingMember, setInvitingMember] = useState<string | null>(null);

const invitePodMember = async (userId: string, email: string) => {
  setInvitingMember(userId);
  try {
    await api.post('/invites', {
      type: 'session',
      sessionId,
      inviteeEmail: email,
      maxUses: 1,
    });
    addToast('Invite sent!', 'success');
    qc.invalidateQueries({ queryKey: ['pod-members-for-invite'] });
  } catch (err: any) {
    addToast(err?.response?.data?.error?.message || 'Failed to invite', 'error');
  } finally {
    setInvitingMember(null);
  }
};
```

- [ ] **Step 3: Verify + commit**

```bash
cd server && npx tsc --noEmit 2>&1 | head -20
cd client && npx tsc --noEmit 2>&1 | head -20
git add server/src/routes/pods.ts server/src/services/pod/pod.service.ts client/src/features/sessions/SessionDetailPage.tsx
git commit -m "feat: hosts can bulk-invite pod members to events from invite modal"
```

---

## Task 9: Verify Pod Creation Flow (#4)

**Files:** None (verification only — fix if needed)

- [ ] **Step 1: Verify the flow**

The audit showed:
- `HostDashboardPage.tsx` has NO "Create Pod" button (confirmed)
- `PodsPage.tsx` has a working "Create Pod" button that opens modal → creates → navigates to new pod
- `CreatePodModal.tsx:86` navigates to `/pods/{newPodId}` on success

Verify by reading the code. If there's a broken link elsewhere (e.g., a dashboard quick-action), fix it. If flow works correctly, skip.

```bash
grep -rn "Create Pod\|create.*pod\|/pods/create" client/src/ --include="*.tsx" --include="*.ts" | grep -v node_modules
```

- [ ] **Step 2: Commit if changes made**

```bash
# Only if changes were needed:
git add [changed files]
git commit -m "fix: pod creation flow navigates correctly after creation"
```

---

## Task 10: Full Build Verification + Push

- [ ] **Step 1: Full server build**

```bash
cd server && npm run build 2>&1 | tail -10
```

- [ ] **Step 2: Full client build**

```bash
cd client && npm run build 2>&1 | tail -10
```

- [ ] **Step 3: Verify no stale favicon**

```bash
ls client/public/favicon*
```

Expected: favicon.svg, favicon.png, favicon-64.png, favicon-192.png, favicon.ico — NO favicon_1.ico.

- [ ] **Step 4: Push both branches**

```bash
git push origin staging && git push origin main
```
