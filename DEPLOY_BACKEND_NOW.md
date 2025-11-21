# Deploy Backend Quest Finalization - Quick Start

Your side quest system is ready to go live! Follow these 5 simple steps.

---

## Step 1: Update Supabase Database (1 min)

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your Cooped project
3. Click **SQL Editor** → **New Query**
4. Copy & paste this:

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
CREATE INDEX IF NOT EXISTS idx_coops_updated_at ON coops(updated_at);
```

5. Click **Run** → Wait for green checkmarks ✅

---

## Step 2: Create PostgreSQL Function (1 min)

1. Stay in **SQL Editor**
2. Click **New Query** again
3. Copy & paste from file: `CREATE_ADD_XP_FUNCTION.sql`
4. Click **Run** → Wait for green checkmarks ✅

---

## Step 3: Deploy Edge Function (2 min)

### Option A: Using Supabase CLI (Easiest)

```bash
cd /Users/jasonhaug/Documents/couped/Cooped
supabase functions deploy finalize-side-quests
```

### Option B: Using Supabase Dashboard

1. Go to **Edge Functions** in sidebar
2. Click **Create new function** → Name it `finalize-side-quests`
3. Paste content from: `supabase/functions/finalize-side-quests/index.ts`
4. Click **Deploy**

---

## Step 4: Test It Works (3 min)

1. Open your Chrome extension
2. Go to your **Coop Settings**
3. Scroll to **🧪 Testing** section
4. Click **Create Test Side Quest** ← Creates a quest that expires in 1 hour
5. Go to **Home** → You should see **🎯 Side Quests Available**

---

## Step 5: Finalize the Quest (Manual Test)

The quest will auto-finalize when it expires, but you can test manually:

### In Browser Console (F12):

```javascript
await fetch(
  'https://YOUR_PROJECT_ID.functions.supabase.co/finalize-side-quests',
  { method: 'POST' }
).then(r => r.json()).then(console.log)
```

Replace `YOUR_PROJECT_ID` with your Supabase project ID (find it in dashboard URL).

Expected response:
```json
{
  "success": true,
  "message": "Finalized 1 quests",
  "finalized": [
    {
      "quest_id": "...",
      "participants": 1,
      "placements": [
        {
          "attempt_id": "...",
          "user_id": "...",
          "placement": 1,
          "xp_earned": 250,
          "accuracy": 100,
          "compositeScore": 100
        }
      ]
    }
  ]
}
```

---

## What Happens Automatically

Once deployed, your system:

✅ **Detects expired quests** - Every hour (or manually triggered)
✅ **Calculates scores** - 80% accuracy + 20% speed
✅ **Assigns placements** - 1st, 2nd, 3rd get XP rewards
✅ **Awards XP** - 250, 200, 150, 100 (participation)
✅ **Updates database** - Marks quest as completed

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Function not found` | Make sure you deployed the Edge Function (Step 3) |
| `Permission denied` | Make sure you ran the PostgreSQL function SQL (Step 2) |
| `Could not find column` | Make sure you ran the ALTER TABLE SQL (Step 1) |
| `No quests finalized` | Check quest `expires_at` - it must be in the past |
| `XP not added` | Verify `add_xp_to_user` exists in Supabase Functions tab |

---

## Next Steps (Optional)

- **Setup scheduled finalization**: See `BACKEND_FINALIZATION_ARCHITECTURE.md` for cron job setup
- **Manual trigger button**: Add "Finalize Quests" button to admin panel
- **Monitor in production**: Check Supabase Edge Functions logs for errors

---

## Files You'll Need

- ✅ `supabase-schema.sql` - Already updated (Step 1 SQL)
- ✅ `CREATE_ADD_XP_FUNCTION.sql` - For Step 2
- ✅ `supabase/functions/finalize-side-quests/index.ts` - For Step 3
- 📖 `BACKEND_FINALIZATION_ARCHITECTURE.md` - If you need more details

---

**You're done when:**
- [ ] SQL runs without errors in Step 1
- [ ] PostgreSQL function created in Step 2
- [ ] Edge Function deployed in Step 3
- [ ] Test quest appears on home screen in Step 4
- [ ] Manual finalize endpoint returns success in Step 5

**Then your side quests are live! 🚀**
