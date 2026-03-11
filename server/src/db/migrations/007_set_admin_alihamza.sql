-- Migration: 007_set_super_admin_alihamza
-- Description: Promote alihamza891840@gmail.com to super_admin role

UPDATE users SET role = 'super_admin', updated_at = NOW()
WHERE LOWER(email) = LOWER('alihamza891840@gmail.com');
