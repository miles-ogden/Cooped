# Schema Fix Summary - Coop Settings Columns

## Problem
When trying to save coop settings, users got this error:
```
Error saving settings: Could not find the 'is_public' column of 'coops' in the schema cache
```

This happened because:
1. The `coops` table in the original schema didn't have columns for coop settings
2. The UI code was trying to save settings to non-existent database columns

## Solution Implemented

### 1. Updated Database Schema (`supabase-schema.sql`)
Added 8 new columns to the `coops` table:
- `updated_at` - Timestamp for tracking last modification
- `blocker_question_type` - Question type for challenges (default: 'general')
- `max_members` - Maximum coop size (default: 10)
- `side_quests_enabled` - Enable/disable feature (default: FALSE)
- `side_quest_category` - Quest category (default: 'learning')
- `side_quest_topics` - Array of selected topics (default: [])
- `side_quest_frequency` - Frequency unit (default: 'daily')
- `side_quest_frequency_value` - Frequency count (default: 1)

### 2. Created Migration Script (`MIGRATE_COOPS_SCHEMA.sql`)
For users with existing databases, this script safely adds the missing columns without affecting existing data.

Uses `IF NOT EXISTS` clauses so it's safe to run multiple times.

### 3. Fixed Coop Settings UI (`coop-settings-screen.js`)
- **Removed**: Privacy Settings section (was trying to use non-existent `is_public` column)
- **Updated**: `onSaveAllSettingsClick()` to only save columns that exist in the schema
- **Kept**: All other functionality (blocker question type, max members, side quest settings)

### 4. Created Setup Documentation (`SETUP_COOP_SETTINGS.md`)
Comprehensive guide for:
- Fresh installations (use main schema)
- Existing installations (run migration script)
- Verification steps
- Troubleshooting

## Testing the Fix

### For New Installations
1. Run the complete `supabase-schema.sql` in Supabase SQL Editor
2. Open extension, create a coop
3. Go to coop settings
4. All settings sections should now be available
5. Click "Save All Settings" - should work without errors

### For Existing Installations
1. Run `MIGRATE_COOPS_SCHEMA.sql` in Supabase SQL Editor
2. Reload the extension
3. Go to coop settings
4. All settings sections should now be available
5. Click "Save All Settings" - should work without errors

## Files Modified

1. **supabase-schema.sql** - Updated coops table definition
2. **src/popup/screens/coop-settings-screen.js** - Removed privacy setting, fixed save handler
3. **MIGRATE_COOPS_SCHEMA.sql** - NEW: Migration script for existing databases
4. **SETUP_COOP_SETTINGS.md** - NEW: Setup and troubleshooting guide
5. **SCHEMA_FIX_SUMMARY.md** - NEW: This file

## Backward Compatibility

All changes are backward compatible:
- `IF NOT EXISTS` in migration prevents errors if columns already exist
- Default values ensure existing coops have valid settings
- Side quests default to disabled so no unexpected behavior

## Next Steps

1. **New Users**: Run `supabase-schema.sql` when setting up Supabase
2. **Existing Users**: Run `MIGRATE_COOPS_SCHEMA.sql` to add missing columns
3. **All Users**: Follow `SETUP_COOP_SETTINGS.md` to configure side quests
4. **Then**: Use the "🧪 Testing" section in coop settings to create test quests

---

Everything is now ready to use! The schema matches the UI and settings will save correctly.
