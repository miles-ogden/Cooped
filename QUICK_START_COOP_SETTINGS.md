# Quick Start: Coop Settings & Side Quests

Follow these steps to get side quests working in your coop.

## Step 1: Update Your Supabase Schema

### If Starting Fresh
1. Open [Supabase SQL Editor](https://supabase.com/dashboard)
2. Click "New Query"
3. Open `supabase-schema.sql` from this project
4. Copy and paste the entire SQL into the editor
5. Click "Run"

### If You Already Have a Database
1. Open [Supabase SQL Editor](https://supabase.com/dashboard)
2. Click "New Query"
3. Open `MIGRATE_COOPS_SCHEMA.sql` from this project
4. Copy and paste the SQL into the editor
5. Click "Run"

**Result**: ✅ Your `coops` table now has all necessary columns

---

## Step 2: Configure Side Quests in Your Coop

1. Open the extension popup
2. Click on your coop
3. Click **Settings** (gear icon)
4. Find **"Side Quests"** section

   a. Check the box: **Enable Side Quests** ✓

   b. Choose a **Quest Category**:
      - Learning: Math, History, Vocabulary, General Knowledge
      - Fun: Trivia, Sports, Movies, Pop Culture
      - Random: Mix of everything

   c. Select **Topics**: Check at least one box

   d. Set **Frequency**: How often quests appear
      - Daily: 4-hour windows (once, twice, or 3x per day)
      - Weekly: 24-hour windows (once, twice, or 3x per week)

5. Click **Save All Settings** ✓

**Result**: ✅ Side quests are now configured

---

## Step 3: Create a Test Quest

1. In the same **Settings** screen
2. Scroll down to **"🧪 Testing"** section
3. Click **"Create Test Side Quest"**
4. You'll see: ✅ Test side quest created! Check your home screen.
5. You're automatically taken to home screen

**Result**: ✅ The "🎯 Side Quests Available" button appears with a countdown timer

---

## Step 4: Test the Quest

1. Click the **"🎯 Side Quests Available"** button
2. Read the quest intro and click **"Start Quiz"**
3. Answer 10 questions (order is randomized per user)
4. Click **"Submit Quiz"** when done
5. See your results:
   - Accuracy percentage
   - Time taken
   - XP earned

**Result**: ✅ Side quest system is working!

---

## Troubleshooting

### "Error saving settings: Could not find..."
- You haven't run the schema migration yet
- Go back to Step 1 and run the appropriate SQL script

### Settings don't appear in the UI
- Reload the extension (close popup and reopen)
- Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)

### "Create Test Side Quest" button doesn't work
- Make sure **"Enable Side Quests"** is checked ✓
- Make sure **at least one topic** is selected ✓
- Click **"Save All Settings"** first ✓

### Quest button won't appear on home screen
- The button only appears if side quests are enabled AND at least one topic is selected
- Try clicking the "Create Test Side Quest" button again

---

## What Each Setting Does

| Setting | Default | What It Does |
|---------|---------|--------------|
| Enable Side Quests | OFF | Turn the whole feature on/off |
| Quest Category | Learning | Determines which question types are used |
| Topics | None | Filter questions by specific subject |
| Frequency | Once per day | How often new quests are created |

---

## FAQ

**Q: Can players opt out of side quests?**
A: No, side quests show to all coop members who have them enabled in settings.

**Q: Can I change settings after enabling?**
A: Yes! Go back to Settings anytime and save new preferences.

**Q: Do old quests expire?**
A: Yes! Quests expire based on frequency (4 hours for daily, 24 hours for weekly).

**Q: Can the same user take a quest twice?**
A: No, the system prevents duplicate entries with a UNIQUE constraint.

**Q: What if I don't select any topics?**
A: You can't create a quest. At least one topic must be selected.

---

## Need Help?

- Check console logs for error details (F12 → Console)
- See `SETUP_COOP_SETTINGS.md` for detailed info
- See `SCHEMA_FIX_SUMMARY.md` for technical details

---

**You're all set! 🎯 Enjoy your side quests!**
