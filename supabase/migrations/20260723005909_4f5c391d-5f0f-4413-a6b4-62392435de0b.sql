CREATE TABLE IF NOT EXISTS public.user_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL,
  chat_id bigint,
  key text NOT NULL,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);
GRANT ALL ON public.user_memories TO service_role;
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_user_memories_user ON public.user_memories(user_id);