-- Migration: Add UNIQUE constraint on stripe_sub_id
-- This migration adds a UNIQUE constraint to prevent duplicate Stripe subscription IDs
-- Date: 2025

-- Add UNIQUE constraint on stripe_sub_id
-- This allows ON CONFLICT (stripe_sub_id) to work in INSERT ... ON CONFLICT queries
ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_stripe_sub_id_key UNIQUE (stripe_sub_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT subscriptions_stripe_sub_id_key ON subscriptions IS 
'Ensures each Stripe subscription ID is unique, enabling ON CONFLICT upserts';

