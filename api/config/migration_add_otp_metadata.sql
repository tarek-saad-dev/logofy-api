-- Migration: Add metadata column to otp_codes table
-- This migration adds a JSONB column to store temporary registration data
-- Date: 2025-11-06

-- Add metadata column if it doesn't exist
ALTER TABLE otp_codes 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create index on metadata for better query performance
CREATE INDEX IF NOT EXISTS idx_otp_codes_metadata ON otp_codes USING GIN (metadata);

-- Add comment
COMMENT ON COLUMN otp_codes.metadata IS 'Stores temporary data (e.g., registration info) associated with the OTP';

