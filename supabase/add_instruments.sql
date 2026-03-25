-- Add instruments column to songs table
-- Stores an array of instrument names as JSONB (e.g. ["Guitar", "Vocals"])
ALTER TABLE songs ADD COLUMN IF NOT EXISTS instruments jsonb NOT NULL DEFAULT '["Guitar"]'::jsonb;
