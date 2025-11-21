# Setup Quest Finalization Backend

The finalization backend automatically calculates placements and awards XP when quests expire.

## What It Does

1. **Finds expired quests** (where `expires_at < now` and `status = 'active'`)
2. **Calculates composite scores** using the 80/20 formula for all participants
3. **Assigns placements** (1st, 2nd, 3rd, etc.)
4. **Awards XP** based on placement
5. **Updates user XP totals** in the database

## Setup Steps

### Step 1: Create the XP Function in Supabase

1. Go to https://supabase.com/dashboard
2. Select your Cooped project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire SQL from `CREATE_ADD_XP_FUNCTION.sql`
6. Click **Run**
7. You should see: "CREATE FUNCTION"

### Step 2: Deploy the Edge Function

You have two options:

#### Option A: Deploy via Supabase CLI (Recommended)

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to your Supabase account
supabase login

# Link your project
supabase link --project-ref iwiwnximqjtnmmmtgmoh

# Deploy the function
supabase functions deploy finalize-side-quests

# You should see: "✓ Function finalize-side-quests deployed successfully!"
```

#### Option B: Deploy Manually via Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your Cooped project
3. Click **Edge Functions** in the left sidebar
4. Click **Create a new function**
5. Name it: `finalize-side-quests`
6. Copy the code from `supabase/functions/finalize-side-quests/index.ts`
7. Paste it into the editor
8. Click **Deploy**

### Step 3: Test the Function

#### Option A: Via Console Script (Easiest for Testing)

```javascript
// Open your extension console (F12 in popup)
(async () => {
  const response = await fetch(
    'https://iwiwnximqjtnmmmtgmoh.functions.supabase.co/finalize-side-quests',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_ANON_KEY' // Optional for POST
      }
    }
  )
  const result = await response.json()
  console.log('Finalization result:', result)
})()
```

#### Option B: Via curl

```bash
curl -X POST https://iwiwnximqjtnmmmtgmoh.functions.supabase.co/finalize-side-quests \
  -H "Content-Type: application/json"
```

## How to Use

### Manual Trigger (For Testing)

After users submit quests, manually trigger finalization:

```javascript
// In browser console
const response = await fetch(
  'https://iwiwnximqjtnmmmtgmoh.functions.supabase.co/finalize-side-quests',
  { method: 'POST' }
)
const result = await response.json()
console.log(result)
```

Expected response:
```json
{
  "success": true,
  "message": "Finalized 1 quests",
  "finalized": [
    {
      "quest_id": "...",
      "participants": 3,
      "placements": [
        {
          "attempt_id": "...",
          "user_id": "...",
          "placement": 1,
          "xp_earned": 250,
          "accuracy": 90,
          "compositeScore": 92.0
        },
        // ... more placements
      ]
    }
  ]
}
```

### Automatic Scheduling (Production)

To run finalization automatically every hour:

#### Using Vercel/Netlify Cron

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/finalize-quests",
      "schedule": "0 * * * *"
    }
  ]
}
```

#### Using Supabase Realtime + Client-Side Job

Use the browser to poll when extension is open:
```javascript
// In popup.js, check every 5 minutes if quests need finalization
setInterval(async () => {
  const response = await fetch(
    'https://iwiwnximqjtnmmmtgmoh.functions.supabase.co/finalize-side-quests',
    { method: 'POST' }
  )
  console.log('Quest finalization check:', await response.json())
}, 5 * 60 * 1000) // 5 minutes
```

#### Using External Service (e.g., AWS CloudWatch)

Create a Lambda function that calls your Edge Function on a schedule.

## Testing Workflow

1. **Create a test quest** (use "Create Test Side Quest" button)
2. **Have 2-3 users take the quiz** (different accuracy/speed)
3. **Manually trigger finalization** (run the console script above)
4. **Check Supabase dashboard**:
   - Go to `side_quest_attempts` table
   - You should see `placement` and `xp_earned` columns filled in
   - Go to `users` table
   - Check that `xp_total` increased for all participants

## Troubleshooting

### "Function not found" error

- Function may still be deploying (wait 30 seconds)
- Check project name and function name match
- Verify you're using the correct Supabase URL

### "Missing Supabase credentials" error

- Environment variables not set in Supabase
- Check Edge Function settings have `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### XP not being awarded

- Check `add_xp_to_user` function was created (run the SQL first)
- Verify user IDs exist in the `users` table
- Check Supabase logs for errors

### "permission denied" on function

- Make sure `CREATE_ADD_XP_FUNCTION.sql` was run with service_role permissions

## What Happens to Each User

After finalization runs for an expired quest:

```
User A (Composite: 84.0)
  ✅ placement = 1
  ✅ xp_earned = 250
  ✅ users.xp_total increased by 250

User B (Composite: 82.0)
  ✅ placement = 2
  ✅ xp_earned = 200
  ✅ users.xp_total increased by 200

User C (Composite: 76.0)
  ✅ placement = 3
  ✅ xp_earned = 150
  ✅ users.xp_total increased by 150
```

## Next Steps

1. **Decide on scheduling**:
   - Manual only (run when you want)
   - Automatic (every 1-6 hours)
   - On-demand via API

2. **Set up your preferred scheduling method**

3. **Test with multiple users taking quests**

## File References

- Edge Function: `supabase/functions/finalize-side-quests/index.ts`
- PostgreSQL Function: `CREATE_ADD_XP_FUNCTION.sql`
- Client-side: Already implemented in `sideQuestSystem.js`

## Questions?

Check the function logs in Supabase Dashboard → Edge Functions → finalize-side-quests → Invocations
