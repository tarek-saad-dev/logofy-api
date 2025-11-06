-- Migration: Update OTP Type Constraint to Include 'register'
-- This migration updates the check constraint to allow 'register' type for OTP codes
-- Date: 2025-11-06

-- Drop the existing constraint
ALTER TABLE otp_codes DROP CONSTRAINT IF EXISTS chk_otp_type;

-- Add the new constraint with 'register' type included
ALTER TABLE otp_codes ADD CONSTRAINT chk_otp_type 
    CHECK (type IN ('login', 'reset_password', 'register'));

-- Update the comment to reflect the new type
COMMENT ON COLUMN otp_codes.type IS 'Type of OTP: login, reset_password, or register';

