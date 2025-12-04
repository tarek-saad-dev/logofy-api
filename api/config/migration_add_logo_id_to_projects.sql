-- Migration: Add logo_id to Projects Table
-- This migration adds a foreign key to link projects to logos
-- Date: 2024

-- ==============================================
-- ADD LOGO_ID COLUMN TO PROJECTS
-- ==============================================

-- Add logo_id column (nullable, as existing projects may not have a logo)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS logo_id UUID REFERENCES logos(id) ON DELETE SET NULL;

-- Add index for logo_id for better join performance
CREATE INDEX IF NOT EXISTS idx_projects_logo_id ON projects(logo_id) WHERE logo_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN projects.logo_id IS 'Reference to the original logo this project is based on (FK to logos.id)';

