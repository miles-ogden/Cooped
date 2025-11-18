/**
 * Challenge Preview Script
 * Allows designers to preview and test challenge styling across different subjects
 */

import { getRandomMathQuestionByDifficulty } from '../content/math-questions.js';
import { getRandomVocabQuestionByDifficulty } from '../content/vocabulary-questions.js';
import { getRandomHistoryQuestionByDifficulty } from '../content/history-questions.js';

let currentOverlay = null;

// Show challenge button
document.getElementById('show-challenge-btn').addEventListener('click', async () => {
  const subject = document.getElementById('subject-select').value;
  const difficulty = parseInt(document.getElementById('difficulty-select').value);

  console.log('Loading challenge:', subject, 'difficulty:', difficulty);

  // Remove existing overlay
  if (currentOverlay) {
    currentOverlay.remove();
  }

  // Get challenge based on subject
  let challengeData;
  try {
    switch (subject) {
      case 'math':
        challengeData = getRandomMathQuestionByDifficulty(difficulty);
        break;
      case 'vocabulary':
        const vocabQuestion = getRandomVocabQuestionByDifficulty(difficulty);
        // Normalize vocabulary question to match standard format
        challengeData = {
          question: vocabQuestion.sentence,
          answer: vocabQuestion.correctAnswer,
          options: vocabQuestion.options,
          difficulty: vocabQuestion.difficulty,
          explanation: vocabQuestion.explanation
        };
        break;
      case 'history':
        challengeData = getRandomHistoryQuestionByDifficulty(difficulty);
        break;
      case 'general-knowledge':
        // Fallback to trivia for general knowledge
        challengeData = {
          question: 'What is the capital of France?',
          answer: 'Paris',
          difficulty: difficulty
        };
        break;
    }

    console.log('Challenge data:', challengeData);

    // Create overlay
    currentOverlay = createChallengeOverlay(challengeData, subject, difficulty);
    document.body.appendChild(currentOverlay);
  } catch (error) {
    console.error('Error loading challenge:', error);
    alert('Error loading challenge: ' + error.message);
  }
});

// Close challenge button
document.getElementById('close-challenge-btn').addEventListener('click', () => {
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }
});

function createChallengeOverlay(challengeData, subject, difficulty) {
  const overlay = document.createElement('div');
  overlay.id = 'cooped-overlay';
  overlay.setAttribute('data-subject', subject);

  // Build the HTML based on challenge type
  if (subject === 'history') {
    // History uses detective/magnifying glass UI
    overlay.innerHTML = createHistoryChallengeHTML(challengeData, difficulty);
  } else {
    // Standard challenge UI for math, vocab, general-knowledge
    overlay.innerHTML = createStandardChallengeHTML(challengeData, subject, difficulty);
  }

  // Add event listeners
  setTimeout(() => {
    setupChallengeListeners(overlay, challengeData, subject);
  }, 100);

  return overlay;
}

function createStandardChallengeHTML(challengeData, subject, difficulty) {
  const subjectEmojis = {
    math: '📐',
    vocabulary: '📚',
    history: '🏛️',
    'general-knowledge': '🌍'
  };

  const subjectNames = {
    math: 'Math',
    vocabulary: 'Vocabulary',
    history: 'History',
    'general-knowledge': 'General Knowledge'
  };

  const difficultyLabels = ['', 'Easy', 'Easy+', 'Medium', 'Hard', 'Very Hard'];

  return `
    <div class="cooped-modal">
      <div class="cooped-header">
        <div class="cooped-chicken-image">
          <img src="../assets/mascot/chicken_basic.png" alt="Cooped Chicken" onerror="this.style.display='none'">
        </div>
        <h1>Focus Challenge</h1>
        <p class="cooped-subtitle">Answer correctly to continue</p>
      </div>

      <div class="cooped-challenge-info">
        <span class="cooped-badge cooped-badge-medium">${difficultyLabels[difficulty] || 'Level ' + difficulty}</span>
        <span class="cooped-badge cooped-badge-type">${subjectEmojis[subject]} ${subjectNames[subject]}</span>
      </div>

      <div class="cooped-challenge-content">
        <div class="cooped-question">
          ${challengeData.question}
          <div class="cooped-input-group">
            <input
              type="text"
              id="cooped-answer-input"
              class="cooped-input"
              placeholder="Type your answer..."
              autocomplete="off"
            >
            <button id="cooped-submit-btn" class="cooped-btn cooped-btn-primary">
              Submit
            </button>
          </div>
        </div>

        <div id="cooped-feedback" class="cooped-feedback"></div>
      </div>

      <div class="cooped-footer">
        <p class="cooped-blocked-url">Preview Mode - Subject: <strong>${subjectNames[subject]}</strong></p>
        <p class="cooped-hint">Style preview for difficulty level ${difficulty}</p>
      </div>
    </div>
  `;
}

function createHistoryChallengeHTML(challengeData, difficulty) {
  const difficultyLabels = ['', 'Easy', 'Easy+', 'Medium', 'Hard', 'Very Hard'];

  return `
    <div class="cooped-modal">
      <div class="cooped-header">
        <div class="cooped-chicken-image">
          <img src="../assets/mascot/chicken_basic.png" alt="Cooped Chicken" onerror="this.style.display='none'">
        </div>
        <h1>History Detective</h1>
        <p class="cooped-subtitle">Find the clues to solve the mystery</p>
      </div>

      <div class="cooped-challenge-info">
        <span class="cooped-badge cooped-badge-medium">${difficultyLabels[difficulty] || 'Level ' + difficulty}</span>
        <span class="cooped-badge cooped-badge-type">🏛️ History</span>
      </div>

      <div class="cooped-challenge-content">
        <div class="cooped-question">
          <p style="margin-bottom: 15px;"><strong>${challengeData.question}</strong></p>

          ${challengeData.clues ? `
            <div class="detective-area" id="detective-area">
              ${challengeData.clues.map((clue, index) => `
                <div class="clue-text clue-${index + 1}" id="clue-${index + 1}">${clue}</div>
              `).join('')}
              <div class="magnifying-glass" id="magnifying-glass">🔍</div>
            </div>
          ` : ''}

          <div class="multiple-choice-options" style="margin-top: 20px;">
            ${challengeData.options ? challengeData.options.map((option, index) => `
              <button class="choice-btn" data-answer="${option}" style="display: block; width: 100%; margin: 8px 0; padding: 12px; border: 2px solid #333; background: white; cursor: pointer; border-radius: 8px; text-align: left; font-size: 16px;">
                ${String.fromCharCode(65 + index)}. ${option}
              </button>
            `).join('') : ''}
          </div>
        </div>

        <div id="cooped-feedback" class="cooped-feedback"></div>
      </div>

      <div class="cooped-footer">
        <p class="cooped-blocked-url">Preview Mode - Subject: <strong>History</strong></p>
        <p class="cooped-hint">Use magnifying glass to reveal clues</p>
      </div>
    </div>
  `;
}

function setupChallengeListeners(overlay, challengeData, subject) {
  // Standard challenge submit
  const submitBtn = overlay.querySelector('#cooped-submit-btn');
  const input = overlay.querySelector('#cooped-answer-input');

  if (submitBtn && input) {
    submitBtn.addEventListener('click', () => handleSubmit(overlay, challengeData, input));
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSubmit(overlay, challengeData, input);
    });
    input.focus();
  }

  // History challenge multiple choice
  const choiceBtns = overlay.querySelectorAll('.choice-btn');
  choiceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const userAnswer = btn.getAttribute('data-answer');
      handleHistoryAnswer(overlay, challengeData, userAnswer, btn);
    });
  });

  // History magnifying glass
  const magnifyingGlass = overlay.querySelector('#magnifying-glass');
  if (magnifyingGlass) {
    setupMagnifyingGlass(magnifyingGlass);
  }
}

function handleSubmit(overlay, challengeData, input) {
  const feedback = overlay.querySelector('#cooped-feedback');
  const userAnswer = input.value.trim();

  if (!userAnswer) {
    showFeedback(feedback, 'Please enter an answer!', 'warning');
    return;
  }

  const correctAnswer = String(challengeData.answer).trim();
  const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();

  if (isCorrect) {
    showFeedback(feedback, `✅ Correct! Great job!${challengeData.explanation ? '<br><small>' + challengeData.explanation + '</small>' : ''}`, 'success');
  } else {
    showFeedback(feedback, `❌ Not quite. The answer was: ${correctAnswer}`, 'error');
  }
}

function handleHistoryAnswer(overlay, challengeData, userAnswer, btn) {
  const feedback = overlay.querySelector('#cooped-feedback');
  const correctAnswer = String(challengeData.answer);
  const isCorrect = userAnswer === correctAnswer;

  // Highlight selected button
  overlay.querySelectorAll('.choice-btn').forEach(b => b.style.opacity = '0.5');
  btn.style.opacity = '1';

  if (isCorrect) {
    showFeedback(feedback, `✅ Correct! You solved the mystery!${challengeData.explanation ? '<br><small>' + challengeData.explanation + '</small>' : ''}`, 'success');
    btn.style.background = '#c8e6c9';
    btn.style.borderColor = '#4caf50';
  } else {
    showFeedback(feedback, `❌ Not quite. The answer was: ${correctAnswer}`, 'error');
    btn.style.background = '#ffcdd2';
    btn.style.borderColor = '#f44336';
  }
}

function setupMagnifyingGlass(magnifyingGlass) {
  const detectiveArea = document.getElementById('detective-area');
  if (!detectiveArea) return;

  detectiveArea.addEventListener('mousemove', (e) => {
    const rect = detectiveArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    magnifyingGlass.style.left = x + 'px';
    magnifyingGlass.style.top = y + 'px';

    // Reveal clues near magnifying glass
    document.querySelectorAll('.clue-text').forEach(clue => {
      const clueRect = clue.getBoundingClientRect();
      const clueX = clueRect.left - rect.left + clueRect.width / 2;
      const clueY = clueRect.top - rect.top + clueRect.height / 2;

      const distance = Math.sqrt(Math.pow(x - clueX, 2) + Math.pow(y - clueY, 2));

      if (distance < 80) {
        clue.style.opacity = '1';
      } else {
        clue.style.opacity = '0';
      }
    });
  });
}

function showFeedback(feedbackElement, message, type) {
  feedbackElement.innerHTML = message;
  feedbackElement.className = `cooped-feedback cooped-feedback-${type}`;
  feedbackElement.style.display = 'block';
}
