/**
 * Side Quest Screen
 * Displays and manages multiplayer side quest gameplay
 *
 * Flow:
 * 1. Show quest intro with timer and question count
 * 2. User clicks "Start Quiz"
 * 3. Display 10 randomized questions
 * 4. User submits answers
 * 5. Show results and placement/XP
 */

import { querySelect, getCurrentUser } from '../../logic/supabaseClient.js'
import { getQuestQuestionsForUser, submitQuestAttempt, getActiveQuest } from '../../logic/sideQuestSystem.js'

export class SideQuestScreen {
  constructor() {
    this.currentUser = null
    this.coop = null
    this.activeQuest = null
    this.questQuestions = null
    this.startTime = null
    this.currentQuestionIndex = 0
    this.userAnswers = []
    this.stage = 'intro' // 'intro', 'quiz', 'results'
    console.log('[SIDE_QUEST_SCREEN] Initialized')
  }

  /**
   * Load quest data and render screen
   */
  async show(coopId) {
    try {
      console.log('[SIDE_QUEST_SCREEN] Loading side quest screen...')

      this.currentUser = await getCurrentUser(true)
      if (!this.currentUser) {
        console.error('[SIDE_QUEST_SCREEN] No authenticated user')
        return
      }

      // Get user's coop if not provided
      if (!coopId) {
        const userProfile = await querySelect('users', {
          eq: { id: this.currentUser.id },
          single: true
        })
        coopId = userProfile?.coop_id
      }

      if (!coopId) {
        console.error('[SIDE_QUEST_SCREEN] User not in a coop')
        alert('You must be in a coop to participate in side quests')
        window.dispatchEvent(new CustomEvent('navigateToScreen', {
          detail: { screen: 'home' }
        }))
        return
      }

      // Get coop data
      this.coop = await querySelect('coops', {
        eq: { id: coopId },
        single: true
      })

      if (!this.coop) {
        console.error('[SIDE_QUEST_SCREEN] Coop not found')
        return
      }

      // Get active quest
      const questResult = await getActiveQuest(coopId)
      if (!questResult.success) {
        console.error('[SIDE_QUEST_SCREEN] Error getting active quest:', questResult.error)
        alert('Error loading quest. Please try again.')
        window.dispatchEvent(new CustomEvent('navigateToScreen', {
          detail: { screen: 'coop-view', coopId: coopId }
        }))
        return
      }

      if (!questResult.quest) {
        console.warn('[SIDE_QUEST_SCREEN] No active quests available')
        alert('No active quests available right now')
        window.dispatchEvent(new CustomEvent('navigateToScreen', {
          detail: { screen: 'coop-view', coopId: coopId }
        }))
        return
      }

      this.activeQuest = questResult.quest
      this.userAnswers = new Array(this.activeQuest.question_count).fill(null)
      this.stage = 'intro'

      this.render()
    } catch (err) {
      console.error('[SIDE_QUEST_SCREEN] Error loading side quest:', err)
      alert('Error loading side quest: ' + err.message)
    }
  }

  /**
   * Render appropriate stage
   */
  render() {
    const screenContainer = document.getElementById('screen-container')
    if (!screenContainer) {
      console.warn('[SIDE_QUEST_SCREEN] Screen container not found')
      return
    }

    let html = ''

    if (this.stage === 'intro') {
      html = this.renderIntro()
    } else if (this.stage === 'quiz') {
      html = this.renderQuiz()
    } else if (this.stage === 'results') {
      html = this.renderResults()
    }

    screenContainer.innerHTML = html
    this.attachEventListeners()
    console.log('[SIDE_QUEST_SCREEN] Rendered stage:', this.stage)
  }

  /**
   * Render intro screen with quest info and start button
   */
  renderIntro() {
    const timeRemaining = this.getTimeRemaining()
    const timeString = this.formatTimeRemaining(timeRemaining)

    return `
      <div class="side-quest-screen">
        <div class="quest-header">
          <button class="btn-icon" id="back-btn" title="Back">⬅</button>
          <h2>Side Quest</h2>
          <div class="quest-timer" id="quest-timer">${timeString}</div>
        </div>

        <div class="quest-intro">
          <div class="quest-icon">🎯</div>
          <h3>Daily Challenge</h3>
          <p class="quest-description">Test your knowledge against your coop members!</p>

          <div class="quest-details">
            <div class="detail-item">
              <span class="detail-label">Questions</span>
              <span class="detail-value">10</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Category</span>
              <span class="detail-value">${this.activeQuest.category}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Time Limit</span>
              <span class="detail-value">${timeString}</span>
            </div>
          </div>

          <div class="quest-rewards">
            <h4>Rewards</h4>
            <p>🥇 1st Place: 250 XP</p>
            <p>🥈 2nd Place: 200 XP</p>
            <p>🥉 3rd Place: 150 XP</p>
            <p>✓ Participation: 100 XP</p>
          </div>

          <button class="btn-primary btn-full" id="start-quiz-btn">Start Quiz</button>
        </div>
      </div>
    `
  }

  /**
   * Render quiz stage
   */
  renderQuiz() {
    if (!this.questQuestions || this.questQuestions.length === 0) {
      return `<div class="side-quest-screen"><p>Loading questions...</p></div>`
    }

    const currentQuestion = this.questQuestions[this.currentQuestionIndex]
    const progress = Math.round(((this.currentQuestionIndex + 1) / this.questQuestions.length) * 100)

    let optionsHTML = ''
    currentQuestion.options.forEach((option, idx) => {
      const isSelected = this.userAnswers[this.currentQuestionIndex] === idx
      optionsHTML += `
        <button class="option-button ${isSelected ? 'selected' : ''}" data-option="${idx}">
          <span class="option-letter">${String.fromCharCode(65 + idx)}</span>
          <span class="option-text">${option}</span>
        </button>
      `
    })

    return `
      <div class="side-quest-screen quiz-stage">
        <div class="quiz-header">
          <div class="quiz-progress">
            <span class="progress-text">Question ${this.currentQuestionIndex + 1} of ${this.questQuestions.length}</span>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
          </div>
        </div>

        <div class="quiz-content">
          <div class="question-box">
            <h3>${currentQuestion.q}</h3>
          </div>

          <div class="options-grid">
            ${optionsHTML}
          </div>

          <div class="quiz-navigation">
            ${this.currentQuestionIndex > 0 ? `<button class="btn-secondary" id="prev-btn">← Previous</button>` : ''}
            ${this.currentQuestionIndex < this.questQuestions.length - 1
              ? `<button class="btn-secondary" id="next-btn">Next →</button>`
              : `<button class="btn-primary" id="submit-btn">Submit Quiz</button>`
            }
          </div>
        </div>
      </div>
    `
  }

  /**
   * Render results screen
   */
  renderResults() {
    const correctAnswers = this.userAnswers.filter(
      (answer, idx) => answer === this.questQuestions[idx].correct
    ).length

    const accuracy = Math.round((correctAnswers / this.questQuestions.length) * 100)

    return `
      <div class="side-quest-screen results-stage">
        <div class="quest-header">
          <h2>Results</h2>
        </div>

        <div class="results-content">
          <div class="score-circle">
            <div class="score-number">${correctAnswers}/10</div>
            <div class="score-accuracy">${accuracy}%</div>
          </div>

          <div class="results-message">
            <h3 id="results-title">Great Job!</h3>
            <p id="results-text">Your results are being calculated...</p>
          </div>

          <div class="results-info">
            <p>Your placement and XP reward will be shown once all participants have completed the quest.</p>
          </div>

          <button class="btn-primary btn-full" id="return-home-btn">Return to Home</button>
        </div>
      </div>
    `
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Back button
    document.getElementById('back-btn')?.addEventListener('click', () => {
      this.onBackClick()
    })

    // Intro stage
    document.getElementById('start-quiz-btn')?.addEventListener('click', async () => {
      await this.onStartQuiz()
    })

    // Quiz stage - option selection
    document.querySelectorAll('.option-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const option = parseInt(e.currentTarget.getAttribute('data-option'))
        this.userAnswers[this.currentQuestionIndex] = option
        this.render()
      })
    })

    // Quiz navigation
    document.getElementById('prev-btn')?.addEventListener('click', () => {
      if (this.currentQuestionIndex > 0) {
        this.currentQuestionIndex--
        this.render()
      }
    })

    document.getElementById('next-btn')?.addEventListener('click', () => {
      if (this.currentQuestionIndex < this.questQuestions.length - 1) {
        this.currentQuestionIndex++
        this.render()
      }
    })

    document.getElementById('submit-btn')?.addEventListener('click', async () => {
      await this.onSubmitQuiz()
    })

    // Results stage
    document.getElementById('return-home-btn')?.addEventListener('click', () => {
      this.onReturnHome()
    })

    // Start timer update
    if (this.stage === 'intro') {
      this.startTimerUpdate()
    }
  }

  /**
   * Handle start quiz
   */
  async onStartQuiz() {
    try {
      console.log('[SIDE_QUEST_SCREEN] Starting quiz...')

      const questResult = await getQuestQuestionsForUser(
        this.activeQuest.id,
        this.currentUser.id
      )

      if (!questResult.success) {
        throw new Error(questResult.error)
      }

      this.questQuestions = questResult.quest.questions
      this.startTime = new Date().toISOString()
      this.currentQuestionIndex = 0
      this.userAnswers = new Array(this.questQuestions.length).fill(null)
      this.stage = 'quiz'

      this.render()
    } catch (err) {
      console.error('[SIDE_QUEST_SCREEN] Error starting quiz:', err)
      alert('Error starting quiz: ' + err.message)
    }
  }

  /**
   * Handle submit quiz
   */
  async onSubmitQuiz() {
    try {
      console.log('[SIDE_QUEST_SCREEN] Submitting quiz...')

      const endTime = new Date().toISOString()

      const submitResult = await submitQuestAttempt(
        this.activeQuest.id,
        this.currentUser.id,
        this.userAnswers,
        this.startTime,
        endTime
      )

      if (!submitResult.success) {
        throw new Error(submitResult.error)
      }

      console.log('[SIDE_QUEST_SCREEN] Quiz submitted successfully')
      this.stage = 'results'
      this.render()
    } catch (err) {
      console.error('[SIDE_QUEST_SCREEN] Error submitting quiz:', err)
      alert('Error submitting quiz: ' + err.message)
    }
  }

  /**
   * Handle back click
   */
  onBackClick() {
    console.log('[SIDE_QUEST_SCREEN] Back clicked')

    if (this.stage === 'quiz') {
      const confirmed = confirm('Are you sure you want to quit? Your progress will be lost.')
      if (!confirmed) return
    }

    window.dispatchEvent(new CustomEvent('navigateToScreen', {
      detail: { screen: 'coop-view', coopId: this.coop.id }
    }))
  }

  /**
   * Handle return home
   */
  onReturnHome() {
    console.log('[SIDE_QUEST_SCREEN] Returning to home')
    window.dispatchEvent(new CustomEvent('navigateToScreen', {
      detail: { screen: 'home' }
    }))
  }

  /**
   * Calculate remaining time
   */
  getTimeRemaining() {
    if (!this.activeQuest) return 0
    const expiresAt = new Date(this.activeQuest.expires_at)
    const now = new Date()
    return Math.max(0, expiresAt - now)
  }

  /**
   * Format time remaining as HH:MM:SS
   */
  formatTimeRemaining(ms) {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  /**
   * Start timer update interval
   */
  startTimerUpdate() {
    const updateTimer = () => {
      const timerEl = document.getElementById('quest-timer')
      if (timerEl) {
        const timeRemaining = this.getTimeRemaining()
        if (timeRemaining <= 0) {
          timerEl.textContent = '00:00:00'
          timerEl.classList.add('expired')
          clearInterval(timerInterval)
        } else {
          timerEl.textContent = this.formatTimeRemaining(timeRemaining)
        }
      }
    }

    updateTimer()
    const timerInterval = setInterval(updateTimer, 1000)
  }
}

console.log('[SIDE_QUEST_SCREEN] Module loaded')
