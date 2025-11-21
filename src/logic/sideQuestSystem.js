/**
 * Side Quest System
 * Manages multiplayer quiz-based side quests for coops
 *
 * Features:
 * - Quest generation based on coop frequency settings
 * - Same 10 questions per quest (randomized order per user)
 * - 4-hour completion window (configurable by frequency)
 * - Scoring based on placement (1st: 250 XP, 2nd: 200 XP, 3rd: 150 XP, others: 100 XP)
 * - Speed and accuracy-based ranking
 * - One attempt per quest per user
 */

import { querySelect, queryUpdate, queryInsert } from './supabaseClient.js'

/**
 * Quest question banks by category
 */
const QUEST_QUESTIONS = {
  'General Knowledge': [
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
  ],
  'Math': [
    { q: 'What is 7 × 8?', options: ['54', '56', '58', '60'], correct: 1 },
    { q: 'What is 144 ÷ 12?', options: ['10', '11', '12', '13'], correct: 2 },
    { q: 'What is the square root of 144?', options: ['10', '11', '12', '13'], correct: 2 },
    { q: 'What is 15% of 200?', options: ['20', '25', '30', '35'], correct: 2 },
    { q: 'What is 2^5?', options: ['16', '32', '64', '128'], correct: 1 },
    { q: 'What is the sum of angles in a triangle?', options: ['90°', '180°', '270°', '360°'], correct: 1 },
    { q: 'What is 999 + 111?', options: ['1100', '1110', '1000', '999'], correct: 1 },
    { q: 'What is the area of a circle with radius 5?', options: ['25π', '10π', '50π', '100π'], correct: 0 },
    { q: 'What is 20% of 500?', options: ['50', '75', '100', '125'], correct: 2 },
    { q: 'If x + 5 = 12, what is x?', options: ['5', '7', '8', '10'], correct: 1 }
  ],
  'History': [
    { q: 'In what year did Columbus discover America?', options: ['1490', '1491', '1492', '1493'], correct: 2 },
    { q: 'Who was the first President of the United States?', options: ['John Adams', 'George Washington', 'Thomas Jefferson', 'Benjamin Franklin'], correct: 1 },
    { q: 'When did the Titanic sink?', options: ['1911', '1912', '1913', '1914'], correct: 1 },
    { q: 'Who invented the telephone?', options: ['Nikola Tesla', 'Alexander Graham Bell', 'Thomas Edison', 'Guglielmo Marconi'], correct: 1 },
    { q: 'In what year did the Berlin Wall fall?', options: ['1987', '1988', '1989', '1990'], correct: 2 },
    { q: 'Who was Napoleon Bonaparte?', options: ['A Russian emperor', 'A French military leader', 'A British general', 'An Italian scientist'], correct: 1 },
    { q: 'When did the Renaissance begin?', options: ['12th century', '13th century', '14th century', '15th century'], correct: 2 },
    { q: 'Who painted the Mona Lisa?', options: ['Michelangelo', 'Raphael', 'Leonardo da Vinci', 'Donatello'], correct: 2 },
    { q: 'What year did the Magna Carta get signed?', options: ['1115', '1215', '1315', '1415'], correct: 1 },
    { q: 'Who was the first person to walk on the moon?', options: ['Buzz Aldrin', 'Neil Armstrong', 'John Glenn', 'Yuri Gagarin'], correct: 1 }
  ],
  'Vocabulary': [
    { q: 'What does "benevolent" mean?', options: ['Harmful', 'Kind and generous', 'Confused', 'Angry'], correct: 1 },
    { q: 'What is a synonym for "meticulous"?', options: ['Careless', 'Quick', 'Careful and precise', 'Lazy'], correct: 2 },
    { q: 'What does "ephemeral" mean?', options: ['Permanent', 'Lasting a short time', 'Valuable', 'Ancient'], correct: 1 },
    { q: 'What is an antonym for "abundance"?', options: ['Plenty', 'Scarcity', 'Wealth', 'Fortune'], correct: 1 },
    { q: 'What does "pragmatic" mean?', options: ['Theoretical', 'Practical and realistic', 'Pessimistic', 'Stubborn'], correct: 1 },
    { q: 'What is a synonym for "eloquent"?', options: ['Silent', 'Fluent and persuasive in speaking', 'Confused', 'Rude'], correct: 1 },
    { q: 'What does "ambiguous" mean?', options: ['Clear', 'Open to multiple interpretations', 'Simple', 'Obvious'], correct: 1 },
    { q: 'What is an antonym for "verbose"?', options: ['Talkative', 'Long-winded', 'Concise', 'Rambling'], correct: 2 },
    { q: 'What does "resilient" mean?', options: ['Fragile', 'Able to recover quickly', 'Weak', 'Stubborn'], correct: 1 },
    { q: 'What is a synonym for "diligent"?', options: ['Lazy', 'Careful and hardworking', 'Quick', 'Careless'], correct: 1 }
  ],
  'Trivia': [
    { q: 'What is the highest-grossing movie of all time?', options: ['Avatar', 'Avengers: Endgame', 'Avatar: The Way of Water', 'Titanic'], correct: 2 },
    { q: 'Which actor played Iron Man in the Marvel Universe?', options: ['Chris Hemsworth', 'Robert Downey Jr.', 'Chris Evans', 'Tom Hiddleston'], correct: 1 },
    { q: 'What is the most-watched TV series of all time?', options: ['Game of Thrones', 'The Office', 'Breaking Bad', 'Friends'], correct: 2 },
    { q: 'Who won the Grammy Award for Best Album in 2023?', options: ['Taylor Swift', 'The Weeknd', 'Harry Styles', 'Billie Eilish'], correct: 0 },
    { q: 'What is the best-selling video game of all time?', options: ['Minecraft', 'Tetris', 'Call of Duty', 'Grand Theft Auto V'], correct: 0 },
    { q: 'Which superhero is known as "The Dark Knight"?', options: ['Superman', 'Batman', 'Spider-Man', 'Wonder Woman'], correct: 1 },
    { q: 'What is the longest-running animated TV series?', options: ['South Park', 'The Simpsons', 'Family Guy', 'Futurama'], correct: 1 },
    { q: 'Who is the author of the Harry Potter series?', options: ['J.K. Rowling', 'Stephen King', 'George R.R. Martin', 'J.R.R. Tolkien'], correct: 0 },
    { q: 'What is the most-streamed song on Spotify?', options: ['Blinding Lights', 'Shape of You', 'One Dance', 'As It Was'], correct: 0 },
    { q: 'Which actor has won the most Academy Awards?', options: ['Meryl Streep', 'Jack Lemmon', 'Spencer Tracy', 'Katharine Hepburn'], correct: 3 }
  ],
  'Sports': [
    { q: 'How many players are on a basketball team?', options: ['8', '9', '5', '6'], correct: 2 },
    { q: 'In which year was the first World Cup held?', options: ['1930', '1932', '1934', '1936'], correct: 0 },
    { q: 'What is the maximum score in a game of bowling?', options: ['200', '250', '300', '350'], correct: 2 },
    { q: 'How long is a marathon?', options: ['40 km', '42.195 km', '45 km', '50 km'], correct: 1 },
    { q: 'Which tennis player has won the most Grand Slam titles?', options: ['Roger Federer', 'Rafael Nadal', 'Novak Djokovic', 'Margaret Court'], correct: 3 },
    { q: 'How many innings are in a baseball game?', options: ['7', '8', '9', '10'], correct: 2 },
    { q: 'What is the objective of curling?', options: ['Throw stones into a net', 'Slide stones into circles', 'Push stones across ice', 'Hit stones with brooms'], correct: 1 },
    { q: 'In American football, how many points is a touchdown worth?', options: ['3', '6', '7', '10'], correct: 1 },
    { q: 'How many holes are on a standard golf course?', options: ['9', '18', '27', '36'], correct: 1 },
    { q: 'What is the name of the trophy awarded to the NBA champion?', options: ['Stanley Cup', 'Larry O\'Brien Trophy', 'Lombardi Trophy', 'Vince Lombardi Trophy'], correct: 1 }
  ],
  'Movies & Media': [
    { q: 'What year was the first Star Wars movie released?', options: ['1976', '1977', '1978', '1979'], correct: 1 },
    { q: 'Which actor played Jack in Titanic?', options: ['Matt Damon', 'Leonardo DiCaprio', 'Brad Pitt', 'Tom Cruise'], correct: 1 },
    { q: 'What is the name of the fictional currency in Harry Potter?', options: ['Galleons', 'Knuts', 'Sickles', 'All of the above'], correct: 3 },
    { q: 'In The Lord of the Rings, what is the name of the ring?', options: ['The Evil Ring', 'The One Ring', 'The Master Ring', 'The Dark Ring'], correct: 1 },
    { q: 'Who directed Inception?', options: ['Christopher Nolan', 'Denis Villeneuve', 'Steven Spielberg', 'Quentin Tarantino'], correct: 0 },
    { q: 'What is the name of the coffee shop in Friends?', options: ['The Coffee Place', 'Central Perk', 'Friends Cafe', 'The Brew'], correct: 1 },
    { q: 'In The Matrix, what color pill does Neo take?', options: ['Red pill', 'Blue pill', 'Purple pill', 'Green pill'], correct: 0 },
    { q: 'Who is the main character in The Hunger Games?', options: ['Katniss Everdeen', 'Hermione Granger', 'Daenerys Targaryen', 'Arya Stark'], correct: 0 },
    { q: 'What is the name of Elsa\'s sister in Frozen?', options: ['Anna', 'Ariel', 'Aurora', 'Belle'], correct: 0 },
    { q: 'In The Office, what is the name of the paper company?', options: ['Dunder Mifflin', 'Wernham Hogg', 'Sabre', 'Michael Scott Inc'], correct: 0 }
  ],
  'Pop Culture': [
    { q: 'What is the real name of the artist known as "The Weeknd"?', options: ['Oscar Mbo', 'Abel Tesfaye', 'Khalid Robinson', 'Daniel Sturridge'], correct: 1 },
    { q: 'What social media platform was founded by Mark Zuckerberg?', options: ['Twitter', 'Instagram', 'Facebook', 'Snapchat'], correct: 2 },
    { q: 'In what year did TikTok become globally popular?', options: ['2018', '2019', '2020', '2021'], correct: 2 },
    { q: 'What is the name of Elon Musk\'s space company?', options: ['Blue Origin', 'SpaceX', 'Virgin Galactic', 'Axiom Space'], correct: 1 },
    { q: 'Who is known as the "Queen of Pop"?', options: ['Lady Gaga', 'Britney Spears', 'Madonna', 'Beyonce'], correct: 2 },
    { q: 'What is the name of the popular K-pop group that includes RM and Jungkook?', options: ['Blackpink', 'BTS', 'Twice', 'Exo'], correct: 1 },
    { q: 'In what year did Instagram launch?', options: ['2009', '2010', '2011', '2012'], correct: 2 },
    { q: 'What is the name of Jeff Bezos\'s e-commerce company?', options: ['eBay', 'Alibaba', 'Amazon', 'Shopify'], correct: 2 },
    { q: 'Who created the "Kardashian" brand?', options: ['Kylie Jenner', 'Kim Kardashian', 'Kris Jenner', 'Kanye West'], correct: 1 },
    { q: 'What streaming service produces "Stranger Things"?', options: ['Disney+', 'Amazon Prime', 'Netflix', 'Hulu'], correct: 2 }
  ],
  'Real Life Events': [
    { q: 'In what year did the COVID-19 pandemic start?', options: ['2019', '2020', '2021', '2022'], correct: 0 },
    { q: 'What is the name of the social movement started in 2020?', options: ['Me Too', 'Black Lives Matter', '#MeToo', 'Times Up'], correct: 1 },
    { q: 'In which country did the 2016 Olympic Games take place?', options: ['China', 'Brazil', 'South Africa', 'Australia'], correct: 1 },
    { q: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'], correct: 2 },
    { q: 'In what year did the metaverse become a major trend?', options: ['2020', '2021', '2022', '2023'], correct: 2 },
    { q: 'What is the name of Elon Musk\'s neural technology company?', options: ['Tesla', 'Neuralink', 'The Boring Company', 'SolarCity'], correct: 1 },
    { q: 'In what year did ChatGPT launch?', options: ['2021', '2022', '2023', '2024'], correct: 1 },
    { q: 'What is the primary goal of climate change activism?', options: ['Reduce pollution', 'Stop global warming', 'Save the planet', 'All of the above'], correct: 3 },
    { q: 'In what year did the James Webb Space Telescope launch?', options: ['2020', '2021', '2022', '2023'], correct: 2 },
    { q: 'What is the name of the recent AI revolution powered by transformer models?', options: ['Machine Learning', 'Deep Learning', 'Generative AI', 'Neural Networks'], correct: 2 }
  ]
}

/**
 * Difficulty levels for questions
 */
const DIFFICULTY_LEVELS = {
  easy: 1,
  medium: 2,
  hard: 3
}

/**
 * Time windows for different frequencies
 */
const FREQUENCY_WINDOWS = {
  'daily': { hoursToComplete: 4, questsPerWeek: 7 },
  'weekly': { hoursToComplete: 24, questsPerWeek: 1 }
}

/**
 * Generate a new side quest for a coop
 * Creates a quest with 10 random questions from the selected categories
 */
export async function generateSideQuest(coopId) {
  try {
    console.log('[SIDE_QUEST] Generating side quest for coop:', coopId)

    // Get coop data to fetch side quest settings
    const coop = await querySelect('coops', {
      eq: { id: coopId },
      single: true
    })

    if (!coop) {
      throw new Error('Coop not found')
    }

    // Check if side quests are enabled
    if (!coop.side_quests_enabled) {
      return { success: false, error: 'Side quests are not enabled for this coop' }
    }

    // Get question topics
    const category = coop.side_quest_category || 'learning'
    const selectedTopics = coop.side_quest_topics || []

    if (selectedTopics.length === 0) {
      return { success: false, error: 'No topics selected for side quests' }
    }

    // Collect all available questions from selected topics
    let availableQuestions = []
    selectedTopics.forEach(topic => {
      if (QUEST_QUESTIONS[topic]) {
        availableQuestions = availableQuestions.concat(QUEST_QUESTIONS[topic])
      }
    })

    if (availableQuestions.length < 10) {
      return { success: false, error: `Not enough questions available (${availableQuestions.length} < 10)` }
    }

    // Randomly select 10 questions
    const selectedQuestions = []
    const questionsCopy = [...availableQuestions]
    for (let i = 0; i < 10; i++) {
      const randomIndex = Math.floor(Math.random() * questionsCopy.length)
      selectedQuestions.push(questionsCopy[randomIndex])
      questionsCopy.splice(randomIndex, 1)
    }

    // Calculate expiration time based on frequency
    const frequency = coop.side_quest_frequency || 'daily'
    const window = FREQUENCY_WINDOWS[frequency]
    const expiresAt = new Date(Date.now() + window.hoursToComplete * 60 * 60 * 1000).toISOString()

    // Create quest record
    const now = new Date().toISOString()
    const questResult = await queryInsert('side_quests', [{
      coop_id: coopId,
      category: category,
      questions: selectedQuestions,
      created_at: now,
      expires_at: expiresAt,
      status: 'active'
    }])

    const newQuest = questResult[0]

    console.log('[SIDE_QUEST] Quest created:', newQuest.id, 'Expires:', expiresAt)

    return {
      success: true,
      quest: {
        id: newQuest.id,
        coop_id: coopId,
        category: category,
        created_at: now,
        expires_at: expiresAt,
        question_count: selectedQuestions.length
      }
    }
  } catch (err) {
    console.error('[SIDE_QUEST] Error generating quest:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Get the current active side quest for a coop
 */
export async function getActiveQuest(coopId) {
  try {
    console.log('[SIDE_QUEST] Getting active quest for coop:', coopId)

    const now = new Date().toISOString()

    // Find an active quest that hasn't expired
    const quests = await querySelect('side_quests', {
      eq: { coop_id: coopId }
    })

    if (!quests || quests.length === 0) {
      return { success: true, quest: null, message: 'No quests available' }
    }

    // Sort by creation date (most recent first) and find first non-expired quest
    const activeQuest = quests
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .find(q => q.status === 'active' && new Date(q.expires_at) > new Date(now))

    if (!activeQuest) {
      return { success: true, quest: null, message: 'No active quests available' }
    }

    console.log('[SIDE_QUEST] Found active quest:', activeQuest.id)

    return {
      success: true,
      quest: {
        id: activeQuest.id,
        coop_id: activeQuest.coop_id,
        category: activeQuest.category,
        created_at: activeQuest.created_at,
        expires_at: activeQuest.expires_at,
        question_count: activeQuest.questions?.length || 0,
        time_remaining_ms: new Date(activeQuest.expires_at) - new Date(now)
      }
    }
  } catch (err) {
    console.error('[SIDE_QUEST] Error getting active quest:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Get quest questions for a specific user (randomized order)
 */
export async function getQuestQuestionsForUser(questId, userId) {
  try {
    console.log('[SIDE_QUEST] Getting quest questions for user:', userId, 'quest:', questId)

    const quest = await querySelect('side_quests', {
      eq: { id: questId },
      single: true
    })

    if (!quest) {
      throw new Error('Quest not found')
    }

    // Randomize question order per user using user ID as seed
    const questions = quest.questions || []
    const randomizedQuestions = randomizeQuestionsPerUser(questions, userId)

    console.log('[SIDE_QUEST] Returning', randomizedQuestions.length, 'randomized questions')

    return {
      success: true,
      quest: {
        id: quest.id,
        coop_id: quest.coop_id,
        category: quest.category,
        expires_at: quest.expires_at,
        questions: randomizedQuestions
      }
    }
  } catch (err) {
    console.error('[SIDE_QUEST] Error getting quest questions:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Submit quiz answers and record attempt
 */
export async function submitQuestAttempt(questId, userId, answers, startTime, endTime) {
  try {
    console.log('[SIDE_QUEST] Submitting quest attempt for user:', userId, 'quest:', questId)

    // Get the quest
    const quest = await querySelect('side_quests', {
      eq: { id: questId },
      single: true
    })

    if (!quest) {
      throw new Error('Quest not found')
    }

    // Check if quest has expired
    const now = new Date()
    if (new Date(quest.expires_at) < now) {
      return { success: false, error: 'Quest has expired' }
    }

    // Check if user already has an attempt
    let existingAttempts = []
    try {
      existingAttempts = await querySelect('side_quest_attempts', {
        eq: { quest_id: questId, user_id: userId }
      })
    } catch (err) {
      // Table might not have this quest yet
      console.log('[SIDE_QUEST] No existing attempts found:', err.message)
    }

    if (existingAttempts && existingAttempts.length > 0) {
      return { success: false, error: 'You already completed this quest' }
    }

    // Calculate accuracy
    const questions = quest.questions || []
    let correctCount = 0

    answers.forEach((answer, index) => {
      if (index < questions.length && answer === questions[index].correct) {
        correctCount++
      }
    })

    const accuracy = Math.round((correctCount / questions.length) * 100)
    const timeTakenSeconds = (new Date(endTime) - new Date(startTime)) / 1000

    // Create attempt record
    const attemptResult = await queryInsert('side_quest_attempts', [{
      quest_id: questId,
      user_id: userId,
      coop_id: quest.coop_id,
      answers: answers,
      start_time: startTime,
      end_time: endTime,
      accuracy_percent: accuracy,
      time_taken_seconds: timeTakenSeconds,
      created_at: new Date().toISOString()
    }])

    const newAttempt = attemptResult[0]

    console.log('[SIDE_QUEST] Attempt recorded:', newAttempt.id, 'Accuracy:', accuracy + '%')

    return {
      success: true,
      attempt: {
        id: newAttempt.id,
        accuracy: accuracy,
        time_taken: timeTakenSeconds,
        correct_answers: correctCount,
        total_questions: questions.length
      }
    }
  } catch (err) {
    console.error('[SIDE_QUEST] Error submitting attempt:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Calculate placements and award XP when quest expires
 */
export async function finalizeQuestResults(questId) {
  try {
    console.log('[SIDE_QUEST] Finalizing results for quest:', questId)

    const quest = await querySelect('side_quests', {
      eq: { id: questId },
      single: true
    })

    if (!quest) {
      throw new Error('Quest not found')
    }

    // Get all attempts for this quest
    let attempts = []
    try {
      attempts = await querySelect('side_quest_attempts', {
        eq: { quest_id: questId }
      })
    } catch (err) {
      console.log('[SIDE_QUEST] No attempts found for quest:', err.message)
      return { success: true, placements: [] }
    }

    if (!attempts || attempts.length === 0) {
      console.log('[SIDE_QUEST] No attempts to finalize')
      return { success: true, placements: [] }
    }

    // Sort by accuracy (descending) then by time (ascending)
    const sorted = attempts.sort((a, b) => {
      if (b.accuracy_percent !== a.accuracy_percent) {
        return b.accuracy_percent - a.accuracy_percent
      }
      return a.time_taken_seconds - b.time_taken_seconds
    })

    // Assign placements and calculate XP rewards
    const placements = []
    const xpRewards = [250, 200, 150] // 1st, 2nd, 3rd place
    const baseXp = 100

    for (let i = 0; i < sorted.length; i++) {
      const attempt = sorted[i]
      let xpEarned = baseXp

      if (i === 0) {
        xpEarned = xpRewards[0]
      } else if (i === 1) {
        xpEarned = xpRewards[1]
      } else if (i === 2) {
        xpEarned = xpRewards[2]
      }

      placements.push({
        placement: i + 1,
        user_id: attempt.user_id,
        accuracy: attempt.accuracy_percent,
        time_taken: attempt.time_taken_seconds,
        xp_earned: xpEarned
      })
    }

    console.log('[SIDE_QUEST] Quest finalized with', placements.length, 'participants')

    return {
      success: true,
      placements: placements
    }
  } catch (err) {
    console.error('[SIDE_QUEST] Error finalizing quest:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Helper: Randomize question order per user deterministically
 * Uses user ID as seed so same user always gets same order for same quest
 */
function randomizeQuestionsPerUser(questions, userId) {
  // Create a simple hash from userId to use as seed
  const seed = userId
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)

  // Fisher-Yates shuffle with seeded random
  const shuffled = [...questions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Seeded random between 0 and 1
    const random = Math.sin(seed + i) * 10000
    const j = Math.floor((random - Math.floor(random)) * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

console.log('[SIDE_QUEST] Module loaded')
