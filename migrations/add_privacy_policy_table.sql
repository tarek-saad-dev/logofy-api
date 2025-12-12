-- Migration: Add Privacy Policy Table
-- This migration adds a table to store privacy policy content with multilingual support (EN/AR)
-- Date: 2025

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- PRIVACY POLICY TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS privacy_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_en TEXT NOT NULL,
  content_ar TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Index for active policy lookups
CREATE INDEX IF NOT EXISTS idx_privacy_policy_active
  ON privacy_policy(is_active) WHERE is_active = TRUE;

-- Index for version lookups
CREATE INDEX IF NOT EXISTS idx_privacy_policy_version
  ON privacy_policy(version);

-- ==============================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON TABLE privacy_policy IS 'Stores privacy policy content with multilingual support (English and Arabic)';
COMMENT ON COLUMN privacy_policy.id IS 'Primary key UUID';
COMMENT ON COLUMN privacy_policy.content_en IS 'Privacy policy content in English';
COMMENT ON COLUMN privacy_policy.content_ar IS 'Privacy policy content in Arabic (وسياسة الخصوصيه)';
COMMENT ON COLUMN privacy_policy.version IS 'Version number of the privacy policy';
COMMENT ON COLUMN privacy_policy.is_active IS 'Whether this privacy policy version is currently active';
COMMENT ON COLUMN privacy_policy.created_at IS 'Timestamp when privacy policy record was created';
COMMENT ON COLUMN privacy_policy.updated_at IS 'Timestamp when privacy policy record was last updated';

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
DROP TRIGGER IF EXISTS update_privacy_policy_updated_at ON privacy_policy;
CREATE TRIGGER update_privacy_policy_updated_at
  BEFORE UPDATE ON privacy_policy
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- INITIAL DATA (Optional - can be inserted via API)
-- ==============================================

-- Insert a default active privacy policy if none exists
-- This ensures the GET endpoint always returns data
INSERT INTO privacy_policy (
  content_en,
  content_ar,
  version,
  is_active
) 
SELECT 
  'This is the default privacy policy. Please update it with your actual privacy policy content.',
  'هذه هي سياسة الخصوصية الافتراضية. يرجى تحديثها بمحتوى سياسة الخصوصية الفعلي.',
  1,
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM privacy_policy WHERE is_active = TRUE
);





