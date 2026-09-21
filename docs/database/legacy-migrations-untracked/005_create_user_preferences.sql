-- Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  default_servings INTEGER DEFAULT 2 CHECK (default_servings >= 1 AND default_servings <= 10),
  default_days INTEGER DEFAULT 7 CHECK (default_days IN (3, 5, 7)),
  notifications_enabled BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  diet_preference TEXT,
  allergies TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: users can view their own preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: users can update their own preferences
CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: users can insert their own preferences
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);
