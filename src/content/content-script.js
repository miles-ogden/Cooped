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
let recordYouTubeProductivityResponse, handleMediaPauseChange, handleTabVisibilityChange;
let showInterruptSequence;
let applyXpEvent, getCurrentUser;

// Set up message listener BEFORE modules load, store message for when ready
let pendingMessages = [];
let modulesReady = false;

// Interrupt sequence overlay state
let interruptOverlayElement = null;
let currentInterruptPage = 1;
let currentGameType = 'math'; // Track which game is being played (vocabulary, math, etc.)
let interruptSequenceUserId = null; // User ID for this interrupt session
let stimPenaltyApplied = false; // Track if -50 XP penalty was applied for this visit
let challengeAnsweredCorrectly = false; // Track if user answered challenge correctly

/**
 * Show the interrupt sequence overlay (inline implementation)
 */
async function showInterruptSequenceInline() {
  console.log('[INTERRUPT] showInterruptSequenceInline called');

  if (interruptOverlayElement && interruptOverlayElement.isConnected) {
    console.log('[INTERRUPT] Overlay already showing, returning');
    return;
  }

  // Apply -50 XP stim penalty when blocked site is visited
  if (!stimPenaltyApplied && getCurrentUser && applyXpEvent) {
    try {
      const user = await getCurrentUser(true);
      if (user) {
        interruptSequenceUserId = user.id;
        stimPenaltyApplied = true;
        console.log('[INTERRUPT] Applying -50 XP stim penalty for user:', user.id);
        await applyXpEvent(user.id, 'stim_penalty', {});
        console.log('[INTERRUPT] Stim penalty applied successfully');
      }
    } catch (err) {
      console.error('[INTERRUPT] Error applying stim penalty:', err);
    }
  }

  if (!document.body) {
    console.log('[INTERRUPT] document.body not ready, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', async () => {
      console.log('[INTERRUPT] DOM ready, retrying interrupt overlay');
      await showInterruptSequenceInline();
    }, { once: true });
    return;
  }

  // Pause YouTube video if on YouTube
  const hostname = window.location.hostname;
  if (hostname.includes('youtube.com')) {
    pauseYouTubeVideo();
  }

  console.log('[INTERRUPT] Creating new interrupt overlay');
  currentInterruptPage = 1;
  currentGameType = 'random'; // Reset game type to pick a new random one

  // Create overlay container
  interruptOverlayElement = document.createElement('div');
  interruptOverlayElement.id = 'cooped-interrupt-overlay';

  // Add SVG filter for chicken outline
  const svgFilter = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgFilter.style.position = 'absolute';
  svgFilter.style.width = '0';
  svgFilter.style.height = '0';
  svgFilter.innerHTML = `
    <defs>
      <filter id="chicken-outline-filter" x="-20%" y="-20%" width="140%" height="140%">
        <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="expanded" />
        <feFlood flood-color="#000000" result="outline-color" />
        <feComposite in="outline-color" in2="expanded" operator="in" result="outline" />
        <feMerge>
          <feMergeNode in="outline" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  `;
  interruptOverlayElement.appendChild(svgFilter);

  // Create modal box (white square in center)
  const modal = document.createElement('div');
  modal.className = 'cooped-interrupt-modal';
  modal.id = 'cooped-interrupt-modal';

  // Create header
  const header = document.createElement('div');
  header.className = 'cooped-interrupt-header';
  header.id = 'cooped-interrupt-header';
  modal.appendChild(header);

  // Create content area
  const content = document.createElement('div');
  content.className = 'cooped-interrupt-content';
  content.id = 'cooped-interrupt-content';
  modal.appendChild(content);

  // Create navigation arrow at bottom
  const arrow = document.createElement('div');
  arrow.className = 'cooped-interrupt-arrow';
  arrow.innerHTML = '↓';
  modal.appendChild(arrow);

  interruptOverlayElement.appendChild(modal);

  // Add click event listeners
  interruptOverlayElement.addEventListener('click', (e) => {
    // Don't advance if on page 2 (quiz page) - user must answer correctly
    if (currentInterruptPage === 2) {
      return;
    }

    if (e.target === arrow || e.target.closest('.cooped-interrupt-arrow')) {
      advanceInterruptPageInline();
    } else if (!e.target.closest('button, input, textarea')) {
      advanceInterruptPageInline();
    }
  });

  // Append to body
  if (document.body) {
    // Store original body content
    const bodyChildren = Array.from(document.body.children).filter(child => child.id !== 'cooped-grayscale-layer');

    // Create grayscale wrapper for background content only
    const grayscaleLayer = document.createElement('div');
    grayscaleLayer.id = 'cooped-grayscale-layer';
    grayscaleLayer.style.position = 'fixed';
    grayscaleLayer.style.top = '0';
    grayscaleLayer.style.left = '0';
    grayscaleLayer.style.width = '100%';
    grayscaleLayer.style.height = '100%';
    grayscaleLayer.style.filter = 'grayscale(100%)';
    grayscaleLayer.style.zIndex = '2147483645';
    grayscaleLayer.style.pointerEvents = 'none';
    grayscaleLayer.style.overflow = 'hidden';

    // Move existing body content to grayscale layer
    for (let child of bodyChildren) {
      if (child !== interruptOverlayElement) {
        grayscaleLayer.appendChild(child);
      }
    }

    document.body.appendChild(grayscaleLayer);
    document.body.appendChild(interruptOverlayElement);
    console.log('[INTERRUPT] Overlay appended to DOM');
    console.log('[INTERRUPT] Applied grayscale filter to background only');

    // Remove any unwanted iframes that YouTube might inject
    const removeUnwantedElements = () => {
      const modal = document.getElementById('cooped-interrupt-modal');
      if (modal) {
        // Remove all iframes
        modal.querySelectorAll('iframe').forEach(iframe => {
          iframe.remove();
          console.log('[INTERRUPT] Removed unwanted iframe');
        });
      }
    };

    // Run immediately and periodically to catch injected elements
    removeUnwantedElements();
    const cleanupInterval = setInterval(() => {
      if (!interruptOverlayElement || !interruptOverlayElement.isConnected) {
        clearInterval(cleanupInterval);
        return;
      }
      removeUnwantedElements();
    }, 500);

    // Periodically enforce video pause/mute while overlay is active
    const videoPauseInterval = setInterval(() => {
      if (!interruptOverlayElement || !interruptOverlayElement.isConnected) {
        clearInterval(videoPauseInterval);
        return;
      }
      // Re-pause and mute if video starts playing again
      const hostname = window.location.hostname;
      if (hostname.includes('youtube.com')) {
        pauseYouTubeVideo();
      }
    }, 250); // Check every 250ms for aggressive pausing

    renderInterruptPageInline(1);
    console.log('[INTERRUPT] Page 1 rendered');
  } else {
    console.log('[INTERRUPT] ERROR: No document.body available');
  }
}

/**
 * Render a specific interrupt page
 */
function renderInterruptPageInline(pageNum) {
  const headerEl = document.getElementById('cooped-interrupt-header');
  const contentEl = document.getElementById('cooped-interrupt-content');

  if (!headerEl || !contentEl) {
    console.log('[INTERRUPT] Header or content element not found');
    return;
  }

  headerEl.innerHTML = '';
  contentEl.innerHTML = '';

  if (pageNum === 1) {
    renderPage1Inline(headerEl);
  } else if (pageNum === 2) {
    // Randomly select a challenge type
    const challengeTypes = ['vocabulary', 'math', 'history'];
    const randomChallenge = challengeTypes[Math.floor(Math.random() * challengeTypes.length)];
    console.log('[INTERRUPT] Selected random challenge:', randomChallenge);

    if (randomChallenge === 'vocabulary') {
      renderVocabularyChallengeInline(headerEl, contentEl);
    } else if (randomChallenge === 'math') {
      renderMathChallengeInline(headerEl, contentEl);
    } else if (randomChallenge === 'history') {
      renderHistoryChallengeInline(headerEl, contentEl);
    }
  } else if (pageNum === 3) {
    renderPage3Inline(headerEl, contentEl);
  }
}

/**
 * Page 1: Chicken + "Funny seeing you here" message
 */
function renderPage1Inline(headerEl) {
  console.log('[INTERRUPT] renderPage1Inline called');

  // Add chicken image
  const chickenDiv = document.createElement('div');
  chickenDiv.className = 'cooped-interrupt-chicken-image';
  const img = document.createElement('img');
  img.src = chrome.runtime.getURL('src/assets/mascot/chicken_svg.svg');
  img.alt = 'Cooped Chicken';
  chickenDiv.appendChild(img);
  headerEl.appendChild(chickenDiv);

  // Add big title message
  const title = document.createElement('h1');
  title.className = 'cooped-interrupt-title page-1-title';
  title.textContent = 'Funny seeing you here...';
  headerEl.appendChild(title);

  console.log('[INTERRUPT] Page 1 rendered');
}

/**
 * Game 1: Vocabulary Challenge - Fill in the blank
 */
function renderVocabularyChallengeInline(headerEl, contentEl) {
  console.log('[INTERRUPT] renderVocabularyChallengeInline called');

  // Add title to header
  const title = document.createElement('h1');
  title.className = 'cooped-interrupt-title';
  title.textContent = 'Vocabulary Challenge';
  headerEl.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.className = 'cooped-interrupt-subtitle';
  subtitle.textContent = 'Help the chicken pick the right word!';
  headerEl.appendChild(subtitle);

  // Dynamically load vocabulary questions and select a random one
  import('./vocabulary-questions.js').then(module => {
    const question = module.getRandomVocabularyQuestion();
    console.log('[INTERRUPT] Selected vocabulary question:', question.correctAnswer);
    renderVocabularyGameUI(headerEl, contentEl, question);
  }).catch(err => {
    console.error('[INTERRUPT] Error loading vocabulary questions:', err);
    // Fallback question if import fails
    const fallbackQuestion = {
      sentence: 'The teacher gave a __________ explanation that helped everyone understand the concept.',
      correctAnswer: 'lucid',
      options: ['lucid', 'vague', 'confusing', 'incoherent'],
      difficulty: 1
    };
    renderVocabularyGameUI(headerEl, contentEl, fallbackQuestion);
  });
}

/**
 * Render the vocabulary game UI with a specific question
 */
function renderVocabularyGameUI(headerEl, contentEl, question) {
  // Track which word is placed in blank and chicken animation state
  let selectedWord = null;
  let isAnimating = false;

  // Create main layout container (flex for sentence on top, content on bottom)
  const layoutContainer = document.createElement('div');
  layoutContainer.style.display = 'flex';
  layoutContainer.style.flexDirection = 'column';
  layoutContainer.style.width = '100%';
  layoutContainer.style.gap = '20px';

  // ===== TOP: Sentence with blank =====
  const sentenceContainer = document.createElement('div');
  sentenceContainer.className = 'dithered-panel';
  sentenceContainer.style.flex = '0 0 auto';
  sentenceContainer.style.padding = '20px';
  sentenceContainer.style.borderRadius = '16px';
  sentenceContainer.style.border = '2px solid #000';
  sentenceContainer.style.boxShadow = '4px 4px 0 rgba(0, 0, 0, 1)';
  sentenceContainer.style.fontSize = '18px';
  sentenceContainer.style.lineHeight = '1.6';
  sentenceContainer.style.color = '#333';
  sentenceContainer.style.textAlign = 'center';

  // Split sentence into parts before and after blank
  const sentenceMatch = question.sentence.match(/^(.*?)\s*__________\s*(.*)$/);
  const sentenceBefore = sentenceMatch ? sentenceMatch[1] : 'Fill in the blank:';
  const sentenceAfter = sentenceMatch ? sentenceMatch[2] : '';

  const sentenceText = document.createElement('span');
  sentenceText.textContent = sentenceBefore + ' ';
  sentenceContainer.appendChild(sentenceText);

  // Create blank space
  const blank = document.createElement('div');
  blank.id = 'vocab-blank';
  blank.style.display = 'inline-block';
  blank.style.minWidth = '150px';
  blank.style.height = '40px';
  blank.style.border = '3px solid #333';
  blank.style.borderRadius = '8px';
  blank.style.backgroundColor = '#fff';
  blank.style.padding = '4px 12px';
  blank.style.fontWeight = 'bold';
  blank.style.color = '#666';
  blank.style.textAlign = 'center';
  blank.style.lineHeight = '32px';
  blank.style.verticalAlign = 'middle';
  blank.style.cursor = 'pointer';
  blank.style.fontSize = '18px';
  blank.style.boxShadow = '2px 2px 0 rgba(0, 0, 0, 1)';
  blank.textContent = '_____';

  sentenceContainer.appendChild(blank);

  if (sentenceAfter) {
    const sentenceAfterSpan = document.createElement('span');
    sentenceAfterSpan.textContent = ' ' + sentenceAfter;
    sentenceContainer.appendChild(sentenceAfterSpan);
  }

  layoutContainer.appendChild(sentenceContainer);

  // ===== BOTTOM: Chicken on left, words on right =====
  const bottomContainer = document.createElement('div');
  bottomContainer.style.display = 'flex';
  bottomContainer.style.flex = '0 0 auto';
  bottomContainer.style.gap = '30px';
  bottomContainer.style.alignItems = 'flex-start';

  // LEFT: Chicken image
  const chickenWrapper = document.createElement('div');
  chickenWrapper.style.flex = '0 0 250px';
  chickenWrapper.style.position = 'relative';
  chickenWrapper.style.height = '250px';
  chickenWrapper.style.display = 'flex';
  chickenWrapper.style.alignItems = 'center';
  chickenWrapper.style.justifyContent = 'center';

  const chickenImg = document.createElement('img');
  chickenImg.id = 'vocab-chicken-img';
  chickenImg.src = chrome.runtime.getURL('src/assets/mascot/chicken_svg.svg');
  chickenImg.alt = 'Cooped Chicken';
  chickenImg.style.maxWidth = '100%';
  chickenImg.style.maxHeight = '100%';
  chickenImg.style.objectFit = 'contain';
  chickenImg.style.transition = 'transform 0.3s ease';
  chickenImg.style.filter = 'url(#chicken-outline-filter)';

  chickenWrapper.appendChild(chickenImg);
  bottomContainer.appendChild(chickenWrapper);

  // RIGHT: Word options (vertical stack)
  const wordsContainer = document.createElement('div');
  wordsContainer.id = 'vocab-words-container';
  wordsContainer.style.display = 'flex';
  wordsContainer.style.flexDirection = 'column';
  wordsContainer.style.gap = '15px';
  wordsContainer.style.flex = '1';
  wordsContainer.style.justifyContent = 'flex-start';
  wordsContainer.style.paddingTop = '20px';

  // Create word buttons
  question.options.forEach((word, index) => {
    const wordBtn = document.createElement('button');
    wordBtn.textContent = word;
    wordBtn.className = 'vocab-word-option choice-btn';
    wordBtn.id = `vocab-word-${index}`;
    wordBtn.style.padding = '15px 20px';
    wordBtn.style.fontSize = '16px';
    wordBtn.style.border = '2px solid #000';
    wordBtn.style.backgroundColor = '#ffe5cc';
    wordBtn.style.color = '#333';
    wordBtn.style.cursor = 'pointer';
    wordBtn.style.borderRadius = '16px';
    wordBtn.style.fontWeight = 'bold';
    wordBtn.style.transition = 'all 0.2s ease';
    wordBtn.style.userSelect = 'none';
    wordBtn.style.width = '100%';
    wordBtn.style.boxShadow = '4px 4px 0 rgba(0, 0, 0, 1)';
    wordBtn.dataset.word = word;
    wordBtn.dataset.inBlank = 'false';

    // Click handler to move word to blank WITH ANIMATION
    wordBtn.addEventListener('click', async () => {
      if (isAnimating) return;

      if (wordBtn.dataset.inBlank === 'true') {
        // Word is in blank, move it back (no animation)
        wordBtn.dataset.inBlank = 'false';
        wordBtn.style.opacity = '1';
        wordBtn.style.transform = 'scale(1)';
        selectedWord = null;
        updateBlank();
        chickenImg.style.transform = 'translate(0, 0)';
      } else {
        // New word selected - play animation
        isAnimating = true;

        // Move any previously selected word back
        if (selectedWord) {
          const prevBtn = document.getElementById(`vocab-word-${question.options.indexOf(selectedWord)}`);
          prevBtn.dataset.inBlank = 'false';
          prevBtn.style.opacity = '1';
          prevBtn.style.transform = 'scale(1)';
        }

        // Get word button position
        const wordRect = wordBtn.getBoundingClientRect();
        const containerRect = chickenWrapper.getBoundingClientRect();
        const blankRect = blank.getBoundingClientRect();

        // Calculate distances for chicken to move
        const toWordX = wordRect.left - containerRect.left - 50; // Center of word
        const toWordY = wordRect.top - containerRect.top;
        const toBlankX = blankRect.left - containerRect.left - 50;
        const toBlankY = blankRect.top - containerRect.top;

        // Move chicken to word
        chickenImg.style.transition = 'transform 0.5s ease';
        chickenImg.style.transform = `translate(${toWordX}px, ${toWordY}px)`;

        // Wait for chicken to reach word
        await new Promise(resolve => setTimeout(resolve, 500));

        // Move chicken to blank
        chickenImg.style.transition = 'transform 0.5s ease';
        chickenImg.style.transform = `translate(${toBlankX}px, ${toBlankY}px)`;

        // Wait for chicken to reach blank
        await new Promise(resolve => setTimeout(resolve, 500));

        // Reset chicken position
        chickenImg.style.transition = 'transform 0.3s ease';
        chickenImg.style.transform = 'translate(0, 0)';

        // Update UI
        wordBtn.dataset.inBlank = 'true';
        wordBtn.style.opacity = '0.5';
        wordBtn.style.transform = 'scale(0.9)';
        selectedWord = word;
        updateBlank();

        isAnimating = false;
      }
    });

    wordsContainer.appendChild(wordBtn);
  });

  bottomContainer.appendChild(wordsContainer);
  layoutContainer.appendChild(bottomContainer);

  contentEl.appendChild(layoutContainer);

  // Add submit button at the bottom
  const submitBtn = document.createElement('button');
  submitBtn.textContent = 'Check Answer';
  submitBtn.className = 'cooped-btn';
  submitBtn.style.padding = '15px 35px';
  submitBtn.style.fontSize = '16px';
  submitBtn.style.backgroundColor = '#ffe5cc';
  submitBtn.style.color = '#000';
  submitBtn.style.border = '2px solid #000';
  submitBtn.style.borderRadius = '16px';
  submitBtn.style.boxShadow = '4px 4px 0 rgba(0, 0, 0, 1)';
  submitBtn.style.cursor = 'pointer';
  submitBtn.style.marginTop = 'auto';
  submitBtn.style.fontWeight = 'bold';

  submitBtn.addEventListener('click', () => {
    if (selectedWord === question.correctAnswer) {
      // Correct! Move to next page
      advanceInterruptPageInline();
    } else {
      // Wrong answer
      blank.style.backgroundColor = '#ffcccc';
      submitBtn.textContent = 'Try Again';
      setTimeout(() => {
        blank.style.backgroundColor = '#fff';
      }, 1000);
    }
  });

  contentEl.appendChild(submitBtn);

  // Helper function to update blank display
  function updateBlank() {
    const blank = document.getElementById('vocab-blank');
    if (selectedWord) {
      blank.textContent = selectedWord;
      blank.style.color = '#333';
    } else {
      blank.textContent = '_____';
      blank.style.color = '#666';
    }
  }
}

/**
 * Chicken Scratch Drawing Overlay
 */
function showChickenScratchOverlay(problem = null) {
  // Check if overlay already exists
  const existingOverlay = document.getElementById('chicken-scratch-overlay');
  if (existingOverlay) {
    // Update problem text if provided
    if (problem) {
      const problemDisplay = existingOverlay.querySelector('[data-problem-display]');
      if (problemDisplay) {
        problemDisplay.textContent = problem;
      }
    }
    existingOverlay.style.display = 'flex';
    return;
  }

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'chicken-scratch-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '50%';
  overlay.style.left = '50%';
  overlay.style.transform = 'translate(-50%, -50%)';
  overlay.style.backgroundColor = '#d4b5a0'; // Tan color
  overlay.style.borderRadius = '8px';
  overlay.style.padding = '20px';
  overlay.style.zIndex = '2147483648'; // Higher than main modal
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.gap = '15px';
  overlay.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.3)';
  overlay.style.width = '500px';
  overlay.style.maxWidth = '90vw';

  // Header with back button and title
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';

  const backBtn = document.createElement('button');
  backBtn.textContent = '← Back';
  backBtn.style.padding = '8px 16px';
  backBtn.style.fontSize = '14px';
  backBtn.style.border = '2px solid #333';
  backBtn.style.backgroundColor = '#fff';
  backBtn.style.color = '#333';
  backBtn.style.cursor = 'pointer';
  backBtn.style.borderRadius = '4px';
  backBtn.style.fontWeight = 'bold';
  backBtn.style.transition = 'all 0.2s ease';

  backBtn.addEventListener('mouseenter', () => {
    backBtn.style.backgroundColor = '#f5f5f5';
  });

  backBtn.addEventListener('mouseleave', () => {
    backBtn.style.backgroundColor = '#fff';
  });

  backBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
  });

  const title = document.createElement('h2');
  title.textContent = 'Chicken Scratch';
  title.style.fontSize = '18px';
  title.style.fontWeight = 'bold';
  title.style.color = '#333';
  title.style.margin = '0';
  title.style.flex = '1';
  title.style.textAlign = 'center';

  header.appendChild(backBtn);
  header.appendChild(title);

  // Top right buttons (undo and clear)
  const toolsContainer = document.createElement('div');
  toolsContainer.style.display = 'flex';
  toolsContainer.style.gap = '10px';
  toolsContainer.style.justifyContent = 'flex-end';

  const undoDrawBtn = document.createElement('button');
  undoDrawBtn.textContent = '↶ Undo';
  undoDrawBtn.style.padding = '8px 16px';
  undoDrawBtn.style.fontSize = '12px';
  undoDrawBtn.style.border = '2px solid #666';
  undoDrawBtn.style.backgroundColor = '#fff';
  undoDrawBtn.style.color = '#333';
  undoDrawBtn.style.cursor = 'pointer';
  undoDrawBtn.style.borderRadius = '4px';
  undoDrawBtn.style.fontWeight = 'bold';
  undoDrawBtn.style.transition = 'all 0.2s ease';

  const clearDrawBtn = document.createElement('button');
  clearDrawBtn.textContent = '✕ Clear';
  clearDrawBtn.style.padding = '8px 16px';
  clearDrawBtn.style.fontSize = '12px';
  clearDrawBtn.style.border = '2px solid #666';
  clearDrawBtn.style.backgroundColor = '#fff';
  clearDrawBtn.style.color = '#333';
  clearDrawBtn.style.cursor = 'pointer';
  clearDrawBtn.style.borderRadius = '4px';
  clearDrawBtn.style.fontWeight = 'bold';
  clearDrawBtn.style.transition = 'all 0.2s ease';

  toolsContainer.appendChild(undoDrawBtn);
  toolsContainer.appendChild(clearDrawBtn);

  overlay.appendChild(header);

  // Math problem display on the paper
  const problemDisplay = document.createElement('div');
  problemDisplay.setAttribute('data-problem-display', 'true');
  problemDisplay.style.fontSize = '20px';
  problemDisplay.style.fontWeight = 'bold';
  problemDisplay.style.color = '#333';
  problemDisplay.style.textAlign = 'center';
  problemDisplay.style.marginBottom = '10px';

  // Display the problem (use passed parameter or fallback)
  problemDisplay.textContent = problem || '50 ÷ 2 = ?';
  overlay.appendChild(problemDisplay);

  // Canvas for drawing
  const canvas = document.createElement('canvas');
  canvas.width = 450;
  canvas.height = 300;
  canvas.style.backgroundColor = '#ffffff';
  canvas.style.border = '2px solid #333';
  canvas.style.borderRadius = '4px';
  canvas.style.cursor = `url('${chrome.runtime.getURL('assets/pencil.png')}') 8 24, auto`;
  canvas.style.display = 'block';
  canvas.style.margin = '0 auto';

  const ctx = canvas.getContext('2d');
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  const drawHistory = [];

  // Save initial state
  drawHistory.push(canvas.toDataURL());

  // Drawing functions
  const startDrawing = (e) => {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    lastX = currentX;
    lastY = currentY;
  };

  const stopDrawing = () => {
    if (isDrawing) {
      isDrawing = false;
      // Save to history after drawing ends
      drawHistory.push(canvas.toDataURL());
    }
  };

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);

  // Undo functionality
  undoDrawBtn.addEventListener('click', () => {
    if (drawHistory.length > 1) {
      drawHistory.pop(); // Remove current state
      const imageData = new Image();
      imageData.src = drawHistory[drawHistory.length - 1];
      imageData.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imageData, 0, 0);
      };
    }
  });

  // Clear functionality
  clearDrawBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawHistory.length = 0;
    drawHistory.push(canvas.toDataURL());
  });

  overlay.appendChild(canvas);
  overlay.appendChild(toolsContainer);

  // Add overlay to body
  document.body.appendChild(overlay);
}

/**
 * Game 2: Math Challenge - Drag eggs to accumulate answer
 */
function renderMathChallengeInline(_, contentEl) {
  console.log('[INTERRUPT] renderMathChallengeInline called');

  // Dynamically load math questions and render the game
  Promise.all([
    import('./math-questions.js')
  ]).then(([mathModule]) => {
    const question = mathModule.getRandomMathQuestion();
    renderMathGameUI(_, contentEl, question);
  }).catch(err => {
    console.error('[INTERRUPT] Failed to load math questions:', err);
    // Fallback to hardcoded question
    const fallbackQuestion = {
      question: '50 ÷ 2 = ?',
      answer: 25
    };
    renderMathGameUI(_, contentEl, fallbackQuestion);
  });
}

/**
 * Render the math game UI with a specific question
 */
function renderMathGameUI(_, contentEl, question) {
  console.log('[INTERRUPT] renderMathGameUI called with question:', question);

  // Normalize question data for both formats (question/answer vs problem/correctAnswer)
  const problem = question.question || question.problem;
  const correctAnswer = question.answer !== undefined ? question.answer : question.correctAnswer;

  // Track accumulated eggs and animation state
  let accumulatedEggs = 0;
  let isAnimating = false;
  let eggHistory = [0]; // Track history of egg totals for undo functionality

  // Drawing canvas state (preserved across show/hide)
  let drawingCanvas = null;
  let drawingContext = null;
  let drawingHistory = [];

  // Create main layout container (column: question, buttons, chicken, total, submit)
  const layoutContainer = document.createElement('div');
  layoutContainer.style.display = 'flex';
  layoutContainer.style.flexDirection = 'column';
  layoutContainer.style.width = '100%';
  layoutContainer.style.gap = '15px';
  layoutContainer.style.alignItems = 'center';
  layoutContainer.style.justifyContent = 'flex-start';
  layoutContainer.style.position = 'relative';

  // ===== TOP: Math Question =====
  const questionContainer = document.createElement('div');
  questionContainer.style.flex = '0 0 auto';
  questionContainer.style.fontSize = '32px';
  questionContainer.style.fontWeight = 'bold';
  questionContainer.style.color = '#333';
  questionContainer.style.textAlign = 'center';
  questionContainer.style.marginTop = '20px'; // Move question down
  questionContainer.style.position = 'relative';
  questionContainer.style.width = '100%';
  questionContainer.style.display = 'flex';
  questionContainer.style.justifyContent = 'center';
  questionContainer.textContent = problem;

  // Chicken scratch button (top right)
  const scratchBtn = document.createElement('button');
  scratchBtn.style.position = 'absolute';
  scratchBtn.style.right = '20px';
  scratchBtn.style.top = '0';
  scratchBtn.style.width = '50px';
  scratchBtn.style.height = '50px';
  scratchBtn.style.padding = '0';
  scratchBtn.style.border = 'none';
  scratchBtn.style.backgroundColor = 'transparent';
  scratchBtn.style.cursor = 'pointer';
  scratchBtn.style.display = 'flex';
  scratchBtn.style.alignItems = 'center';
  scratchBtn.style.justifyContent = 'center';
  scratchBtn.style.transition = 'transform 0.2s ease';

  const scratchImg = document.createElement('img');
  scratchImg.src = chrome.runtime.getURL('assets/chicken_scratch.png');
  scratchImg.alt = 'Chicken Scratch';
  scratchImg.style.width = '40px';
  scratchImg.style.height = '40px';
  scratchImg.style.objectFit = 'contain';
  scratchBtn.appendChild(scratchImg);

  scratchBtn.addEventListener('mouseenter', () => {
    scratchBtn.style.transform = 'scale(1.1)';
  });

  scratchBtn.addEventListener('mouseleave', () => {
    scratchBtn.style.transform = 'scale(1)';
  });

  scratchBtn.addEventListener('click', () => {
    showChickenScratchOverlay(problem);
  });

  questionContainer.appendChild(scratchBtn);
  layoutContainer.appendChild(questionContainer);

  // ===== EGG BUTTONS (4 buttons with denominations) =====
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.gap = '15px';
  buttonsContainer.style.justifyContent = 'center';
  buttonsContainer.style.flex = '0 0 auto';
  buttonsContainer.style.flexWrap = 'wrap';
  buttonsContainer.style.marginTop = '30px'; // Move buttons further down

  const eggDenominations = [
    { value: 100, label: '100 🥚' },
    { value: 50, label: '50 🥚' },
    { value: 10, label: '10 🥚' },
    { value: 1, label: '1 🥚' }
  ];

  eggDenominations.forEach((denom) => {
    const btn = document.createElement('button');
    btn.textContent = denom.label;
    btn.style.padding = '20px 30px';
    btn.style.fontSize = '18px';
    btn.style.border = '2px solid #333';
    btn.style.backgroundColor = '#fff';
    btn.style.color = '#333';
    btn.style.cursor = 'pointer';
    btn.style.borderRadius = '4px';
    btn.style.fontWeight = 'bold';
    btn.style.transition = 'all 0.2s ease';
    btn.style.userSelect = 'none';
    btn.style.minWidth = '100px';
    btn.draggable = true;

    // Click animation (full animation)
    btn.addEventListener('click', async () => {
      if (isAnimating) return;
      await addEggsWithAnimation(denom.value);
    });

    btn.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('eggValue', denom.value);
      btn.style.opacity = '0.5'; // Visual feedback during drag
    });

    btn.addEventListener('dragend', () => {
      btn.style.opacity = '1'; // Restore opacity
    });

    buttonsContainer.appendChild(btn);
  });

  // Add reset/undo button below egg buttons
  const resetContainer = document.createElement('div');
  resetContainer.style.display = 'flex';
  resetContainer.style.gap = '10px';
  resetContainer.style.justifyContent = 'center';
  resetContainer.style.flex = '0 0 auto';

  const undoBtn = document.createElement('button');
  undoBtn.textContent = '↶ Undo';
  undoBtn.style.padding = '10px 20px';
  undoBtn.style.fontSize = '14px';
  undoBtn.style.border = '2px solid #ccc';
  undoBtn.style.backgroundColor = '#fff';
  undoBtn.style.color = '#666';
  undoBtn.style.cursor = 'pointer';
  undoBtn.style.borderRadius = '4px';
  undoBtn.style.fontWeight = 'bold';
  undoBtn.style.transition = 'all 0.2s ease';

  undoBtn.addEventListener('click', () => {
    // Go back one step in history
    if (eggHistory.length > 1) {
      eggHistory.pop(); // Remove current state
      accumulatedEggs = eggHistory[eggHistory.length - 1]; // Restore previous state
      const totalDisplay = document.getElementById('math-total-display');
      totalDisplay.textContent = `Total: ${accumulatedEggs} 🥚`;
    }
  });

  undoBtn.addEventListener('mouseenter', () => {
    undoBtn.style.borderColor = '#999';
    undoBtn.style.color = '#333';
  });

  undoBtn.addEventListener('mouseleave', () => {
    undoBtn.style.borderColor = '#ccc';
    undoBtn.style.color = '#666';
  });

  const resetBtn = document.createElement('button');
  resetBtn.textContent = '⟲ Reset';
  resetBtn.style.padding = '10px 20px';
  resetBtn.style.fontSize = '14px';
  resetBtn.style.border = '2px solid #ccc';
  resetBtn.style.backgroundColor = '#fff';
  resetBtn.style.color = '#666';
  resetBtn.style.cursor = 'pointer';
  resetBtn.style.borderRadius = '4px';
  resetBtn.style.fontWeight = 'bold';
  resetBtn.style.transition = 'all 0.2s ease';

  resetBtn.addEventListener('click', () => {
    accumulatedEggs = 0;
    eggHistory = [0]; // Clear history and reset to initial state
    const totalDisplay = document.getElementById('math-total-display');
    totalDisplay.textContent = `Total: ${accumulatedEggs} 🥚`;
  });

  resetBtn.addEventListener('mouseenter', () => {
    resetBtn.style.borderColor = '#999';
    resetBtn.style.color = '#333';
  });

  resetBtn.addEventListener('mouseleave', () => {
    resetBtn.style.borderColor = '#ccc';
    resetBtn.style.color = '#666';
  });

  resetContainer.appendChild(undoBtn);
  resetContainer.appendChild(resetBtn);
  layoutContainer.appendChild(buttonsContainer);
  layoutContainer.appendChild(resetContainer);

  // ===== MIDDLE: Chicken on Nest =====
  const chickenNestContainer = document.createElement('div');
  chickenNestContainer.style.flex = '1';
  chickenNestContainer.style.display = 'flex';
  chickenNestContainer.style.alignItems = 'center';
  chickenNestContainer.style.justifyContent = 'center';
  chickenNestContainer.style.position = 'relative';
  chickenNestContainer.style.width = '100%';
  chickenNestContainer.style.minHeight = '250px';

  // Nest background image
  const nestBackground = document.createElement('div');
  nestBackground.style.position = 'absolute';
  nestBackground.style.width = '300px';
  nestBackground.style.height = '200px';
  nestBackground.style.backgroundImage = `url('${chrome.runtime.getURL('src/assets/nest.png')}')`;
  nestBackground.style.backgroundSize = 'contain';
  nestBackground.style.backgroundRepeat = 'no-repeat';
  nestBackground.style.backgroundPosition = 'center';
  nestBackground.style.bottom = '0';
  chickenNestContainer.appendChild(nestBackground);

  // Chicken SVG (positioned to sit on nest)
  const chickenWrapper = document.createElement('div');
  chickenWrapper.id = 'math-chicken-wrapper';
  chickenWrapper.style.position = 'absolute';
  chickenWrapper.style.bottom = '0px';
  chickenWrapper.style.width = '280px';
  chickenWrapper.style.height = '280px';
  chickenWrapper.style.display = 'flex';
  chickenWrapper.style.alignItems = 'center';
  chickenWrapper.style.justifyContent = 'center';
  chickenWrapper.style.transition = 'transform 0.4s ease';
  chickenWrapper.style.zIndex = '10';

  const chickenImg = document.createElement('img');
  chickenImg.id = 'math-chicken-img';
  chickenImg.src = chrome.runtime.getURL('src/assets/mascot/chicken_svg.svg');
  chickenImg.alt = 'Cooped Chicken';
  chickenImg.style.maxWidth = '100%';
  chickenImg.style.maxHeight = '100%';
  chickenImg.style.objectFit = 'contain';
  chickenImg.style.filter = 'url(#chicken-outline-filter)';

  chickenWrapper.appendChild(chickenImg);
  chickenNestContainer.appendChild(chickenWrapper);

  // Allow dropping eggs onto chicken/nest
  chickenNestContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    // Move chicken up when dragging over
    const chickenWrapper = document.getElementById('math-chicken-wrapper');
    if (chickenWrapper && chickenWrapper.style.transform !== 'translateY(-60px)') {
      chickenWrapper.style.transition = 'transform 0.2s ease'; // Faster for drag preview
      chickenWrapper.style.transform = 'translateY(-60px)';
    }
  });

  chickenNestContainer.addEventListener('dragleave', () => {
    // Move chicken back down when leaving
    const chickenWrapper = document.getElementById('math-chicken-wrapper');
    if (chickenWrapper) {
      chickenWrapper.style.transition = 'transform 0.2s ease';
      chickenWrapper.style.transform = 'translateY(0)';
    }
  });

  chickenNestContainer.addEventListener('drop', async (e) => {
    e.preventDefault();
    const eggValue = parseInt(e.dataTransfer.getData('eggValue'), 10);
    if (!isNaN(eggValue)) {
      // Reset chicken position with smooth animation
      const chickenWrapper = document.getElementById('math-chicken-wrapper');
      chickenWrapper.style.transition = 'transform 0.4s ease';
      chickenWrapper.style.transform = 'translateY(0)';

      // Wait for chicken to return
      await new Promise(resolve => setTimeout(resolve, 400));

      // Update egg total and record in history
      accumulatedEggs += eggValue;
      eggHistory.push(accumulatedEggs); // Record this new state
      const totalDisplay = document.getElementById('math-total-display');
      totalDisplay.textContent = `Total: ${accumulatedEggs} 🥚`;
    }
  });

  layoutContainer.appendChild(chickenNestContainer);

  // ===== BOTTOM: Accumulated eggs display =====
  const totalContainer = document.createElement('div');
  totalContainer.id = 'math-total-display';
  totalContainer.style.flex = '0 0 auto';
  totalContainer.style.fontSize = '28px';
  totalContainer.style.fontWeight = 'bold';
  totalContainer.style.color = '#333';
  totalContainer.style.textAlign = 'center';
  totalContainer.textContent = `Total: ${accumulatedEggs} 🥚`;
  layoutContainer.appendChild(totalContainer);

  // ===== SUBMIT BUTTON =====
  const submitBtn = document.createElement('button');
  submitBtn.textContent = 'Check Answer';
  submitBtn.className = 'cooped-btn';
  submitBtn.style.padding = '15px 35px';
  submitBtn.style.fontSize = '16px';
  submitBtn.style.backgroundColor = '#ffe5cc';
  submitBtn.style.color = '#000';
  submitBtn.style.border = '2px solid #000';
  submitBtn.style.borderRadius = '16px';
  submitBtn.style.boxShadow = '4px 4px 0 rgba(0, 0, 0, 1)';
  submitBtn.style.cursor = 'pointer';
  submitBtn.style.fontWeight = 'bold';
  submitBtn.style.flex = '0 0 auto';

  submitBtn.addEventListener('click', () => {
    if (accumulatedEggs === correctAnswer) {
      // Correct! Move to next page
      advanceInterruptPageInline();
    } else {
      // Wrong answer - flash feedback
      totalContainer.style.backgroundColor = '#ffcccc';
      submitBtn.textContent = 'Try Again';
      setTimeout(() => {
        totalContainer.style.backgroundColor = 'transparent';
      }, 1000);
    }
  });

  layoutContainer.appendChild(submitBtn);
  contentEl.appendChild(layoutContainer);

  // Helper function to add eggs with animation
  async function addEggsWithAnimation(eggValue) {
    if (isAnimating) return;
    isAnimating = true;

    const chickenWrapper = document.getElementById('math-chicken-wrapper');

    // Move chicken up (reveal nest)
    chickenWrapper.style.transform = 'translateY(-60px)';

    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 400));

    // Update egg total and record in history
    accumulatedEggs += eggValue;
    eggHistory.push(accumulatedEggs); // Record this new state
    const totalDisplay = document.getElementById('math-total-display');
    totalDisplay.textContent = `Total: ${accumulatedEggs} 🥚`;

    // Return chicken to starting position
    chickenWrapper.style.transform = 'translateY(0)';

    await new Promise(resolve => setTimeout(resolve, 400));

    isAnimating = false;
  }
}

/**
 * Game 3: History Challenge - 3 clues with multiple choice
 */
function renderHistoryChallengeInline(headerEl, contentEl) {
  console.log('[HISTORY] ===== START renderHistoryChallengeInline =====');
  console.log('[HISTORY] headerEl:', headerEl);
  console.log('[HISTORY] contentEl:', contentEl);

  // Add title to header
  const title = document.createElement('h1');
  title.className = 'cooped-interrupt-title';
  title.textContent = 'History Challenge';
  headerEl.appendChild(title);
  console.log('[HISTORY] Title appended to header');

  const subtitle = document.createElement('p');
  subtitle.className = 'cooped-interrupt-subtitle';
  subtitle.textContent = 'Can you guess who or what this is?';
  headerEl.appendChild(subtitle);
  console.log('[HISTORY] Subtitle appended to header');

  // Dynamically load history questions and select a random one
  console.log('[HISTORY] About to import history-questions.js');
  import('./history-questions.js').then(module => {
    console.log('[HISTORY] history-questions.js imported successfully');
    const question = module.getRandomHistoryQuestion();
    console.log('[HISTORY] Selected history question:', question.correctAnswer);
    renderHistoryGameUI(headerEl, contentEl, question);
  }).catch(err => {
    console.error('[HISTORY] Error loading history questions:', err);
    console.log('[HISTORY] Using fallback question');
    // Fallback question if import fails
    const fallbackQuestion = {
      clue1: 'I was the first President of the United States.',
      clue2: 'I led the American Revolutionary War against British rule.',
      clue3: 'My face appears on the one dollar bill.',
      correctAnswer: 'George Washington',
      options: ['George Washington', 'Thomas Jefferson', 'Benjamin Franklin', 'John Adams'],
      difficulty: 1,
      category: 'Presidents'
    };
    renderHistoryGameUI(headerEl, contentEl, fallbackQuestion);
  });
}

/**
 * Render the history game UI with a specific question
 */
function renderHistoryGameUI(headerEl, contentEl, question) {
  console.log('[HISTORY] ===== START renderHistoryGameUI =====');
  console.log('[HISTORY] Question:', question.correctAnswer);

  // Track magnifying glass state
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let answered = false;
  let selectedAnswer = null;
  let mouseMoved = false; // Track if mouse has moved yet
  const MAGNIFY_RADIUS = 60;

  // ===== MAIN CONTAINER (Flexbox layout) =====
  console.log('[HISTORY] Creating layoutContainer with flexbox...');
  const layoutContainer = document.createElement('div');
  layoutContainer.style.display = 'flex';
  layoutContainer.style.flexDirection = 'column';
  layoutContainer.style.width = '100%';
  layoutContainer.style.gap = '12px';
  layoutContainer.style.padding = '8px';
  console.log('[HISTORY] layoutContainer created');

  // ===== TOP: INSTRUCTION CONTAINER =====
  console.log('[HISTORY] Creating instructionContainer...');
  const instructionContainer = document.createElement('div');
  instructionContainer.style.flex = '0 0 auto';
  instructionContainer.style.backgroundColor = '#f5f5f5';
  instructionContainer.style.padding = '12px 15px';
  instructionContainer.style.borderRadius = '4px';
  instructionContainer.style.fontSize = '13px';
  instructionContainer.style.lineHeight = '1.4';
  instructionContainer.style.color = '#333';
  instructionContainer.style.textAlign = 'center';
  instructionContainer.textContent = "You're a history detective! Use the magnifying glass to uncover clues.";
  layoutContainer.appendChild(instructionContainer);
  console.log('[HISTORY] instructionContainer appended');

  // ===== MIDDLE: DETECTIVE CANVAS WITH CLUES AND IMAGES =====
  console.log('[HISTORY] Creating detectiveCanvas...');
  const detectiveCanvas = document.createElement('div');
  detectiveCanvas.style.flex = '1';
  detectiveCanvas.style.position = 'relative';
  detectiveCanvas.style.backgroundColor = '#fafafa';
  detectiveCanvas.style.borderRadius = '4px';
  detectiveCanvas.style.overflow = 'hidden';
  detectiveCanvas.style.display = 'flex';
  detectiveCanvas.style.alignItems = 'center';
  detectiveCanvas.style.justifyContent = 'center';
  layoutContainer.appendChild(detectiveCanvas);
  console.log('[HISTORY] detectiveCanvas created and appended');

  // Create clue text elements positioned randomly within detectiveCanvas
  const clues = [
    { text: question.clue1, id: 'clue1' },
    { text: question.clue2, id: 'clue2' },
    { text: question.clue3, id: 'clue3' }
  ];

  const clueElements = [];
  const positions = [];
  console.log('[HISTORY] Created clues array with', clues.length, 'clues');

  // Generate random positions for clues
  clues.forEach((clue, index) => {
    console.log('[HISTORY] Creating clue', index + 1, ':', clue.id);
    const clueEl = document.createElement('div');
    clueEl.id = clue.id;
    clueEl.textContent = clue.text;
    clueEl.style.position = 'absolute';
    clueEl.style.fontSize = '14px';
    clueEl.style.lineHeight = '1.3';
    clueEl.style.maxWidth = '130px';
    clueEl.style.color = '#fafafa'; // Hidden - matches background
    clueEl.style.cursor = 'default';
    clueEl.style.fontWeight = 'bold';
    clueEl.style.userSelect = 'none';
    clueEl.style.textAlign = 'center';
    clueEl.style.padding = '6px';
    clueEl.style.transition = 'color 0.2s ease';
    clueEl.style.zIndex = '1';

    // Random positioning (constrained to available space)
    let x, y, overlapping;
    do {
      overlapping = false;
      // Use percentages or viewport coordinates within the flex container
      x = Math.random() * 85; // as percentage
      y = Math.random() * 85;

      // Simple check - if positions exist, ensure minimum distance
      for (let pos of positions) {
        const distance = Math.sqrt(
          Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2)
        );
        if (distance < 30) {
          overlapping = true;
          break;
        }
      }
    } while (overlapping && positions.length > 0);

    clueEl.style.left = x + '%';
    clueEl.style.top = y + '%';
    clueEl.style.transform = 'translate(-50%, -50%)';
    positions.push({ x, y });

    detectiveCanvas.appendChild(clueEl);
    clueElements.push({ element: clueEl, id: clue.id, x, y });
    console.log('[HISTORY] Clue', index + 1, 'appended at position:', x + '%', y + '%');
  });
  console.log('[HISTORY] All clues created:', clueElements.length);

  // ===== MAGNIFYING GLASS =====
  console.log('[HISTORY] Creating magnifyingGlass...');
  const magnifyingGlass = document.createElement('img');
  magnifyingGlass.src = chrome.runtime.getURL('assets/Magnifying_glass_icon.svg.png');
  magnifyingGlass.alt = 'Magnifying Glass';
  magnifyingGlass.style.position = 'absolute';
  magnifyingGlass.style.width = '80px';
  magnifyingGlass.style.height = '80px';
  magnifyingGlass.style.cursor = 'grab';
  magnifyingGlass.style.userSelect = 'none';
  magnifyingGlass.style.zIndex = '10';
  magnifyingGlass.style.pointerEvents = 'auto';
  magnifyingGlass.style.left = '50%';
  magnifyingGlass.style.top = '50%';
  magnifyingGlass.style.transform = 'translate(-50%, -50%)';
  detectiveCanvas.appendChild(magnifyingGlass);
  console.log('[HISTORY] magnifyingGlass appended');

  // ===== BOTTOM: MULTIPLE CHOICE OPTIONS =====
  console.log('[HISTORY] Creating optionsContainer...');
  const optionsContainer = document.createElement('div');
  optionsContainer.style.flex = '0 0 auto';
  optionsContainer.style.display = 'grid';
  optionsContainer.style.gridTemplateColumns = '1fr 1fr';
  optionsContainer.style.gap = '8px';
  optionsContainer.style.width = '100%';

  question.options.forEach((option) => {
    const optionBtn = document.createElement('button');
    optionBtn.textContent = option;
    optionBtn.style.padding = '10px 8px';
    optionBtn.style.fontSize = '12px';
    optionBtn.style.border = '2px solid #ccc';
    optionBtn.style.backgroundColor = '#fff';
    optionBtn.style.color = '#333';
    optionBtn.style.cursor = 'pointer';
    optionBtn.style.borderRadius = '4px';
    optionBtn.style.fontWeight = 'bold';
    optionBtn.style.transition = 'all 0.2s ease';
    optionBtn.style.minHeight = '40px';
    optionBtn.style.display = 'flex';
    optionBtn.style.alignItems = 'center';
    optionBtn.style.justifyContent = 'center';
    optionBtn.style.textAlign = 'center';

    optionBtn.addEventListener('mouseenter', () => {
      if (!answered) {
        optionBtn.style.borderColor = '#333';
        optionBtn.style.backgroundColor = '#f0f0f0';
      }
    });

    optionBtn.addEventListener('mouseleave', () => {
      if (!answered) {
        optionBtn.style.borderColor = '#ccc';
        optionBtn.style.backgroundColor = '#fff';
      }
    });

    optionBtn.addEventListener('click', () => {
      if (answered) return;

      selectedAnswer = option;

      // Visual feedback
      Array.from(optionsContainer.children).forEach(btn => {
        if (btn === optionBtn) {
          btn.style.borderColor = '#333';
          btn.style.backgroundColor = '#f0f0f0';
        } else {
          btn.style.borderColor = '#ccc';
          btn.style.backgroundColor = '#fff';
        }
      });
    });

    optionsContainer.appendChild(optionBtn);
  });

  layoutContainer.appendChild(optionsContainer);

  // ===== SUBMIT BUTTON =====
  console.log('[HISTORY] Creating submitBtn...');
  const submitBtn = document.createElement('button');
  submitBtn.textContent = 'Check Answer';
  submitBtn.className = 'cooped-btn';
  submitBtn.style.flex = '0 0 auto';
  submitBtn.style.padding = '12px 24px';
  submitBtn.style.fontSize = '14px';
  submitBtn.style.backgroundColor = '#ffe5cc';
  submitBtn.style.color = '#000';
  submitBtn.style.border = '2px solid #000';
  submitBtn.style.borderRadius = '16px';
  submitBtn.style.boxShadow = '4px 4px 0 rgba(0, 0, 0, 1)';
  submitBtn.style.cursor = 'pointer';
  submitBtn.style.fontWeight = 'bold';
  submitBtn.style.transition = 'all 0.2s ease';
  submitBtn.style.alignSelf = 'center';

  submitBtn.addEventListener('mouseenter', () => {
    submitBtn.style.backgroundColor = '#ffd7b3';
  });

  submitBtn.addEventListener('mouseleave', () => {
    submitBtn.style.backgroundColor = '#ffe5cc';
  });

  submitBtn.addEventListener('click', () => {
    if (!selectedAnswer) {
      submitBtn.textContent = 'Please select an answer';
      setTimeout(() => {
        submitBtn.textContent = 'Check Answer';
      }, 1500);
      return;
    }

    answered = true;
    submitBtn.disabled = true;

    if (selectedAnswer === question.correctAnswer) {
      // Mark that user answered correctly
      challengeAnsweredCorrectly = true;

      // Apply +20 XP for correct answer
      if (interruptSequenceUserId && applyXpEvent) {
        applyXpEvent(interruptSequenceUserId, 'manual_adjustment', { delta: 20 })
          .catch(err => console.error('[INTERRUPT] Error applying challenge win XP:', err));
      }

      submitBtn.style.backgroundColor = '#4CAF50';
      submitBtn.style.color = '#fff';
      submitBtn.textContent = 'Correct!';

      Array.from(optionsContainer.children).forEach(btn => {
        if (btn.textContent === question.correctAnswer) {
          btn.style.borderColor = '#4CAF50';
          btn.style.backgroundColor = '#c8e6c9';
          btn.style.color = '#2e7d32';
        }
      });

      setTimeout(() => {
        advanceInterruptPageInline();
      }, 1000);
    } else {
      submitBtn.style.backgroundColor = '#f44336';
      submitBtn.textContent = 'Wrong! Try again';

      Array.from(optionsContainer.children).forEach(btn => {
        if (btn.textContent === selectedAnswer) {
          btn.style.borderColor = '#f44336';
          btn.style.backgroundColor = '#ffcdd2';
          btn.style.color = '#c62828';
        }
      });

      setTimeout(() => {
        answered = false;
        selectedAnswer = null;
        submitBtn.disabled = false;
        submitBtn.style.backgroundColor = '#333';
        submitBtn.textContent = 'Check Answer';

        Array.from(optionsContainer.children).forEach(btn => {
          btn.style.borderColor = '#ccc';
          btn.style.backgroundColor = '#fff';
          btn.style.color = '#333';
        });
      }, 2000);
    }
  });

  layoutContainer.appendChild(submitBtn);

  // ===== MOUSE TRACKING FOR MAGNIFYING GLASS REVEAL =====
  console.log('[HISTORY] Setting up mouse tracking...');
  detectiveCanvas.addEventListener('mousemove', (e) => {
    mouseMoved = true;
    const rect = detectiveCanvas.getBoundingClientRect();
    const centerX = e.clientX - rect.left;
    const centerY = e.clientY - rect.top;

    // Update glass position to follow cursor
    const glassX = (centerX / rect.width) * 100;
    const glassY = (centerY / rect.height) * 100;
    magnifyingGlass.style.left = glassX + '%';
    magnifyingGlass.style.top = glassY + '%';
    magnifyingGlass.style.transform = 'translate(-50%, -50%)';

    // Check which clues are revealed (in percentage terms)
    clueElements.forEach(({ element, x, y }) => {
      // Convert to pixel distances for accurate radius checking
      const cluePixelX = (x / 100) * rect.width;
      const cluePixelY = (y / 100) * rect.height;
      const distance = Math.sqrt(
        Math.pow(centerX - cluePixelX, 2) +
        Math.pow(centerY - cluePixelY, 2)
      );

      if (distance < MAGNIFY_RADIUS + 20) { // Slightly larger reveal area
        element.style.color = '#000';
      } else {
        element.style.color = '#fafafa';
      }
    });
  });

  // ===== DRAGGING MAGNIFYING GLASS =====
  console.log('[HISTORY] Setting up magnifying glass drag...');
  magnifyingGlass.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = magnifyingGlass.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    magnifyingGlass.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const rect = detectiveCanvas.getBoundingClientRect();
    const posX = e.clientX - rect.left - dragOffsetX;
    const posY = e.clientY - rect.top - dragOffsetY;

    // Convert to percentages
    const glassX = Math.max(0, Math.min((posX / rect.width) * 100, 100));
    const glassY = Math.max(0, Math.min((posY / rect.height) * 100, 100));

    magnifyingGlass.style.left = glassX + '%';
    magnifyingGlass.style.top = glassY + '%';
    magnifyingGlass.style.transform = 'translate(-50%, -50%)';

    // Update revealed clues
    const centerX = posX;
    const centerY = posY;
    clueElements.forEach(({ element, x, y }) => {
      const cluePixelX = (x / 100) * rect.width;
      const cluePixelY = (y / 100) * rect.height;
      const distance = Math.sqrt(
        Math.pow(centerX - cluePixelX, 2) +
        Math.pow(centerY - cluePixelY, 2)
      );

      if (distance < MAGNIFY_RADIUS + 20) {
        element.style.color = '#000';
      } else {
        element.style.color = '#fafafa';
      }
    });
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    magnifyingGlass.style.cursor = 'grab';
  });

  console.log('[HISTORY] About to append layoutContainer to contentEl');
  console.log('[HISTORY] layoutContainer.children.length:', layoutContainer.children.length);
  console.log('[HISTORY] contentEl:', contentEl);
  contentEl.appendChild(layoutContainer);
  console.log('[HISTORY] ===== DONE renderHistoryGameUI =====');
}

/**
 * Page 3: Reflection/Followup
 */
function renderPage3Inline(headerEl, contentEl) {
  console.log('[INTERRUPT] renderPage3Inline called');

  // Add chicken image
  const chickenDiv = document.createElement('div');
  chickenDiv.className = 'cooped-interrupt-chicken-image';
  const img = document.createElement('img');
  img.src = chrome.runtime.getURL('src/assets/mascot/chicken_svg.svg');
  img.alt = 'Cooped Chicken';
  chickenDiv.appendChild(img);
  headerEl.appendChild(chickenDiv);

  // Add title to header
  const title = document.createElement('h1');
  title.className = 'cooped-interrupt-title';
  title.textContent = 'Nice Job...';
  headerEl.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.className = 'cooped-interrupt-subtitle';
  subtitle.textContent = 'You SURE you wanna keep scrolling?';
  headerEl.appendChild(subtitle);

  // Create content layout
  const contentLayout = document.createElement('div');
  contentLayout.style.display = 'flex';
  contentLayout.style.flexDirection = 'column';
  contentLayout.style.width = '100%';
  contentLayout.style.height = '100%';
  contentLayout.style.gap = '20px';
  contentLayout.style.alignItems = 'center';
  contentLayout.style.justifyContent = 'space-between';

  // Add spacer for content
  const spacer = document.createElement('div');
  spacer.style.flex = '1';
  contentLayout.appendChild(spacer);

  // Button container at bottom
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '20px';
  buttonContainer.style.width = '100%';
  buttonContainer.style.justifyContent = 'center';
  buttonContainer.style.flexWrap = 'wrap';
  buttonContainer.style.paddingBottom = '20px';

  // "Return to Safety" button - closes the tab
  const safetyBtn = document.createElement('button');
  safetyBtn.textContent = 'Return to Safety';
  safetyBtn.className = 'cooped-btn';
  safetyBtn.style.padding = '15px 35px';
  safetyBtn.style.fontSize = '16px';
  safetyBtn.style.backgroundColor = '#4CAF50';
  safetyBtn.style.color = '#000';
  safetyBtn.style.border = '2px solid #000';
  safetyBtn.style.borderRadius = '16px';
  safetyBtn.style.boxShadow = '4px 4px 0 rgba(0, 0, 0, 1)';
  safetyBtn.style.cursor = 'pointer';
  safetyBtn.style.fontWeight = 'bold';
  safetyBtn.style.transition = 'all 0.2s ease';
  safetyBtn.style.minWidth = '150px';

  safetyBtn.addEventListener('mouseenter', () => {
    safetyBtn.style.backgroundColor = '#45a049';
  });

  safetyBtn.addEventListener('mouseleave', () => {
    safetyBtn.style.backgroundColor = '#4CAF50';
  });

  safetyBtn.addEventListener('click', async () => {
    // Apply +20 XP safety bonus only if user answered challenge correctly
    if (interruptSequenceUserId && applyXpEvent && challengeAnsweredCorrectly) {
      try {
        console.log('[INTERRUPT] Applying +20 XP safety bonus for user:', interruptSequenceUserId);
        await applyXpEvent(interruptSequenceUserId, 'manual_adjustment', { delta: 20 });
        console.log('[INTERRUPT] Safety bonus applied successfully');
      } catch (err) {
        console.error('[INTERRUPT] Error applying safety bonus XP:', err);
      }
    }
    // Close the current tab
    chrome.runtime.sendMessage({ action: 'closeTab' });
  });

  // "Proceed into Danger" button - proceeds to the website
  const dangerBtn = document.createElement('button');
  dangerBtn.textContent = 'Proceed into Danger';
  dangerBtn.className = 'cooped-btn';
  dangerBtn.style.padding = '15px 35px';
  dangerBtn.style.fontSize = '16px';
  dangerBtn.style.backgroundColor = '#f44336';
  dangerBtn.style.color = '#000';
  dangerBtn.style.border = '2px solid #000';
  dangerBtn.style.borderRadius = '16px';
  dangerBtn.style.boxShadow = '4px 4px 0 rgba(0, 0, 0, 1)';
  dangerBtn.style.cursor = 'pointer';
  dangerBtn.style.fontWeight = 'bold';
  dangerBtn.style.transition = 'all 0.2s ease';
  dangerBtn.style.minWidth = '150px';

  dangerBtn.addEventListener('mouseenter', () => {
    dangerBtn.style.backgroundColor = '#da190b';
  });

  dangerBtn.addEventListener('mouseleave', () => {
    dangerBtn.style.backgroundColor = '#f44336';
  });

  dangerBtn.addEventListener('click', () => {
    // Close overlay to allow access to the website
    closeInterruptSequenceInline();
  });

  buttonContainer.appendChild(safetyBtn);
  buttonContainer.appendChild(dangerBtn);
  contentLayout.appendChild(buttonContainer);

  contentEl.appendChild(contentLayout);
}

/**
 * Advance to next page or close if on last page
 */
function advanceInterruptPageInline() {
  if (currentInterruptPage < 3) {
    currentInterruptPage++;
    renderInterruptPageInline(currentInterruptPage);
  } else {
    closeInterruptSequenceInline();
  }
}

/**
 * Close the interrupt sequence overlay
 */
function closeInterruptSequenceInline() {
  if (interruptOverlayElement && interruptOverlayElement.isConnected) {
    // Move grayscale layer content back to body
    const grayscaleLayer = document.getElementById('cooped-grayscale-layer');
    if (grayscaleLayer) {
      while (grayscaleLayer.firstChild) {
        document.body.insertBefore(grayscaleLayer.firstChild, interruptOverlayElement);
      }
      grayscaleLayer.remove();
    }

    // Restore video audio if on YouTube
    const hostname = window.location.hostname;
    if (hostname.includes('youtube.com')) {
      restoreYouTubeVideoAudio();
    }

    interruptOverlayElement.remove();
    interruptOverlayElement = null;
    currentInterruptPage = 1;

    // Reset state variables for next interrupt
    stimPenaltyApplied = false;
    challengeAnsweredCorrectly = false;
    interruptSequenceUserId = null;

    console.log('[INTERRUPT] Overlay closed and grayscale filter removed');
  }
}

chrome.runtime.onMessage.addListener(async (message) => {
  console.log('[CONTENT-SCRIPT] Message received:', message);
  if (message.action === 'showInterruptSequence') {
    console.log('[CONTENT-SCRIPT] showInterruptSequence message received');
    // Call the inline version immediately
    await showInterruptSequenceInline();
  }
});

// Load all modules
Promise.all([
  import('../../challenges/challenge-bank.js'),
  import('../utils/storage.js'),
  import('../utils/mascot.js'),
  import('../utils/time-tracking.js'),
  import('../utils/platform-detection.js'),
  import('./interrupt-sequence.js'),
  import('../logic/xpEngine.js'),
  import('../logic/supabaseClient.js')
]).then(([challengeBank, storageModule, mascotModule, timeTrackingModule, platformDetectionModule, interruptModule, xpEngineModule, supabaseModule]) => {
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
  handleMediaPauseChange = platformDetectionModule.handleMediaPauseChange;
  handleTabVisibilityChange = platformDetectionModule.handleTabVisibilityChange;

  showInterruptSequence = interruptModule.showInterruptSequence;

  applyXpEvent = xpEngineModule.applyXpEvent;
  getCurrentUser = supabaseModule.getCurrentUser;

  // Mark modules as ready
  modulesReady = true;

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
  // Add message listener for challenges (interrupt sequence already has its own)
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

  // If on TikTok, Facebook, Instagram, or X - set up social media monitoring
  const hostname = new URL(window.location.href).hostname;
  const platform = detectPlatform(hostname);
  if (platform && ['tiktok.com', 'facebook.com', 'instagram.com', 'x.com'].includes(platform)) {
    setupSocialMediaMonitoring(platform);
  }
}

/**
 * Set up monitoring for social media platforms (immediate interrupt for debugging)
 */
function setupSocialMediaMonitoring(platform) {
  console.log(`[SOCIAL-MEDIA] Immediate interrupt for ${platform}`);
  const trigger = async () => {
    if (!document.hidden) {
      await showInterruptSequenceInline();
    }
  };

  if (document.body) {
    setTimeout(trigger, 500);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(trigger, 200), { once: true });
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
 * Now uses the new 3-slide interrupt sequence instead of old overlay
 */
async function showReEngagementChallenge(messageData) {
  // Use the new 3-slide interrupt sequence
  await showInterruptSequenceInline();

  isOverlayActive = true;
  challengeStartTime = Date.now();

  // Focus on the modal (interrupt sequence takes care of itself)
  setTimeout(() => {
    const input = document.getElementById('cooped-answer-input');
    if (input) input.focus();
  }, 100);
}

/**
 * DEPRECATED: Create re-engagement overlay element
 * This function is no longer used - replaced by showInterruptSequenceInline()
 * Kept for reference only - uses the new 3-slide interrupt sequence instead
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
  // Use the new 3-slide interrupt sequence instead of old challenge overlay
  await showInterruptSequenceInline();

  isOverlayActive = true;
  challengeStartTime = Date.now();

  // Prevent page scrolling
  document.body.style.overflow = 'hidden';

  // If we're on YouTube, pause any playing videos so the popup doesn't run over the audio
  if (window.location.hostname.includes('youtube.com')) {
    pauseYouTubeVideo();
  }
}

/**
 * Show a saved challenge overlay (from previous page load)
 * Now uses the new 3-slide interrupt sequence instead of old overlay
 */
async function showSavedChallengeOverlay(savedChallengeData) {
  // Use the new 3-slide interrupt sequence
  await showInterruptSequenceInline();

  isOverlayActive = true;
  currentChallenge = savedChallengeData.challenge;
  challengeStartTime = savedChallengeData.startTime;

  // Prevent page scrolling
  document.body.style.overflow = 'hidden';

  if (window.location.hostname.includes('youtube.com')) {
    pauseYouTubeVideo();
  }
}

/**
 * DEPRECATED: Create overlay DOM element
 * This function is no longer used - replaced by showInterruptSequenceInline()
 * Kept for reference only - uses the new 3-slide interrupt sequence instead
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
      // Also mute to ensure no sound
      if (!video.muted) {
        video.muted = true;
      }
      // Store original volume to restore later
      if (!video.dataset.coopedOriginalVolume) {
        video.dataset.coopedOriginalVolume = video.volume;
      }
      video.volume = 0;
    });
    if (videos.length > 0) {
      console.log('Cooped: Paused and muted YouTube video for challenge overlay');
    }
  } catch (error) {
    console.log('Cooped: Unable to pause YouTube video', error);
  }
}

/**
 * Restore video audio after challenge
 */
function restoreYouTubeVideoAudio() {
  try {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      // Restore mute state
      video.muted = false;
      // Restore volume if we stored it
      if (video.dataset.coopedOriginalVolume) {
        video.volume = parseFloat(video.dataset.coopedOriginalVolume);
        delete video.dataset.coopedOriginalVolume;
      }
    });
    console.log('Cooped: Restored YouTube video audio');
  } catch (error) {
    console.log('Cooped: Unable to restore YouTube video audio', error);
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
    await recordYouTubeProductivityResponse(true);

    setTimeout(removeOverlay, 800);
  });

  confessBtn.addEventListener('click', async () => {
    yesBtn.disabled = true;
    confessBtn.disabled = true;
    messageEl.textContent = "I'll be back...";

    // Record that user reported NOT being productive
    await recordYouTubeProductivityResponse(false);

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

  // Monitor play/pause using periodic sync instead of intercepting prototype methods
  // This avoids CSP violations while still tracking video state
  // The syncLongWatchTracking function will detect play/pause state changes
  console.log('Cooped: YouTube tracking initialized (using periodic state sync instead of prototype interception)');

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
  // Pause the video immediately
  pauseYouTubeVideo();

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
