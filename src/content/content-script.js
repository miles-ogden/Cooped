/**
 * Content script for Cooped extension
 * Injects challenge overlay when user visits blocked sites
 */

// Import modules dynamically to ensure they're loaded as modules
let getRandomChallenge, checkAnswer, CHALLENGE_TYPES;
let recordSession, getAppState, saveCurrentChallenge, getCurrentChallenge, clearCurrentChallenge;
let calculateXPReward, getMascotMessage, checkLevelUp, getAdaptiveDifficultyWithVariety;
let setSiteInterval, checkSiteInterval;

// Load all modules
Promise.all([
  import('../../challenges/challenge-bank.js'),
  import('../utils/storage.js'),
  import('../utils/mascot.js')
]).then(([challengeBank, storageModule, mascotModule]) => {
  getRandomChallenge = challengeBank.getRandomChallenge;
  checkAnswer = challengeBank.checkAnswer;
  CHALLENGE_TYPES = challengeBank.CHALLENGE_TYPES;

  recordSession = storageModule.recordSession;
  getAppState = storageModule.getAppState;
  saveCurrentChallenge = storageModule.saveCurrentChallenge;
  getCurrentChallenge = storageModule.getCurrentChallenge;
  clearCurrentChallenge = storageModule.clearCurrentChallenge;
  setSiteInterval = storageModule.setSiteInterval;
  checkSiteInterval = storageModule.checkSiteInterval;

  calculateXPReward = mascotModule.calculateXPReward;
  getMascotMessage = mascotModule.getMascotMessage;
  checkLevelUp = mascotModule.checkLevelUp;
  getAdaptiveDifficultyWithVariety = mascotModule.getAdaptiveDifficultyWithVariety;

  // Now initialize the content script
  initializeContentScript();
}).catch(err => console.error('Cooped: Error loading modules:', err));

let currentChallenge = null;
let challengeStartTime = null;
let isOverlayActive = false;
let skipsRemaining = 3;
let intervalCheckTimer = null;
let lastActivityTime = Date.now();

/**
 * Check if current tab is blocked and show challenge if needed
 */
async function checkAndShowChallenge() {
  // Only check once per page load
  if (isOverlayActive) return;

  try {
    // First check if there's an existing challenge in progress
    const savedChallenge = await getCurrentChallenge();

    if (savedChallenge) {
      console.log('Cooped: Restoring saved challenge from previous page load');
      showSavedChallengeOverlay(savedChallenge);
      return;
    }

    // If no saved challenge, check if site is blocked
    const response = await chrome.runtime.sendMessage({
      type: 'CHECK_BLOCKED_SITE'
    });

    if (response && response.isBlocked && !isOverlayActive) {
      // Check if site is in a cooldown interval
      const hostname = new URL(window.location.href).hostname;
      const intervalCheck = await checkSiteInterval(hostname);

      if (intervalCheck.isActive) {
        console.log(`Cooped: Site is in cooldown for ${intervalCheck.minutesRemaining} more minutes`);
        // Don't show challenge, user is in their chosen interval
        return;
      }

      console.log('Cooped: This is a blocked site, showing challenge');
      showChallengeOverlay(response);
    }
  } catch (error) {
    console.log('Cooped: Error checking if site is blocked:', error);
    // Service worker might not be ready yet, that's ok
  }
}

/**
 * Initialize the content script (called once modules are loaded)
 */
function initializeContentScript() {
  // Set up message listener
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SHOW_CHALLENGE' && !isOverlayActive) {
      showChallengeOverlay(message);
    }
  });

  // Track user activity
  document.addEventListener('mousedown', () => {
    lastActivityTime = Date.now();
  });
  document.addEventListener('keydown', () => {
    lastActivityTime = Date.now();
  });
  document.addEventListener('scroll', () => {
    lastActivityTime = Date.now();
  });

  // Check on page load if this is a blocked site
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndShowChallenge);
  } else {
    // DOM already loaded
    checkAndShowChallenge();
  }

  // Start monitoring for interval expiry
  startIntervalMonitoring();
}

/**
 * Monitor for interval expiry and show re-engagement challenge if user is still active
 */
function startIntervalMonitoring() {
  // Check every 30 seconds if an interval has expired
  intervalCheckTimer = setInterval(async () => {
    if (isOverlayActive) return; // Don't check while overlay is showing

    try {
      const hostname = new URL(window.location.href).hostname;
      const intervalCheck = await checkSiteInterval(hostname);

      // If interval was active but is now expired
      if (!intervalCheck.isActive) {
        // Check if user has been active recently (within last 5 minutes)
        const timeSinceLastActivity = Date.now() - lastActivityTime;
        const fiveMinutesInMs = 5 * 60 * 1000;

        if (timeSinceLastActivity < fiveMinutesInMs) {
          // User is still active! Show re-engagement challenge
          console.log('Cooped: Interval expired and user is still active, showing re-engagement challenge');

          // Get the blocked site info
          const response = await chrome.runtime.sendMessage({
            type: 'CHECK_BLOCKED_SITE'
          });

          if (response && response.isBlocked) {
            showReEngagementChallenge(response);
          }
        }
      }
    } catch (error) {
      console.log('Cooped: Error in interval monitoring:', error);
    }
  }, 30000); // Check every 30 seconds
}

/**
 * Show a re-engagement challenge when user is still on blocked site after interval
 */
async function showReEngagementChallenge(messageData) {
  isOverlayActive = true;
  challengeStartTime = Date.now();

  document.body.style.overflow = 'hidden';

  const enabledTypes = messageData.enabledTypes || ['trivia', 'math', 'word'];
  const state = await getAppState();
  const difficulty = getAdaptiveDifficultyWithVariety(state.mascot.currentStage, state.user.stats.experience);
  const enabledCategories = state.settings.enabledCategories;

  const randomType = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];
  currentChallenge = await getRandomChallenge(randomType, difficulty, enabledCategories);

  await saveCurrentChallenge(currentChallenge, messageData.url);

  const overlay = createReEngagementOverlay(currentChallenge, messageData.url);
  document.body.appendChild(overlay);

  // Focus on input
  setTimeout(() => {
    const input = document.getElementById('cooped-answer-input');
    if (input) input.focus();
  }, 100);
}

/**
 * Create re-engagement overlay element with special messaging
 */
function createReEngagementOverlay(challenge, blockedUrl) {
  const overlay = document.createElement('div');
  overlay.id = 'cooped-overlay';
  overlay.innerHTML = `
    <div class="cooped-modal">
      <div class="cooped-header">
        <div class="cooped-mascot">🐔</div>
        <h1>You're still here?</h1>
        <p class="cooped-subtitle">Let's try another challenge!</p>
      </div>

      <div class="cooped-challenge-info">
        <span class="cooped-badge cooped-badge-${challenge.difficulty}">${challenge.difficulty}</span>
        <span class="cooped-badge cooped-badge-type">${challenge.type}</span>
        <span class="cooped-skips-badge" id="cooped-skips-badge">Skips: ${skipsRemaining}/3</span>
      </div>

      <div class="cooped-challenge-content">
        <div class="cooped-question">
          ${challenge.question}
          ${challenge.isBooleanQuestion ? `<div style="font-size: 14px; margin-top: 10px; opacity: 0.9;">${challenge.booleanHint}</div>` : ''}
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

        <div class="cooped-actions">
          <button id="cooped-skip-btn" class="cooped-btn cooped-btn-secondary" ${skipsRemaining <= 0 ? 'disabled' : ''}>
            Skip Question
          </button>
          <button id="cooped-tellme-btn" class="cooped-btn cooped-btn-secondary">
            Tell Me Answer
          </button>
        </div>

        <div id="cooped-feedback" class="cooped-feedback"></div>
      </div>

      <div class="cooped-footer">
        <p class="cooped-blocked-url">Trying to access: <strong>${new URL(blockedUrl).hostname}</strong></p>
        <p class="cooped-hint">Your break time is up! Let's keep the focus going.</p>
      </div>
    </div>
  `;

  // Add event listeners
  const submitBtn = overlay.querySelector('#cooped-submit-btn');
  const skipBtn = overlay.querySelector('#cooped-skip-btn');
  const tellMeBtn = overlay.querySelector('#cooped-tellme-btn');
  const input = overlay.querySelector('#cooped-answer-input');

  submitBtn.addEventListener('click', () => handleAnswerSubmit(overlay));
  skipBtn.addEventListener('click', () => handleSkip(overlay));
  tellMeBtn.addEventListener('click', () => handleTellMe(overlay));
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleAnswerSubmit(overlay);
    }
  });

  return overlay;
}

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

  // Use adaptive difficulty based on user level
  const state = await getAppState();
  const difficulty = getAdaptiveDifficultyWithVariety(state.mascot.currentStage, state.user.stats.experience);
  const enabledCategories = state.settings.enabledCategories;

  // Pick a random challenge type from enabled types
  const randomType = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];

  // Get a random challenge with category filtering (now async)
  currentChallenge = await getRandomChallenge(randomType, difficulty, enabledCategories);

  // Save challenge to session storage to prevent bypass via refresh
  await saveCurrentChallenge(currentChallenge, messageData.url);

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
 * Show a saved challenge overlay (from previous page load)
 */
function showSavedChallengeOverlay(savedChallengeData) {
  isOverlayActive = true;
  currentChallenge = savedChallengeData.challenge;
  challengeStartTime = savedChallengeData.startTime;

  // Prevent page scrolling
  document.body.style.overflow = 'hidden';

  // Create overlay
  const overlay = createOverlayElement(currentChallenge, savedChallengeData.url);
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
        <span class="cooped-skips-badge" id="cooped-skips-badge">Skips: ${skipsRemaining}/3</span>
      </div>

      <div class="cooped-challenge-content">
        <div class="cooped-question">
          ${challenge.question}
          ${challenge.isBooleanQuestion ? `<div style="font-size: 14px; margin-top: 10px; opacity: 0.9;">${challenge.booleanHint}</div>` : ''}
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

        <div class="cooped-actions">
          <button id="cooped-skip-btn" class="cooped-btn cooped-btn-secondary" ${skipsRemaining <= 0 ? 'disabled' : ''}>
            Skip Question
          </button>
          <button id="cooped-tellme-btn" class="cooped-btn cooped-btn-secondary">
            Tell Me Answer
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
  const skipBtn = overlay.querySelector('#cooped-skip-btn');
  const tellMeBtn = overlay.querySelector('#cooped-tellme-btn');
  const input = overlay.querySelector('#cooped-answer-input');

  submitBtn.addEventListener('click', () => handleAnswerSubmit(overlay));
  skipBtn.addEventListener('click', () => handleSkip(overlay));
  tellMeBtn.addEventListener('click', () => handleTellMe(overlay));
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

  let feedbackMsg = '';
  if (xpGained > 0) {
    const speedText = timeSpent < 30000 ? ' ⚡ Lightning fast!' : '';
    feedbackMsg = `🎉 Correct! +${xpGained} XP${speedText}<br><small>${mascotMsg}</small>`;
  } else {
    feedbackMsg = `✅ Correct, but too slow. +${xpGained} XP<br><small>Try to answer faster next time!</small>`;
  }

  showFeedback(feedback, feedbackMsg, 'success');

  // Show level up message if applicable
  if (levelUpInfo.leveledUp) {
    feedback.innerHTML += `<br><strong>🎊 LEVEL UP! Your chicken evolved to: ${levelUpInfo.newStage.name}!</strong>`;
  }

  // Send message to background script
  chrome.runtime.sendMessage({
    type: 'CHALLENGE_COMPLETED',
    data: session
  });

  // Clear saved challenge since it's been completed
  await clearCurrentChallenge();

  // Show interval selection popup after a brief delay
  setTimeout(() => {
    showIntervalSelectionOverlay(overlay);
  }, 2000);
}

/**
 * Handle incorrect answer
 */
async function handleIncorrectAnswer(overlay, feedback, input) {
  const state = await getAppState();
  const mascotMsg = getMascotMessage('failure', state.mascot.currentStage);

  const xpChange = calculateXPReward(currentChallenge.difficulty, false, Date.now() - challengeStartTime);

  let feedbackMsg = '';
  if (xpChange < 0) {
    feedbackMsg = `❌ Not quite right. ${xpChange} XP<br><small>${mascotMsg} Try again!</small>`;
  } else {
    feedbackMsg = `❌ Not quite right. ${mascotMsg}<br><small>Try again!</small>`;
  }

  showFeedback(
    feedback,
    feedbackMsg,
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
    experienceGained: xpChange
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
 * Show interval selection popup after correct answer
 * Allows user to choose when they want to be challenged again (5, 15, or 30 minutes)
 */
async function showIntervalSelectionOverlay(previousOverlay) {
  const hostname = new URL(window.location.href).hostname;

  const intervalOverlay = document.createElement('div');
  intervalOverlay.id = 'cooped-interval-overlay';
  intervalOverlay.innerHTML = `
    <div class="cooped-modal cooped-interval-modal">
      <div class="cooped-header">
        <div class="cooped-mascot">🎉</div>
        <h1>Great job!</h1>
        <p class="cooped-subtitle">When should I check on you again?</p>
      </div>

      <div class="cooped-interval-options">
        <button class="cooped-interval-btn" data-minutes="5">
          <span class="cooped-interval-time">5 minutes</span>
          <span class="cooped-interval-desc">Quick return</span>
        </button>
        <button class="cooped-interval-btn" data-minutes="15">
          <span class="cooped-interval-time">15 minutes</span>
          <span class="cooped-interval-desc">Medium break</span>
        </button>
        <button class="cooped-interval-btn" data-minutes="30">
          <span class="cooped-interval-time">30 minutes</span>
          <span class="cooped-interval-desc">Extended focus</span>
        </button>
      </div>

      <div class="cooped-footer">
        <p class="cooped-hint">I'll come back and give you another challenge when the time is up!</p>
      </div>
    </div>
  `;

  // Remove the previous challenge overlay
  previousOverlay.remove();
  document.body.appendChild(intervalOverlay);

  // Add event listeners to interval buttons
  const intervalBtns = intervalOverlay.querySelectorAll('.cooped-interval-btn');
  intervalBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const minutes = parseInt(e.currentTarget.getAttribute('data-minutes'));
      await setSiteInterval(hostname, minutes);

      console.log(`Cooped: User selected ${minutes} minute interval for ${hostname}`);

      // Remove interval overlay and restore normal page
      intervalOverlay.remove();
      document.body.style.overflow = '';
      isOverlayActive = false;
      currentChallenge = null;
      challengeStartTime = null;
      skipsRemaining = 3;
    });
  });
}

/**
 * Remove overlay
 */
async function removeOverlay(overlay) {
  overlay.remove();
  document.body.style.overflow = '';
  isOverlayActive = false;
  currentChallenge = null;
  challengeStartTime = null;
  skipsRemaining = 3;

  // Clear saved challenge when overlay is removed
  await clearCurrentChallenge();

  // Reset activity tracking for next interval
  lastActivityTime = Date.now();
}

async function handleSkip(overlay) {
  if (skipsRemaining <= 0) {
    return;
  }

  skipsRemaining--;

  const skipsBadge = document.getElementById('cooped-skips-badge');
  if (skipsBadge) {
    skipsBadge.textContent = `Skips: ${skipsRemaining}/3`;
  }

  const skipBtn = document.getElementById('cooped-skip-btn');
  if (skipBtn && skipsRemaining <= 0) {
    skipBtn.disabled = true;
  }

  const enabledTypes = ['trivia', 'math', 'word'];
  const randomType = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];
  currentChallenge = getRandomChallenge(randomType, currentChallenge.difficulty);

  challengeStartTime = Date.now();

  const questionDiv = overlay.querySelector('.cooped-question');
  const feedback = document.getElementById('cooped-feedback');
  const input = document.getElementById('cooped-answer-input');

  if (questionDiv) {
    questionDiv.textContent = currentChallenge.question;
  }

  if (input) {
    input.value = '';
    input.focus();
    input.disabled = false;
  }

  if (feedback) {
    feedback.style.display = 'none';
  }

  const submitBtn = document.getElementById('cooped-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = false;
  }

  showFeedback(
    feedback,
    '⏭️ Question skipped! Here\'s a new one.',
    'warning'
  );

  setTimeout(() => {
    if (feedback) {
      feedback.style.display = 'none';
    }
  }, 2000);
}

async function handleTellMe(overlay) {
  const feedback = document.getElementById('cooped-feedback');
  const input = document.getElementById('cooped-answer-input');
  const submitBtn = document.getElementById('cooped-submit-btn');
  const skipBtn = document.getElementById('cooped-skip-btn');
  const tellMeBtn = document.getElementById('cooped-tellme-btn');

  showFeedback(
    feedback,
    `💡 The answer is: <strong>${currentChallenge.answer}</strong><br><small>No points awarded, but you can proceed.</small>`,
    'info'
  );

  if (input) input.disabled = true;
  if (submitBtn) submitBtn.disabled = true;
  if (skipBtn) skipBtn.disabled = true;
  if (tellMeBtn) tellMeBtn.disabled = true;

  const session = {
    id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    timestamp: Date.now(),
    site: window.location.href,
    challengeType: currentChallenge.type,
    success: false,
    timeSpent: Date.now() - challengeStartTime,
    experienceGained: 0,
    revealed: true
  };

  await recordSession(session);

  chrome.runtime.sendMessage({
    type: 'CHALLENGE_REVEALED',
    data: session
  });

  // Clear saved challenge since answer was revealed
  await clearCurrentChallenge();

  setTimeout(() => {
    removeOverlay(overlay);
  }, 3000);
}

// Prevent immediate navigation on page load if blocked
window.addEventListener('load', () => {
  // Background script will send message if site is blocked
});
