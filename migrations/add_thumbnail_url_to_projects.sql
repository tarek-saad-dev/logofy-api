-- Migration: Add thumbnail_url to Projects Table
-- This migration adds a thumbnail_url column to store project-specific thumbnails
-- Date: 2025

-- ==============================================
-- ADD THUMBNAIL_URL COLUMN TO PROJECTS
-- ==============================================

-- Add thumbnail_url column (nullable, as projects may use logo thumbnail as fallback)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add comment
COMMENT ON COLUMN projects.thumbnail_url IS 'Project-specific thumbnail URL. If NULL, falls back to logo thumbnail_url';

