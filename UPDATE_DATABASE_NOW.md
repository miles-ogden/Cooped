# ⚠️ URGENT: Update Your Supabase Database

The extension code has been updated but your **Supabase database** still needs to be updated with the new columns.

## What You Need to Do RIGHT NOW

### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard
2. Select your project (Cooped)
3. Click **"SQL Editor"** in the left sidebar

### Step 2: Run the Migration SQL

**If you already have a coops table:**

1. Click **"New Query"**
2. Copy and paste this SQL:

```sql
-- Add missing columns to coops table
ALTER TABLE coops ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS blocker_question_type TEXT DEFAULT 'general' NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 10 NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS side_quests_enabled BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS side_quest_category TEXT DEFAULT 'learning' NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS side_quest_topics TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS side_quest_frequency TEXT DEFAULT 'daily' NOT NULL;
ALTER TABLE coops ADD COLUMN IF NOT EXISTS side_quest_frequency_value INTEGER DEFAULT 1 NOT NULL;

-- Create index on updated_at for efficient queries
CREATE INDEX IF NOT EXISTS idx_coops_updated_at ON coops(updated_at);
```

3. Click **"Run"** button (or press Cmd+Enter / Ctrl+Enter)
4. You should see green checkmarks ✅ for each line

### Step 3: Verify the Columns Were Added
1. Click **"Tables"** in the left sidebar
2. Click on **"coops"**
3. You should see all these new columns:
   - ✅ `updated_at`
   - ✅ `blocker_question_type`
   - ✅ `max_members`
   - ✅ `side_quests_enabled`
   - ✅ `side_quest_category`
   - ✅ `side_quest_topics`
   - ✅ `side_quest_frequency`
   - ✅ `side_quest_frequency_value`

### Step 4: Reload the Extension
1. Close the extension popup
2. Reopen it
3. Go to your coop → Settings
4. Try saving again - it should work now! ✅

---

## If You See Errors

### "Error: column already exists"
- That's fine! It means the column was already added
- Just try the next line or move forward

### "Error: permission denied"
- Make sure you're logged in as the project owner
- Try in an incognito window if you have multiple Supabase accounts

### Still getting the error after running SQL?
- Wait 30 seconds for Supabase to sync
- Hard refresh the extension (close and reopen)
- Clear browser cache (Ctrl+Shift+Delete)

---

## Reference Files
- `MIGRATE_COOPS_SCHEMA.sql` - Contains all the SQL above
- `SETUP_COOP_SETTINGS.md` - Detailed setup guide
- `QUICK_START_COOP_SETTINGS.md` - Step-by-step guide

---

**Once the database columns are added, everything will work! 🎯**
