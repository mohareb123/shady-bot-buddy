
CREATE TABLE IF NOT EXISTS public.user_ai_prefs (
  user_id bigint PRIMARY KEY,
  model text NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  fast_mode boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ai_prefs TO authenticated;
GRANT ALL ON public.user_ai_prefs TO service_role;
ALTER TABLE public.user_ai_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role manages ai prefs" ON public.user_ai_prefs FOR ALL TO service_role USING (true) WITH CHECK (true);
