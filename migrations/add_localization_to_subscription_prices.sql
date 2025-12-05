-- Migration: Add Localization Support to Subscription Prices
-- This migration adds Arabic price columns and creates plan_types table for multilingual plan names
-- Date: 2025

-- ==============================================
-- ADD ARABIC PRICE COLUMNS TO SUBSCRIPTION_PRICES
-- ==============================================

-- Add Arabic price columns
ALTER TABLE subscription_prices
ADD COLUMN IF NOT EXISTS weekly_price_ar DECIMAL(10, 2) CHECK (weekly_price_ar >= 0);

ALTER TABLE subscription_prices
ADD COLUMN IF NOT EXISTS monthly_price_ar DECIMAL(10, 2) CHECK (monthly_price_ar >= 0);

ALTER TABLE subscription_prices
ADD COLUMN IF NOT EXISTS yearly_price_ar DECIMAL(10, 2) CHECK (yearly_price_ar >= 0);

-- Add comments for Arabic price columns
COMMENT ON COLUMN subscription_prices.weekly_price_ar IS 'Weekly subscription price in Arabic (localized)';
COMMENT ON COLUMN subscription_prices.monthly_price_ar IS 'Monthly subscription price in Arabic (localized)';
COMMENT ON COLUMN subscription_prices.yearly_price_ar IS 'Yearly subscription price in Arabic (localized)';

-- Add currency localization columns
ALTER TABLE subscription_prices
ADD COLUMN IF NOT EXISTS currency_name_en VARCHAR(255);

ALTER TABLE subscription_prices
ADD COLUMN IF NOT EXISTS currency_name_ar VARCHAR(255);

-- Add comments for currency localization columns
COMMENT ON COLUMN subscription_prices.currency_name_en IS 'Currency name in English (e.g., "US Dollar", "Emirati Dirham")';
COMMENT ON COLUMN subscription_prices.currency_name_ar IS 'Currency name in Arabic (e.g., "دولار أمريكي", "درهم إماراتي")';

-- ==============================================
-- CREATE PLAN_TYPES TABLE FOR MULTILINGUAL PLAN NAMES
-- ==============================================

CREATE TABLE IF NOT EXISTS plan_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'pro', 'guest', 'trial', 'free_trial'
  name_en VARCHAR(255) NOT NULL, -- English name: 'Pro', 'Guest', 'Free Trial'
  name_ar VARCHAR(255) NOT NULL, -- Arabic name: 'احترافي', 'ضيف', 'تجربة مجانية'
  description_en TEXT,
  description_ar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for plan_key lookups
CREATE INDEX IF NOT EXISTS idx_plan_types_key ON plan_types(plan_key);
CREATE INDEX IF NOT EXISTS idx_plan_types_active ON plan_types(is_active) WHERE is_active = TRUE;

-- Add comments
COMMENT ON TABLE plan_types IS 'Stores multilingual plan type names (Pro, Guest, Trial, etc.)';
COMMENT ON COLUMN plan_types.plan_key IS 'Unique identifier for plan type (pro, guest, trial, free_trial)';
COMMENT ON COLUMN plan_types.name_en IS 'English name of the plan type';
COMMENT ON COLUMN plan_types.name_ar IS 'Arabic name of the plan type';
COMMENT ON COLUMN plan_types.description_en IS 'English description of the plan type';
COMMENT ON COLUMN plan_types.description_ar IS 'Arabic description of the plan type';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_plan_types_updated_at ON plan_types;
CREATE TRIGGER update_plan_types_updated_at
  BEFORE UPDATE ON plan_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- INSERT DEFAULT PLAN TYPES
-- ==============================================

-- Insert default plan types if they don't exist
INSERT INTO plan_types (plan_key, name_en, name_ar, description_en, description_ar, is_active)
VALUES 
  ('pro', 'Pro', 'احترافي', 'Professional subscription plan with full features', 'خطة الاشتراك الاحترافية مع جميع الميزات', TRUE),
  ('guest', 'Guest', 'ضيف', 'Guest user with limited access', 'مستخدم ضيف مع وصول محدود', TRUE),
  ('trial', 'Trial', 'تجربة', 'Trial subscription period', 'فترة تجربة الاشتراك', TRUE),
  ('free_trial', 'Free Trial', 'تجربة مجانية', 'Free trial period for new users', 'فترة تجربة مجانية للمستخدمين الجدد', TRUE)
ON CONFLICT (plan_key) DO NOTHING;
