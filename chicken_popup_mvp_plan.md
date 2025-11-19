
# 🐔 Chicken Popup – Complete MVP Build Plan  
**Formatted for Claude / Dev Team**  
**Version: MVP Roadmap Document**

---

# 📌 Overview

This document contains the **entire Chicken Popup MVP plan** including:

- What has already been built  
- The exact order of development  
- Backend schema  
- XP / eggs / streak / skip logic  
- Coop system  
- Auth + account system  
- Blocker logic  
- Mini-games integration  
- Animation hook system  
- Extension-first architecture  
- Step-by-step actionable tasks for Claude (“Do X”, “Create Y”, “Write Z function”)

Your job:  
Give this document to Claude and it will be able to **track progress**, generate code, and recommend next tasks automatically.

---

# 🧱 SECTION 1 — Current Progress

### ✔ Already Built
- Basic Chrome extension structure  
- Blocker triggers  
- One or more mini-games  
- Ability to show a game when user visits a blocked site  

### ⏳ Not Yet Built
Everything below this line:

- Backend (Firebase/Supabase)  
- XP/Egg/Streak logic  
- Daily skip system (hearts)  
- Coop backend + UI  
- Sign-in system (Google, email, phone, guest)  
- Time tracking of stimming events  
- Animation event hooks  
- Final art assets (will be added LAST)  
- Mobile apps (to be done AFTER extension MVP)

---

# 🚀 SECTION 2 — MVP BUILD ORDER  
(This is the correct order. Claude should track each task.)

---

# ✅ **STEP 1 — Backend + Account System**

### 🎯 Goal  
Create persistent accounts so XP, eggs, streaks, coop membership, and game progress sync across devices.

### ✔ Use one of:
- Firebase Auth + Firestore  
- OR Supabase Auth + Postgres  

### 📁 Claude: **Do This**
1. Create `/backend` directory inside the project.  
2. Add Firebase or Supabase SDK to extension.  
3. Implement functions:  
   ```js
   createUser(authProvider)
   loginUser(authProvider)
   logoutUser()
   getCurrentUser()
   ```
4. Create database collections/tables:

#### **users**
```
id
auth_provider
xp_total
level
eggs
streak_days
last_stim_date
hearts_remaining_today
skip_until
coop_id
created_at
updated_at
```

#### **coops**
```
id
name
creator_user_id
member_ids
coop_level
total_xp
created_at
```

#### **xp_events**
```
id
user_id
type ("clean_day", "stim_penalty", "challenge_win", etc.)
delta
timestamp
metadata
```

#### **stim_events**
```
id
user_id
url
started_at
ended_at
skip_used (bool)
blocked (bool)
```

---

# ✅ **STEP 2 — XP / Egg / Streak Engine**

This is the **core brain** of the product.

### ✔ XP Rules  
- +150 XP → clean day  
- +200 XP → clean streak ≥ 3  
- -50 XP → if user stims and continues  
- +100 XP → challenge finish  
- +150/200/250 XP → placement  
- Every **1000 XP → +1 egg + 1 level + coop_point**

### 📁 Claude: **Implement `xpEngine.js`**
Create file:
```
/src/logic/xpEngine.js
```

Include:

```js
export function applyXpEvent(user, eventType, metadata) {
  // Loads user from DB
  // Applies XP change
  // Updates level + eggs if crossing 1000 XP boundaries
  // Updates streak logic
  // Saves user back to DB
  // Returns updated user
}
```

### ✔ Streak Logic
- If user has **no stimming events today → clean day**
- If streak ≥ 2, next day clean gives +200
- If user stims → streak resets to 0

---

# ✅ **STEP 3 — Skip System (Hearts)**

### ✔ Rules
- 3 hearts per day  
- Each heart = 20 minutes  
- When used → blocker sleeps until `skip_until` timestamp  

### 📁 Claude: **Implement `skipSystem.js`**
Create file:

```
/src/logic/skipSystem.js
```

Functions required:
```js
getAvailableHearts(user)
useHeart(user)
resetHeartsDaily(user)
isUserInSkipPeriod(user)
```

---

# ✅ **STEP 4 — Coop System (Basic MVP)**

### 🎯 Goal  
Allow people to create/join a coop and see each other’s rank.

### ✔ Coop Rules
- Coop rank = sum of members’ levels  
- Members sorted by level  
- Show chicken avatar + level  

### 📁 Claude: **Implement `coopManager.js`**
Create file:

```
/src/logic/coopManager.js
```

Functions:
```js
createCoop(name, creatorUserId)
joinCoop(userId, coopId)
leaveCoop(userId)
getCoopData(coopId)
updateCoopStats(coopId)
```

### ✔ UI needs:
A simple page:
```
Your Coop:
- Member 1 (Level 5)
- Member 2 (Level 3)
- Member 3 (Level 2)
Coop Rank: 10
```

No art needed yet.

---

# ✅ **STEP 5 — Auth UI (Google, Email, Phone, Guest)**

### 📁 Claude: **Implement components**
```
LoginScreen.js
SignupScreen.js
GuestModeButton.js
LogoutButton.js
```

### ✔ Requirements
- Google OAuth  
- Email/password  
- Phone (optional MVP)  
- Guest mode = random UUID  
- Save user to DB after creation  

---

# ✅ **STEP 6 — Stimming Detection & Time Tracking**

### 🎯 Goal  
Track when a user visits blocked sites.

### ✔ Claude: Implement:
```
/src/logic/stimTracker.js
```

Functions:
```js
startStimEvent(url, userId)
endStimEvent(eventId)
recordStimPenalty(userId)
```

Extensions scripts should call:

- `startStimEvent()` when user lands on blocked site  
- `endStimEvent()` when user leaves or blocker wins  

---

# ✅ **STEP 7 — Integrate Existing Mini-Games**

Since games already exist:

### ✔ Claude: Wrap each game with:
```js
startGame(gameId, userId)
finishGame(gameId, resultData)
applyXpEvent(...)
```

Place in:
```
/src/games/
```

---

# ✅ **STEP 8 — Build the MVP UI (Placeholder Art)**

No animations yet.  
Just rectangles, text, layout.

Screens needed:

- Blocker screen  
- Mini-game container  
- Stats view (XP, Level, Eggs, Streak)  
- Coop view  
- Login/signup  
- Settings (blocklist, coop settings)

Claude can scaffold UI using:
- Plain HTML/CSS
- Or React (if extension setup supports it)

---

# ✅ **STEP 9 — Add Animation Hooks (DO NOT Add Animations Yet)**

### Purpose  
Your designer will later attach animations to these events, NOT you.

### 📁 Claude: Add `animationEvents.js`

```
export function triggerAnimation(type, payload) {
  // For MVP: console.log(type, payload)
  // Later: designer maps these to real animations
}
```

### Hooks to add:
- `"LEVEL_UP"`
- `"BRAIN_BONK"`
- `"EGG_GAINED"`
- `"HEART_USED"`
- `"STREAK_UP"`
- `"STIM_DETECTED"`
- `"GAME_WIN"`
- `"GAME_LOSE"`

Whenever XP changes or a penalty occurs, call:
```js
triggerAnimation("LEVEL_UP", { newLevel: user.level })
```

---

# 🧩 SECTION 3 — Full Firestore Schema (Copy/Paste For Claude)

```json
{
  "users": {
    "id": "string",
    "auth_provider": "google|email|phone|guest",
    "xp_total": 0,
    "level": 0,
    "eggs": 0,
    "streak_days": 0,
    "last_stim_date": null,
    "hearts_remaining_today": 3,
    "skip_until": null,
    "coop_id": null,
    "created_at": "",
    "updated_at": ""
  },
  "coops": {
    "id": "string",
    "name": "string",
    "creator_user_id": "string",
    "member_ids": [],
    "coop_level": 0,
    "total_xp": 0,
    "created_at": ""
  },
  "xp_events": {
    "id": "string",
    "user_id": "string",
    "type": "string",
    "delta": 0,
    "timestamp": ""
  },
  "stim_events": {
    "id": "string",
    "user_id": "string",
    "url": "string",
    "started_at": "",
    "ended_at": "",
    "skip_used": false,
    "blocked": false
  }
}
```

---

# 🧪 SECTION 4 — Final MVP Feature Checklist (For Claude to Track)

### Backend
- [ ] Firebase/Supabase connected  
- [ ] User auth implemented  
- [ ] Firestore/Postgres schema created  
- [ ] XP engine implemented  
- [ ] Skip/hearts logic implemented  
- [ ] Coop system implemented  
- [ ] Stim tracking implemented  

### Extension UI
- [ ] Blocker screen  
- [ ] Stats view  
- [ ] Coop view  
- [ ] Login/signup screens  
- [ ] Placeholder chicken evolution UI  
- [ ] Skip usage UI  
- [ ] Settings  

### Logic / Events
- [ ] Call `applyXpEvent` on stim, streak, challenge  
- [ ] Call `useHeart` when skipping  
- [ ] Call `triggerAnimation` on all key events  

### Testing
- [ ] XP increases correctly  
- [ ] Eggs appear every 1000 XP  
- [ ] Level increases  
- [ ] Streak resets on stim  
- [ ] Hearts reset daily  
- [ ] Coop updates when members level up  

---

# 🎨 SECTION 5 — What Happens AFTER MVP  
Designer adds:

- Chicken evolution art  
- Brain damage animation  
- Heal animation  
- Hearts  
- Coop banners  
- Mini-game UI polish  
- Smooth transitions  
- Sound effects  

Since animation hooks already exist, this will require **zero backend or logic changes**.

---

# 📱 SECTION 6 — Transition to iOS/Android (Later)

Once Chrome MVP is live:

- Reuse the same backend  
- Reuse XP engine  
- Reuse coop system  
- Reuse games  
- Add Freedom-style VPN blocking  
- Add mobile notifications for streaks  
- Add mobile UI for stats + coop  
- Everything else stays the same  

---

# 🎉 Done  
This file contains EVERYTHING Claude needs to:

- Understand the entire system  
- Track progress  
- Build missing components  
- Provide actionable next steps  
- Keep statefulness during development  
