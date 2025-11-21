# Side Quest Scoring System

## Overview

The side quest system uses a **composite scoring formula** that balances both accuracy and speed:

```
Composite Score = (Accuracy × 0.8) + (Speed Score × 0.2)
```

This means:
- **80% weight** on getting answers correct
- **20% weight** on how fast you complete the quiz

---

## How the Scoring Works

### 1. Accuracy Score (80%)
- Based on the number of correct answers out of 10
- Score: 0-100 (100 = all correct, 0 = all wrong)
- **Formula**: `(correct_answers / 10) × 100`

**Example:**
- 9/10 correct = 90 accuracy score
- 7/10 correct = 70 accuracy score

### 2. Speed Score (20%)
- Based on how fast you complete the quiz relative to other participants
- Score: 0-100 (100 = fastest, 0 = slowest)
- **Formula**: `100 - ((your_time - fastest_time) / time_range) × 100`

**Example with 3 players:**
- Player A: 45 seconds
- Player B: 90 seconds
- Player C: 120 seconds

Speed scores:
- Player A (fastest): 100
- Player B: 59 (about 59% of possible speed points)
- Player C (slowest): 0

### 3. Composite Score
Combines accuracy and speed into final ranking:

**Formula**: `(Accuracy × 0.8) + (Speed × 0.2)`

**Example:**
```
Player A: (80 × 0.8) + (100 × 0.2) = 64 + 20 = 84.0
Player B: (90 × 0.8) + (59 × 0.2) = 72 + 11.8 = 83.8
Player C: (95 × 0.8) + (0 × 0.2) = 76 + 0 = 76.0
```

**Ranking:**
1. Player A (84.0) - 1st place: 250 XP ⭐
2. Player B (83.8) - 2nd place: 200 XP
3. Player C (76.0) - 3rd place: 150 XP

---

## Why This Weighting?

### Accuracy (80%)
- Getting the right answer is the primary goal
- Encourages learning and knowledge
- The bulk of the score

### Speed (20%)
- Adds competitive element without overshadowing knowledge
- Rewards quick thinking and decisiveness
- Prevents "slowest person wins" scenario

---

## XP Rewards

After the quest expires, rankings are finalized and XP is awarded:

| Placement | XP Earned | What You Did |
|-----------|-----------|--------------|
| 1st Place | 250 XP | Best composite score |
| 2nd Place | 200 XP | Second best composite score |
| 3rd Place | 150 XP | Third best composite score |
| 4th+ | 100 XP | Participated (participation reward) |

---

## Examples

### Scenario 1: Speed vs Accuracy Trade-off

**Player A** (Smart & Deliberate)
- Accuracy: 100% (10/10 correct)
- Time: 180 seconds (slowest)
- Speed Score: 0
- Composite: (100 × 0.8) + (0 × 0.2) = **80.0** ⭐ 1st Place

**Player B** (Quick & Accurate)
- Accuracy: 90% (9/10 correct)
- Time: 60 seconds (fastest)
- Speed Score: 100
- Composite: (90 × 0.8) + (100 × 0.2) = **92.0** ⭐ 1st Place (Actually wins!)

### Scenario 2: Good Balance

**Player C**
- Accuracy: 85% (8.5/10 average)
- Time: 120 seconds (middle)
- Speed Score: 50
- Composite: (85 × 0.8) + (50 × 0.2) = **78.0**

---

## Edge Cases

### Everyone has same accuracy
Example: 3 users all get 80% correct
- Winner = person who finished fastest
- Speed component determines ranking

### Only one participant
- They get 100 speed score (no comparison point)
- Get 1st place rewards (250 XP)

### Tied composite scores
- Currently: Whoever submitted first wins
- Future: Could add tiebreaker logic

---

## Implementation Details

### Time Calculation
- Measured in whole seconds (rounded)
- From quiz start to submission time
- Server-side calculation for accuracy

### Score Storage
- `accuracy_percent`: 0-100 (integer)
- `time_taken_seconds`: whole seconds (integer)
- `speed_score`: 0-100 (calculated, not stored)
- `composite_score`: 0-100.00 (calculated, not stored)
- `placement`: 1, 2, 3, 4+ (calculated after quest expires)
- `xp_earned`: 250, 200, 150, or 100 (calculated after quest expires)

### Database Columns
```sql
time_taken_seconds INTEGER -- How long the quiz took in seconds
accuracy_percent INTEGER   -- Accuracy as percentage (0-100)
placement INTEGER          -- Final ranking (1st, 2nd, 3rd, etc)
xp_earned INTEGER          -- XP earned based on placement
```

---

## Future Enhancements

- **Dynamic weights**: Different events could use different ratios
- **Bonus points**: Extra XP for perfect scores (10/10)
- **Streak bonuses**: Bonus XP if you win multiple quests in a row
- **Speed tiers**: "Blazing Fast" achievement for <60 second completes
- **Difficulty scaling**: Harder questions = more XP potential
- **Leaderboard stats**: Track "Most Accurate" vs "Fastest" separately

---

## How to Test

1. Create a test side quest in coop settings
2. Have multiple users take the quiz
3. After quest expires, results are finalized
4. Check `side_quest_attempts` table for scores
5. Verify composite score calculation matches formula

---

## Technical Notes

### Bug Fixed
- Time calculation now returns integer (was returning float like 32.052)
- Changed: `timeTakenSeconds / 1000` → `Math.round(timeTakenSeconds / 1000)`

### Score Calculation
- All scores rounded to nearest integer for storage
- Composite scores rounded to 2 decimals for display
- Speed normalized against min/max times in attempt group

### Sorting
- Primary sort: Composite score (highest first)
- No secondary sort needed (composite is definitive)

---

## Questions?

The scoring formula is designed to:
✅ Reward accuracy heavily (80%)
✅ Reward speed lightly (20%)
✅ Balance learning with competition
✅ Make every second count, but not too much
