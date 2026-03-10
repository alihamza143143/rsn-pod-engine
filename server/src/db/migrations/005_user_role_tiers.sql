-- Migration: 005_user_role_tiers
-- Description: Add user role tiers (super_admin, founding_member, pro, free)

-- Add new values to the user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'founding_member';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'pro';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'free';
