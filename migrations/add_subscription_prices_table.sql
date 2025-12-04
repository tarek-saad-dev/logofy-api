-- Migration: Add Subscription Prices Table
-- This migration adds a table to store active subscription prices for the mobile app
-- Date: 2025

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- SUBSCRIPTION PRICES TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS subscription_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_price DECIMAL(10, 2) NOT NULL CHECK (monthly_price >= 0),
  yearly_price DECIMAL(10, 2) NOT NULL CHECK (yearly_price >= 0),
  trial_days INTEGER NOT NULL DEFAULT 0 CHECK (trial_days >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  stripe_monthly_price_id VARCHAR(255),
  stripe_yearly_price_id VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Index for active price lookups
CREATE INDEX IF NOT EXISTS idx_subscription_prices_active
  ON subscription_prices(is_active) WHERE is_active = TRUE;

-- ==============================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON TABLE subscription_prices IS 'Stores active subscription prices for mobile app display';
COMMENT ON COLUMN subscription_prices.id IS 'Primary key UUID';
COMMENT ON COLUMN subscription_prices.monthly_price IS 'Monthly subscription price in the specified currency';
COMMENT ON COLUMN subscription_prices.yearly_price IS 'Yearly subscription price in the specified currency';
COMMENT ON COLUMN subscription_prices.trial_days IS 'Number of trial days for new subscriptions';
COMMENT ON COLUMN subscription_prices.currency IS 'Currency code (e.g., USD, EGP, EUR)';
COMMENT ON COLUMN subscription_prices.stripe_monthly_price_id IS 'Stripe price ID for monthly subscription';
COMMENT ON COLUMN subscription_prices.stripe_yearly_price_id IS 'Stripe price ID for yearly subscription';
COMMENT ON COLUMN subscription_prices.is_active IS 'Whether this price configuration is currently active';
COMMENT ON COLUMN subscription_prices.created_at IS 'Timestamp when price record was created';
COMMENT ON COLUMN subscription_prices.updated_at IS 'Timestamp when price record was last updated';

-- ==============================================
-- TRIGGER FOR UPDATED_AT
-- ==============================================

-- Function to update updated_at timestamp (if not already exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_subscription_prices_updated_at ON subscription_prices;
CREATE TRIGGER update_subscription_prices_updated_at
  BEFORE UPDATE ON subscription_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- INITIAL DATA (Optional - can be inserted via API)
-- ==============================================

-- Insert a default active price configuration if none exists
-- This ensures the GET endpoint always returns data
INSERT INTO subscription_prices (
  monthly_price,
  yearly_price,
  trial_days,
  currency,
  stripe_monthly_price_id,
  stripe_yearly_price_id,
  is_active
) 
SELECT 
  0.00,
  0.00,
  0,
  'USD',
  NULL,
  NULL,
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM subscription_prices WHERE is_active = TRUE
);

