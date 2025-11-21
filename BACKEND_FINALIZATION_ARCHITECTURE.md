# Backend Finalization Architecture

## Overview

The quest finalization system is a two-part backend:

1. **Supabase Edge Function** - Serverless function that runs the finalization logic
2. **PostgreSQL Function** - Database function that adds XP to users

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FINALIZATION FLOW                        │
└─────────────────────────────────────────────────────────────┘

1. TRIGGER (Manual or Scheduled)
   └─→ POST /finalize-side-quests

2. EDGE FUNCTION
   ├─→ Find expired quests (expires_at < now, status = 'active')
   ├─→ For each expired quest:
   │  ├─→ Get all attempts
   │  ├─→ Calculate composite scores (80/20 formula)
   │  ├─→ Assign placements
   │  └─→ Assign XP rewards
   │
   └─→ For each placement:
      ├─→ Update side_quest_attempts (placement + xp_earned)
      ├─→ Call add_xp_to_user()
      └─→ Mark quest as completed

3. DATABASE UPDATES
   ├─→ side_quest_attempts table
   │  └─→ placement, xp_earned columns
   │
   ├─→ users table (via add_xp_to_user)
   │  └─→ xp_total, level columns
   │
   └─→ side_quests table
      └─→ status = 'completed'

4. RESPONSE
   └─→ JSON with finalized quests & placements
```

## Files

### 1. Edge Function: `supabase/functions/finalize-side-quests/index.ts`

**What it does:**
- Receives POST request
- Finds all expired quests
- Calculates scores using 80/20 formula
- Updates database
- Returns results

**Triggers:**
- Manual: Browser console or API call
- Scheduled: Cron job (external service)
- Webhook: Custom trigger

**Environment:**
- Deno runtime
- Supabase JS client
- Service Role Key (for database access)

**Response:**
```json
{
  "success": true,
  "message": "Finalized X quests",
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
        }
      ]
    }
  ]
}
```

### 2. PostgreSQL Function: `add_xp_to_user`

**What it does:**
- Takes user_id and xp_amount
- Adds XP to user's xp_total
- Recalculates level (1000 XP per level)
- Returns new totals

**Called by:**
- Edge Function (once per attempt)
- Can also be called manually: `supabase.rpc('add_xp_to_user', { user_id: '...', xp_amount: 250 })`

**SQL:**
```sql
SELECT add_xp_to_user(user_id, xp_amount)
```

## Composite Score Calculation

The Edge Function implements the same 80/20 scoring as the frontend:

```javascript
const accuracyScore = attempt.accuracy_percent // 0-100

const speedScore =
  minTime === maxTime
    ? 100
    : 100 - ((attempt.time_taken_seconds - minTime) / timeRange) * 100

const compositeScore = (accuracyScore * 0.8) + (speedScore * 0.2)
```

**Example:**
- User A: 80% accurate, 45 sec (fastest) → Score = (80 × 0.8) + (100 × 0.2) = 84.0 → 1st Place (250 XP)
- User B: 90% accurate, 90 sec (medium) → Score = (90 × 0.8) + (50 × 0.2) = 82.0 → 2nd Place (200 XP)
- User C: 95% accurate, 180 sec (slowest) → Score = (95 × 0.8) + (0 × 0.2) = 76.0 → 3rd Place (150 XP)

## How to Trigger Finalization

### Option 1: Manual (Browser Console)

```javascript
await fetch(
  'https://iwiwnximqjtnmmmtgmoh.functions.supabase.co/finalize-side-quests',
  { method: 'POST' }
).then(r => r.json()).then(console.log)
```

### Option 2: Scheduled (Every Hour)

Use external service like:
- **AWS CloudWatch** → Lambda function
- **Google Cloud Scheduler** → HTTP endpoint
- **Vercel Crons** → API route
- **GitHub Actions** → Workflow trigger

```yaml
# Example: GitHub Actions (free tier)
name: Finalize Quests
on:
  schedule:
    - cron: '0 * * * *' # Every hour

jobs:
  finalize:
    runs-on: ubuntu-latest
    steps:
      - name: Finalize expired quests
        run: |
          curl -X POST \
            https://iwiwnximqjtnmmmtgmoh.functions.supabase.co/finalize-side-quests \
            -H "Content-Type: application/json"
```

### Option 3: On-Demand (Add Button)

Add a "Finalize Quests" button to admin panel:

```javascript
// In settings-screen.js
async function onFinalizeQuestsClick() {
  try {
    const response = await fetch(
      'https://iwiwnximqjtnmmmtgmoh.functions.supabase.co/finalize-side-quests',
      { method: 'POST' }
    )
    const result = await response.json()
    alert(`✅ Finalized ${result.finalized.length} quests`)
  } catch (err) {
    alert(`❌ Error: ${err.message}`)
  }
}
```

### Option 4: Client-Side Polling

Auto-check every 5 minutes when extension is open:

```javascript
// In popup.js
setInterval(async () => {
  const response = await fetch(
    'https://iwiwnximqjtnmmmtgmoh.functions.supabase.co/finalize-side-quests',
    { method: 'POST' }
  )
  console.log('Finalization check completed')
}, 5 * 60 * 1000)
```

## Database Schema Required

### side_quest_attempts table

Must have these columns:
```sql
id UUID PRIMARY KEY
quest_id UUID FOREIGN KEY (side_quests)
user_id UUID FOREIGN KEY (users)
coop_id UUID FOREIGN KEY (coops)
answers JSONB
start_time TIMESTAMP
end_time TIMESTAMP
accuracy_percent INTEGER (0-100)
time_taken_seconds INTEGER (whole seconds)
placement INTEGER (filled by finalization) ✅ NEW
xp_earned INTEGER (filled by finalization) ✅ NEW
created_at TIMESTAMP
```

### users table

Must have these columns:
```sql
id UUID PRIMARY KEY
xp_total INTEGER (updated by add_xp_to_user)
level INTEGER (updated by add_xp_to_user)
... other columns
updated_at TIMESTAMP
```

### side_quests table

Must have these columns:
```sql
id UUID PRIMARY KEY
coop_id UUID
category TEXT
questions JSONB
created_at TIMESTAMP
expires_at TIMESTAMP
status TEXT ('active', 'completed')
created_by UUID
```

## Deployment Steps

### Step 1: Create PostgreSQL Function

Run in Supabase SQL Editor:
```sql
-- Paste entire CREATE_ADD_XP_FUNCTION.sql
```

### Step 2: Deploy Edge Function

Option A (via CLI):
```bash
supabase functions deploy finalize-side-quests
```

Option B (via Dashboard):
1. Go to Edge Functions
2. Create new function: `finalize-side-quests`
3. Paste `supabase/functions/finalize-side-quests/index.ts`
4. Click Deploy

### Step 3: Set Up Scheduling

Choose one of the trigger options above.

## Testing Checklist

- [ ] Created test quest
- [ ] 2-3 users took the quiz
- [ ] Quest has expired (or manually update `expires_at`)
- [ ] Ran finalization script
- [ ] Check `side_quest_attempts` → `placement` filled
- [ ] Check `side_quest_attempts` → `xp_earned` filled
- [ ] Check `users` → `xp_total` increased
- [ ] Check `side_quests` → `status = 'completed'`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Function 404 | Deploy Edge Function first |
| Permission denied | Run CREATE_ADD_XP_FUNCTION.sql |
| No quests finalized | Check `expires_at` timestamp format |
| XP not added | Verify `add_xp_to_user` exists in Functions tab |
| Wrong placements | Check composite score calculation in Edge Function |

## Future Enhancements

- [ ] Store finalization history (audit trail)
- [ ] Send notifications when quest completes
- [ ] Webhook on finalization (Discord bot integration)
- [ ] Leaderboard update on finalization
- [ ] Unlock achievements based on placement
- [ ] Track "fastest completion" separately
- [ ] Bonus XP for perfect scores (10/10)

## Performance Considerations

- Edge Function runs in milliseconds
- Parallel processing could optimize for many participants
- Database queries are indexed on quest_id and user_id
- Consider pagination if a quest has 100+ participants

## Security

- Edge Function uses Service Role Key (backend only)
- add_xp_to_user has proper RLS
- No direct XP modification via client
- All XP changes are auditable in side_quest_attempts

## Costs

- **Supabase Edge Functions**: Free tier includes 500K invocations/month
- **Database**: Standard pricing
- **Scheduler** (external): Depends on service (GitHub Actions = free)
