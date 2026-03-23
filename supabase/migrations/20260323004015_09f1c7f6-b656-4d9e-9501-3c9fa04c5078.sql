
CREATE TABLE public.afk_status (
  user_id bigint NOT NULL,
  chat_id bigint NOT NULL,
  reason text DEFAULT '',
  since timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, chat_id)
);
ALTER TABLE public.afk_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full" ON public.afk_status FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Auth read" ON public.afk_status FOR SELECT TO authenticated USING (true);

CREATE TABLE public.member_reputation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id bigint NOT NULL,
  from_user_id bigint NOT NULL,
  to_user_id bigint NOT NULL,
  value smallint NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(chat_id, from_user_id, to_user_id)
);
ALTER TABLE public.member_reputation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full" ON public.member_reputation FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Auth read" ON public.member_reputation FOR SELECT TO authenticated USING (true);

CREATE TABLE public.achievements (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  required_value integer DEFAULT 0
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON public.achievements FOR SELECT TO public USING (true);
CREATE POLICY "Service full" ON public.achievements FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TABLE public.member_achievements (
  user_id bigint NOT NULL,
  chat_id bigint NOT NULL,
  achievement_id text REFERENCES public.achievements(id) NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, chat_id, achievement_id)
);
ALTER TABLE public.member_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service full" ON public.member_achievements FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Auth read" ON public.member_achievements FOR SELECT TO authenticated USING (true);

INSERT INTO public.achievements (id, name, description, icon, required_value) VALUES
('msg_100', 'محادث نشيط', 'أرسل 100 رسالة', '💬', 100),
('msg_1000', 'ثرثار محترف', 'أرسل 1000 رسالة', '🗣️', 1000),
('msg_5000', 'أسطورة الكلام', 'أرسل 5000 رسالة', '👑', 5000),
('points_500', 'جامع النقاط', 'وصل إلى 500 نقطة', '💎', 500),
('points_5000', 'ثري النقاط', 'وصل إلى 5000 نقطة', '💰', 5000),
('level_5', 'المتسلق', 'وصل للمستوى 5', '⭐', 5),
('level_10', 'النجم الصاعد', 'وصل للمستوى 10', '🌟', 10),
('level_20', 'الأسطورة', 'وصل للمستوى 20', '🏆', 20),
('quiz_10', 'عبقري الكويز', 'أجاب 10 أسئلة صحيحة', '🧠', 10),
('daily_7', 'ملتزم', 'جمع المكافأة 7 أيام متتالية', '📅', 7),
('gift_1000', 'الكريم', 'أهدى 1000 عملة إجمالاً', '🎁', 1000),
('rep_10', 'نجم السمعة', 'حصل على 10 تقييمات إيجابية', '⭐', 10);

CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id bigint NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  created_by bigint NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service full" ON public.polls FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Auth read" ON public.polls FOR SELECT TO authenticated USING (true);

CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
  user_id bigint NOT NULL,
  option_index integer NOT NULL,
  UNIQUE(poll_id, user_id)
);
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service full" ON public.poll_votes FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TABLE public.lottery_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id bigint NOT NULL,
  user_id bigint NOT NULL,
  tickets integer DEFAULT 1,
  round_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(chat_id, user_id, round_id)
);
ALTER TABLE public.lottery_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service full" ON public.lottery_entries FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL,
  chat_id bigint NOT NULL,
  message text NOT NULL,
  remind_at timestamptz NOT NULL,
  is_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service full" ON public.reminders FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TABLE public.dashboard_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  chat_id bigint NOT NULL,
  chat_title text,
  created_at timestamptz DEFAULT now(),
  used boolean DEFAULT false
);
ALTER TABLE public.dashboard_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service full" ON public.dashboard_links FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TABLE public.dashboard_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chat_id bigint NOT NULL,
  display_name text,
  is_developer boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.dashboard_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own" ON public.dashboard_users FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service full" ON public.dashboard_users FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Users insert own" ON public.dashboard_users FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS reputation integer DEFAULT 0;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS daily_streak integer DEFAULT 0;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS quiz_correct integer DEFAULT 0;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS total_gifted integer DEFAULT 0;
