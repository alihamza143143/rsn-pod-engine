// ─── Connected-Users Invite Search ───────────────────────────────────────────
import { query } from '../../db';

export interface ConnectedUserResult {
  id: string;
  display_name: string | null;
  email: string;
  company: string | null;
  job_title: string | null;
  industry: string | null;
  avatar_url: string | null;
}

/**
 * Search for users the requester has previously interacted with via encounter_history.
 *
 * "Connected" = exists a row in encounter_history where the requester and target user
 * are the two participants (in either order). This models "people I've met at past
 * RSN events" — the platform's native notion of connection.
 *
 * Used by pod/session invite modals so inviters can only invite people they know,
 * not random searchable strangers. Non-admin callers get filtered results; admin
 * moderation flows continue to use the unfiltered /users/search endpoint.
 */
export async function searchConnectedUsers(
  requesterId: string,
  searchTerm: string,
  limit = 20,
): Promise<ConnectedUserResult[]> {
  const q = searchTerm.trim().toLowerCase();
  const result = await query<ConnectedUserResult>(
    `SELECT DISTINCT u.id, u.display_name, u.email, u.company, u.job_title, u.industry, u.avatar_url
     FROM users u
     WHERE u.status = 'active'
       AND u.id != $1
       AND EXISTS (
         SELECT 1 FROM encounter_history eh
         WHERE (eh.user_a_id = $1 AND eh.user_b_id = u.id)
            OR (eh.user_b_id = $1 AND eh.user_a_id = u.id)
       )
       AND (
         LOWER(COALESCE(u.display_name, '')) LIKE $2
         OR LOWER(u.email) LIKE $2
         OR LOWER(COALESCE(u.first_name, '')) LIKE $2
         OR LOWER(COALESCE(u.last_name, '')) LIKE $2
       )
     ORDER BY u.display_name
     LIMIT $3`,
    [requesterId, `%${q}%`, limit],
  );
  return result.rows;
}
