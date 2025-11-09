# Cooped - Chrome Extension MVP Project Plan

**Project Name:** Cooped
**Tagline:** "Stay focused, one challenge at a time."
**Platform:** Chrome Extension (Manifest V3)
**Status:** In Development (MVP Phase)

---

## 📋 Project Overview

### Mission Statement
Build a Chrome extension that transforms website blocking into an engaging experience by forcing users to complete educational challenges before accessing distracting sites. Users earn points and eggs through challenges and avoiding sites, with a cute chicken mascot that evolves as they progress. Every time they think about checking social media, they face a fun question instead.

### Current MVP Scope

#### ✅ Completed Features
- Site blocking (YouTube, Instagram, Twitter, Reddit, Facebook, TikTok)
- Challenge overlay with OpenTriviaDB integration
- Challenge persistence (prevent refresh bypass)
- Interval-based re-engagement ("You're still here?" popup after 5/15/30 min)
- Activity detection for re-engagement triggers
- Challenge difficulty progression (easy/medium/hard)
- Multiple challenge types (trivia, math, word)

#### 🔄 In Progress
- **Economy System**
  - Points system (+150/day avoidance, -15 correct, -25 wrong, -1 per minute)
  - Eggs currency (100 points = 1 egg)
  - Rank progression (Egg → Chick → Pecker → Chicken → HEN)
  - Streak tracking (🔥 emoji at 2+ days, survives if correct + <5 min on site)
  - Time tracking on blocked sites
  - Skip penalty (1 egg cost)

#### 📋 Planned Features (Phase 2)
- Shop UI with 16 cosmetics at 5 eggs each
- Weekly egg conversion (Sunday 9 AM PST)
- Firebase backend for account persistence
- Backend account system for cosmetic tracking
- Stats dashboard with economy display

#### ❌ Not Included (MVP)
- Multiplayer/co-op features
- Tournaments and leaderboards
- Daily scheduled popups
- Advanced animations/Lottie integration
- Mobile apps
- User-generated challenges

---

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend:** Vanilla JavaScript (no framework)
- **Storage:** Chrome Storage API (local)
- **Backend:** Firebase (future - for accounts & persistence)
- **API:** OpenTriviaDB (free, no auth required)
- **Browser:** Chrome/Chromium-based

### File Structure
```
Cooped/
├── manifest.json                 # Extension config
├── src/
│   ├── background/
│   │   └── service-worker.js     # Background monitoring
│   ├── content/
│   │   ├── content-script.js     # Challenge overlay & UI
│   │   └── challenge-overlay.css # Styling
│   ├── popup/
│   │   ├── popup.html            # Extension popup
│   │   ├── popup.css
│   │   └── popup.js
│   ├── utils/
│   │   ├── storage.js            # All storage operations
│   │   ├── api.js                # OpenTriviaDB wrapper
│   │   └── mascot.js             # XP & progression logic
│   ├── types/
│   │   └── types.js              # TypeScript definitions & constants
│   └── assets/
│       ├── mascot/
│       └── icons/
├── challenges/
│   └── challenge-bank.js         # Challenge system & offline fallback
└── README.md
```

---

## 💾 Data Model

### User Stats (Stored Locally)
```javascript
{
  // Legacy (for XP system)
  challengesCompleted: number,
  experience: number,
  level: number,

  // Streak System
  currentStreak: number,        // Days consecutive (🔥 at 2+)
  longestStreak: number,
  lastActivityDate: timestamp,

  // Economy System
  points: number,               // Main currency
  eggs: number,                 // Premium currency
  rank: string,                 // Egg|Chick|Pecker|Chicken|HEN
  lastDayChecked: number,       // For daily +150 bonus
  lastEggConversion: timestamp,  // Last Sunday 9 AM PST

  // Time Tracking
  totalTimeBlocked: number      // Total ms on blocked sites
}
```

### Rank Tiers
- **Egg**: 0-19 challenges
- **Chick**: 20-49 challenges
- **Pecker**: 50-99 challenges
- **Chicken**: 100-199 challenges
- **HEN**: 200+ challenges

### Cosmetics Catalog (16 items, 5 eggs each)
- Backgrounds: Sunset, Ocean, Forest, Space
- Hats: Crown, Party, Wizard, Flower
- Scarves: Red, Blue, Rainbow
- Shoes: Sparkles, Cowboy, Roller Skates
- Nests: Golden, Cozy, Rainbow

---

## 🎮 Core Mechanics

### Challenge Flow
1. User visits blocked site → Challenge overlay appears
2. User answers correctly → Interval selection popup
3. User picks 5/15/30 min → Gets access for that time
4. After interval expires + still active → Re-engagement challenge

### Points Economy
```
Daily:  +150 pts for avoiding all blocked sites (once per calendar day)

Challenge:
  Correct answer:  -15 pts
  Wrong answer:    -25 pts
  Time penalty:    -1 pt per minute on site

Skip:    Costs 1 egg (premium action)

Weekly:  100 points → 1 egg (Sunday 9 AM PST auto-conversion)
```

### Streak Mechanics
- Increases by 1 each day user completes a challenge OR avoids sites entirely
- Shows 🔥 emoji at 2+ consecutive days
- **Survives site visit if**: Answer correct AND time on site < 5 minutes
- **Breaks if**: Wrong answer OR spend ≥5 minutes on site

### Time Tracking
- Starts when user skips a challenge OR after answering correctly and staying on site
- Tracks minutes spent, applies -1 pt per minute penalty
- Affects streak survival (must be < 5 mins to keep streak alive)

---

## 📅 Development Roadmap

### MVP Phase (Current)
- [x] Site blocking & challenge system
- [x] Challenge persistence (refresh bypass prevention)
- [x] Re-engagement system
- [ ] Economy system integration
- [ ] Points/eggs/rank system
- [ ] Time tracking system
- [ ] Streak system
- [ ] Skip penalty system
- [ ] Stats display
- [ ] Shop UI
- [ ] Account system (Firebase)

### Phase 2 (Post-MVP)
- [ ] Backend synchronization
- [ ] Account login/signup
- [ ] Cloud save for cosmetics
- [ ] Enhanced mascot animations (Lottie)
- [ ] Detailed analytics dashboard
- [ ] Performance optimizations

---

## 🔄 Current Implementation Details

### Storage Functions (src/utils/storage.js)
- `addPoints(amount)` - Add/subtract points
- `addEggs(amount)` - Add/subtract eggs
- `getBalance()` - Get current points & eggs
- `checkDailyAvoidanceBonus()` - Award 150 pts once per day
- `startTimeTrackingSession(hostname)` - Begin time tracking
- `endTimeTrackingSession()` - End tracking, calculate penalty
- `processChallengeResult(correct, timeOnSite)` - Apply points
- `updateStreak(correct, timeOnSite)` - Handle streak logic
- `updateRank()` - Calculate new rank tier
- `applySkipPenalty()` - Deduct 1 egg for skip

### Content Script Integration (in progress)
- Import all economy functions
- Call `startTimeTrackingSession()` on skip
- Call `endTimeTrackingSession()` before overlay close
- Call `processChallengeResult()` on correct/wrong answers
- Call `updateStreak()` after processing challenge
- Call `updateRank()` to update user rank
- Display points, eggs, rank, and 🔥 streak in UI

### Service Worker (background-worker.js)
- Monitor tab navigation
- Detect blocked sites
- Trigger challenges when appropriate
- (Future) Handle Sunday 9 AM egg conversion

---

## 🎯 Success Criteria (MVP Launch)

### Functionality
- [x] Blocks 6+ major sites correctly
- [x] Shows challenges before allowing access
- [x] Challenge persists across page refreshes
- [x] Re-engagement triggers after interval expires
- [ ] Points system working correctly
- [ ] Eggs currency system working
- [ ] Rank progression visible
- [ ] Streak tracking with fire emoji
- [ ] Time tracking on sites
- [ ] Skip penalty deducts eggs
- [ ] Daily avoidance bonus awards 150 points
- [ ] Stats display all economy values

### Quality
- [ ] No critical bugs
- [ ] Performance: <100ms response times
- [ ] Memory usage: <50MB
- [ ] Storage efficient
- [ ] All edge cases handled

---

## 📊 Progress Tracking

### MVP Completion Status
**Overall Progress:** 40% (Core blocking + challenges done, economy in progress)

**Components:**
- Core Blocking: ✅ 100%
- Challenge System: ✅ 100%
- Interval Re-engagement: ✅ 100%
- Economy System: 🔄 60% (data model done, integration pending)
- UI/Stats Display: ❌ 0%
- Shop System: ❌ 0%
- Account System: ❌ 0%

---

## 🐔 Mascot System

### Current Implementation
- 5 evolution stages (Egg → Chick → Young → Smart → Wise Rooster)
- Uses XP system for progression
- Simple emoji display (future: Lottie animations)

### Future Customization
- Custom names
- Cosmetic accessories (hats, scarves, shoes)
- Background customization
- Color variations

---

## 🔐 Security & Privacy

### Local Storage Only (MVP)
- No cloud sync until Phase 2
- All data stored in `chrome.storage.local`
- No PII collected
- No external dependencies except OpenTriviaDB

### Future Considerations
- Firebase authentication (OAuth)
- End-to-end encryption for cosmetics
- User data export/deletion tools
- GDPR compliance

---

## 🚀 Deployment

### Development
1. Clone repository
2. Navigate to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked", select project folder

### Testing Checklist
- [ ] Test on YouTube, Instagram, Twitter, Reddit, Facebook, TikTok
- [ ] Verify challenge display and interaction
- [ ] Test correct/wrong answers
- [ ] Test skip penalty (egg deduction)
- [ ] Verify streak tracking
- [ ] Test time tracking (wait 5 mins, check penalty)
- [ ] Test daily bonus (wait 24 hours or manipulate time)
- [ ] Verify rank progression
- [ ] Test persistence across sessions

### Chrome Web Store Submission (Phase 2)
- [ ] Create store listing
- [ ] Write privacy policy
- [ ] Prepare screenshots
- [ ] Package extension
- [ ] Submit for review

---

## 📝 Notes & Decisions

### Why No Backend (MVP)?
- Faster development
- Works offline
- Simpler deployment
- Can add later without breaking existing functionality

### Why OpenTriviaDB?
- Free API
- No authentication required
- 4000+ questions across 20+ categories
- Works offline with local fallback
- HTML entity decoding handled

### Why 5/15/30 Minutes for Intervals?
- 5 min: Quick return for heavy users
- 15 min: Reasonable work break
- 30 min: Extended focus session
- User choice encourages buy-in

### Why -1 Point Per Minute?
- Encourages quick, focused visits
- Balances with -15/-25 flat penalties
- Adds nuance to economy
- Supports <5 min streak survival

---

## 🔮 Post-MVP Vision

### Phase 2-3 (Months 2-3)
- Account system with cloud sync
- Enhanced UI with Lottie animations
- Shop system with cosmetic purchases
- Leaderboards (future multiplayer prep)
- Advanced analytics dashboard

### Long-term (6-12 months)
- Multiplayer co-op tournaments
- Egg-based economy battles
- Mobile companion apps
- AI-generated questions
- Spaced repetition learning

---

## 📚 Resources

### Documentation
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [OpenTriviaDB](https://opentdb.com/)

### Tools
- Chrome DevTools (F12)
- Chrome Extensions page (chrome://extensions)
- JSON formatter

### Team
- **Lead Developer:** Jason Haug
- **Design/Vision:** Jason Haug

---

## ✅ Launch Readiness

### Code Quality
- [ ] No console.logs in production
- [ ] Error handling throughout
- [ ] Comments on complex logic
- [ ] Consistent code style

### Documentation
- [ ] README.md with setup instructions
- [ ] JSDoc comments on functions
- [ ] Architecture overview
- [ ] Contributing guidelines

### Testing
- [ ] Manual testing on all blocked sites
- [ ] Edge case handling verified
- [ ] Performance benchmarked
- [ ] Offline functionality tested

---

## 📞 Contact & Feedback

**Project Status:** MVP Development
**Last Updated:** 2025-11-09
**Version:** 0.1.0

---

*Cooped: Gamify your focus, one challenge at a time. 🐔*
