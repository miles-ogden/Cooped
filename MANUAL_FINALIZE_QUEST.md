# Manual Quest Finalization - Testing Script

Use this to manually finalize expired quests without waiting for scheduled runs.

## Quick Test (Right Now)

1. Open your extension popup
2. Press **F12** to open Developer Console
3. Click the **Console** tab
4. **Copy and paste this entire script:**

```javascript
(async () => {
  console.log('🎯 Finalizing expired side quests...')

  try {
    const response = await fetch(
      'https://iwiwnximqjtnmmmtgmoh.functions.supabase.co/finalize-side-quests',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    const result = await response.json()

    if (result.success) {
      console.log('✅ Finalization successful!')
      console.log(`📊 Finalized ${result.finalized.length} quests`)

      // Show details for each quest
      result.finalized.forEach((quest, idx) => {
        console.log(`\n🎮 Quest ${idx + 1}: ${quest.quest_id}`)
        console.log(`👥 Participants: ${quest.participants}`)
        console.log('\n📍 Placements:')

        quest.placements.forEach(p => {
          const medal = p.placement === 1 ? '🥇' : p.placement === 2 ? '🥈' : p.placement === 3 ? '🥉' : '✓'
          console.log(`  ${medal} ${p.placement}. User ${p.user_id.slice(0, 8)}...`)
          console.log(`     Accuracy: ${p.accuracy}% | Score: ${p.compositeScore}`)
          console.log(`     XP: +${p.xp_earned}`)
        })
      })
    } else {
      console.error('❌ Error:', result.error)
    }
  } catch (err) {
    console.error('❌ Request failed:', err.message)
  }
})()
```

5. **Press Enter**

6. You should see output like:
```
🎯 Finalizing expired side quests...
✅ Finalization successful!
📊 Finalized 1 quests

🎮 Quest 1: abc123...
👥 Participants: 3
📍 Placements:
  🥇 1. User abc123de...
     Accuracy: 90% | Score: 92.0
     XP: +250
  🥈 2. User def456fg...
     Accuracy: 85% | Score: 85.5
     XP: +200
  🥉 3. User ghi789ij...
     Accuracy: 80% | Score: 80.0
     XP: +150
```

## Verify It Worked

### Check Supabase Database

1. Go to https://supabase.com/dashboard
2. Select your Cooped project
3. Click **Tables** in the left sidebar
4. Click **side_quest_attempts**
5. Look for your recent quiz submissions
6. You should see:
   - ✅ `placement` column filled (1, 2, 3, etc.)
   - ✅ `xp_earned` column filled (250, 200, 150, 100)
7. Click **users** table
8. Check that `xp_total` increased for the participants

## Prerequisites

**Before running this, make sure:**

1. ✅ `CREATE_ADD_XP_FUNCTION.sql` was run in Supabase
2. ✅ Edge Function was deployed (via Supabase CLI or Dashboard)
3. ✅ At least one quest has expired
4. ✅ At least one user submitted answers to that quest

## If It Doesn't Work

### Error: "Function not found (404)"

- Edge Function hasn't been deployed yet
- Follow the setup in `SETUP_FINALIZATION_BACKEND.md`

### Error: "permission denied"

- Run the SQL from `CREATE_ADD_XP_FUNCTION.sql` first
- Make sure to use the Supabase Service Role Key

### Error: "No expired quests"

- Create a test quest first
- Wait for it to expire (or check its `expires_at` in database)
- Then run this script

## Automate It

Once you verify it works, you can:

1. **Schedule it** - Run every 1 hour automatically
2. **Trigger from button** - Add a "Finalize Quests" button in settings
3. **Run on quest expiry** - Use Supabase triggers

For now, just run this script manually whenever you want to finalize quests.

## What It Does

1. Calls the Edge Function
2. Function finds all expired quests with status = 'active'
3. For each quest:
   - Fetches all attempts from that quest
   - Calculates composite scores (80% accuracy + 20% speed)
   - Assigns placements (1st, 2nd, 3rd, etc.)
   - Awards XP (250, 200, 150, 100)
   - Updates database with placement & XP
   - Adds XP to user's xp_total
   - Marks quest as 'completed'
4. Returns summary of finalized quests

## Next: Set Up Automatic Scheduling

See `SETUP_FINALIZATION_BACKEND.md` for options to run this automatically.
