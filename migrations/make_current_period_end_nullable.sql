-- Migration: Make current_period_end nullable
-- This migration allows current_period_end to be NULL temporarily
-- while we fix the Stripe subscription retrieval logic
-- Date: 2025

-- Make current_period_end nullable (remove NOT NULL constraint if it exists)
ALTER TABLE subscriptions
ALTER COLUMN current_period_end DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN subscriptions.current_period_end IS 
'Temporary: NULL allowed while fixing Stripe subscription retrieval. Will be populated with actual period end dates once logic is corrected.';

