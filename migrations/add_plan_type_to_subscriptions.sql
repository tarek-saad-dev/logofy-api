-- Migration: Add plan_type column to subscriptions table
-- This migration adds a plan_type column to store the subscription billing interval (weekly, monthly, yearly)
-- Date: 2025

-- Add plan_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'plan_type'
    ) THEN
        ALTER TABLE subscriptions 
        ADD COLUMN plan_type VARCHAR(20) NULL;
        
        COMMENT ON COLUMN subscriptions.plan_type IS 'Subscription billing interval: weekly, monthly, or yearly';
    END IF;
END $$;












