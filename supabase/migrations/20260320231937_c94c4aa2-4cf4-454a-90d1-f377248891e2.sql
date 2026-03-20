
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Members table
CREATE TABLE public.members (
  user_id BIGINT NOT NULL,
  chat_id BIGINT NOT NULL,
  username TEXT,
  full_name TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  messages_count INTEGER NOT NULL DEFAULT 0,
  warnings INTEGER NOT NULL DEFAULT 0,
  last_daily TIMESTAMP WITH TIME ZONE,
  join_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_active TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chat_id)
);

-- Admin logs
CREATE TABLE public.admin_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  admin_id BIGINT NOT NULL,
  admin_name TEXT,
  target_id BIGINT,
  target_name TEXT,
  action TEXT NOT NULL,
  reason TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Messages log
CREATE TABLE public.messages_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  user_name TEXT,
  message_preview TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Auto responses
CREATE TABLE public.auto_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  trigger_word TEXT NOT NULL,
  response TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Whispers
CREATE TABLE public.whispers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id BIGINT NOT NULL,
  sender_name TEXT,
  recipient_id BIGINT NOT NULL,
  recipient_name TEXT,
  message TEXT NOT NULL,
  chat_id BIGINT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Group settings
CREATE TABLE public.group_settings (
  chat_id BIGINT PRIMARY KEY,
  links_allowed BOOLEAN NOT NULL DEFAULT false,
  media_allowed BOOLEAN NOT NULL DEFAULT true,
  spam_protection BOOLEAN NOT NULL DEFAULT true,
  welcome_enabled BOOLEAN NOT NULL DEFAULT true,
  max_warnings INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quiz questions
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  category TEXT DEFAULT 'عام'
);

-- User titles
CREATE TABLE public.user_titles (
  chat_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  PRIMARY KEY (chat_id, user_id)
);

-- Telegram bot state for polling
CREATE TABLE public.telegram_bot_state (
  id INT PRIMARY KEY CHECK (id = 1),
  update_offset BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

INSERT INTO public.telegram_bot_state (id, update_offset) VALUES (1, 0);

-- Telegram messages
CREATE TABLE public.telegram_messages (
  update_id BIGINT PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  text TEXT,
  raw_update JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_messages_chat_id ON public.telegram_messages (chat_id);
CREATE INDEX idx_members_chat_id ON public.members (chat_id);
CREATE INDEX idx_messages_log_chat_id ON public.messages_log (chat_id);
CREATE INDEX idx_admin_logs_chat_id ON public.admin_logs (chat_id);

-- Enable RLS on all tables
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whispers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies - service role access for edge functions (all tables)
CREATE POLICY "Service role full access" ON public.members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.admin_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.messages_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.auto_responses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.whispers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.group_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.quiz_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.user_titles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.telegram_bot_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.telegram_messages FOR ALL USING (true) WITH CHECK (true);

-- Read access for authenticated users (dashboard)
CREATE POLICY "Authenticated read" ON public.members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.admin_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.messages_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.auto_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.group_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.quiz_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.user_titles FOR SELECT TO authenticated USING (true);
