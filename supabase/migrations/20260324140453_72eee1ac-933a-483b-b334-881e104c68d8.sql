CREATE TABLE IF NOT EXISTS conversation_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id bigint NOT NULL,
  user_id bigint NOT NULL,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conv_memory_chat_user ON conversation_memory (chat_id, user_id, created_at DESC);

ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service full" ON conversation_memory FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS bot_messages (
  message_id bigint NOT NULL,
  chat_id bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, chat_id)
);

CREATE INDEX idx_bot_messages_chat ON bot_messages (chat_id, created_at DESC);

ALTER TABLE bot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service full" ON bot_messages FOR ALL USING (true) WITH CHECK (true);