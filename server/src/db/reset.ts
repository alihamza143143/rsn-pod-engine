// ─── Database Reset Script ───────────────────────────────────────────────────
// Drops ALL tables and reruns migrations + seed from scratch.
// Usage: npx ts-node src/db/reset.ts

import { pool } from './index';
import logger from '../config/logger';

async function reset(): Promise<void> {
  const client = await pool.connect();
  try {
    logger.info('Dropping all tables...');

    // Drop all tables in one transaction
    await client.query('BEGIN');

    // Drop tables in reverse dependency order
    await client.query(`
      DROP TABLE IF EXISTS audit_log CASCADE;
      DROP TABLE IF EXISTS user_entitlements CASCADE;
      DROP TABLE IF EXISTS user_subscriptions CASCADE;
      DROP TABLE IF EXISTS join_requests CASCADE;
      DROP TABLE IF EXISTS invites CASCADE;
      DROP TABLE IF EXISTS encounter_history CASCADE;
      DROP TABLE IF EXISTS ratings CASCADE;
      DROP TABLE IF EXISTS matches CASCADE;
      DROP TABLE IF EXISTS session_participants CASCADE;
      DROP TABLE IF EXISTS sessions CASCADE;
      DROP TABLE IF EXISTS pod_members CASCADE;
      DROP TABLE IF EXISTS pods CASCADE;
      DROP TABLE IF EXISTS refresh_tokens CASCADE;
      DROP TABLE IF EXISTS magic_links CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS _migrations CASCADE;
    `);

    // Drop all custom ENUM types
    await client.query(`
      DROP TYPE IF EXISTS user_role CASCADE;
      DROP TYPE IF EXISTS user_status CASCADE;
      DROP TYPE IF EXISTS pod_type CASCADE;
      DROP TYPE IF EXISTS orchestration_mode CASCADE;
      DROP TYPE IF EXISTS communication_mode CASCADE;
      DROP TYPE IF EXISTS pod_visibility CASCADE;
      DROP TYPE IF EXISTS pod_status CASCADE;
      DROP TYPE IF EXISTS pod_member_role CASCADE;
      DROP TYPE IF EXISTS pod_member_status CASCADE;
      DROP TYPE IF EXISTS session_status CASCADE;
      DROP TYPE IF EXISTS participant_status CASCADE;
      DROP TYPE IF EXISTS match_status CASCADE;
      DROP TYPE IF EXISTS invite_status CASCADE;
      DROP TYPE IF EXISTS invite_type CASCADE;
      DROP TYPE IF EXISTS subscription_plan CASCADE;
      DROP TYPE IF EXISTS subscription_status CASCADE;
      DROP TYPE IF EXISTS join_request_status CASCADE;
    `);

    await client.query('COMMIT');
    logger.info('All tables and types dropped successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Failed to drop tables');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

reset()
  .then(() => {
    console.log('Database reset complete. Run migrations and seed next.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Database reset failed:', err);
    process.exit(1);
  });
