-- Create user_favorites table
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

-- Enable RLS
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Policy: users can view their own favorites
CREATE POLICY "Users can view own favorites" ON public.user_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: users can insert their own favorites
CREATE POLICY "Users can insert own favorites" ON public.user_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: users can delete their own favorites
CREATE POLICY "Users can delete own favorites" ON public.user_favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_recipe_id ON public.user_favorites(recipe_id);
