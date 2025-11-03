-- Migration: Add Projects Table
-- This migration adds a table to store user projects (copies of logos with modifications)
-- Date: 2024

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- PROJECTS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title VARCHAR(200) NOT NULL,
  json_doc JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  
  -- Foreign key constraint
  CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Composite index for user queries with updated_at sorting (as specified)
CREATE INDEX IF NOT EXISTS idx_projects_user_id_updated_at ON projects(user_id, updated_at DESC);

-- Index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NULL;

-- Index for full-text search on title (if needed)
CREATE INDEX IF NOT EXISTS idx_projects_title ON projects(title);

-- Index for JSONB queries (if needed for json_doc searches)
CREATE INDEX IF NOT EXISTS idx_projects_json_doc ON projects USING GIN(json_doc);

-- ==============================================
-- TRIGGER FOR UPDATED_AT
-- ==============================================

-- Create or replace the function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for re-runs)
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- COMMENTS
-- ==============================================

COMMENT ON TABLE projects IS 'Stores user projects - copies of logos with modifications made in the editor';
COMMENT ON COLUMN projects.id IS 'Project identifier (UUID)';
COMMENT ON COLUMN projects.user_id IS 'Owner of the project (FK to users.id)';
COMMENT ON COLUMN projects.title IS 'Project title';
COMMENT ON COLUMN projects.json_doc IS 'Design document / serialized canvas state (JSONB)';
COMMENT ON COLUMN projects.created_at IS 'Project creation timestamp';
COMMENT ON COLUMN projects.updated_at IS 'Last edit time (auto-updated by trigger)';
COMMENT ON COLUMN projects.deleted_at IS 'Soft delete marker (NULL = active, timestamp = deleted)';

