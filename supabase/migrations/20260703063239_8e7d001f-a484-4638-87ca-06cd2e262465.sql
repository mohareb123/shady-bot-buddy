
CREATE TABLE public.browser_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bb_session_id TEXT NOT NULL,
  context_id UUID,
  site_name TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  live_view_url TEXT,
  connect_url TEXT,
  started_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  last_screenshot TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.browser_sessions TO authenticated;
GRANT SELECT ON public.browser_sessions TO anon;
GRANT ALL ON public.browser_sessions TO service_role;
ALTER TABLE public.browser_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read browser sessions" ON public.browser_sessions FOR SELECT USING (true);
CREATE POLICY "service manages browser sessions" ON public.browser_sessions FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.browser_contexts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bb_context_id TEXT NOT NULL,
  site_name TEXT NOT NULL,
  description TEXT,
  logged_in BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.browser_contexts TO authenticated;
GRANT SELECT ON public.browser_contexts TO anon;
GRANT ALL ON public.browser_contexts TO service_role;
ALTER TABLE public.browser_contexts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read browser contexts" ON public.browser_contexts FOR SELECT USING (true);
CREATE POLICY "service manages browser contexts" ON public.browser_contexts FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.browser_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.browser_sessions(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  input JSONB DEFAULT '{}'::jsonb,
  output JSONB DEFAULT '{}'::jsonb,
  screenshot_url TEXT,
  status TEXT DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.browser_actions TO authenticated;
GRANT SELECT ON public.browser_actions TO anon;
GRANT ALL ON public.browser_actions TO service_role;
ALTER TABLE public.browser_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read browser actions" ON public.browser_actions FOR SELECT USING (true);
CREATE POLICY "service manages browser actions" ON public.browser_actions FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_browser_actions_session ON public.browser_actions(session_id, created_at DESC);
CREATE INDEX idx_browser_sessions_status ON public.browser_sessions(status, created_at DESC);
