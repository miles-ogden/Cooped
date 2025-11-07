# 🐔 Cooped - Quick Start Guide

Get your Chrome extension running in 5 minutes!

## Prerequisites
- Google Chrome browser
- Basic understanding of Chrome extensions (optional)

## Step 1: Create Placeholder Icons

Before loading the extension, you need to create placeholder icon files. The easiest way:

### Option A: Using Online Tool (Recommended)
1. Go to https://favicon.io/emoji-favicons/
2. Search for "chicken" emoji 🐔
3. Download the generated favicon
4. Extract the ZIP file
5. Rename and copy the files:
   - `favicon-16x16.png` → `src/assets/icons/icon16.png`
   - `favicon-32x32.png` → `src/assets/icons/icon32.png`
   - `android-chrome-192x192.png` → `src/assets/icons/icon48.png` (resize to 48x48)
   - `android-chrome-512x512.png` → `src/assets/icons/icon128.png` (resize to 128x128)

### Option B: Manual Creation
Create 4 simple PNG images (any color, any design) with these dimensions:
- `src/assets/icons/icon16.png` - 16x16 pixels
- `src/assets/icons/icon32.png` - 32x32 pixels
- `src/assets/icons/icon48.png` - 48x48 pixels
- `src/assets/icons/icon128.png` - 128x128 pixels

You can use any image editor (Paint, Photoshop, GIMP, etc.) or online tools like Canva.

## Step 2: Load Extension in Chrome

1. Open Chrome and go to: `chrome://extensions/`
2. Enable **Developer mode** (toggle switch in top-right corner)
3. Click **Load unpacked**
4. Navigate to and select the `Cooped` folder
5. The extension should now appear in your extensions list!

## Step 3: Pin the Extension (Optional)

1. Click the puzzle piece icon in Chrome's toolbar
2. Find "Cooped" in the list
3. Click the pin icon to keep it visible

## Step 4: Configure Your First Blocked Site

1. Click the Cooped extension icon
2. Go to the **Settings** tab
3. In the "Add Site" field, enter: `*://www.example.com/*`
4. Click **Add Site**
5. The site should appear in your blocked sites list

## Step 5: Test It Out!

1. Open a new tab
2. Visit: `https://www.example.com`
3. You should see the challenge overlay appear!
4. Answer the challenge correctly to access the site
5. Check your XP in the extension popup

## Default Blocked Sites

The extension comes pre-configured with these popular distracting sites:
- Facebook
- Instagram
- Twitter
- Reddit
- YouTube
- TikTok

You can remove these or add your own in the Settings tab.

## Customizing Your Experience

### Change Difficulty
1. Open the extension popup
2. Go to **Settings** tab
3. Select difficulty: Easy, Medium, or Hard

### Choose Challenge Types
In Settings, check/uncheck the challenge types you want:
- ✅ Trivia Questions
- ✅ Math Problems
- ✅ Word Puzzles
- ⬜ Memory Games
- ⬜ Typing Challenges

### View Your Progress
1. Click the extension icon
2. **Mascot** tab - See your chicken's evolution progress
3. **Stats** tab - View your productivity stats

## Troubleshooting

### Extension Won't Load
- Make sure all icon files exist in `src/assets/icons/`
- Check the Extensions page for error messages
- Click "Errors" button if shown for details

### Challenge Overlay Not Appearing
1. Check that the site is in your blocked list
2. Refresh the page after adding a site
3. Open Console (F12) and look for "Cooped:" messages
4. Make sure at least one challenge type is enabled

### No XP Being Earned
- Make sure you're answering challenges correctly
- Check the Stats tab to verify tracking
- Open DevTools Console for error messages

### Extension Icon Not Showing
- Make sure all 4 icon files exist
- Try reloading the extension:
  1. Go to `chrome://extensions/`
  2. Click the refresh icon on the Cooped extension

## Understanding URL Patterns

When adding blocked sites, use these formats:

| Pattern | Matches | Example |
|---------|---------|---------|
| `*://www.example.com/*` | Exact domain | www.example.com |
| `*://*.example.com/*` | Domain and all subdomains | www.example.com, mail.example.com |
| `*://example.com/videos*` | Specific path | example.com/videos, example.com/videos/123 |

## Next Steps

1. **Expand Your Blocked List**: Add your personal distraction sites
2. **Adjust Difficulty**: Find the right challenge level for you
3. **Build Your Streak**: Complete challenges daily to build your streak
4. **Track Progress**: Check your stats regularly
5. **Evolve Your Chicken**: Earn XP to unlock new mascot stages!

## Need Help?

- Read the full [README.md](README.md) for detailed documentation
- Check [claude.md](claude.md) for future plans and architecture
- Open a GitHub issue for bugs or feature requests

## Tips for Success

1. **Start Easy**: Begin with "Easy" difficulty and 2-3 blocked sites
2. **Be Consistent**: Build a daily streak for maximum mascot growth
3. **Challenge Variety**: Enable multiple challenge types to keep it interesting
4. **Review Stats**: Check your "Time Blocked" stat to see productivity gains
5. **Adjust as Needed**: Fine-tune your blocked sites list based on your habits

---

**Ready to stay focused?** Your chicken is waiting! 🐔

**Pro Tip**: The first evolution (from Egg to Chick) happens at just 100 XP - about 4 medium-difficulty challenges. Start building focus today!
