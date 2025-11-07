# 🐔 Cooped - Stay Focused, One Challenge at a Time

A Chrome extension that transforms website blocking into an engaging, educational experience. Instead of harsh restrictions, Cooped presents fun challenges when you try to access distracting websites. Watch your chicken mascot grow smarter and stronger as you build better focus habits!

## Features

### Core Functionality
- **Smart Website Blocking**: Customize which sites require challenges before access
- **Educational Challenges**: 5 different challenge types across 3 difficulty levels
  - 🧠 Trivia Questions - Test your knowledge
  - ➗ Math Problems - Quick mental calculations
  - 📝 Word Puzzles - Anagrams and word games
  - 🧩 Memory Games - Remember and recall
  - ⌨️ Typing Challenges - Speed and accuracy
- **Progressive Mascot System**: Your chicken evolves through 5 stages as you earn XP
- **Gamification**: XP system, streak tracking, and achievement-style progression
- **Statistics Dashboard**: Track your productivity gains and challenge performance

### Mascot Evolution Stages
1. **Egg** (0 XP) - Your journey begins
2. **Chick** (100 XP) - Curious and learning
3. **Young Chicken** (500 XP) - Growing stronger
4. **Smart Chicken** (1,500 XP) - Knowledgeable and focused
5. **Wise Rooster** (5,000 XP) - Master of focus and wisdom

## Installation

### Development Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/cooped.git
   cd cooped
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top right)

4. Click "Load unpacked" and select the `Cooped` directory

5. The extension icon should appear in your toolbar!

### Adding Placeholder Icons (Temporary)
Before testing, you need to add placeholder icons. Create simple 16x16, 32x32, 48x48, and 128x128 PNG files and place them in:
- `src/assets/icons/icon16.png`
- `src/assets/icons/icon32.png`
- `src/assets/icons/icon48.png`
- `src/assets/icons/icon128.png`

You can use any simple chicken emoji or icon for testing.

## Usage

### Getting Started
1. Click the Cooped icon in your Chrome toolbar
2. Go to the **Settings** tab
3. Add websites you want to block (e.g., `*://www.facebook.com/*`)
4. Choose your challenge difficulty
5. Select which challenge types you want to see

### When You Visit a Blocked Site
1. A challenge overlay will appear
2. Answer the question correctly to gain access
3. Earn XP and watch your chicken grow!
4. Failed attempts don't give you access - try again!

### Understanding URL Patterns
- Use wildcards: `*://www.example.com/*`
- Block entire domains: `*://*.reddit.com/*`
- Specific pages: `*://www.youtube.com/feed/subscriptions`

### Tips for Success
- Start with **Easy** difficulty and work your way up
- Enable multiple challenge types for variety
- Check your stats regularly to see productivity gains
- Build a streak by completing challenges daily

## Project Structure

```
Cooped/
├── manifest.json                 # Extension configuration
├── src/
│   ├── background/
│   │   └── service-worker.js    # Monitors tabs and URLs
│   ├── content/
│   │   ├── content-script.js    # Injects challenge overlay
│   │   └── challenge-overlay.css # Overlay styling
│   ├── popup/
│   │   ├── popup.html           # Extension popup UI
│   │   ├── popup.css            # Popup styling
│   │   └── popup.js             # Popup logic
│   ├── utils/
│   │   ├── storage.js           # Chrome storage management
│   │   └── mascot.js            # Mascot progression logic
│   ├── types/
│   │   └── types.js             # Type definitions and constants
│   └── assets/
│       ├── icons/               # Extension icons
│       └── mascot/              # Mascot images (TODO)
├── challenges/
│   └── challenge-bank.js        # Challenge database
└── README.md
```

## Development

### Data Structure
The extension uses a scalable data structure designed for future features:

```javascript
{
  user: {
    id: string,
    stats: {
      challengesCompleted: number,
      currentStreak: number,
      longestStreak: number,
      totalTimeBlocked: number,
      experience: number,
      level: number
    }
  },
  mascot: {
    currentStage: number,
    unlocks: string[],
    customizations: object
  },
  settings: {
    blockedSites: string[],
    challengeDifficulty: 'easy' | 'medium' | 'hard',
    enabledChallengeTypes: string[]
  },
  sessions: Session[]
}
```

### Adding New Challenges
Edit `challenges/challenge-bank.js` and add questions to the appropriate difficulty array:

```javascript
const triviaMedium = [
  {
    question: 'Your question here?',
    answer: 'Correct answer',
    category: 'Category name'
  },
  // ... more challenges
];
```

### Debugging
1. Open Chrome DevTools on any page (F12)
2. Go to the Console tab
3. Look for messages starting with "Cooped:"
4. Check `chrome://extensions/` for extension errors

### Testing
1. Add a test site (e.g., `*://www.example.com/*`) to your blocked list
2. Visit that site in a new tab
3. The challenge overlay should appear
4. Complete the challenge to verify XP tracking

## Future Plans

See [claude.md](claude.md) for detailed expansion roadmap including:
- 📱 Mobile app version (iOS/Android)
- 👥 Co-op mode with team leaderboards
- 🎨 Advanced mascot customization
- 🔄 Cross-platform sync
- 🏆 Achievement system
- 📚 Educational partnerships
- 🤖 AI-generated challenges
- And much more!

## Technologies Used
- **Chrome Extension API** (Manifest V3)
- **Vanilla JavaScript** (ES6 modules)
- **Chrome Storage API** (local storage)
- **CSS3** (animations and gradients)
- **Service Workers** (background processing)

## Privacy & Data
- All data is stored locally on your device
- No data is collected or sent to external servers
- Browsing history is only used to detect blocked sites
- You can export or delete your data anytime

## Contributing
This is currently a personal project, but ideas and feedback are welcome! Feel free to:
- Open issues for bugs or feature requests
- Suggest new challenge types or questions
- Share your success stories

## Roadmap

### Version 1.0 (MVP) - Current
- [x] Basic URL monitoring
- [x] Challenge system with 5 types
- [x] Mascot progression (5 stages)
- [x] Statistics tracking
- [x] Settings UI
- [ ] Add actual mascot artwork
- [ ] Chrome Web Store submission

### Version 1.1
- [ ] Sound effects
- [ ] Animation improvements
- [ ] More challenges (50+ per type)
- [ ] Daily challenge system
- [ ] Achievement badges

### Version 2.0
- [ ] Team/co-op features
- [ ] Backend infrastructure
- [ ] Cloud sync
- [ ] Mobile app development

## Known Issues
- Mascot images are placeholders (need actual artwork)
- Extension icons need professional design
- Challenge bank needs expansion (currently ~10-15 per category)
- No sound effects yet

## License
MIT License - See LICENSE file for details

## Credits
Created with determination and focus 🐔

Inspired by:
- Forest (gamified focus app)
- Duolingo (mascot-driven learning)
- Cold Turkey (website blocking)

---

**Tagline**: Stay focused, one challenge at a time.

**Support**: For issues or questions, please open a GitHub issue.

**Fun Fact**: Did you know chickens can remember over 100 different faces? Just like how Cooped remembers all your achievements! 🐔
