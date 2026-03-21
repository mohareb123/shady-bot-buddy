
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by bigint,
  is_sent boolean NOT NULL DEFAULT false
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.notifications FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated read" ON public.notifications FOR SELECT TO authenticated USING (true);
