/**
 * Content script for Cooped extension
 * Injects challenge overlay when user visits blocked sites
 */

// Import modules dynamically to ensure they're loaded as modules
let getRandomChallenge, checkAnswer, CHALLENGE_TYPES;
let recordSession, getAppState, saveCurrentChallenge, getCurrentChallenge, clearCurrentChallenge;
let calculateXPReward, getMascotMessage, checkLevelUp, getAdaptiveDifficultyWithVariety;
let setSiteInterval, checkSiteInterval, addEggs, startTimeTrackingSession;
let checkDoNotBotherMe, recordYouTubeActivity, analyzeYouTubeActivity, checkYouTubeShorts;
let updateTabVisibility, updateMediaPauseState, setActivityState, ACTIVITY_STATE, accumulateTime, getTimeTrackingRecord;
let detectPlatform, isOnYouTubeShorts, handleYouTubeShortsDetection, handleYouTubeLongFormDetection;
let recordYouTubeProductivityResponse, handleSocialMediaStimmingDetection, handleMediaPauseChange, handleTabVisibilityChange;

// Load all modules
Promise.all([
  import('../../challenges/challenge-bank.js'),
  import('../utils/storage.js'),
  import('../utils/mascot.js'),
  import('../utils/time-tracking.js'),
  import('../utils/platform-detection.js')
]).then(([challengeBank, storageModule, mascotModule, timeTrackingModule, platformDetectionModule]) => {
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
  addEggs = storageModule.addEggs;
  startTimeTrackingSession = storageModule.startTimeTrackingSession;
  checkDoNotBotherMe = storageModule.checkDoNotBotherMe;
  recordYouTubeActivity = storageModule.recordYouTubeActivity;
  analyzeYouTubeActivity = storageModule.analyzeYouTubeActivity;
  checkYouTubeShorts = storageModule.checkYouTubeShorts;

  calculateXPReward = mascotModule.calculateXPReward;
  getMascotMessage = mascotModule.getMascotMessage;
  checkLevelUp = mascotModule.checkLevelUp;
  getAdaptiveDifficultyWithVariety = mascotModule.getAdaptiveDifficultyWithVariety;

  updateTabVisibility = timeTrackingModule.updateTabVisibility;
  updateMediaPauseState = timeTrackingModule.updateMediaPauseState;
  setActivityState = timeTrackingModule.setActivityState;
  ACTIVITY_STATE = timeTrackingModule.ACTIVITY_STATE;
  accumulateTime = timeTrackingModule.accumulateTime;
  getTimeTrackingRecord = timeTrackingModule.getTimeTrackingRecord;

  detectPlatform = platformDetectionModule.detectPlatform;
  isOnYouTubeShorts = platformDetectionModule.isOnYouTubeShorts;
  handleYouTubeShortsDetection = platformDetectionModule.handleYouTubeShortsDetection;
  handleYouTubeLongFormDetection = platformDetectionModule.handleYouTubeLongFormDetection;
  recordYouTubeProductivityResponse = platformDetectionModule.recordYouTubeProductivityResponse;
  handleSocialMediaStimmingDetection = platformDetectionModule.handleSocialMediaStimmingDetection;
  handleMediaPauseChange = platformDetectionModule.handleMediaPauseChange;
  handleTabVisibilityChange = platformDetectionModule.handleTabVisibilityChange;

  // Now initialize the content script
  initializeContentScript();
}).catch(err => console.error('Cooped: Error loading modules:', err));

let currentChallenge = null;
let challengeStartTime = null;
let isOverlayActive = false;
let isMiniReminderActive = false;
let skipsRemaining = 3;
let intervalCheckTimer = null;
let lastActivityTime = Date.now();
const LONG_WATCH_THRESHOLD_MINUTES = 7; // Adjustable threshold (production value)
let longWatchChallengeTriggered = false; // Track if we already showed a challenge for this watch session
let currentWatchVideoId = null; // Track current video ID to detect video changes
let longWatchAccumulatedMs = 0; // Total continuous watch time
let longWatchPlayingSince = null; // Timestamp when current uninterrupted segment started
let lastKnownShortsState = null; // Track if we were on Shorts page to detect transitions

/**
 * Check if current tab is blocked and show challenge if needed
 */
async function checkAndShowChallenge() {
  // Only check once per page load
  if (isOverlayActive) return;

  try {
    // First check if extension is enabled
    const extensionStateResult = await chrome.storage.local.get(['extensionEnabled']);
    const isExtensionEnabled = extensionStateResult.extensionEnabled !== false; // Default to enabled

    if (!isExtensionEnabled) {
      console.log('Cooped: Extension is disabled - will not show challenges');
      // Continue with YouTube tracking but don't show challenges
      return;
    }

    // Then check if "Do Not Bother Me" timer is active
    const doNotBotherCheck = await checkDoNotBotherMe();
    if (doNotBotherCheck.active) {
      console.log(`Cooped: Do Not Bother Me active for ${doNotBotherCheck.minutesRemaining} more minutes`);
      // Don't show challenges during this period
      return;
    }

    const currentHostname = window.location.hostname;
    const isYouTube = currentHostname.includes('youtube.com');

    // Then check if there's an existing challenge in progress
    const savedChallenge = await getCurrentChallenge();

    if (savedChallenge) {
      const normalizeHost = (host) => (host || '').replace(/^www\./, '').toLowerCase();
      const originalHostname = normalizeHost(new URL(savedChallenge.url).hostname);
      const normalizedCurrent = normalizeHost(currentHostname);
      const isSameDomain =
        normalizedCurrent === originalHostname ||
        normalizedCurrent.endsWith('.' + originalHostname);

      if (isSameDomain) {
        if (isYouTube && originalHostname.includes('youtube.com')) {
          console.log('Cooped: Clearing saved YouTube challenge to avoid instant popup on fresh visit');
          await clearCurrentChallenge();
        } else {
          console.log('Cooped: Restoring saved challenge from previous page load');
          showSavedChallengeOverlay(savedChallenge);
          return;
        }
      }

      // Challenge belongs to a different site, clear it so it won't appear elsewhere
      await clearCurrentChallenge();
    }

    // Special handling: YouTube should only show challenges when productivity triggers fire.
    if (isYouTube) {
      console.log('Cooped: YouTube detected - waiting for activity triggers before showing challenge');
      return;
    }

    // If no saved challenge, check if site is blocked
    const response = await chrome.runtime.sendMessage({
      type: 'CHECK_BLOCKED_SITE'
    });

    if (response && response.isBlocked && !isOverlayActive) {
      const hostname = new URL(window.location.href).hostname;

      // YouTube should only show challenges after watching behaviour triggers
      if (hostname.includes('youtube.com')) {
        console.log('Cooped: Skipping immediate YouTube challenge until activity triggers fire');
        return;
      }

      // Check if site is in a cooldown interval
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

  // Track tab visibility (active/inactive) for time tracking
  document.addEventListener('visibilitychange', async () => {
    const isVisible = !document.hidden;
    const hostname = new URL(window.location.href).hostname;
    const platform = detectPlatform(hostname);

    if (platform) {
      await handleTabVisibilityChange(platform, isVisible);
      console.log(`[TAB-VISIBILITY] ${platform}: Tab is now ${isVisible ? 'VISIBLE' : 'HIDDEN'}`);
    }
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

  // If on YouTube, set up video tracking
  if (window.location.hostname.includes('youtube.com')) {
    setupYouTubeTracking();
  }
}

/**
 * Monitor for interval expiry and show re-engagement challenge if user is still active
 */
function startIntervalMonitoring() {
  // Check every 30 seconds if an interval has expired
  intervalCheckTimer = setInterval(async () => {
    if (isOverlayActive) return; // Don't check while overlay is showing

    try {
      // Check if extension is enabled
      const extensionStateResult = await chrome.storage.local.get(['extensionEnabled']);
      const isExtensionEnabled = extensionStateResult.extensionEnabled !== false;

      if (!isExtensionEnabled) {
        console.log('Cooped: Extension is disabled - skipping re-engagement check');
        return;
      }

      const hostname = new URL(window.location.href).hostname;

      // YouTube uses custom triggers, skip re-engagement polling
      if (hostname.includes('youtube.com')) {
        return;
      }
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
  overlay.classList.add('cooped-mini-hidden');
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
          <strong>QUESTION:</strong> <span>${challenge.question}</span>
          ${challenge.isBooleanQuestion ? `<div style="font-size: 14px; margin-top: 10px; opacity: 0.9;">${challenge.booleanHint}</div>` : ''}

          <div class="cooped-input-group">
            <input
              type="text"
              id="cooped-answer-input"
              class="cooped-input"
              placeholder="Type your answer..."
              autocomplete="off"
            >
            <button id="cooped-submit-btn" class="cooped-btn-primary">
              Submit
            </button>
          </div>
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

  // If we're on YouTube, pause any playing videos so the popup doesn't run over the audio
  if (window.location.hostname.includes('youtube.com')) {
    pauseYouTubeVideo();
  }

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
  const overlay = createOverlayElement(currentChallenge);
  document.body.appendChild(overlay);

  // Focus on input after render
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

  if (window.location.hostname.includes('youtube.com')) {
    pauseYouTubeVideo();
  }

  // Create overlay
  const overlay = createOverlayElement(currentChallenge);
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
function createOverlayElement(challenge) {
  const overlay = document.createElement('div');
  overlay.id = 'cooped-overlay';
  overlay.innerHTML = `
    <div class="cooped-modal">
      <div class="cooped-header">
        <div class="cooped-chicken-image">
          <img src="${chrome.runtime.getURL('src/assets/mascot/chicken_basic.png')}" alt="Cooped Chicken">
        </div>
        <h1>Funny seeing you here...</h1>
        <p class="cooped-subtitle">Not so fast pal...</p>
      </div>

      <div class="cooped-challenge-content">
        <div class="cooped-question">
          <strong>QUESTION:</strong> <span>${challenge.question}</span>
          ${challenge.isBooleanQuestion ? `<div style="font-size: 14px; margin-top: 10px; opacity: 0.9;">${challenge.booleanHint}</div>` : ''}
          ${challenge.requiresContextValidation ? `<div style="font-size: 13px; margin-top: 10px; opacity: 0.8; font-style: italic; color: #666;">Write a sentence using this word naturally. At least 10 words.</div>` : ''}

          <div class="cooped-input-group">
            <input
              type="text"
              id="cooped-answer-input"
              class="cooped-input"
              placeholder="Type your answer..."
              autocomplete="off"
            >
            <button id="cooped-submit-btn" class="cooped-btn-primary">
              Submit
            </button>
          </div>
        </div>

        ${challenge.requiresContextValidation ? `<button id="cooped-show-definition-btn" class="cooped-btn cooped-btn-secondary" style="width: 100%; margin-bottom: 15px;">Show Definition</button>` : ''}

        <button id="cooped-skip-button" class="cooped-skip-button">
          <span class="cooped-skip-text">Skip this question</span>
          <span class="cooped-skip-cost">COST = 1 EGG 🥚</span>
        </button>

        <div id="cooped-feedback" class="cooped-feedback"></div>
      </div>
    </div>
  `;

  // Add event listeners
  const submitBtn = overlay.querySelector('#cooped-submit-btn');
  const skipBtn = overlay.querySelector('#cooped-skip-button');
  const input = overlay.querySelector('#cooped-answer-input');
  const showDefBtn = overlay.querySelector('#cooped-show-definition-btn');

  submitBtn.addEventListener('click', () => handleAnswerSubmit(overlay));
  skipBtn.addEventListener('click', () => handleSkip(overlay));
  if (showDefBtn) {
    showDefBtn.addEventListener('click', () => handleShowDefinition(overlay, challenge));
  }
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

  // Check answer (pass challenge for vocabulary context validation)
  const isCorrect = checkAnswer(userAnswer, currentChallenge.answer, currentChallenge);
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

  // DISABLED: Show interval selection popup after a brief delay
  // TODO: If this feature is not re-enabled within 2 release cycles, remove the showIntervalSelectionOverlay function entirely
  // (Keep the function in code for now but don't call it)
  // setTimeout(() => {
  //   showIntervalSelectionOverlay(overlay);
  // }, 2000);

  // For now, just close the overlay after success
  await removeOverlay(overlay);
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
  const state = await getAppState();
  const currentEggs = state.user.stats.eggs || 0;

  // Check if user has enough eggs to skip
  if (currentEggs < 1) {
    const feedback = document.getElementById('cooped-feedback');
    showFeedback(feedback, '❌ You need 1 egg to skip! Earn more points and convert them to eggs.', 'error');
    return;
  }

  // Deduct 1 egg
  await addEggs(-1);

  // Start time tracking for this site
  const hostname = new URL(window.location.href).hostname;
  await startTimeTrackingSession(hostname);

  // Close overlay and allow access
  await removeOverlay(overlay);

  // Show feedback message
  const tempFeedback = document.createElement('div');
  tempFeedback.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ffccbc;
    color: #d84315;
    padding: 15px 20px;
    border-radius: 8px;
    font-weight: 600;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  tempFeedback.textContent = '⏱️ Skip used! -1 EGG - Time is being tracked.';
  document.body.appendChild(tempFeedback);

  // Remove message after 4 seconds
  setTimeout(() => {
    tempFeedback.remove();
  }, 4000);
}

async function handleShowDefinition(_overlay, challenge) {
  // Extract the word from the question (format: "Use this word in a sentence: WORD")
  const wordMatch = challenge.question.match(/in a sentence: (\w+)/i);
  if (!wordMatch) return;

  const word = wordMatch[1];
  const feedback = document.getElementById('cooped-feedback');

  // Simple definition lookup - in a real app, you'd use an API like WordsAPI or Merriam-Webster
  const definitions = {
    'HAPPY': 'feeling or showing pleasure or contentment',
    'RUN': 'move fast by using your legs',
    'BLUE': 'the color of the sky on a clear day',
    'JUMP': 'push oneself off a surface and into the air',
    'BRIGHT': 'giving out much light; shining',
    'QUICK': 'happening or done fast',
    'FRIEND': 'a person with whom one has a bond of mutual affection',
    'LEARN': 'acquire knowledge or skill in something',
    'MORNING': 'the part of the day from sunrise until noon',
    'BEAUTIFUL': 'pleasing the senses or mind aesthetically',
    'ELOQUENT': 'fluent, persuasive, and expressive in speaking or writing',
    'MELANCHOLY': 'a feeling of pensive sadness, typically with no obvious cause',
    'TENACIOUS': 'holding firmly to something; persistent',
    'AMBIGUOUS': 'open to more than one interpretation; unclear',
    'RESILIENT': 'able to withstand or recover quickly from difficult conditions',
    'PRAGMATIC': 'dealing with things in a way based on practical rather than theoretical considerations',
    'OBSCURE': 'not clearly expressed or easily understood',
    'METICULOUS': 'showing great attention to detail; very careful and precise',
    'EPHEMERAL': 'lasting for a very short time',
    'VIVACIOUS': 'lively, animated, and spirited',
    'INCONGRUOUS': 'not in harmony or keeping with the surroundings',
    'SANGUINE': 'optimistic or positive, especially in an inappropriate situation',
    'OBFUSCATE': 'to deliberately make unclear or confusing',
    'PERSPICACIOUS': 'having keen insight; mentally sharp',
    'SERENDIPITY': 'the occurrence of events by chance in a happy or beneficial way',
    'PELLUCID': 'translucently clear; easy to understand',
    'CAPRICIOUS': 'given to sudden and unaccountable changes of mood or behavior',
    'MAGNANIMOUS': 'generous or forgiving, especially toward a rival or less powerful person',
    'PROPITIOUS': 'giving or indicating a good chance of success; favorable',
    'UBIQUITOUS': 'present, appearing, or found everywhere'
  };

  const definition = definitions[word] || `Definition of ${word}: (Not available - try looking it up in a dictionary)`;

  showFeedback(
    feedback,
    `<strong>${word}</strong><br><small>${definition}</small>`,
    'info'
  );
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

/**
 * Pause any active YouTube/Shorts video so audio stops when a challenge appears
 */
function pauseYouTubeVideo() {
  try {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      if (!video.paused) {
        video.pause();
      }
    });
    if (videos.length > 0) {
      console.log('Cooped: Paused YouTube video for challenge overlay');
    }
  } catch (error) {
    console.log('Cooped: Unable to pause YouTube video', error);
  }
}

/**
 * Long-form watch tracking helpers
 */
function resetLongWatchTracking() {
  longWatchAccumulatedMs = 0;
  longWatchPlayingSince = null;
}

function startLongWatchSegment() {
  if (!longWatchPlayingSince) {
    longWatchPlayingSince = Date.now();
  }
}

function pauseLongWatchSegment() {
  if (longWatchPlayingSince) {
    longWatchAccumulatedMs += Date.now() - longWatchPlayingSince;
    longWatchPlayingSince = null;
  }
}

function getLongWatchMinutes() {
  const currentSegment = longWatchPlayingSince ? (Date.now() - longWatchPlayingSince) : 0;
  return (longWatchAccumulatedMs + currentSegment) / (60 * 1000);
}

function syncLongWatchTracking() {
  const video = document.querySelector('video');
  const isPlaying = video && !video.paused && !video.ended && video.currentTime > 0;
  if (isPlaying) {
    startLongWatchSegment();
  } else {
    pauseLongWatchSegment();
  }
}

/**
 * Position the mini reminder over the active video area
 */
function positionMiniReminderOverlay(overlay) {
  if (!overlay) return;
  const video = document.querySelector('video');
  if (!video) {
    overlay.style.top = '';
    overlay.style.bottom = '40px';
    overlay.style.left = '50%';
    overlay.style.transform = 'translate(-50%, 0)';
    return;
  }

  const rect = video.getBoundingClientRect();
  const overlayRect = overlay.getBoundingClientRect();
  const top = Math.max(rect.top + (rect.height / 2) - (overlayRect.height / 2), 20);
  const left = rect.left + (rect.width / 2);

  overlay.style.bottom = '';
  overlay.style.top = `${top}px`;
  overlay.style.left = `${left}px`;
  overlay.style.transform = 'translate(-50%, 0)';
}

/**
 * Show a lightweight reminder overlay (YouTube mini block screen)
 */
function showMiniReminderOverlay(context = {}) {
  if (isMiniReminderActive) return;
  isMiniReminderActive = true;
  longWatchChallengeTriggered = true;

  const overlay = document.createElement('div');
  overlay.id = 'cooped-mini-reminder';
  overlay.innerHTML = `
    <div class="cooped-mini-card">
      <img class="cooped-mini-mascot" src="${chrome.runtime.getURL('src/assets/mascot/chicken_basic.png')}" alt="Cooped Chicken">
      <p class="cooped-mini-text">You still working?</p>
      <button class="cooped-mini-btn cooped-mini-btn-primary" data-action="yes">Yes</button>
      <button class="cooped-mini-btn cooped-mini-btn-secondary" data-action="confess">Yes... well no actually</button>
      <p class="cooped-mini-message" aria-live="polite"></p>
    </div>
  `;

  const reposition = () => positionMiniReminderOverlay(overlay);

  const cleanupListeners = () => {
    window.removeEventListener('resize', reposition);
    window.removeEventListener('scroll', reposition, true);
  };

  const removeOverlay = () => {
    if (!overlay.isConnected) return;
    cleanupListeners();
    overlay.remove();
    isMiniReminderActive = false;
    resetLongWatchTracking();
    longWatchChallengeTriggered = false;
  };

  const cardEl = overlay.querySelector('.cooped-mini-card');
  const yesBtn = overlay.querySelector('[data-action="yes"]');
  const confessBtn = overlay.querySelector('[data-action="confess"]');
  const messageEl = overlay.querySelector('.cooped-mini-message');

  yesBtn.addEventListener('click', async () => {
    yesBtn.disabled = true;
    confessBtn.disabled = true;
    messageEl.textContent = 'Keep it up! 🐥';

    // Record that user reported being productive
    const videoId = extractVideoIdFromUrl();
    const videoTitle = document.querySelector('h1.title yt-formatted-string')?.textContent || 'Unknown';
    await recordYouTubeProductivityResponse(true, {
      videoId,
      videoTitle,
      timestamp: Date.now()
    });

    setTimeout(removeOverlay, 800);
  });

  confessBtn.addEventListener('click', async () => {
    yesBtn.disabled = true;
    confessBtn.disabled = true;
    messageEl.textContent = "I'll be back...";

    // Record that user reported NOT being productive
    const videoId = extractVideoIdFromUrl();
    const videoTitle = document.querySelector('h1.title yt-formatted-string')?.textContent || 'Unknown';
    await recordYouTubeProductivityResponse(false, {
      videoId,
      videoTitle,
      timestamp: Date.now()
    });

    setTimeout(removeOverlay, 1500);
  });

  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    reposition();
    requestAnimationFrame(() => {
      overlay.classList.remove('cooped-mini-hidden');
    });
  });
  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, true);
}

/**
 * Debug helper: Dump YouTube activity storage to console
 */
async function debugDumpYouTubeActivity() {
  try {
    const result = await chrome.storage.local.get('cooped_youtube_activity');
    const activities = result.cooped_youtube_activity || [];
    console.log('[DEBUG_DUMP] Total activities stored:', activities.length);
    console.log('[DEBUG_DUMP] Recent activities (last 5):', activities.slice(-5).map(a => ({
      type: a.type,
      videoId: a.videoId,
      isShorts: a.isShorts,
      timestamp: new Date(a.timestamp).toISOString()
    })));
  } catch (error) {
    console.error('[DEBUG_DUMP] Error:', error);
  }
}

/**
 * Set up YouTube-specific video tracking
 * Monitors pause/play events and URL changes to detect productivity patterns
 */
function setupYouTubeTracking() {
  let currentVideoId = extractVideoIdFromUrl();
  let lastRecordedUrl = window.location.href;
  resetLongWatchTracking();
  currentWatchVideoId = currentVideoId;

  const processVideoChange = async () => {
    const currentUrl = window.location.href;
    const urlChanged = currentUrl !== lastRecordedUrl;
    if (urlChanged) {
      lastRecordedUrl = currentUrl;
    }

    const newVideoId = extractVideoIdFromUrl();
    const isShortsPage = window.location.pathname.includes('/shorts');
    if (newVideoId && newVideoId !== currentVideoId) {
      currentVideoId = newVideoId;
      currentWatchVideoId = newVideoId;
      resetLongWatchTracking();
      longWatchChallengeTriggered = false;
      try {
        await recordYouTubeActivity({
          type: 'url_change',
          videoId: newVideoId,
          videoDuration: getVideoDuration(),
          currentTime: getCurrentPlayTime(),
          isShorts: isShortsPage
        });
        console.log('[ACTIVITY_RECORD] YouTube video changed to', newVideoId, '| isShortsPage:', isShortsPage, '| pathname:', window.location.pathname);
      } catch (err) {
        console.error('[ACTIVITY_RECORD_ERROR] Failed to record activity:', err.message);
      }
    } else if (!newVideoId && urlChanged) {
      currentWatchVideoId = null;
      resetLongWatchTracking();
      // URL changed but we couldn't parse an ID (fallback for Shorts or unknown formats)
      try {
        await recordYouTubeActivity({
          type: 'url_change',
          videoId: null,
          videoDuration: getVideoDuration(),
          currentTime: getCurrentPlayTime(),
          isShorts: isShortsPage
        });
        console.log('[ACTIVITY_RECORD] YouTube URL changed (no ID detected):', currentUrl, '| isShortsPage:', isShortsPage, '| pathname:', window.location.pathname);
      } catch (err) {
        console.error('[ACTIVITY_RECORD_ERROR] Failed to record activity:', err.message);
      }
    }
  };

  const handleVideoChange = () => {
    requestAnimationFrame(processVideoChange);
  };

  // Monitor URL changes, including SPA navigation
  window.addEventListener('popstate', handleVideoChange);
  window.addEventListener('hashchange', handleVideoChange);
  window.addEventListener('yt-navigate-finish', handleVideoChange);

  // Patch history methods to detect pushState/replaceState navigation (used heavily by YouTube)
  if (!window.__coopedHistoryPatched) {
    window.__coopedHistoryPatched = true;
    ['pushState', 'replaceState'].forEach((method) => {
      const original = history[method];
      history[method] = function (...args) {
        const result = original.apply(this, args);
        handleVideoChange();
        return result;
      };
    });
  }

  // Fallback: poll for URL changes in case custom events are missed
  setInterval(() => {
    if (window.location.href !== lastRecordedUrl) {
      handleVideoChange();
    }
  }, 1000);

  // Periodically sync play/pause state in case events were missed
  setInterval(syncLongWatchTracking, 2000);

  // Inject script to monitor player events
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      const originalPlay = HTMLMediaElement.prototype.play;
      const originalPause = HTMLMediaElement.prototype.pause;

      HTMLMediaElement.prototype.play = function() {
        window.postMessage({ type: 'YT_PLAY', currentTime: this.currentTime }, '*');
        return originalPlay.call(this);
      };

      HTMLMediaElement.prototype.pause = function() {
        window.postMessage({ type: 'YT_PAUSE', currentTime: this.currentTime }, '*');
        return originalPause.call(this);
      };
    })();
  `;
  document.documentElement.appendChild(script);
  script.remove();

  // Listen for messages from injected script
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;

    if (event.data.type === 'YT_PLAY') {
      await recordYouTubeActivity({
        type: 'play',
        videoId: currentVideoId,
        videoDuration: getVideoDuration(),
        currentTime: event.data.currentTime || getCurrentPlayTime()
      });
      startLongWatchSegment();
      // Update time tracking: video is playing (not paused)
      await handleMediaPauseChange('youtube.com', false);
      console.log('Cooped: YouTube video played');
    } else if (event.data.type === 'YT_PAUSE') {
      await recordYouTubeActivity({
        type: 'pause',
        videoId: currentVideoId,
        videoDuration: getVideoDuration(),
        currentTime: event.data.currentTime || getCurrentPlayTime()
      });
      pauseLongWatchSegment();
      // Update time tracking: video is paused (no time accumulation)
      await handleMediaPauseChange('youtube.com', true);
      console.log('Cooped: YouTube video paused');
    }
  });

  // Check every 5 seconds for productivity triggers (long watch or short-form binge)
  longWatchCheckTimer = setInterval(async () => {
    if (isOverlayActive || isMiniReminderActive || !recordYouTubeActivity) return;

    // Check if extension is enabled
    const extensionStateResult = await chrome.storage.local.get(['extensionEnabled']);
    const isExtensionEnabled = extensionStateResult.extensionEnabled !== false;

    if (!isExtensionEnabled) {
      console.log('Cooped: Extension is disabled - will track but not show challenges');
      return;
    }

    try {
      const videoId = extractVideoIdFromUrl();
      const isShortsPage = window.location.pathname.includes('/shorts');

      // Debug: Log the state every 30 seconds
      console.log('[30SEC_CHECK] isShortsPage:', isShortsPage, '| videoId:', videoId, '| pathname:', window.location.pathname);

      // Detect transitions between Shorts and regular videos
      if (lastKnownShortsState !== null && lastKnownShortsState !== isShortsPage) {
        console.log(`Cooped: Transitioning from ${lastKnownShortsState ? 'Shorts' : 'regular'} to ${isShortsPage ? 'Shorts' : 'regular'} mode`);
        resetLongWatchTracking();
        longWatchChallengeTriggered = false;
      }
      lastKnownShortsState = isShortsPage;

      // Reset tracking when video changes
      if (videoId !== currentWatchVideoId) {
        currentWatchVideoId = videoId;
        longWatchChallengeTriggered = false;
        resetLongWatchTracking();
        console.log(`Cooped: New video detected (${videoId}), resetting challenge flag`);
      }

      // Continuously sync playback state in case we missed events
      syncLongWatchTracking();

      const watchedMinutes = getLongWatchMinutes();

      let triggerInfo = null;

      // For Shorts: ALWAYS check for Shorts pattern, ignore long watch threshold
      if (isShortsPage && !longWatchChallengeTriggered) {
        console.log('[SHORTS CHECK] User is on Shorts page, checking for viewing pattern...');
        await debugDumpYouTubeActivity(); // Debug: see what's stored
        const shortsCheck = typeof checkYouTubeShorts === 'function'
          ? await checkYouTubeShorts()
          : { watchingShortsIndicator: false, analysisDetails: {} };

        console.log('[SHORTS CHECK RESULT]', shortsCheck);

        // Update time tracking based on Shorts detection
        await handleYouTubeShortsDetection(shortsCheck.shortsCount, '7 minutes');

        if (shortsCheck.watchingShortsIndicator) {
          triggerInfo = {
            type: 'block_screen',
            reason: 'short_form',
            message: `[SHORTS] Detected watching multiple shorts (${shortsCheck.shortsCount} watched)`
          };
          console.log('[SHORTS TRIGGER] YES - showing block screen');
        } else {
          console.log('[SHORTS TRIGGER] NO - need more shorts activity');
        }
      } else if (
        // For regular videos: check long watch ONLY if NOT on Shorts
        !isShortsPage &&
        watchedMinutes >= LONG_WATCH_THRESHOLD_MINUTES &&
        !longWatchChallengeTriggered &&
        currentWatchVideoId
      ) {
        // Update time tracking: long watch detected
        await handleYouTubeLongFormDetection(watchedMinutes);

        triggerInfo = {
          type: 'youtube_mini',
          reason: 'long_watch',
          message: `[LONG WATCH] Video playing for ${watchedMinutes.toFixed(1)} minutes without pause`
        };
      }

      if (triggerInfo) {
        console.log(`Cooped: ${triggerInfo.message} - showing reminder`);

        if (triggerInfo.type === 'youtube_mini') {
          showMiniReminderOverlay(triggerInfo);
        } else {
          longWatchChallengeTriggered = true;
          resetLongWatchTracking();

          console.log('[BLOCK_SCREEN_TRIGGER] Showing full block screen for:', triggerInfo.reason);
          await showFullBlockScreen();
          console.log('[BLOCK_SCREEN_TRIGGER] Block screen display completed');
        }
      }
    } catch (error) {
      console.error('Cooped: Error in long watch check:', error);
    }
  }, 5000); // Check every 5 seconds for faster Shorts detection
}

/**
 * Extract video ID from YouTube URL
 */
function extractVideoIdFromUrl() {
  const url = window.location.href;

  // Handle youtube.com/watch?v=ID
  const match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];

  // Handle youtube.com/shorts/ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{5,})/);
  if (shortsMatch) return shortsMatch[1];

  // Handle youtu.be/ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  return null;
}

/**
 * Get current video duration
 */
function getVideoDuration() {
  const video = document.querySelector('video');
  if (video && video.duration) {
    return Math.round(video.duration);
  }
  return 0;
}

/**
 * Get current playback time
 */
function getCurrentPlayTime() {
  const video = document.querySelector('video');
  if (video && video.currentTime) {
    return Math.round(video.currentTime);
  }
  return 0;
}

async function showFullBlockScreen() {
  const response = await chrome.runtime.sendMessage({
    type: 'CHECK_BLOCKED_SITE'
  }).catch((error) => {
    console.log('Cooped: Error contacting background for YouTube challenge:', error);
    return null;
  });

  if (response && response.isBlocked) {
    showChallengeOverlay(response);
  } else {
    const state = await getAppState();
    showChallengeOverlay({
      isBlocked: true,
      url: window.location.href,
      difficulty: state.settings.challengeDifficulty,
      enabledTypes: state.settings.enabledChallengeTypes
    });
  }
}
