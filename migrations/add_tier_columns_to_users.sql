-- Migration: Add Tier Columns to Users Table
-- This migration adds tier and tier_expires_at columns for manual trial system
-- Date: 2025

-- ==============================================
-- ADD TIER COLUMNS TO USERS TABLE
-- ==============================================

-- Add tier column (TEXT, nullable) - can be 'trial', 'pro', 'guest', etc.
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS tier TEXT;

-- Add tier_expires_at column (TIMESTAMPTZ, nullable) - expiration date for trial
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS tier_expires_at TIMESTAMPTZ;

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Index for querying active trials
CREATE INDEX IF NOT EXISTS idx_users_tier_expires_at 
ON users(tier, tier_expires_at) 
WHERE tier = 'trial' AND tier_expires_at IS NOT NULL;

-- ==============================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON COLUMN users.tier IS 'User tier: trial, pro, guest, etc. Used for manual trial system';
COMMENT ON COLUMN users.tier_expires_at IS 'Expiration date for trial tier. NULL if tier is not trial or has no expiration';

