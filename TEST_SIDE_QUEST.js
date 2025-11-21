/**
 * TEST SCRIPT: Manually create a side quest for your coop
 *
 * This script creates a test side quest that will appear in your home screen
 * Run this in the browser console while the extension popup is open
 */

// Copy your coop ID (you can find it in coop-view settings section)
const TEST_COOP_ID = 'your-coop-id-here'; // Replace with your actual coop ID

// Sample questions for testing
const TEST_QUESTIONS = [
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

// Function to manually insert a side quest
async function createTestSideQuest() {
  console.log('🎯 Creating test side quest...');

  // Get coop ID from your actual coop
  const userProfile = await querySelect('users', {
    select: 'coop_id',
    eq: { id: (await getCurrentUser(true)).id },
    single: true
  });

  const coopId = userProfile?.coop_id;

  if (!coopId) {
    console.error('❌ You are not in a coop! Please create or join a coop first.');
    return;
  }

  console.log('✅ Found coop ID:', coopId);

  // Create quest object
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now

  const questData = {
    coop_id: coopId,
    category: 'learning',
    questions: TEST_QUESTIONS,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    status: 'active'
  };

  try {
    const result = await queryInsert('side_quests', [questData]);
    console.log('✅ Side quest created successfully!');
    console.log('   Quest ID:', result[0].id);
    console.log('   Expires at:', expiresAt.toISOString());
    console.log('   Users will see "Side Quest Available" button on home screen');

    // Reload home screen to show the button
    console.log('   Reloading home screen...');
    window.dispatchEvent(new CustomEvent('navigateToScreen', {
      detail: { screen: 'home' }
    }));

  } catch (err) {
    console.error('❌ Error creating side quest:', err);
  }
}

// Alternative: Direct REST API call (if above doesn't work)
async function createTestSideQuestViaAPI() {
  console.log('🎯 Creating test side quest via direct API...');

  // Get user's coop
  const session = await getSession();
  if (!session?.access_token) {
    console.error('❌ No active session. Make sure you are logged in.');
    return;
  }

  const userResponse = await fetch(
    'https://iwiwnximqjtnmmmtgmoh.supabase.co/rest/v1/users?select=coop_id&id=eq.' + session.user_id,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3aXdueGltcWp0bm1tbXRnbW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MTI2MjEsImV4cCI6MjA3OTA4ODYyMX0.WUuzfV8p-OBhR-8barokcJZU2uWba7Rsaut3YIUJGCc'
      }
    }
  );

  const userData = await userResponse.json();
  const coopId = userData[0]?.coop_id;

  if (!coopId) {
    console.error('❌ You are not in a coop!');
    return;
  }

  console.log('✅ Found coop ID:', coopId);

  // Create quest
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const questData = {
    coop_id: coopId,
    category: 'learning',
    questions: TEST_QUESTIONS,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    status: 'active'
  };

  try {
    const insertResponse = await fetch(
      'https://iwiwnximqjtnmmmtgmoh.supabase.co/rest/v1/side_quests',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3aXdueGltcWp0bm1tbXRnbW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MTI2MjEsImV4cCI6MjA3OTA4ODYyMX0.WUuzfV8p-OBhR-8barokcJZU2uWba7Rsaut3YIUJGCc',
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(questData)
      }
    );

    const result = await insertResponse.json();

    if (!insertResponse.ok) {
      console.error('❌ API Error:', result);
      return;
    }

    console.log('✅ Side quest created successfully via API!');
    console.log('   Quest ID:', result[0].id);
    console.log('   Expires at:', expiresAt.toISOString());

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

// Instructions
console.log(`
╔════════════════════════════════════════════════════════════╗
║           SIDE QUEST TEST SCRIPT                          ║
╚════════════════════════════════════════════════════════════╝

This script will create a test side quest for your coop.

To run:
  1. Open your extension popup
  2. Open browser console (F12 > Console tab)
  3. Run: createTestSideQuest()
  4. If that doesn't work, try: createTestSideQuestViaAPI()

The "Side Quest Available" button should appear on your home screen!

What you'll see:
  ✓ "🎯 Side Quests Available" button with countdown timer
  ✓ Timer shows HH:MM:SS (4 hours)
  ✓ Click to enter the quiz
  ✓ 10 randomized questions with multiple choice
  ✓ Submit quiz to see results

`);
