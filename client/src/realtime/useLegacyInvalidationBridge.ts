// ─── Legacy invalidation bridge ──────────────────────────────────────────────
//
// Bug 32 (19 May Ali) — until every server emit migrates to the generic
// `entity:changed` channel handled by `useEntityChangedHandler`, the
// pre-existing bespoke socket events (`pod:membership_updated`,
// `session:list_changed`, `notification:new`) still need to invalidate the
// React-Query caches that the app's UI reads from.
//
// Previously these listeners lived in `NotificationBell.tsx`. The bell only
// mounts inside `AppLayout`, which means live-event pages, `/invite/:code`,
// `/login`, and onboarding all rendered OUTSIDE the layout — so users sitting
// on those pages received the socket broadcast but no React-Query cache
// reacted, and any subsequent navigation showed stale data.
//
// This bridge moves the invalidation logic to the App root. The bell keeps
// its OWN local-state listener for `notification:new` (because it mutates
// the bell's component state, not the query cache); everything cache-shaped
// belongs here.
//
// Forward-looking event stubs (`admin:list_changed`, `user:profile_changed`,
// `notification:list_changed`) are wired up here even though the server
// hasn't started emitting them yet. They're harmless until the parallel
// server work lands; this avoids a second round-trip across the two
// subagents.

import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';

/** Every admin-* React-Query key the client uses today. */
const ADMIN_QUERY_KEYS = [
  'admin-users',
  'admin-pods',
  'admin-sessions',
  'admin-violations',
  'admin-join-requests',
  'admin-support-tickets',
  'admin-stats',
  'admin-recent-matches',
  // The admin-analytics-* family. Each chart has its own key; we invalidate
  // by prefix so future charts inherit the behaviour without code changes.
  'admin-analytics',
  'admin-analytics-overview',
  'admin-analytics-funnel',
  'admin-analytics-retention',
  'admin-analytics-engagement',
  'admin-analytics-revenue',
  'admin-analytics-events',
] as const;

function invalidateAllAdminKeys(qc: QueryClient): void {
  for (const key of ADMIN_QUERY_KEYS) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}

function invalidateAdminScope(qc: QueryClient, scope: string | undefined): void {
  if (!scope) {
    invalidateAllAdminKeys(qc);
    return;
  }
  // Match either the exact key (`admin-users`) or the prefix family
  // (`admin-analytics` → every `admin-analytics-*` variant).
  const target = scope.startsWith('admin-') ? scope : `admin-${scope}`;
  for (const key of ADMIN_QUERY_KEYS) {
    if (key === target || key.startsWith(`${target}-`)) {
      qc.invalidateQueries({ queryKey: [key] });
    }
  }
}

export function useLegacyInvalidationBridge(): void {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // ── notification:new ────────────────────────────────────────────────
    // The invitee receives this when an invite is sent directly to them
    // (single-recipient fan-out from the invite service). The bell mutates
    // its own list-state on this same event; what we own here is the
    // received-invites cache so any open list page repaints live.
    const notificationNewHandler = () => {
      qc.invalidateQueries({ queryKey: ['received-invites'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    };
    socket.on('notification:new', notificationNewHandler);

    // ── pod:membership_updated ──────────────────────────────────────────
    // Pod approval / rejection / removal. Touches: the pod listing
    // surfaces, the invite-list surfaces (an approved invite flips state),
    // the user's own profile-derived queries, and every adjacent feature
    // whose visibility depends on pod membership (DMs, blocks, can-
    // message, encounters, host-state).
    const membershipHandler = () => {
      // Pod listing + detail surfaces.
      qc.invalidateQueries({ queryKey: ['my-pods'] });
      qc.invalidateQueries({ queryKey: ['pod'] });
      qc.invalidateQueries({ queryKey: ['pod-members'] });
      qc.invalidateQueries({ queryKey: ['pod-member-counts'] });
      qc.invalidateQueries({ queryKey: ['pod-pending-members'] });
      qc.invalidateQueries({ queryKey: ['pod-pending-invites'] });
      qc.invalidateQueries({ queryKey: ['pod-session-count'] });
      qc.invalidateQueries({ queryKey: ['pod-sessions'] });
      qc.invalidateQueries({ queryKey: ['pod-members-for-invite'] });
      // Inviter + invitee invite-list surfaces.
      qc.invalidateQueries({ queryKey: ['received-invites'] });
      qc.invalidateQueries({ queryKey: ['my-invites'] });
      // User-derived caches that read from membership state.
      qc.invalidateQueries({ queryKey: ['user-block-status'] });
      qc.invalidateQueries({ queryKey: ['blocked-users'] });
      qc.invalidateQueries({ queryKey: ['can-message'] });
      qc.invalidateQueries({ queryKey: ['notification-prefs'] });
      qc.invalidateQueries({ queryKey: ['my-support-tickets'] });
      qc.invalidateQueries({ queryKey: ['encounters'] });
      qc.invalidateQueries({ queryKey: ['dm-conversations'] });
      qc.invalidateQueries({ queryKey: ['dm-groups'] });
      qc.invalidateQueries({ queryKey: ['dm-unread-count'] });
      qc.invalidateQueries({ queryKey: ['host-state'] });
      // Notification list (the approval/rejection notification itself).
      qc.invalidateQueries({ queryKey: ['notifications'] });
      // The full admin surface — a membership flip can change admin
      // counts, pending-join-request lists, etc.
      invalidateAllAdminKeys(qc);
    };
    socket.on('pod:membership_updated', membershipHandler);

    // ── session:list_changed ────────────────────────────────────────────
    // A session was created, started, ended, or its participant list /
    // invite list mutated.
    const sessionListHandler = () => {
      qc.invalidateQueries({ queryKey: ['my-sessions'] });
      qc.invalidateQueries({ queryKey: ['pod-sessions'] });
      qc.invalidateQueries({ queryKey: ['pod-session-count'] });
      qc.invalidateQueries({ queryKey: ['session'] });
      qc.invalidateQueries({ queryKey: ['session-detail'] });
      qc.invalidateQueries({ queryKey: ['session-participants'] });
      qc.invalidateQueries({ queryKey: ['session-participant-counts'] });
      qc.invalidateQueries({ queryKey: ['session-pending-invites'] });
      qc.invalidateQueries({ queryKey: ['received-invites'] });
      qc.invalidateQueries({ queryKey: ['my-invites'] });
    };
    socket.on('session:list_changed', sessionListHandler);

    // ── Forward-looking stubs ───────────────────────────────────────────
    // These events are not in the typed `ServerToClientEvents` contract
    // yet — the server-side subagent is adding them in parallel. Cast
    // through `any` at the listener boundary so the typecheck stays clean
    // until the shared types catch up. Harmless until the server emits.

    const userProfileChangedHandler = (data: { userId?: string } = {}) => {
      if (data.userId) {
        qc.invalidateQueries({ queryKey: ['user', data.userId] });
      }
      qc.invalidateQueries({ queryKey: ['user-block-status'] });
      qc.invalidateQueries({ queryKey: ['blocked-users'] });
      qc.invalidateQueries({ queryKey: ['can-message'] });
      qc.invalidateQueries({ queryKey: ['notification-prefs'] });
    };

    const adminListChangedHandler = (data: { scope?: string } = {}) => {
      invalidateAdminScope(qc, data.scope);
    };

    const notificationListChangedHandler = () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['received-invites'] });
      qc.invalidateQueries({ queryKey: ['my-invites'] });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const untypedSocket = socket as any;
    untypedSocket.on('user:profile_changed', userProfileChangedHandler);
    untypedSocket.on('admin:list_changed', adminListChangedHandler);
    untypedSocket.on('notification:list_changed', notificationListChangedHandler);

    return () => {
      socket.off('notification:new', notificationNewHandler);
      socket.off('pod:membership_updated', membershipHandler);
      socket.off('session:list_changed', sessionListHandler);
      untypedSocket.off('user:profile_changed', userProfileChangedHandler);
      untypedSocket.off('admin:list_changed', adminListChangedHandler);
      untypedSocket.off('notification:list_changed', notificationListChangedHandler);
    };
  }, [qc]);
}
