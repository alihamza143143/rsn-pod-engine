-- Migration 046: Extend notifications.type to include direct_message
-- (Phase C of chat-fix-and-dm-system, 1 May 2026)
--
-- Migration 025 created notifications with a CHECK constraint allowing only
-- 'event_invite' and 'pod_invite'. We extend the allowed set so the DM
-- system can push a notification on each new DM (used by the bell icon).

BEGIN;

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('event_invite', 'pod_invite', 'direct_message'));

COMMIT;
