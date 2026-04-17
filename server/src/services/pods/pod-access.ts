// ─── Pod Access Control ──────────────────────────────────────────────────────
// Read-access gate for pod detail endpoints. Private pods are hidden from
// non-members — callers should treat a `false` result as 404 (don't leak
// existence, mirroring GitHub private-repo UX).

import { query } from '../../db';

/**
 * Determines if a user can view a pod's details.
 *
 * Rules (short-circuit in order):
 *   1. Admin / super_admin → allowed
 *   2. Pod member → allowed
 *   3. Pod is public / public_with_approval / request_to_join / invite_only → allowed (overview discoverable)
 *   4. Pod is private → denied (caller should return 404, don't leak existence)
 *   5. Pod doesn't exist → denied
 */
export async function canViewPod(
  userId: string,
  podId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === 'admin' || userRole === 'super_admin') return true;

  const podRes = await query<{ visibility: string }>(
    `SELECT visibility FROM pods WHERE id = $1`,
    [podId],
  );
  if (podRes.rows.length === 0) return false;
  const visibility = podRes.rows[0].visibility;

  const memRes = await query<{ role: string }>(
    `SELECT role FROM pod_members WHERE pod_id = $1 AND user_id = $2 LIMIT 1`,
    [podId, userId],
  );
  if (memRes.rows.length > 0) return true;

  // Non-members — public-family visibilities are discoverable
  const publicVisibilities = ['public', 'public_with_approval', 'request_to_join', 'invite_only'];
  if (publicVisibilities.includes(visibility)) return true;

  // private → denied
  return false;
}
