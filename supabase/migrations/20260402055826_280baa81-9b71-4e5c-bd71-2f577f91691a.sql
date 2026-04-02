CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete notifications"
ON public.notifications
FOR DELETE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update notifications"
ON public.notifications
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);