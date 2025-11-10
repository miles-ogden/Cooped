/**
 * Earn More Eggs - Daily Challenge Mode
 * Users can answer questions to earn extra eggs
 */

import { getAppState, addEggs, getBalance } from '../utils/storage.js';

// Challenge pool - will be expanded with real challenges
const CHALLENGE_POOL = [
  {
    id: 1,
    question: "What is the capital of France?",
    type: "trivia",
    difficulty: "easy",
    options: ["London", "Berlin", "Paris", "Madrid"],
    answer: "Paris",
    category: "geography"
  },
  {
    id: 2,
    question: "What is 12 × 8?",
    type: "math",
    difficulty: "easy",
    options: ["84", "96", "108", "112"],
    answer: "96",
    category: "math"
  },
  {
    id: 3,
    question: "What does HTML stand for?",
    type: "trivia",
    difficulty: "medium",
    options: ["Hyper Text Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyperlinks and Text Markup Language"],
    answer: "Hyper Text Markup Language",
    category: "technology"
  },
  {
    id: 4,
    question: "Who wrote 'Romeo and Juliet'?",
    type: "trivia",
    difficulty: "easy",
    options: ["Mark Twain", "William Shakespeare", "Jane Austen", "Charles Dickens"],
    answer: "William Shakespeare",
    category: "literature"
  },
  {
    id: 5,
    question: "What is the square root of 144?",
    type: "math",
    difficulty: "easy",
    options: ["10", "11", "12", "13"],
    answer: "12",
    category: "math"
  },
  {
    id: 6,
    question: "Which planet is known as the Red Planet?",
    type: "trivia",
    difficulty: "easy",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    answer: "Mars",
    category: "science"
  },
  {
    id: 7,
    question: "What is the opposite of 'benevolent'?",
    type: "vocabulary",
    difficulty: "medium",
    options: ["generous", "malevolent", "kind", "helpful"],
    answer: "malevolent",
    category: "vocabulary"
  },
  {
    id: 8,
    question: "In what year did the Titanic sink?",
    type: "trivia",
    difficulty: "easy",
    options: ["1912", "1905", "1920", "1898"],
    answer: "1912",
    category: "history"
  }
];

const EGG_REWARDS = {
  easy: 1,
  medium: 2,
  hard: 3
};

// State
let currentChallengeIndex = 0;
let sessionChallenges = [];
let completedChallenges = [];
let eggsEarned = 0;
let appState = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  appState = await getAppState();
  initializePage();
});

/**
 * Initialize the page
 */
function initializePage() {
  setupEventListeners();
  generateSession();
  renderChallengeCircles();
  loadNextChallenge();
  updateEggsDisplay();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  const backBtn = document.getElementById('back-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      // Go back to main popup
      window.close();
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleFullscreen);
  }
}

/**
 * Toggle fullscreen mode
 */
function toggleFullscreen() {
  document.body.classList.toggle('fullscreen');

  if (document.body.classList.contains('fullscreen')) {
    // Try to open in fullscreen tab if possible
    if (chrome.windows && chrome.windows.create) {
      chrome.windows.create({
        url: chrome.runtime.getURL('src/popup/earn-eggs.html'),
        type: 'normal'
      });
      window.close();
    }
  }
}

/**
 * Generate a session of unique challenges
 */
function generateSession() {
  // Create a session with 8 random challenges
  sessionChallenges = [...CHALLENGE_POOL].sort(() => 0.5 - Math.random()).slice(0, 8);
  completedChallenges = [];
  eggsEarned = 0;
  currentChallengeIndex = 0;
  console.log('Cooped: Generated session with challenges:', sessionChallenges);
}

/**
 * Render the challenge progression circles
 */
function renderChallengeCircles() {
  const container = document.getElementById('progression-circles');
  if (!container) return;

  container.innerHTML = '';

  sessionChallenges.forEach((challenge, index) => {
    const circle = document.createElement('div');
    circle.className = 'challenge-circle';
    circle.textContent = index + 1;
    circle.dataset.index = index;

    if (index === currentChallengeIndex) {
      circle.classList.add('active');
    } else if (index < currentChallengeIndex) {
      circle.classList.add('completed');
    } else {
      circle.classList.add('upcoming');
    }

    circle.addEventListener('click', () => {
      if (index <= currentChallengeIndex) {
        currentChallengeIndex = index;
        loadChallenge(index);
        renderChallengeCircles();
      }
    });

    container.appendChild(circle);
  });
}

/**
 * Load the current challenge
 */
function loadNextChallenge() {
  if (currentChallengeIndex < sessionChallenges.length) {
    loadChallenge(currentChallengeIndex);
  } else {
    showSessionComplete();
  }
}

/**
 * Load a specific challenge by index
 */
function loadChallenge(index) {
  const challenge = sessionChallenges[index];
  if (!challenge) return;

  currentChallengeIndex = index;

  const contentArea = document.getElementById('challenge-content');
  contentArea.innerHTML = `
    <div class="challenge-header">
      <span class="challenge-difficulty">${challenge.difficulty}</span>
    </div>
    <div class="challenge-question">${challenge.question}</div>
    <div class="challenge-options">
      ${challenge.options.map((option, idx) => `
        <button class="challenge-option" data-option="${option}">
          ${option}
        </button>
      `).join('')}
    </div>
    <div class="challenge-buttons">
      <button class="btn-submit" disabled>Submit Answer</button>
      <button class="btn-skip">Skip</button>
    </div>
  `;

  // Setup option selection
  const options = contentArea.querySelectorAll('.challenge-option');
  const submitBtn = contentArea.querySelector('.btn-submit');
  const skipBtn = contentArea.querySelector('.btn-skip');
  let selectedOption = null;

  options.forEach(option => {
    option.addEventListener('click', () => {
      // Remove previous selection
      options.forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      selectedOption = option.dataset.option;
      submitBtn.disabled = false;
    });
  });

  submitBtn.addEventListener('click', () => {
    submitAnswer(challenge, selectedOption);
  });

  skipBtn.addEventListener('click', () => {
    skipChallenge();
  });

  renderChallengeCircles();
}

/**
 * Submit an answer
 */
async function submitAnswer(challenge, selectedOption) {
  const contentArea = document.getElementById('challenge-content');
  const options = contentArea.querySelectorAll('.challenge-option');
  const submitBtn = contentArea.querySelector('.btn-submit');
  const skipBtn = contentArea.querySelector('.btn-skip');

  const isCorrect = selectedOption === challenge.answer;

  // Show feedback
  options.forEach(option => {
    if (option.dataset.option === challenge.answer) {
      option.classList.add('correct');
    } else if (option.dataset.option === selectedOption && !isCorrect) {
      option.classList.add('incorrect');
    }
    option.disabled = true;
  });

  submitBtn.disabled = true;
  skipBtn.disabled = true;

  if (isCorrect) {
    const eggsAwarded = EGG_REWARDS[challenge.difficulty];
    eggsEarned += eggsAwarded;

    // Award eggs to user
    await addEggs(eggsAwarded);

    // Mark as completed
    completedChallenges.push(challenge.id);

    // Show success message
    const message = document.createElement('div');
    message.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: #4caf50;
      color: white;
      border-radius: 8px;
      font-weight: 600;
      z-index: 100;
    `;
    message.textContent = `+${eggsAwarded} eggs! ✨`;
    document.body.appendChild(message);

    setTimeout(() => {
      message.remove();
    }, 2000);

    updateEggsDisplay();

    // Move to next challenge after 2 seconds
    setTimeout(() => {
      currentChallengeIndex++;
      loadNextChallenge();
    }, 2000);
  } else {
    // Show try again option
    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Try Again';
      skipBtn.disabled = false;
    }, 1500);
  }
}

/**
 * Skip a challenge (no eggs awarded)
 */
function skipChallenge() {
  currentChallengeIndex++;
  loadNextChallenge();
}

/**
 * Show session complete screen
 */
function showSessionComplete() {
  const contentArea = document.getElementById('challenge-content');
  contentArea.innerHTML = `
    <div style="text-align: center; padding: 40px 20px;">
      <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
      <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 10px;">Session Complete!</h2>
      <p style="color: #999; margin-bottom: 20px; font-size: 16px;">
        You earned <span style="color: #667eea; font-weight: 700; font-size: 18px;">${eggsEarned}</span> eggs!
      </p>
      <button style="
        padding: 12px 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.3)'"
         onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
        Play Again
      </button>
    </div>
  `;

  const playAgainBtn = contentArea.querySelector('button');
  if (playAgainBtn) {
    playAgainBtn.addEventListener('click', () => {
      generateSession();
      renderChallengeCircles();
      loadNextChallenge();
    });
  }
}

/**
 * Update the eggs earned display
 */
function updateEggsDisplay() {
  const eggsDisplay = document.getElementById('eggs-earned');
  if (eggsDisplay) {
    eggsDisplay.textContent = eggsEarned;
  }
}
