-- Add times_shown column to recipes for popularity tracking
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS times_shown INTEGER DEFAULT 0;

-- Create index for sorting performance
CREATE INDEX IF NOT EXISTS idx_recipes_times_shown ON recipes(times_shown DESC NULLS LAST);
