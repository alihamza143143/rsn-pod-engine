// Phase May-19 realtime server-gap closure — 12+ REST routes that mutated
// state without emitting any socket fanout now do. Code-reviewer flagged
// every route below as a source of "I did X and the other screen didn't
// update" bugs. Each test pins one fanout call so regressions surface
// immediately on the next test run.
//
// Strategy: read-the-source assertions, same pattern as
// phase-may19-bug30-realtime-everywhere.test.ts. Server-only — client
// integration is a separate subagent's job.

import * as nodeFs from 'fs';
import * as nodePath from 'path';

// Normalise CRLF → LF so the regex / indexOf searches below behave
// identically on Windows and Unix checkouts. Server files in this repo
// are committed with CRLF on Windows; without this the test pins fail on
// Windows but pass on CI Linux.
function readServer(rel: string): string {
  return nodeFs
    .readFileSync(nodePath.join(__dirname, '../../', rel), 'utf8')
    .replace(/\r\n/g, '\n');
}
function readShared(rel: string): string {
  return nodeFs
    .readFileSync(nodePath.join(__dirname, '../../../../shared/src', rel), 'utf8')
    .replace(/\r\n/g, '\n');
}

describe('Phase May-19 realtime server-gap closure', () => {
  const orchSrc = readServer('services/orchestration/orchestration.service.ts');
  const adminRoute = readServer('routes/admin.ts');
  const usersRoute = readServer('routes/users.ts');
  const notificationsRoute = readServer('routes/notifications.ts');
  const dmRoute = readServer('routes/dm.ts');
  const podsRoute = readServer('routes/pods.ts');
  const joinRequestsRoute = readServer('routes/join-requests.ts');
  const pokesRoute = readServer('routes/pokes.ts');
  const sessionsRoute = readServer('routes/sessions.ts');
  const reportsRoute = readServer('routes/reports.ts');
  const groupsRoute = readServer('routes/groups.ts');

  // ── New orchestration helpers ───────────────────────────────────────────

  describe('Orchestration service — new helpers', () => {
    it('notifyAdminListChanged selects admins and fans out admin:list_changed', () => {
      const fnIdx = orchSrc.indexOf('export async function notifyAdminListChanged');
      expect(fnIdx).toBeGreaterThan(-1);
      const fn = orchSrc.slice(fnIdx, fnIdx + 2000);
      expect(fn).toMatch(/SELECT id FROM users WHERE role IN \('admin', 'super_admin'\)/);
      expect(fn).toMatch(/io\.to\(userRoom\(row\.id\)\)\.emit\(\s*'admin:list_changed'/);
    });

    it('notifyOwnNotificationsChanged emits notification:list_changed to user room', () => {
      const fnIdx = orchSrc.indexOf('export async function notifyOwnNotificationsChanged');
      expect(fnIdx).toBeGreaterThan(-1);
      const fn = orchSrc.slice(fnIdx, fnIdx + 1500);
      expect(fn).toMatch(/io\.to\(userRoom\(userId\)\)\.emit\(\s*'notification:list_changed'/);
    });

    it('notifyUserBlocksChanged emits to BOTH blocker and blocked rooms', () => {
      const fnIdx = orchSrc.indexOf('export async function notifyUserBlocksChanged');
      expect(fnIdx).toBeGreaterThan(-1);
      const fn = orchSrc.slice(fnIdx, fnIdx + 2000);
      expect(fn).toMatch(/io\.to\(userRoom\(blockerId\)\)\.emit\(\s*'user:blocks_changed'/);
      expect(fn).toMatch(/io\.to\(userRoom\(blockedId\)\)\.emit\(\s*'user:blocks_changed'/);
    });

    it('notifyUserChanged emits user:changed to the affected user room', () => {
      const fnIdx = orchSrc.indexOf('export async function notifyUserChanged');
      expect(fnIdx).toBeGreaterThan(-1);
      const fn = orchSrc.slice(fnIdx, fnIdx + 1500);
      expect(fn).toMatch(/io\.to\(userRoom\(userId\)\)\.emit\(\s*'user:changed'/);
    });

    it('notifyDmReactionChanged emits dm:reaction_added or dm:reaction_removed to both participants', () => {
      const fnIdx = orchSrc.indexOf('export async function notifyDmReactionChanged');
      expect(fnIdx).toBeGreaterThan(-1);
      const fn = orchSrc.slice(fnIdx, fnIdx + 2000);
      expect(fn).toMatch(/added \? 'dm:reaction_added' : 'dm:reaction_removed'/);
      expect(fn).toMatch(/io\.to\(userRoom\(userId\)\)\.emit\(event/);
      expect(fn).toMatch(/io\.to\(userRoom\(otherUserId\)\)\.emit\(event/);
    });

    it('notifyDmReadReceipt emits dm:read_receipt to reader and other party', () => {
      const fnIdx = orchSrc.indexOf('export async function notifyDmReadReceipt');
      expect(fnIdx).toBeGreaterThan(-1);
      const fn = orchSrc.slice(fnIdx, fnIdx + 2000);
      expect(fn).toMatch(/io\.to\(userRoom\(readerId\)\)\.emit\(\s*'dm:read_receipt'/);
      expect(fn).toMatch(/io\.to\(userRoom\(otherUserId\)\)\.emit\(\s*'dm:read_receipt'/);
    });

    it('notifyGroupChanged fans out group:changed to every dm_group_members row', () => {
      const fnIdx = orchSrc.indexOf('export async function notifyGroupChanged');
      expect(fnIdx).toBeGreaterThan(-1);
      const fn = orchSrc.slice(fnIdx, fnIdx + 2000);
      expect(fn).toMatch(/SELECT user_id FROM dm_group_members/);
      expect(fn).toMatch(/io\.to\(userRoom\(row\.user_id\)\)\.emit\(\s*'group:changed'/);
    });
  });

  // ── Shared event type declarations ─────────────────────────────────────

  describe('Shared event types — new realtime events declared', () => {
    const eventsSrc = readShared('types/events.ts');

    it('admin:list_changed is declared', () => {
      expect(eventsSrc).toMatch(
        /'admin:list_changed':[\s\S]{0,200}scope:\s*string;\s*cause:\s*string/,
      );
    });

    it('notification:list_changed is declared', () => {
      expect(eventsSrc).toMatch(
        /'notification:list_changed':[\s\S]{0,200}userId:\s*string;\s*cause:\s*string/,
      );
    });

    it('user:blocks_changed is declared', () => {
      expect(eventsSrc).toMatch(
        /'user:blocks_changed':[\s\S]{0,200}blockerId:\s*string;\s*blockedId:\s*string;\s*cause:\s*string/,
      );
    });

    it('user:changed is declared', () => {
      expect(eventsSrc).toMatch(
        /'user:changed':[\s\S]{0,200}userId:\s*string;\s*cause:\s*string/,
      );
    });

    it('group:changed is declared', () => {
      expect(eventsSrc).toMatch(
        /'group:changed':[\s\S]{0,200}groupId:\s*string;[\s\S]{0,80}cause:\s*string/,
      );
    });
  });

  // ── admin.ts route fanouts ─────────────────────────────────────────────

  describe('routes/admin.ts — every mutating route fans out', () => {
    it('PUT /admin/users/:id/entitlements fans out users list + user changed', () => {
      const idx = adminRoute.indexOf("'/users/:id/entitlements'");
      const end = adminRoute.indexOf('// ─── POST /admin/users/bulk-action', idx);
      const fn = adminRoute.slice(idx, end > -1 ? end : idx + 4000);
      expect(fn).toMatch(/notifyAdminListChanged\('users',\s*'entitlements_updated'/);
      expect(fn).toMatch(/notifyUserChanged\(req\.params\.id,\s*'entitlements_updated'/);
    });

    it('POST /admin/users/bulk-action fans out for both role + status branches', () => {
      const idx = adminRoute.indexOf("'/users/bulk-action'");
      const end = adminRoute.indexOf("'/join-requests/bulk-action'", idx);
      const fn = adminRoute.slice(idx, end > -1 ? end : idx + 5000);
      // Role change branch
      expect(fn).toMatch(/notifyAdminListChanged\('users',\s*'role_changed'/);
      expect(fn).toMatch(/notifyUserChanged\(row\.id,\s*'role_changed'/);
      // Status change branch
      expect(fn).toMatch(/notifyAdminListChanged\('users',\s*`bulk_\$\{action\}`/);
      expect(fn).toMatch(/notifyUserChanged\(row\.id,\s*`bulk_\$\{action\}`/);
    });

    it('POST /admin/join-requests/bulk-action fans out join-requests scope', () => {
      const idx = adminRoute.indexOf("'/join-requests/bulk-action'");
      const fn = adminRoute.slice(idx, idx + 3000);
      expect(fn).toMatch(/notifyAdminListChanged\('join-requests',\s*`bulk_\$\{decision\}`/);
    });

    it('POST /admin/violations/:id/resolve fans out violations + suspended user', () => {
      const idx = adminRoute.indexOf("'/violations/:id/resolve'");
      const end = adminRoute.indexOf("'/violations/report'", idx);
      const fn = adminRoute.slice(idx, end > -1 ? end : idx + 4000);
      expect(fn).toMatch(/notifyAdminListChanged\('violations',\s*`violation_/);
      expect(fn).toMatch(/notifyUserChanged\(violation\.rows\[0\]\.reported_user_id,\s*`violation_/);
    });

    it('POST /admin/violations/report fans out violations queue', () => {
      const idx = adminRoute.indexOf("'/violations/report'");
      const fn = adminRoute.slice(idx, idx + 2500);
      expect(fn).toMatch(/notifyAdminListChanged\('violations',\s*'violation_reported'/);
    });

    it('POST /admin/templates fans out template_created', () => {
      // First POST route handler for /templates (excluding GET / and PUT/:id).
      const idx = adminRoute.indexOf("router.post(\n  '/templates'");
      expect(idx).toBeGreaterThan(-1);
      const fn = adminRoute.slice(idx, idx + 3000);
      expect(fn).toMatch(/notifyAdminListChanged\('templates',\s*'template_created'/);
    });

    it('PUT /admin/templates/:id fans out template_updated', () => {
      const idx = adminRoute.indexOf("router.put(\n  '/templates/:id'");
      expect(idx).toBeGreaterThan(-1);
      const fn = adminRoute.slice(idx, idx + 3000);
      expect(fn).toMatch(/notifyAdminListChanged\('templates',\s*'template_updated'/);
    });

    it('DELETE /admin/templates/:id fans out template_deleted', () => {
      const idx = adminRoute.indexOf("router.delete(\n  '/templates/:id'");
      expect(idx).toBeGreaterThan(-1);
      const fn = adminRoute.slice(idx, idx + 1500);
      expect(fn).toMatch(/notifyAdminListChanged\('templates',\s*'template_deleted'/);
    });

    it('PUT /admin/email-config/:id fans out email-config update', () => {
      const idx = adminRoute.indexOf("'/email-config/:id'");
      const fn = adminRoute.slice(idx, idx + 2000);
      expect(fn).toMatch(/notifyAdminListChanged\('email-config',\s*'email_config_updated'/);
    });

    it('PATCH /admin/support-tickets/:id fans out tickets list + owner', () => {
      const idx = adminRoute.indexOf("'/support-tickets/:id'");
      const end = adminRoute.indexOf("// POST /support-tickets", idx);
      const fn = adminRoute.slice(idx, end > -1 ? end : idx + 4000);
      expect(fn).toMatch(/notifyAdminListChanged\('support-tickets',\s*'ticket_updated'/);
      expect(fn).toMatch(/notifyUserChanged\(ownerResult\.rows\[0\]\.user_id,\s*'ticket_updated'/);
    });

    it('POST /admin/support-tickets fans out tickets queue', () => {
      const idx = adminRoute.indexOf("router.post(\n  '/support-tickets'");
      expect(idx).toBeGreaterThan(-1);
      const fn = adminRoute.slice(idx, idx + 2000);
      expect(fn).toMatch(/notifyAdminListChanged\('support-tickets',\s*'ticket_created'/);
    });
  });

  // ── users.ts route fanouts ─────────────────────────────────────────────

  describe('routes/users.ts — every mutating route fans out', () => {
    it('PUT /users/me fans out profile_updated to every active pod + user room', () => {
      const idx = usersRoute.indexOf("router.put(\n  '/me'");
      const end = usersRoute.indexOf("// ─── GET /users/connected", idx);
      const fn = usersRoute.slice(idx, end > -1 ? end : idx + 3000);
      expect(fn).toMatch(/SELECT pod_id FROM pod_members WHERE user_id = \$1 AND status = 'active'/);
      expect(fn).toMatch(/notifyPodChanged\(row\.pod_id,\s*'profile_updated'/);
      expect(fn).toMatch(/notifyUserChanged\(req\.user!\.userId,\s*'profile_updated'/);
    });

    it('PUT /users/:id/role fans out admin + target user', () => {
      const idx = usersRoute.indexOf("'/:id/role'");
      const end = usersRoute.indexOf("// ─── PUT /users/:id/status", idx);
      const fn = usersRoute.slice(idx, end > -1 ? end : idx + 3000);
      expect(fn).toMatch(/notifyAdminListChanged\('users',\s*'role_changed'/);
      expect(fn).toMatch(/notifyUserChanged\(req\.params\.id,\s*'role_changed'/);
    });

    it('PUT /users/:id/status fans out admin + target user', () => {
      const idx = usersRoute.indexOf("'/:id/status'");
      const end = usersRoute.indexOf("// ─── DELETE /users/:id", idx);
      const fn = usersRoute.slice(idx, end > -1 ? end : idx + 3000);
      expect(fn).toMatch(/notifyAdminListChanged\('users',\s*'status_changed'/);
      expect(fn).toMatch(/notifyUserChanged\(req\.params\.id,\s*'status_changed'/);
    });

    it('DELETE /users/:id fans out BEFORE the delete', () => {
      const idx = usersRoute.indexOf("router.delete(\n  '/:id'");
      const end = usersRoute.indexOf("// ─── Block Routes", idx);
      const fn = usersRoute.slice(idx, end > -1 ? end : idx + 3000);
      expect(fn).toMatch(/notifyAdminListChanged\('users',\s*'user_deleted'/);
      expect(fn).toMatch(/notifyUserChanged\(req\.params\.id,\s*'user_deleted'/);
      const notifyIdx = fn.indexOf("'user_deleted'");
      const deleteIdx = fn.indexOf('identityService.deleteUser');
      expect(notifyIdx).toBeLessThan(deleteIdx);
    });

    it('POST /users/:id/block fans out user:blocks_changed', () => {
      const idx = usersRoute.indexOf("'/:id/block'");
      const fn = usersRoute.slice(idx, idx + 2500);
      expect(fn).toMatch(
        /notifyUserBlocksChanged\(req\.user!\.userId,\s*req\.params\.id,\s*'blocked'/,
      );
    });

    it('DELETE /users/:id/block fans out user:blocks_changed', () => {
      // The DELETE handler is the second match for '/:id/block'.
      const allIdx = [...usersRoute.matchAll(/'\/:id\/block'/g)].map(m => m.index!);
      expect(allIdx.length).toBeGreaterThanOrEqual(2);
      // Take a wide window around the DELETE handler.
      const fn = usersRoute.slice(allIdx[1] - 100, allIdx[1] + 2500);
      expect(fn).toMatch(
        /notifyUserBlocksChanged\(req\.user!\.userId,\s*req\.params\.id,\s*'unblocked'/,
      );
    });
  });

  // ── notifications.ts route fanouts ─────────────────────────────────────

  describe('routes/notifications.ts — mark-read paths fan out', () => {
    it('POST /notifications/read-all fans out read_all', () => {
      const idx = notificationsRoute.indexOf("'/read-all'");
      const end = notificationsRoute.indexOf("// POST /notifications/:id/read", idx);
      const fn = notificationsRoute.slice(idx, end > -1 ? end : idx + 2000);
      expect(fn).toMatch(/notifyOwnNotificationsChanged\(req\.user!\.userId,\s*'read_all'/);
    });

    it('POST /notifications/:id/read fans out read_one', () => {
      const idx = notificationsRoute.indexOf("'/:id/read'");
      const end = notificationsRoute.indexOf("// DELETE /notifications", idx);
      const fn = notificationsRoute.slice(idx, end > -1 ? end : idx + 2000);
      expect(fn).toMatch(/notifyOwnNotificationsChanged\(req\.user!\.userId,\s*'read_one'/);
    });

    it('DELETE /notifications fans out cleared_all', () => {
      const idx = notificationsRoute.indexOf("router.delete(");
      const fn = notificationsRoute.slice(idx, idx + 2000);
      expect(fn).toMatch(/notifyOwnNotificationsChanged\(req\.user!\.userId,\s*'cleared_all'/);
    });
  });

  // ── dm.ts route fanouts ────────────────────────────────────────────────

  describe('routes/dm.ts — reaction + read-receipt fanouts', () => {
    it('POST /dm/messages/:id/reactions fans out reaction_added=true', () => {
      const idx = dmRoute.indexOf("router.post(\n  '/messages/:id/reactions'");
      expect(idx).toBeGreaterThan(-1);
      const fn = dmRoute.slice(idx, idx + 3000);
      expect(fn).toMatch(
        /notifyDmReactionChanged\([\s\S]{0,400}result\.conversationId[\s\S]{0,200}result\.otherUserId[\s\S]{0,200}true,/,
      );
    });

    it('DELETE /dm/messages/:id/reactions/:emoji fans out reaction_added=false', () => {
      const idx = dmRoute.indexOf("router.delete(\n  '/messages/:id/reactions/:emoji'");
      expect(idx).toBeGreaterThan(-1);
      const fn = dmRoute.slice(idx, idx + 3000);
      expect(fn).toMatch(
        /notifyDmReactionChanged\([\s\S]{0,400}result\.conversationId[\s\S]{0,200}result\.otherUserId[\s\S]{0,200}false,/,
      );
    });

    it('POST /dm/conversations/:id/read fans out dm:read_receipt to both parties', () => {
      const idx = dmRoute.indexOf("'/conversations/:id/read'");
      const end = dmRoute.indexOf("// ─── DELETE /dm/conversations/:id", idx);
      const fn = dmRoute.slice(idx, end > -1 ? end : idx + 4000);
      expect(fn).toMatch(/SELECT user_a_id, user_b_id FROM dm_conversations WHERE id = \$1/);
      expect(fn).toMatch(/notifyDmReadReceipt\(/);
    });
  });

  // ── pods.ts route fanouts (Bug-30 follow-ups) ──────────────────────────

  describe('routes/pods.ts — Bug-30 follow-up gaps', () => {
    it('POST /pods/:id/leave fans out member_left + personal notify', () => {
      const idx = podsRoute.indexOf("'/:id/leave'");
      const end = podsRoute.indexOf("// ─── POST /pods/:id/reactivate", idx);
      const fn = podsRoute.slice(idx, end > -1 ? end : idx + 2500);
      expect(fn).toMatch(/notifyPodMembershipChanged\(req\.params\.id,\s*req\.user!\.userId,\s*'left'/);
      expect(fn).toMatch(/notifyPodChanged\(req\.params\.id,\s*'member_left'/);
    });

    it('POST /pods/:id/reactivate fans out pod_reactivated', () => {
      const idx = podsRoute.indexOf("'/:id/reactivate'");
      const end = podsRoute.indexOf("// ─── GET /pods/:id/session-count", idx);
      const fn = podsRoute.slice(idx, end > -1 ? end : idx + 2500);
      expect(fn).toMatch(/notifyPodChanged\(req\.params\.id,\s*'pod_reactivated'/);
    });

    it('PUT /pods/:id/join-config fans out join_config_updated', () => {
      const idx = podsRoute.indexOf("router.put(\n  '/:id/join-config'");
      expect(idx).toBeGreaterThan(-1);
      const fn = podsRoute.slice(idx, idx + 2500);
      expect(fn).toMatch(/notifyPodChanged\(req\.params\.id,\s*'join_config_updated'/);
    });

    it('DELETE /pods/:id/permanent fans out pod_hard_deleted BEFORE the delete', () => {
      const idx = podsRoute.indexOf("'/:id/permanent'");
      const fn = podsRoute.slice(idx, idx + 2500);
      expect(fn).toMatch(/notifyPodChanged\(req\.params\.id,\s*'pod_hard_deleted'/);
      const notifyIdx = fn.indexOf("'pod_hard_deleted'");
      const deleteIdx = fn.indexOf('podService.hardDeletePod');
      expect(notifyIdx).toBeLessThan(deleteIdx);
    });
  });

  // ── join-requests.ts route fanouts ─────────────────────────────────────

  describe('routes/join-requests.ts — every mutating route fans out', () => {
    it('POST /join-requests (public submit) fans out join_request_created', () => {
      const idx = joinRequestsRoute.indexOf("router.post(\n  '/',");
      expect(idx).toBeGreaterThan(-1);
      const fn = joinRequestsRoute.slice(idx, idx + 2500);
      expect(fn).toMatch(/notifyAdminListChanged\('join-requests',\s*'join_request_created'/);
    });

    it('PATCH /join-requests/:id/review fans out admin list + user (if account exists)', () => {
      const idx = joinRequestsRoute.indexOf("'/:id/review'");
      const end = joinRequestsRoute.indexOf("// ─── POST /join-requests/:id/note", idx);
      const fn = joinRequestsRoute.slice(idx, end > -1 ? end : idx + 4000);
      expect(fn).toMatch(/notifyAdminListChanged\('join-requests',\s*`join_request_\$\{decision\}`/);
      expect(fn).toMatch(/notifyUserChanged\(userMatch\.rows\[0\]\.id,\s*`join_request_\$\{decision\}`/);
    });

    it('POST /join-requests/:id/note fans out note_updated', () => {
      const idx = joinRequestsRoute.indexOf("'/:id/note'");
      const fn = joinRequestsRoute.slice(idx, idx + 2000);
      expect(fn).toMatch(/notifyAdminListChanged\('join-requests',\s*'note_updated'/);
    });

    it('POST /join-requests/:id/poke fans out poked', () => {
      const idx = joinRequestsRoute.indexOf("'/:id/poke'");
      const end = joinRequestsRoute.indexOf("// ─── POST /join-requests/:id/message", idx);
      const fn = joinRequestsRoute.slice(idx, end > -1 ? end : idx + 2000);
      expect(fn).toMatch(/notifyAdminListChanged\('join-requests',\s*'poked'/);
    });

    it('POST /join-requests/bulk-poke fans out bulk_poked', () => {
      const idx = joinRequestsRoute.indexOf("'/bulk-poke'");
      const fn = joinRequestsRoute.slice(idx, idx + 2500);
      expect(fn).toMatch(/notifyAdminListChanged\('join-requests',\s*'bulk_poked'/);
    });
  });

  // ── pokes.ts route fanouts ─────────────────────────────────────────────

  describe('routes/pokes.ts — accept/decline pings sender + accepter', () => {
    it('POST /pokes/:id/accept fans out poke_accepted to both parties', () => {
      const idx = pokesRoute.indexOf("'/:id/accept'");
      const end = pokesRoute.indexOf("// POST /pokes/:id/decline", idx);
      const fn = pokesRoute.slice(idx, end > -1 ? end : idx + 2500);
      expect(fn).toMatch(/notifyUserChanged\(result\.poke\.senderId,\s*'poke_accepted'/);
      expect(fn).toMatch(/notifyUserChanged\(req\.user!\.userId,\s*'poke_accepted'/);
    });

    it('POST /pokes/:id/decline fans out poke_declined to both parties', () => {
      const idx = pokesRoute.indexOf("'/:id/decline'");
      const end = pokesRoute.indexOf("// GET /pokes/received", idx);
      const fn = pokesRoute.slice(idx, end > -1 ? end : idx + 2500);
      expect(fn).toMatch(/notifyUserChanged\(result\.senderId,\s*'poke_declined'/);
      expect(fn).toMatch(/notifyUserChanged\(req\.user!\.userId,\s*'poke_declined'/);
    });
  });

  // ── sessions.ts route fanouts ──────────────────────────────────────────

  describe('routes/sessions.ts — self-register / feedback / preferred-people', () => {
    it('POST /sessions/:id/register fans out participant_self_registered', () => {
      const idx = sessionsRoute.indexOf("router.post(\n  '/:id/register'");
      expect(idx).toBeGreaterThan(-1);
      const fn = sessionsRoute.slice(idx, idx + 3000);
      expect(fn).toMatch(/notifySessionListChanged\([\s\S]{0,200}'participant_self_registered'/);
    });

    it('DELETE /sessions/:id/register fans out participant_self_unregistered', () => {
      const idx = sessionsRoute.indexOf("router.delete(\n  '/:id/register'");
      expect(idx).toBeGreaterThan(-1);
      const fn = sessionsRoute.slice(idx, idx + 3000);
      expect(fn).toMatch(/notifySessionListChanged\([\s\S]{0,200}'participant_self_unregistered'/);
    });

    it('POST /sessions/:id/feedback fans out feedback_submitted', () => {
      const idx = sessionsRoute.indexOf("'/:id/feedback'");
      const end = sessionsRoute.indexOf("// ─── GET /sessions/:id/feedback", idx);
      const fn = sessionsRoute.slice(idx, end > -1 ? end : idx + 3500);
      expect(fn).toMatch(/notifySessionListChanged\([\s\S]{0,200}'feedback_submitted'/);
    });

    it('POST /sessions/:id/preferred-people pings the current user room', () => {
      const idx = sessionsRoute.indexOf("router.post(\n  '/:id/preferred-people'");
      expect(idx).toBeGreaterThan(-1);
      const fn = sessionsRoute.slice(idx, idx + 3000);
      expect(fn).toMatch(/notifyUserChanged\(req\.user!\.userId,\s*'preferred_people_updated'/);
    });

    it('DELETE /sessions/:id/permanent fans out BEFORE the hard delete', () => {
      const idx = sessionsRoute.indexOf("'/:id/permanent'");
      const fn = sessionsRoute.slice(idx, idx + 3000);
      expect(fn).toMatch(/notifySessionListChanged\([\s\S]{0,200}'session_hard_deleted'/);
      const notifyIdx = fn.indexOf("'session_hard_deleted'");
      const deleteIdx = fn.indexOf('sessionService.hardDeleteSession');
      expect(notifyIdx).toBeLessThan(deleteIdx);
    });
  });

  // ── reports.ts route fanouts ───────────────────────────────────────────

  describe('routes/reports.ts — submit / resolve / dismiss fan out violations scope', () => {
    it('POST /reports fans out report_submitted', () => {
      const idx = reportsRoute.indexOf("router.post(\n  '/',");
      expect(idx).toBeGreaterThan(-1);
      const fn = reportsRoute.slice(idx, idx + 2000);
      expect(fn).toMatch(/notifyAdminListChanged\('violations',\s*'report_submitted'/);
    });

    it('POST /reports/:id/resolve fans out report_resolved', () => {
      const idx = reportsRoute.indexOf("'/:id/resolve'");
      const end = reportsRoute.indexOf("// POST /reports/:id/dismiss", idx);
      const fn = reportsRoute.slice(idx, end > -1 ? end : idx + 2000);
      expect(fn).toMatch(/notifyAdminListChanged\('violations',\s*'report_resolved'/);
    });

    it('POST /reports/:id/dismiss fans out report_dismissed', () => {
      const idx = reportsRoute.indexOf("'/:id/dismiss'");
      const fn = reportsRoute.slice(idx, idx + 2000);
      expect(fn).toMatch(/notifyAdminListChanged\('violations',\s*'report_dismissed'/);
    });
  });

  // ── groups.ts route fanouts ────────────────────────────────────────────

  describe('routes/groups.ts — every mutating route fans out group:changed', () => {
    it('POST /groups fans out group_created', () => {
      const idx = groupsRoute.indexOf("router.post(\n  '/',");
      expect(idx).toBeGreaterThan(-1);
      const fn = groupsRoute.slice(idx, idx + 2500);
      expect(fn).toMatch(/notifyGroupChanged\(result\.id,\s*'group_created'/);
    });

    it('POST /groups/:id/messages fans out message_sent', () => {
      const idx = groupsRoute.indexOf("'/:id/messages'");
      const fn = groupsRoute.slice(idx, idx + 2500);
      expect(fn).toMatch(/notifyGroupChanged\(req\.params\.id,\s*'message_sent'/);
    });
  });
});
