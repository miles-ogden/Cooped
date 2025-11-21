# Activate Side Quest - Direct Console Command

## Quick Setup

1. **Open your extension popup** (click the extension icon)
2. **Open Developer Console** (Press `F12` → Console tab)
3. **Copy the entire command below and paste it in the console:**

```javascript
(async () => {
  const QUESTIONS = [
    { q: 'What is the capital of France?', options: ['London', 'Paris', 'Berlin', 'Madrid'], correct: 1 },
    { q: 'What is the largest planet in our solar system?', options: ['Saturn', 'Jupiter', 'Neptune', 'Uranus'], correct: 1 },
    { q: 'Who wrote "Romeo and Juliet"?', options: ['Jane Austen', 'William Shakespeare', 'Charles Dickens', 'Mark Twain'], correct: 1 },
    { q: 'What year did World War II end?', options: ['1943', '1944', '1945', '1946'], correct: 2 },
    { q: 'What is the smallest country in the world?', options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'], correct: 1 },
    { q: 'How many continents are there?', options: ['5', '6', '7', '8'], correct: 2 },
    { q: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], correct: 2 },
    { q: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Mercury', 'Jupiter'], correct: 1 },
    { q: 'What is the deepest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correct: 3 },
    { q: 'How many sides does a hexagon have?', options: ['4', '5', '6', '7'], correct: 2 }
  ];

  try {
    const session = await chrome.storage.local.get('supabase_session');
    if (!session.supabase_session) {
      console.error('❌ Not logged in');
      return;
    }

    const token = session.supabase_session.access_token;
    const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3aXdueGltcWp0bm1tbXRnbW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MTI2MjEsImV4cCI6MjA3OTA4ODYyMX0.WUuzfV8p-OBhR-8barokcJZU2uWba7Rsaut3YIUJGCc';

    // Get user's coop
    const userRes = await fetch(
      'https://iwiwnximqjtnmmmtgmoh.supabase.co/rest/v1/users?select=coop_id&limit=1',
      { headers: { 'Authorization': `Bearer ${token}`, 'apikey': apiKey } }
    );
    const users = await userRes.json();
    const coopId = users[0]?.coop_id;

    if (!coopId) {
      console.error('❌ You are not in a coop');
      return;
    }

    console.log('✅ Found coop:', coopId);

    // Create quest
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    const questRes = await fetch(
      'https://iwiwnximqjtnmmmtgmoh.supabase.co/rest/v1/side_quests',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': apiKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          coop_id: coopId,
          category: 'learning',
          questions: QUESTIONS,
          created_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          status: 'active'
        })
      }
    );

    const result = await questRes.json();

    if (!questRes.ok) {
      console.error('❌ Error:', result);
      return;
    }

    console.log('✅ Side quest created!');
    console.log('   Quest ID:', result[0].id);
    console.log('   Expires:', expiresAt.toISOString());
    console.log('   Reloading home screen...');

    // Reload home to show button
    window.dispatchEvent(new CustomEvent('navigateToScreen', { detail: { screen: 'home' } }));

  } catch (err) {
    console.error('❌ Error:', err);
  }
})();
```

4. **Press Enter**

---

## What to Expect

✅ Console will show:
```
✅ Found coop: [your-coop-id]
✅ Side quest created!
   Quest ID: [new-quest-id]
   Expires: [timestamp 4 hours from now]
   Reloading home screen...
```

✅ Home screen loads with the button visible

---

## You Should See:

On your home screen:
- **"🎯 Side Quests Available"** button
- **Live countdown timer** (HH:MM:SS) - showing ~4 hours
- Timer updates every second

Click the button to:
1. See quest intro with details
2. Click "Start Quiz"
3. Answer 10 questions (different order per user)
4. Submit and see results

---

## Troubleshooting

**If you get "Not logged in" error:**
- Make sure you're signed in to the extension
- Go to home screen first, then open console

**If you get "You are not in a coop" error:**
- Create or join a coop first
- Then run the command again

**If the button doesn't appear:**
- Make sure "Enable Side Quests" is toggled ON in coop settings
- Make sure at least one topic is selected in coop settings

---

Enjoy testing the side quest system! 🎯
