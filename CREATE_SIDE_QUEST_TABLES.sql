-- Create side_quests table
CREATE TABLE public.side_quests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  coop_id uuid NOT NULL REFERENCES public.coops(id) ON DELETE CASCADE,
  category text NOT NULL,
  questions jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  status text DEFAULT 'active',
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

-- Create side_quest_attempts table
CREATE TABLE public.side_quest_attempts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  quest_id uuid NOT NULL REFERENCES public.side_quests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  coop_id uuid NOT NULL REFERENCES public.coops(id) ON DELETE CASCADE,
  answers jsonb NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  accuracy_percent integer NOT NULL,
  time_taken_seconds integer NOT NULL,
  placement integer,
  xp_earned integer,
  created_at timestamp with time zone NOT NULL,
  UNIQUE(quest_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_side_quests_coop_id ON public.side_quests(coop_id);
CREATE INDEX idx_side_quests_status ON public.side_quests(status);
CREATE INDEX idx_side_quests_expires_at ON public.side_quests(expires_at);

CREATE INDEX idx_side_quest_attempts_quest_id ON public.side_quest_attempts(quest_id);
CREATE INDEX idx_side_quest_attempts_user_id ON public.side_quest_attempts(user_id);
CREATE INDEX idx_side_quest_attempts_coop_id ON public.side_quest_attempts(coop_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.side_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.side_quest_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view side quests for their coop
CREATE POLICY "Users can view side quests for their coop"
  ON public.side_quests
  FOR SELECT
  USING (
    coop_id IN (
      SELECT coop_id FROM public.users WHERE id = auth.uid()
    )
  );

-- RLS Policy: Users can create side quest attempts
CREATE POLICY "Users can create side quest attempts"
  ON public.side_quest_attempts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users can view their own attempts
CREATE POLICY "Users can view their own attempts"
  ON public.side_quest_attempts
  FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policy: Users can view attempts from their coop members
CREATE POLICY "Users can view coop member attempts"
  ON public.side_quest_attempts
  FOR SELECT
  USING (
    coop_id IN (
      SELECT coop_id FROM public.users WHERE id = auth.uid()
    )
  );
