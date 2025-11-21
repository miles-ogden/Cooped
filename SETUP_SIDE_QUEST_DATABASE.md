# Setup Side Quest Database Tables

The error shows that the `side_quests` and `side_quest_attempts` tables don't exist in your Supabase database yet. Here's how to create them:

## Option 1: Use Supabase Dashboard (Easy)

1. **Go to Supabase Console**
   - Open: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy & Paste the SQL**
   - Copy the entire SQL from `CREATE_SIDE_QUEST_TABLES.sql`
   - Paste into the query editor

4. **Run the Query**
   - Click "Run" button (or Cmd+Enter)
   - You should see: "Success" messages

5. **Verify Tables Created**
   - Go to "Tables" in left sidebar
   - You should see:
     - `side_quests`
     - `side_quest_attempts`

---

## Option 2: Direct SQL (Copy-Paste)

Run this SQL in your Supabase SQL Editor:

```sql
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
```

---

## Table Schemas

### `side_quests` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `coop_id` | uuid | Foreign key to coops |
| `category` | text | Quest category (learning, fun, random) |
| `questions` | jsonb | Array of 10 question objects |
| `created_at` | timestamp | When quest was created |
| `expires_at` | timestamp | When quest expires |
| `status` | text | 'active' or 'completed' |
| `created_by` | uuid | User who created quest (optional) |

### `side_quest_attempts` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `quest_id` | uuid | Foreign key to side_quests |
| `user_id` | uuid | Foreign key to users |
| `coop_id` | uuid | Foreign key to coops |
| `answers` | jsonb | Array of user's answers |
| `start_time` | timestamp | When user started quiz |
| `end_time` | timestamp | When user submitted |
| `accuracy_percent` | integer | Accuracy (0-100) |
| `time_taken_seconds` | integer | Time to complete |
| `placement` | integer | Final placement (1st, 2nd, etc) |
| `xp_earned` | integer | XP reward earned |
| `created_at` | timestamp | When attempt was recorded |

---

## What the SQL Does

✅ **Creates two tables** for storing quests and user attempts
✅ **Sets up relationships** between tables with foreign keys
✅ **Creates indexes** for fast lookups
✅ **Enables RLS** for security
✅ **Adds RLS policies** so users can only see their coop's quests
✅ **Enforces one attempt per user** per quest with UNIQUE constraint

---

## After Creating Tables

Once the tables are created, run the console command again to activate a side quest:

```javascript
(async () => {
  const QUESTIONS = [
    { q: 'What is the capital of France?', options: ['London', 'Paris', 'Berlin', 'Madrid'], correct: 1 },
    { q: 'What is the largest planet in our solar system?', options: ['Saturn', 'Jupiter', 'Neptune', 'Uranus'], correct: 1 },
    // ... (rest of questions)
  ];
  // ... (rest of script)
})();
```

The side quest will be created successfully and you'll see the button on your home screen! 🎯

---

## Troubleshooting

**Error: "uuid_generate_v4() does not exist"**
- Make sure you have the `uuid-ossp` extension enabled in Supabase
- Supabase usually enables this by default

**Error: "Table 'coops' does not exist"**
- You need to create the `coops` table first
- This should already exist from your coop feature

**Error: "Permission denied"**
- Make sure you're logged in to Supabase as the project owner
- Try in an incognito window if you have multiple accounts

---

Need help? Let me know! 🚀
