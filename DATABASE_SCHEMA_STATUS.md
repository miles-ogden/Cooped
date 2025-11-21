# Database Schema Status

## Current Situation

### ✅ Code is Ready
- All JavaScript files have been updated to use the new columns
- The coop settings UI is implemented
- The test quest creation button is ready

### ❌ Supabase Database is NOT Updated Yet
- Your `coops` table is missing 8 new columns
- When you try to save settings, Supabase returns: `Could not find the 'max_members' column`

---

## What Your Supabase Currently Has

```
TABLE: coops
├── id (UUID)
├── name (TEXT)
├── creator_user_id (UUID)
├── member_ids (UUID[])
├── coop_level (INTEGER)
├── total_xp (INTEGER)
└── created_at (TIMESTAMP)
```

## What Your Supabase Needs to Have

```
TABLE: coops
├── id (UUID)
├── name (TEXT)
├── creator_user_id (UUID)
├── member_ids (UUID[])
├── coop_level (INTEGER)
├── total_xp (INTEGER)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)              ← NEW
├── blocker_question_type (TEXT)        ← NEW
├── max_members (INTEGER)               ← NEW
├── side_quests_enabled (BOOLEAN)       ← NEW
├── side_quest_category (TEXT)          ← NEW
├── side_quest_topics (TEXT[])          ← NEW
├── side_quest_frequency (TEXT)         ← NEW
└── side_quest_frequency_value (INTEGER) ← NEW
```

---

## How to Fix It

### Quick Version (Copy & Paste This)

1. Open https://supabase.com/dashboard
2. Select your Cooped project
3. Click **SQL Editor** → **New Query**
4. Paste this:

```sql
ALTER TABLE coops ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS blocker_question_type TEXT DEFAULT 'general' NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 10 NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS side_quests_enabled BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS side_quest_category TEXT DEFAULT 'learning' NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS side_quest_topics TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS side_quest_frequency TEXT DEFAULT 'daily' NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS side_quest_frequency_value INTEGER DEFAULT 1 NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coops_updated_at ON coops(updated_at);
```

5. Click **Run**
6. Wait for green checkmarks ✅
7. Reload extension
8. Try saving coop settings again

### Detailed Version
See `UPDATE_DATABASE_NOW.md` for step-by-step instructions with screenshots.

---

## Why This Is Needed

The coop settings screen uses these columns to store:

| Column | Purpose |
|--------|---------|
| `blocker_question_type` | Which type of questions users see when visiting blocked sites |
| `max_members` | How many people can join this coop (4, 6, 8, or 10) |
| `side_quests_enabled` | Whether the coop has side quests turned on |
| `side_quest_category` | Which category of questions (learning, fun, random) |
| `side_quest_topics` | Specific topics selected for quests |
| `side_quest_frequency` | How often quests appear (daily or weekly) |
| `side_quest_frequency_value` | How many per frequency (1, 2, or 3) |
| `updated_at` | When settings were last changed |

---

## After Running the SQL

1. **Supabase will add all 8 columns** to your existing `coops` table
2. **All your existing coops** will automatically get default values:
   - `blocker_question_type` = 'general'
   - `max_members` = 10
   - `side_quests_enabled` = FALSE (off)
   - `side_quest_category` = 'learning'
   - `side_quest_topics` = [] (empty)
   - `side_quest_frequency` = 'daily'
   - `side_quest_frequency_value` = 1

3. **Nothing is deleted or changed**, just columns added
4. **Safe to run multiple times** - uses `IF NOT EXISTS`

---

## Verify It Worked

1. In Supabase, click **Tables** in left sidebar
2. Click **coops**
3. Scroll right to see the new columns
4. All 8 should be there ✅

---

## Then You Can...

1. Open extension
2. Go to your coop
3. Click **Settings**
4. All settings sections work now! ✅
5. **Enable Side Quests**
6. **Select topics**
7. **Click "Save All Settings"** ← This will now work!
8. **Click "Create Test Side Quest"**
9. See quest on home screen

---

## Timeline

- **Code updated**: ✅ (already done)
- **Database needs update**: ⏳ (you need to do this)
- **After database update**: ✅ (everything works)

**The only thing standing between you and working side quests is running one SQL command in Supabase!**

---

See `UPDATE_DATABASE_NOW.md` for detailed step-by-step instructions.
