-- Migration: 008_set_super_admin_sa
-- Description: Promote sa@mister-raw.com to super_admin role

UPDATE users SET role = 'super_admin', updated_at = NOW()
WHERE LOWER(email) = LOWER('sa@mister-raw.com');
