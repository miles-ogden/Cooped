# Setup Coop Settings in Supabase

The coop settings feature requires some columns in the `coops` table. Here's how to set them up:

## Two Options for Setup

### Option 1: Fresh Install (New Database)
If you're setting up Cooped from scratch:

1. Go to Supabase SQL Editor
2. Run the entire SQL from `supabase-schema.sql`
3. This creates the `coops` table with all the necessary columns

---

### Option 2: Existing Installation (Add to Current Database)
If you already have a `coops` table and need to add the missing columns:

1. Go to Supabase SQL Editor
2. Open a new query
3. Copy and paste the SQL from `MIGRATE_COOPS_SCHEMA.sql`
4. Click "Run" (or Cmd+Enter)
5. You should see "Success" messages

---

## What Gets Added

When you run the migration, these columns are added to your `coops` table:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `updated_at` | TIMESTAMP | NOW() | Track when settings were last modified |
| `blocker_question_type` | TEXT | 'general' | Type of questions for challenge blocking |
| `max_members` | INTEGER | 10 | Maximum members allowed in coop |
| `side_quests_enabled` | BOOLEAN | FALSE | Whether side quests are active |
| `side_quest_category` | TEXT | 'learning' | Quest category (learning/fun/random) |
| `side_quest_topics` | TEXT[] | [] | Selected topics for questions |
| `side_quest_frequency` | TEXT | 'daily' | How often quests appear (daily/weekly) |
| `side_quest_frequency_value` | INTEGER | 1 | How many per frequency (1-3) |

---

## Verify the Migration

After running the migration, you can verify the columns were added:

1. Go to **Tables** in the left sidebar
2. Click on **coops**
3. You should see all the new columns listed

---

## Now What?

Once the columns are added:

1. Open your extension popup
2. Go to your coop
3. Click **Settings**
4. Enable "Side Quests"
5. Select your preferred category and topics
6. Click "Save All Settings"
7. A "🧪 Testing" section will appear where you can create test quests

---

## Troubleshooting

**Error: "Column already exists"**
- This is fine! The migration uses `IF NOT EXISTS`, so it won't error if columns are already there
- Just run the migration again - it will only add missing columns

**Error: "Permission denied"**
- Make sure you're logged into Supabase as the project owner
- Try in an incognito window if you have multiple accounts

**Settings don't show in UI**
- Make sure you've run the migration
- Clear your browser cache (Ctrl+Shift+Delete)
- Reload the extension

---

## Side Quest Settings Explanation

### Enable Side Quests
Turn on/off the entire side quest feature for your coop

### Quest Category
- **Learning**: Math, History, Vocabulary, General Knowledge
- **Fun**: Trivia, Sports, Movies, Pop Culture
- **Random**: Mix of everything

### Topics
Select specific topics within your category. At least one must be selected to create a quest.

### Frequency
How often new quests appear:
- **Daily**: Once, twice, or 3 times per day (4-hour windows per quest)
- **Weekly**: Once, twice, or 3 times per week (24-hour windows per quest)

---

## Testing the Feature

Once everything is set up:

1. Enable side quests in coop settings
2. Select at least one topic
3. Click "Save All Settings"
4. Go to home screen
5. Click "🧪 Testing" → "Create Test Side Quest"
6. You'll see the "🎯 Side Quests Available" button appear with countdown

---

Need help? Check the console logs for debugging information!
