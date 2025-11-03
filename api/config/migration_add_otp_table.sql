-- Migration: Add OTP Codes Table
-- This migration adds a table for storing OTP verification codes
-- Date: 2024

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- OTP CODES TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code VARCHAR(6) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'login', -- 'login' or 'reset_password'
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used BOOLEAN DEFAULT FALSE,
  CONSTRAINT chk_otp_type CHECK (type IN ('login', 'reset_password'))
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_email_type ON otp_codes(email, type);
CREATE INDEX IF NOT EXISTS idx_otp_codes_code ON otp_codes(code);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_codes_created_at ON otp_codes(created_at);

-- ==============================================
-- CLEANUP FUNCTION
-- ==============================================

-- Function to automatically clean up expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_codes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- COMMENTS
-- ==============================================

COMMENT ON TABLE otp_codes IS 'Stores OTP verification codes for login and password reset';
COMMENT ON COLUMN otp_codes.type IS 'Type of OTP: login or reset_password';
COMMENT ON COLUMN otp_codes.expires_at IS 'OTP expiration timestamp';
COMMENT ON COLUMN otp_codes.used IS 'Whether the OTP has been used';

