-- Migration: Add Weekly Price Columns to Subscription Prices Table
-- This migration adds weekly_price and stripe_weekly_price_id columns
-- Date: 2025

-- Add weekly_price column
ALTER TABLE subscription_prices
ADD COLUMN IF NOT EXISTS weekly_price DECIMAL(10, 2) CHECK (weekly_price >= 0);

-- Add stripe_weekly_price_id column
ALTER TABLE subscription_prices
ADD COLUMN IF NOT EXISTS stripe_weekly_price_id VARCHAR(255);

-- Add comments for documentation
COMMENT ON COLUMN subscription_prices.weekly_price IS 'Weekly subscription price in the specified currency';
COMMENT ON COLUMN subscription_prices.stripe_weekly_price_id IS 'Stripe price ID for weekly subscription';

