// ─── Session Access Control ──────────────────────────────────────────────────
// Read-access gate for session detail endpoints. Prevents metadata leaks to
// authenticated users who are neither participants nor pod members.

import { query } from '../../db';

/**
 * Determines if a user is allowed to view a session's details.
 *
 * Rules (short-circuit in order):
 *   1. Admin / super_admin → allowed
 *   2. Session host → allowed
 *   3. Registered participant (status != 'removed') → allowed
 *   4. Pod member → allowed
 *   5. Pod is public → allowed to any authenticated user (discovery)
 *   6. Else → denied
 *
 * Callers that need more nuance (e.g. write permissions) should add their own
 * checks on top of this read-access gate.
 */
export async function canViewSession(
  userId: string,
  sessionId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === 'admin' || userRole === 'super_admin') return true;

  const sessRes = await query<{
    host_user_id: string;
    pod_id: string | null;
    pod_visibility: string | null;
  }>(
    `SELECT s.host_user_id, s.pod_id, p.visibility AS pod_visibility
     FROM sessions s
     LEFT JOIN pods p ON p.id = s.pod_id
     WHERE s.id = $1`,
    [sessionId],
  );
  if (sessRes.rows.length === 0) return false;
  const s = sessRes.rows[0];

  if (s.host_user_id === userId) return true;

  const partRes = await query<{ status: string }>(
    `SELECT status FROM session_participants WHERE session_id = $1 AND user_id = $2 LIMIT 1`,
    [sessionId, userId],
  );
  if (partRes.rows.length > 0 && partRes.rows[0].status !== 'removed') return true;

  if (s.pod_id) {
    const memRes = await query<{ role: string }>(
      `SELECT role FROM pod_members WHERE pod_id = $1 AND user_id = $2 LIMIT 1`,
      [s.pod_id, userId],
    );
    if (memRes.rows.length > 0) return true;
    if (s.pod_visibility === 'public') return true;
  }

  return false;
}
