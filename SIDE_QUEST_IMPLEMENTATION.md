# Side Quest System Implementation

## Overview
Complete multiplayer side quest system for Cooped, enabling coop members to compete in timed quizzes with placement-based scoring and XP rewards.

## Architecture

### Backend System (`src/logic/sideQuestSystem.js`)

#### 1. Quest Generation
```javascript
generateSideQuest(coopId)
```
- Creates a new side quest with 10 randomly selected questions
- Questions sourced from coop's selected categories and topics
- Supports configurable time windows based on frequency setting
- Stores quest metadata in `side_quests` table

**Question Categories:**
- **Learning**: General Knowledge, Math, History, Vocabulary
- **Fun**: Trivia, Sports, Movies & Media, Pop Culture
- **Random**: Real Life Events

#### 2. Quest Retrieval
```javascript
getActiveQuest(coopId)
```
- Returns the most recent active (non-expired) quest for a coop
- Calculates time remaining in milliseconds
- Returns null if no active quest available

#### 3. Question Access
```javascript
getQuestQuestionsForUser(questId, userId)
```
- Retrieves 10 questions for a specific user
- **Randomizes question order deterministically per user**
  - Uses user ID as seed for shuffle algorithm
  - Same user always gets same order for same quest
  - Different users get different orders
- Enables fair competition with variety

#### 4. Attempt Submission
```javascript
submitQuestAttempt(questId, userId, answers, startTime, endTime)
```
- Records quiz attempt with user answers
- Calculates accuracy percentage
- Tracks time taken from start to submission
- Enforces one-attempt-per-user rule
- Validates quest hasn't expired

#### 5. Result Finalization
```javascript
finalizeQuestResults(questId)
```
- Called after quest expires
- Sorts all attempts by accuracy (primary) and time (secondary)
- Assigns placements (1st, 2nd, 3rd, etc.)
- Calculates XP rewards based on placement:
  - **1st Place**: 250 XP
  - **2nd Place**: 200 XP
  - **3rd Place**: 150 XP
  - **4th+/Participation**: 100 XP

### Database Schema

#### `side_quests` Table
```sql
{
  id: uuid (primary key),
  coop_id: uuid (foreign key),
  category: string ('learning' | 'fun' | 'random'),
  questions: json (array of 10 question objects),
  created_at: timestamp,
  expires_at: timestamp,
  status: string ('active' | 'completed' | 'expired')
}
```

#### `side_quest_attempts` Table
```sql
{
  id: uuid (primary key),
  quest_id: uuid (foreign key),
  user_id: uuid (foreign key),
  coop_id: uuid (foreign key),
  answers: json (array of selected option indices),
  start_time: timestamp,
  end_time: timestamp,
  accuracy_percent: integer (0-100),
  time_taken_seconds: integer,
  created_at: timestamp
}
```

### Frontend System (`src/popup/screens/side-quest-screen.js`)

#### Screen Stages

**1. Intro Stage**
- Displays quest icon and category
- Shows 10 questions count
- Displays time limit (4 hours)
- Shows XP reward breakdown
- "Start Quiz" button

**2. Quiz Stage**
- Shows current question and progress
- 4 multiple choice options (A, B, C, D)
- Answer selection with visual feedback
- Progress bar showing completion percentage
- Previous/Next navigation
- Submit button on last question

**3. Results Stage**
- Score display (e.g., 8/10)
- Accuracy percentage
- Message confirming submission
- Note about placement calculation
- "Return to Home" button

#### Features
- **Timer Display**: Shows time remaining on quiz page
- **Progress Tracking**: Progress bar for quiz completion
- **Confirmation**: Alert on back button during quiz
- **Automatic Loading**: Fetches user-specific randomized questions
- **Error Handling**: Graceful errors for expired quests, existing attempts

### Home Screen Integration (`src/popup/screens/home-screen.js`)

#### Side Quest Button
When user is in a coop with active side quests:
- **Display**: "🎯 Side Quest Available" button with countdown timer
- **Timer Format**: HH:MM:SS (e.g., "04:00:00")
- **Updates**: Real-time countdown every second
- **Auto-Refresh**: Reloads screen when quest expires
- **Conditional**: Only shows if:
  - User is in a coop
  - Side quests enabled for that coop
  - Active quest exists and not expired

#### Navigation
```javascript
onSideQuestClick() {
  window.dispatchEvent(new CustomEvent('navigateToScreen', {
    detail: { screen: 'side-quest', coopId: this.coopInfo.id }
  }));
}
```

### Routing & Navigation (`src/popup/popup.js`)

#### Screen Registration
```javascript
import { SideQuestScreen } from './screens/side-quest-screen.js';

// In initializeScreens():
sideQuestScreen = new SideQuestScreen();

// In showScreen():
case 'side-quest':
  await sideQuestScreen.show(data.coopId);
  break;
```

#### Sub-Screen Protection
- `side-quest` marked as sub-screen (no bottom nav switching)
- Prevents accidental navigation during quiz
- Similar to `coop-settings` behavior

### Bottom Navigation (`src/popup/components/bottom-nav.js`)
```javascript
const subScreens = ['coop-settings', 'side-quest'];
if (subScreens.includes(this.activeTab)) {
  console.log('Cannot switch tabs while on sub-screen');
  return;
}
```

## Configuration Integration

### Coop Settings (`coop-settings-screen.js`)
Side quests settings stored in `coops` table:
```javascript
{
  side_quests_enabled: boolean,
  side_quest_category: string,
  side_quest_topics: string[],
  side_quest_frequency: string ('daily' | 'weekly'),
  side_quest_frequency_count: integer
}
```

### Frequency Settings
- **Daily**: 4-hour completion window, 7 quests per week
- **Weekly**: 24-hour completion window, 1 quest per week

## User Flow

1. **User enters coop view**
   - Home screen loads
   - Active quest detected if side quests enabled

2. **User sees "Side Quest Available" button**
   - Shows countdown timer
   - Displays time remaining until quest expires

3. **User clicks button**
   - Navigates to side-quest screen
   - Loads quest intro with details

4. **User clicks "Start Quiz"**
   - Fetches 10 randomized questions
   - Records start time
   - Shows first question

5. **User answers questions**
   - Can navigate between questions
   - Each answer tracked in real-time

6. **User submits quiz**
   - Records end time
   - Submits answers to backend
   - Sees results screen

7. **Backend finalizes results**
   - When all users complete or quest expires
   - Calculates placements
   - Awards XP based on ranking

## Question Randomization Algorithm

```javascript
function randomizeQuestionsPerUser(questions, userId) {
  const seed = userId
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const random = Math.sin(seed + i) * 10000;
    const j = Math.floor((random - Math.floor(random)) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

**Benefits:**
- Deterministic: Same user always gets same order for same quest
- Fair: Different users get different orders
- No server-side randomization needed per user

## Scoring Logic

### Accuracy Calculation
```javascript
const accuracy = Math.round((correctCount / totalQuestions) * 100)
```

### Placement Ranking
1. **Primary**: Accuracy percentage (descending)
2. **Secondary**: Time taken in seconds (ascending)
   - If two users have same accuracy, faster user ranks higher

### XP Rewards
```javascript
const xpRewards = {
  1: 250,  // 1st place
  2: 200,  // 2nd place
  3: 150,  // 3rd place
  4: 100   // Participation/other
}
```

## Error Handling

### Quest Not Found
- Returns null in `getActiveQuest`
- Home screen shows no button
- Graceful navigation back to coop view

### Quest Expired
- `submitQuestAttempt` returns error
- Front-end shows error message
- User can return to home

### Duplicate Attempt
- `submitQuestAttempt` checks for existing attempt
- Returns "Already completed" error
- Prevents multiple attempts per user

### Missing Topics
- `generateSideQuest` validates topic selection
- Returns error if < 10 questions available
- Requires coop creator to select topics

## Security Considerations

1. **One Attempt Per User**: Enforced at database/logic level
2. **Timestamp Validation**: Quest expiration checked server-side
3. **Answer Validation**: Correct answers stored on server, not client
4. **User Authentication**: All operations require authenticated user
5. **Accuracy Calculation**: Performed server-side in finalization

## Future Enhancements

1. **Live Leaderboard**: Real-time placement updates during quest period
2. **Notifications**: Alert users when quest is available/results ready
3. **Question Difficulty**: Adaptive difficulty based on user performance
4. **Custom Quests**: Allow coop creators to add custom questions
5. **Team Quests**: Multiple users answering same question simultaneously
6. **Timed Questions**: Individual time limits per question
7. **Streaks**: Track consecutive quest participation
8. **Achievements**: Badges for high scores, perfect accuracy, etc.

## Testing Checklist

- [ ] Quest generation with valid topics
- [ ] Active quest retrieval when quest exists
- [ ] Active quest returns null when expired
- [ ] Question randomization consistent per user
- [ ] Answer submission with accuracy calculation
- [ ] Placement calculation with tie-breaking
- [ ] XP reward assignment
- [ ] One attempt per user enforcement
- [ ] Side quest button appears when active quest exists
- [ ] Side quest button timer counts down
- [ ] Side quest button disappears when expired
- [ ] Navigation to side-quest screen works
- [ ] Back button protection during quiz
- [ ] Results screen displays after submission
- [ ] Return to home from results

## Files Modified

### New Files
- `src/logic/sideQuestSystem.js` - Core quiz logic
- `src/popup/screens/side-quest-screen.js` - Quiz UI

### Modified Files
- `src/popup/screens/home-screen.js` - Added quest button and timer
- `src/popup/popup.js` - Registered SideQuestScreen
- `src/popup/components/bottom-nav.js` - Added side-quest to sub-screens

## Commit
`779815d - Implement complete side quest system with multiplayer gameplay`

---

**Status**: Implementation Complete
**Date**: November 20, 2025
**Tested**: Ready for database testing and UI refinement
