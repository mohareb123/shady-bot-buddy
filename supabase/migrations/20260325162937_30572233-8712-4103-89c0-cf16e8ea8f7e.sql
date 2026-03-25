
-- Store items table
CREATE TABLE public.store_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_coins integer NOT NULL DEFAULT 0,
  price_cash numeric(10,2) NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON public.store_items FOR SELECT TO public USING (true);
CREATE POLICY "Service full" ON public.store_items FOR ALL TO public USING (true) WITH CHECK (true);

-- Payment requests table
CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL,
  chat_id bigint NOT NULL,
  user_name text,
  service_type text NOT NULL,
  service_details text,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  proof_file_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by bigint
);
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service full" ON public.payment_requests FOR ALL TO public USING (true) WITH CHECK (true);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL,
  chat_id bigint NOT NULL,
  tier text NOT NULL DEFAULT 'free',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, chat_id)
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service full" ON public.subscriptions FOR ALL TO public USING (true) WITH CHECK (true);

-- Ads table
CREATE TABLE public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL,
  chat_id bigint NOT NULL,
  content text NOT NULL,
  scheduled_at timestamptz,
  is_sent boolean NOT NULL DEFAULT false,
  payment_id uuid REFERENCES public.payment_requests(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service full" ON public.ads FOR ALL TO public USING (true) WITH CHECK (true);

-- Insert default store items
INSERT INTO public.store_items (name, description, price_coins, price_cash, category) VALUES
  ('فك كتم', 'فك الكتم عن حسابك في المجموعة', 300, 5, 'moderation'),
  ('فك حظر', 'فك الحظر عن حسابك في المجموعة', 500, 10, 'moderation'),
  ('تثبيت رسالة', 'تثبيت رسالتك لمدة 24 ساعة', 200, 5, 'feature'),
  ('لقب مميز', 'لقب مخصص بجانب اسمك', 500, 8, 'feature'),
  ('ترويج قناة', 'إعلان عن قناتك في المجموعة', 1000, 15, 'promotion'),
  ('ترويج حساب', 'إعلان عن حسابك في المجموعة', 800, 12, 'promotion'),
  ('اشتراك Pro', 'مزايا إضافية لمدة 30 يوم', 2000, 25, 'subscription'),
  ('اشتراك VIP', 'جميع المزايا لمدة 30 يوم', 5000, 50, 'subscription');
