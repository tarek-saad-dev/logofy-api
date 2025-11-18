-- Migration: Add Subscriptions Table
-- This migration adds a table to store user subscription information from Stripe
-- Date: 2025

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- SUBSCRIPTION STATUS ENUM TYPE
-- ==============================================

CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled');

-- ==============================================
-- SUBSCRIPTIONS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(100) NOT NULL,
  stripe_sub_id VARCHAR(100) NOT NULL,
  status subscription_status NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Composite index for user queries with status filtering
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
  ON subscriptions(user_id, status);

-- Composite index for user queries with period end filtering
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_period_end
  ON subscriptions(user_id, current_period_end);

-- Index on stripe_sub_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id
  ON subscriptions(stripe_sub_id);

-- Index on stripe_customer_id for customer lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id
  ON subscriptions(stripe_customer_id);

-- ==============================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON TABLE subscriptions IS 'Stores user subscription information from Stripe';
COMMENT ON COLUMN subscriptions.id IS 'Primary key UUID';
COMMENT ON COLUMN subscriptions.user_id IS 'Foreign key reference to users table';
COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'Stripe customer ID';
COMMENT ON COLUMN subscriptions.stripe_sub_id IS 'Stripe subscription ID';
COMMENT ON COLUMN subscriptions.status IS 'Subscription status: active, trialing, past_due, or canceled';
COMMENT ON COLUMN subscriptions.current_period_end IS 'End date of current subscription period';
COMMENT ON COLUMN subscriptions.canceled_at IS 'Timestamp when subscription was canceled (NULL if active)';
COMMENT ON COLUMN subscriptions.created_at IS 'Timestamp when subscription record was created';
COMMENT ON COLUMN subscriptions.updated_at IS 'Timestamp when subscription record was last updated';

