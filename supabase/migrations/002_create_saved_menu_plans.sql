-- Create saved_menu_plans table
CREATE TABLE IF NOT EXISTS public.saved_menu_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  week_start_date DATE NOT NULL,
  days_count INTEGER NOT NULL DEFAULT 7,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create saved_menu_plan_items table
CREATE TABLE IF NOT EXISTS public.saved_menu_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_plan_id UUID NOT NULL REFERENCES public.saved_menu_plans(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL CHECK (day_index >= 0 AND day_index <= 6),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE RESTRICT,
  servings NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_menu_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_menu_plan_items ENABLE ROW LEVEL SECURITY;

-- Policies for saved_menu_plans
CREATE POLICY "Users can view own menu plans" ON public.saved_menu_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own menu plans" ON public.saved_menu_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own menu plans" ON public.saved_menu_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own menu plans" ON public.saved_menu_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for saved_menu_plan_items
CREATE POLICY "Users can view own menu plan items" ON public.saved_menu_plan_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.saved_menu_plans 
      WHERE id = menu_plan_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own menu plan items" ON public.saved_menu_plan_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.saved_menu_plans 
      WHERE id = menu_plan_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own menu plan items" ON public.saved_menu_plan_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.saved_menu_plans 
      WHERE id = menu_plan_id AND user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_menu_plans_user_id ON public.saved_menu_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_menu_plan_items_menu_plan_id ON public.saved_menu_plan_items(menu_plan_id);
