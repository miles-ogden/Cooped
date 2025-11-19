# STEP 8: MVP UI Specification (Complete)

## Overview
Complete redesign of the popup UI with:
- Home screen with chicken, XP bar, level, eggs, cosmetics access
- Dynamic coop backgrounds
- Hardcore mode toggle (personal + coop level)
- Side quests with category/frequency selection
- Coop wars tracking
- Full cosmetics/skins management

---

## Screen Specifications

### **HOME SCREEN**

**Layout:**
```
┌─────────────────────────────────────┐
│  🥚 Eggs │ [XP Bar] │ ⚙️ Settings  │  ← Header (KEEP)
├─────────────────────────────────────┤
│                                     │
│         🐔 [Chicken Image]          │
│                                     │
│         Clucky - Level 3            │  ← Name + Level
│                                     │
│         [==== 275/450 XP ====]      │  ← XP Progress Bar (KEEP)
│                                     │
├─────────────────────────────────────┤
│  [👕 Cosmetics] [🎮 Skins] [⭕ Coop] │  ← Quick Access Buttons
├─────────────────────────────────────┤
│                                     │
│  IF NOT IN COOP:                   │
│  [➕ Create Coop] [🔗 Join Coop]   │
│                                     │
│  IF IN COOP:                        │
│  Coop: Chicken Squadron              │  ← Coop name display
│  [👥 View Coop] [📊 Leaderboard]   │
│                                     │
└─────────────────────────────────────┘

BACKGROUND: Dynamic based on coop_id (solo vs team themed)
```

**Features:**
- Keep existing: Header, chicken image, XP bar, name, eggs display
- Remove: Night mode toggle, rank name, clutter
- Add: Cosmetics quick-access button
- Add: Coop action buttons (create/join/view)
- Dynamic background CSS class: `background-solo` or `background-coop-{coopId}`
- Bottom navigation tabs: Home | Settings | Skins | Coops (if applicable)

**Data Loaded:**
- `xp_total`, `level`, `eggs` from users table
- `coop_id` to determine which buttons to show
- Coop name from coops table (if coop_id exists)

---

### **SETTINGS SCREEN**

**Layout:**
```
┌─────────────────────────────────────┐
│  Settings                    [✕]    │  ← Header with back button
├─────────────────────────────────────┤
│                                     │
│  PERSONAL SETTINGS                  │
│  ├─ Chicken Name: [Clucky ____]    │
│  ├─ Hardcore Mode: [Toggle ON/OFF] │  ← NEW: Visual toggle
│  └─ Theme Preference: [Light/Dark]  │
│                                     │
│  COOP MANAGEMENT                    │
│  ├─ Current Coop: Chicken Squadron  │
│  │  ├─ Level: 5                     │
│  │  ├─ Members: 4/8                 │
│  │  └─ [Leave Coop]                 │
│  │                                  │
│  └─ Other Coops:                    │
│     ├─ Farmer's Flock               │
│     │  └─ [Leave Coop]              │
│     └─ (none)                       │
│                                     │
│  [Add Coop Code] (input field)      │
│                                     │
│  ACCOUNT                            │
│  └─ [Logout]                        │
│                                     │
└─────────────────────────────────────┘
```

**Features:**
- **Hardcore Mode Toggle**: Visual toggle switch (not just checkbox)
  - Personal level (affects user's experience)
  - Also applies to coops (stricter rules)
  - Affects XP scaling, challenge difficulty, penalty severity
- **Coop Management**:
  - Shows all coops user belongs to
  - Current coop highlighted/starred
  - Leave button for each coop
  - Join code input field with submit button
- **Personal Settings**:
  - Edit chicken name
  - Theme preference
- **Logout button**

---

### **COOP CREATION FLOW (Multi-Step Modal)**

**Step 1: Basic Information**
```
┌─────────────────────────────────────┐
│  Create a Coop (Step 1/3)    [✕]   │
├─────────────────────────────────────┤
│                                     │
│  Coop Name *                        │
│  [Enter coop name...____________]   │
│                                     │
│  Description (optional)             │
│  [Tell us about your coop...]       │
│  [____________________________]      │
│                                     │
│                          [Next ➜]  │
│                                     │
└─────────────────────────────────────┘
```

**Step 2: Settings & Side Quests**
```
┌─────────────────────────────────────┐
│  Create a Coop (Step 2/3)    [✕]   │
├─────────────────────────────────────┤
│                                     │
│  COOP SETTINGS                      │
│  Max Members: [⊘ 4 ⊙ 8 ⊘ 12 ⊘ 16] │
│  Public/Private: [◉ Public ○ Priv] │
│  Hardcore Mode: [Toggle ON/OFF]    │
│                                     │
│  ─────────────────────────────────  │
│  SIDE QUESTS (NEW!)                 │
│  [✓] Enable Side Quests             │
│                                     │
│  IF ENABLED:                        │
│  Topics (select multiple):          │
│  ├─ ☐ Learning                      │
│  │  ├─ ☑ Math                       │
│  │  ├─ ☐ Science                    │
│  │  ├─ ☑ History                    │
│  │  └─ ☐ Vocabulary                 │
│  ├─ ☐ Fun                           │
│  │  ├─ ☐ Trivia                     │
│  │  ├─ ☑ Sports                     │
│  │  ├─ ☐ Movies & Media             │
│  │  └─ ☐ Pop Culture                │
│  └─ ☐ Random                        │
│     └─ ☐ Real Life Events           │
│                                     │
│  Frequency (choose one):            │
│  ○ Daily                            │
│    ├─ ◉ Once per day               │
│    ├─ ○ Twice per day              │
│    └─ ○ 3 times per day            │
│  ○ Weekly                           │
│    ├─ ○ Once per week              │
│    ├─ ○ Bi-weekly                  │
│    └─ ○ 3 times per week           │
│                                     │
│                   [⬅ Back] [Next ➜]│
│                                     │
└─────────────────────────────────────┘
```

**Step 3: Invite Friends**
```
┌─────────────────────────────────────┐
│  Create a Coop (Step 3/3)    [✕]   │
├─────────────────────────────────────┤
│                                     │
│  INVITE FRIENDS                     │
│                                     │
│  Join Code (share with friends):   │
│  ┌──────────────────────────────┐   │
│  │ COOP-CHICKEN-SQUADRON        │   │
│  │                      [📋 Copy]│   │
│  └──────────────────────────────┘   │
│                                     │
│  Invite by Email (future):          │
│  [email@example.com_____] [+ Add]  │
│                                     │
│  Share Message:                     │
│  "Join my coop! Code: COOP-..."    │
│                                     │
│                       [Create Coop]│
│                                     │
└─────────────────────────────────────┘
```

**Features:**
- **Step 1**: Coop name, description
- **Step 2**: Max members, public/private toggle, hardcore mode, side quests config
  - Side quests: Enable/disable toggle
  - If enabled: Multi-select categories (expandable tree)
  - Frequency: Single-select radio buttons
- **Step 3**: Invite flow with auto-generated join code and copy button
- Auto-generates join code if private coop
- Navigation: Back/Next/Create buttons

---

### **COOP VIEW SCREEN**

**Layout:**
```
┌─────────────────────────────────────┐
│  Chicken Squadron          [⬅ Back] │
├─────────────────────────────────────┤
│                                     │
│  COOP STATS                         │
│  ├─ Members: 4 / 8                  │
│  ├─ Level: 5                        │
│  ├─ Total XP: 4,520                 │
│  ├─ Coop Wars Won: 3                │  ← NEW!
│  └─ Founded: Nov 18, 2025           │
│                                     │
│  ─────────────────────────────────  │
│  LEADERBOARD                        │
│                                     │
│  👑 1. Sarah (Level 6)              │
│     🐔 Chicken Squadron             │
│     1,240 XP                        │
│                                     │
│  🥈 2. You (Level 5)                │
│     🐔 Clucky                       │
│     980 XP                          │
│                                     │
│  🥉 3. Alex (Level 4)               │
│     🐔 Rocket                       │
│     850 XP                          │
│                                     │
│  4. Jordan (Level 3)                │
│     🐔 Sparkle                      │
│     450 XP                          │
│                                     │
│  ─────────────────────────────────  │
│  [👥 Invite] [⚙️ Settings] [🚪 Leave] │
│                                     │
└─────────────────────────────────────┘
```

**Features:**
- Coop name header with back button
- Stats section:
  - Members: X/Y
  - Level: Z
  - Total XP: Sum
  - **Coop Wars Won**: Count (NEW - feature for future)
  - Founded date
- Leaderboard:
  - Ranked by user XP (highest to lowest)
  - Shows position, user name, chicken name, level, XP
  - Highlights current user
  - Medal emojis (👑 🥈 🥉)
- Action buttons: Invite, Settings (if creator), Leave

---

### **COSMETICS/SKINS SCREEN**

**Layout:**
```
┌─────────────────────────────────────┐
│  Cosmetics                   [⬅ Back]│
├─────────────────────────────────────┤
│                                     │
│  SKINS                              │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🐔 Basic Chicken (EQUIPPED)│    │  ← Current selection
│  │  Yellow feathered friend    │    │
│  │  [✓ Equipped] [Preview]     │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🐓 Golden Rooster          │    │
│  │  Shiny golden plumage       │    │
│  │  [Equip] [Preview]          │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🔒 Lunar Chicken (Level 10)│    │
│  │  Moonlit chicken unlocks... │    │
│  │  Requirement: Reach Lvl 10  │    │
│  │  [Locked]                   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ─────────────────────────────────  │
│  ACCESSORIES                        │
│                                     │
│  Hats:                              │
│  ├─ ☑ None (EQUIPPED)              │
│  ├─ ◉ Top Hat                      │
│  ├─ ○ Wizard Hat (locked)          │
│  └─ ○ Crown                        │
│                                     │
│  Scarves:                           │
│  ├─ ☑ None (EQUIPPED)              │
│  ├─ ◉ Red Scarf                    │
│  └─ ○ Gold Scarf                   │
│                                     │
│  Backgrounds:                       │
│  ├─ ☑ Default (EQUIPPED)           │
│  ├─ ◉ Coop Theme                   │
│  └─ ○ Galaxy Theme (locked)        │
│                                     │
└─────────────────────────────────────┘
```

**Features:**
- Tabs or scroll: Skins | Accessories | Backgrounds
- Show owned skins with [Equipped] or [Equip] button
- Show locked skins with unlock requirement
- Show cosmetic preview on home screen in real-time
- One skin active at a time
- Multiple accessories can be equipped simultaneously
- Filter owned vs all available cosmetics

---

## Data Model Updates

### New Database Fields/Tables

**coops table (add columns):**
```sql
ALTER TABLE coops ADD COLUMN (
  side_quests_enabled BOOLEAN DEFAULT true,
  side_quest_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  side_quest_frequency TEXT DEFAULT 'daily',
  side_quest_frequency_value INTEGER DEFAULT 1,
  hardcore_mode_enabled BOOLEAN DEFAULT false,
  coop_wars_won INTEGER DEFAULT 0,  ← NEW
  max_members INTEGER DEFAULT 8,
  is_public BOOLEAN DEFAULT true,
  join_code TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**users table (add columns):**
```sql
ALTER TABLE users ADD COLUMN (
  hardcore_mode_enabled BOOLEAN DEFAULT false,
  equipped_skin TEXT DEFAULT 'basic_chicken',
  equipped_accessories TEXT[] DEFAULT ARRAY[]::TEXT[],
  equipped_background TEXT DEFAULT 'default'
);
```

**New table: user_cosmetics**
```sql
CREATE TABLE user_cosmetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cosmetic_id TEXT NOT NULL,
  cosmetic_type TEXT NOT NULL CHECK (cosmetic_type IN ('skin', 'hat', 'scarf', 'background')),
  owned BOOLEAN DEFAULT true,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**New table: side_quests**
```sql
CREATE TABLE side_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coop_id UUID REFERENCES coops(id) ON DELETE SET NULL,
  quest_type TEXT NOT NULL,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  difficulty INTEGER DEFAULT 1,
  assigned_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP NULL,
  xp_reward INTEGER DEFAULT 25,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## UI Components to Create

**JavaScript Modules:**
```
src/popup/screens/
├── home-screen.js           (Home + coop buttons)
├── settings-screen.js       (Settings + hardcore mode + coop mgmt)
├── coop-creation-modal.js   (3-step coop creation)
├── coop-view.js             (Leaderboard + stats + coop wars)
└── cosmetics-screen.js      (Skins + accessories + backgrounds)

src/popup/components/
├── bottom-nav.js            (Tab navigation)
├── side-quest-selector.js   (Category tree + frequency selector)
├── leaderboard.js           (Ranked member list)
├── cosmetic-preview.js      (Item preview modal)
└── coop-stats-card.js       (Coop info card)

src/logic/
├── sideQuestManager.js      (Quest delivery + tracking) ← NEW
└── cosmeticsManager.js      (Skin/accessory management) ← NEW

src/popup/styles/
├── home-screen.css
├── settings-screen.css
├── coop-creation.css
├── coop-view.css
├── cosmetics.css
├── bottom-nav.css
└── coop-backgrounds.css     (Dynamic coop theming)
```

---

## Integration Checklist

- [ ] Keep existing header (eggs, XP bar, settings button)
- [ ] Remove night mode toggle, rank name, clutter
- [ ] Add cosmetics quick-access button to home
- [ ] Add coop action buttons (create/join/view)
- [ ] Implement dynamic coop background theming
- [ ] Implement hardcore mode toggle in settings
- [ ] Create side quest configuration UI (topics + frequency)
- [ ] Add coop wars won to coop stats
- [ ] Create cosmetics browsing/equipping system
- [ ] Update Supabase schema with new fields
- [ ] Add bottom tab navigation
- [ ] Implement screen routing/navigation logic

---

## Future Enhancements

- Coop wars system (competitive challenges between coops)
- Side quest delivery and completion
- Cosmetics shop (egg-based purchases)
- Coop messaging/chat
- Custom cosmetic creation
- Seasonal cosmetics/battle pass

