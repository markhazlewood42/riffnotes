-- Add instruments column to songs table
-- Stores an array of instrument names as JSONB (e.g. ["Guitar", "Vocals"])
ALTER TABLE songs ADD COLUMN instruments jsonb DEFAULT '["Guitar"]'::jsonb;
