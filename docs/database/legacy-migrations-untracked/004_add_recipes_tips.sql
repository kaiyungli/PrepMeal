-- Add tips column to recipes table
-- Run this in Supabase SQL Editor

ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS tips text;
