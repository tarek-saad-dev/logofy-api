-- Migration: Change Price Columns from DECIMAL to VARCHAR (STRING)
-- This migration converts all price columns to store prices as strings
-- Date: 2025

-- ==============================================
-- REMOVE OLD CHECK CONSTRAINTS FIRST
-- ==============================================
-- Must remove constraints BEFORE changing column types

ALTER TABLE subscription_prices
DROP CONSTRAINT IF EXISTS subscription_prices_weekly_price_check;

ALTER TABLE subscription_prices
DROP CONSTRAINT IF EXISTS subscription_prices_weekly_price_ar_check;

ALTER TABLE subscription_prices
DROP CONSTRAINT IF EXISTS subscription_prices_monthly_price_check;

ALTER TABLE subscription_prices
DROP CONSTRAINT IF EXISTS subscription_prices_monthly_price_ar_check;

ALTER TABLE subscription_prices
DROP CONSTRAINT IF EXISTS subscription_prices_yearly_price_check;

ALTER TABLE subscription_prices
DROP CONSTRAINT IF EXISTS subscription_prices_yearly_price_ar_check;

-- Also try to drop any constraints that might have different names
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'subscription_prices'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%price%'
    ) LOOP
        EXECUTE 'ALTER TABLE subscription_prices DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- ==============================================
-- CONVERT PRICE COLUMNS TO VARCHAR
-- ==============================================

-- Convert weekly_price to VARCHAR
ALTER TABLE subscription_prices
ALTER COLUMN weekly_price TYPE VARCHAR(50) USING CASE 
    WHEN weekly_price IS NULL THEN NULL 
    ELSE weekly_price::text 
END;

-- Convert weekly_price_ar to VARCHAR
ALTER TABLE subscription_prices
ALTER COLUMN weekly_price_ar TYPE VARCHAR(50) USING CASE 
    WHEN weekly_price_ar IS NULL THEN NULL 
    ELSE weekly_price_ar::text 
END;

-- Convert monthly_price to VARCHAR
ALTER TABLE subscription_prices
ALTER COLUMN monthly_price TYPE VARCHAR(50) USING CASE 
    WHEN monthly_price IS NULL THEN NULL 
    ELSE monthly_price::text 
END;

-- Convert monthly_price_ar to VARCHAR
ALTER TABLE subscription_prices
ALTER COLUMN monthly_price_ar TYPE VARCHAR(50) USING CASE 
    WHEN monthly_price_ar IS NULL THEN NULL 
    ELSE monthly_price_ar::text 
END;

-- Convert yearly_price to VARCHAR
ALTER TABLE subscription_prices
ALTER COLUMN yearly_price TYPE VARCHAR(50) USING CASE 
    WHEN yearly_price IS NULL THEN NULL 
    ELSE yearly_price::text 
END;

-- Convert yearly_price_ar to VARCHAR
ALTER TABLE subscription_prices
ALTER COLUMN yearly_price_ar TYPE VARCHAR(50) USING CASE 
    WHEN yearly_price_ar IS NULL THEN NULL 
    ELSE yearly_price_ar::text 
END;

-- Update comments to reflect string storage
COMMENT ON COLUMN subscription_prices.weekly_price IS 'Weekly subscription price as string (e.g., "24.99")';
COMMENT ON COLUMN subscription_prices.weekly_price_ar IS 'Weekly subscription price in Arabic as string (e.g., "24.99")';
COMMENT ON COLUMN subscription_prices.monthly_price IS 'Monthly subscription price as string (e.g., "97.99")';
COMMENT ON COLUMN subscription_prices.monthly_price_ar IS 'Monthly subscription price in Arabic as string (e.g., "97.99")';
COMMENT ON COLUMN subscription_prices.yearly_price IS 'Yearly subscription price as string (e.g., "999.99")';
COMMENT ON COLUMN subscription_prices.yearly_price_ar IS 'Yearly subscription price in Arabic as string (e.g., "999.99")';
