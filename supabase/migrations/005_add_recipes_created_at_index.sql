-- Add index on recipes.created_at for Newest/Oldest sorting performance
-- Supports both ASC and DESC queries efficiently

CREATE INDEX IF NOT EXISTS idx_recipes_created_at
ON public.recipes(created_at DESC);

-- Also useful for filtering by date range
COMMENT ON INDEX idx_recipes_created_at IS 'Supports newest/oldest sort';
