/**
 * Content script for Cooped extension
 * Injects challenge overlay when user visits blocked sites
 */

import { getRandomChallenge, checkAnswer, CHALLENGE_TYPES } from '../../challenges/challenge-bank.js';
import { recordSession } from '../utils/storage.js';
import { calculateXPReward, getMascotMessage, checkLevelUp } from '../utils/mascot.js';
import { getAppState } from '../utils/storage.js';

let currentChallenge = null;
let challengeStartTime = null;
let isOverlayActive = false;

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SHOW_CHALLENGE' && !isOverlayActive) {
    showChallengeOverlay(message);
  }
});

/**
 * Create and show challenge overlay
 */
async function showChallengeOverlay(messageData) {
  isOverlayActive = true;
  challengeStartTime = Date.now();

  // Prevent page scrolling
  document.body.style.overflow = 'hidden';

  // Get enabled challenge types from message
  const enabledTypes = messageData.enabledTypes || ['trivia', 'math', 'word'];
  const difficulty = messageData.difficulty || 'medium';

  // Pick a random challenge type from enabled types
  const randomType = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];

  // Get a random challenge
  currentChallenge = getRandomChallenge(randomType, difficulty);

  // Create overlay
  const overlay = createOverlayElement(currentChallenge, messageData.url);
  document.body.appendChild(overlay);

  // Focus on input
  setTimeout(() => {
    const input = document.getElementById('cooped-answer-input');
    if (input) input.focus();
  }, 100);
}

/**
 * Create overlay DOM element
 */
function createOverlayElement(challenge, blockedUrl) {
  const overlay = document.createElement('div');
  overlay.id = 'cooped-overlay';
  overlay.innerHTML = `
    <div class="cooped-modal">
      <div class="cooped-header">
        <div class="cooped-mascot">🐔</div>
        <h1>Hold up there!</h1>
        <p class="cooped-subtitle">Complete this challenge to continue</p>
      </div>

      <div class="cooped-challenge-info">
        <span class="cooped-badge cooped-badge-${challenge.difficulty}">${challenge.difficulty}</span>
        <span class="cooped-badge cooped-badge-type">${challenge.type}</span>
      </div>

      <div class="cooped-challenge-content">
        <div class="cooped-question">
          ${challenge.question}
        </div>

        <div class="cooped-input-group">
          <input
            type="text"
            id="cooped-answer-input"
            class="cooped-input"
            placeholder="Type your answer..."
            autocomplete="off"
          >
          <button id="cooped-submit-btn" class="cooped-btn cooped-btn-primary">
            Submit Answer
          </button>
        </div>

        <div id="cooped-feedback" class="cooped-feedback"></div>
      </div>

      <div class="cooped-footer">
        <p class="cooped-blocked-url">Trying to access: <strong>${new URL(blockedUrl).hostname}</strong></p>
        <p class="cooped-hint">Stay focused! Your chicken is counting on you.</p>
      </div>
    </div>
  `;

  // Add event listeners
  const submitBtn = overlay.querySelector('#cooped-submit-btn');
  const input = overlay.querySelector('#cooped-answer-input');

  submitBtn.addEventListener('click', () => handleAnswerSubmit(overlay));
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleAnswerSubmit(overlay);
    }
  });

  return overlay;
}

/**
 * Handle answer submission
 */
async function handleAnswerSubmit(overlay) {
  const input = document.getElementById('cooped-answer-input');
  const feedback = document.getElementById('cooped-feedback');
  const userAnswer = input.value.trim();

  if (!userAnswer) {
    showFeedback(feedback, 'Please enter an answer!', 'warning');
    return;
  }

  // Disable input while checking
  input.disabled = true;
  document.getElementById('cooped-submit-btn').disabled = true;

  // Check answer
  const isCorrect = checkAnswer(userAnswer, currentChallenge.answer);
  const timeSpent = Date.now() - challengeStartTime;

  if (isCorrect) {
    await handleCorrectAnswer(overlay, feedback, timeSpent);
  } else {
    await handleIncorrectAnswer(overlay, feedback, input);
  }
}

/**
 * Handle correct answer
 */
async function handleCorrectAnswer(overlay, feedback, timeSpent) {
  const state = await getAppState();
  const oldExperience = state.user.stats.experience;

  // Calculate XP reward
  const xpGained = calculateXPReward(currentChallenge.difficulty, true, timeSpent);

  // Record session
  const session = {
    id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    site: window.location.href,
    challengeType: currentChallenge.type,
    success: true,
    timeSpent,
    experienceGained: xpGained
  };

  await recordSession(session);

  // Check for level up
  const newState = await getAppState();
  const levelUpInfo = checkLevelUp(oldExperience, newState.user.stats.experience);
  const mascotMsg = getMascotMessage(levelUpInfo.leveledUp ? 'levelup' : 'success', newState.mascot.currentStage);

  // Show success feedback
  showFeedback(
    feedback,
    `🎉 Correct! +${xpGained} XP<br><small>${mascotMsg}</small>`,
    'success'
  );

  // Show level up message if applicable
  if (levelUpInfo.leveledUp) {
    feedback.innerHTML += `<br><strong>🎊 LEVEL UP! Your chicken evolved to: ${levelUpInfo.newStage.name}!</strong>`;
  }

  // Send message to background script
  chrome.runtime.sendMessage({
    type: 'CHALLENGE_COMPLETED',
    data: session
  });

  // Remove overlay after delay
  setTimeout(() => {
    removeOverlay(overlay);
  }, 2000);
}

/**
 * Handle incorrect answer
 */
async function handleIncorrectAnswer(overlay, feedback, input) {
  const state = await getAppState();
  const mascotMsg = getMascotMessage('failure', state.mascot.currentStage);

  showFeedback(
    feedback,
    `❌ Not quite right. ${mascotMsg}<br><small>Try again!</small>`,
    'error'
  );

  // Re-enable input
  input.disabled = false;
  input.value = '';
  input.focus();
  document.getElementById('cooped-submit-btn').disabled = false;

  // Record failed attempt (but don't remove overlay)
  const session = {
    id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    site: window.location.href,
    challengeType: currentChallenge.type,
    success: false,
    timeSpent: Date.now() - challengeStartTime,
    experienceGained: 0
  };

  await recordSession(session);

  chrome.runtime.sendMessage({
    type: 'CHALLENGE_FAILED',
    data: session
  });
}

/**
 * Show feedback message
 */
function showFeedback(feedbackElement, message, type) {
  feedbackElement.innerHTML = message;
  feedbackElement.className = `cooped-feedback cooped-feedback-${type}`;
  feedbackElement.style.display = 'block';
}

/**
 * Remove overlay
 */
function removeOverlay(overlay) {
  overlay.remove();
  document.body.style.overflow = '';
  isOverlayActive = false;
  currentChallenge = null;
  challengeStartTime = null;
}

// Prevent immediate navigation on page load if blocked
window.addEventListener('load', () => {
  // Background script will send message if site is blocked
});
