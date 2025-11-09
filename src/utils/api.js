/**
 * OpenTriviaDB API wrapper
 * Fetches questions from Open Trivia Database and converts them to fill-in-the-blank format
 */

/**
 * OpenTrivia category IDs
 * https://opentdb.com/api_config.php
 */
const OPENTRIVIA_CATEGORIES = {
  'general-knowledge': 9,
  'books': 10,
  'film': 11,
  'music': 12,
  'musicals-theatre': 13,
  'television': 14,
  'video-games': 15,
  'board-games': 16,
  'science-nature': 17,
  'computers': 18,
  'mathematics': 19,
  'mythology': 20,
  'sports': 21,
  'geography': 22,
  'history': 23,
  'politics': 24,
  'art': 25,
  'celebrities': 26,
  'animals': 27,
  'vehicles': 28,
  'comics': 29,
  'gadgets': 30,
  'anime-manga': 31,
  'cartoons': 32,
};

/**
 * Map Cooped categories to OpenTrivia categories
 * Cooped uses: general-knowledge, vocabulary, history, math
 */
const CATEGORY_MAPPING = {
  'general-knowledge': [9, 27, 28], // General, Animals, Vehicles
  'vocabulary': [10, 11, 12, 26], // Books, Film, Music, Celebrities
  'history': [23, 24, 20], // History, Politics, Mythology
  'math': [19], // Mathematics
};

/**
 * Convert OpenTrivia difficulty to Cooped difficulty
 * OpenTrivia: easy, medium, hard
 * Already matches our system!
 */
const DIFFICULTY_MAPPING = {
  'easy': 'easy',
  'medium': 'medium',
  'hard': 'hard',
};

/**
 * Decode HTML entities in OpenTrivia responses
 * OpenTrivia returns HTML-encoded text (&quot;, &amp;, etc.)
 */
function decodeHTML(text) {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return doc.documentElement.textContent;
}

/**
 * Fetch questions from OpenTriviaDB
 * @param {string} category - Cooped category (general-knowledge, vocabulary, history, math)
 * @param {string} difficulty - Challenge difficulty (easy, medium, hard)
 * @param {number} amount - Number of questions to fetch (default: 5)
 * @returns {Promise<Object[]>} Array of challenge objects
 */
export async function fetchQuestionsFromAPI(category, difficulty, amount = 5) {
  try {
    // Map Cooped category to OpenTrivia category IDs
    const categoryIds = CATEGORY_MAPPING[category] || CATEGORY_MAPPING['general-knowledge'];
    const randomCategoryId = categoryIds[Math.floor(Math.random() * categoryIds.length)];

    // Map difficulty
    const triviaDifficulty = DIFFICULTY_MAPPING[difficulty] || 'medium';

    // Build OpenTriviaDB API URL
    const url = `https://opentdb.com/api.php?amount=${amount}&category=${randomCategoryId}&difficulty=${triviaDifficulty}&type=multiple`;

    console.log('Cooped: Fetching questions from OpenTrivia:', url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.response_code !== 0) {
      console.warn('Cooped: OpenTrivia API error code:', data.response_code);
      return null; // Fall back to local questions
    }

    // Convert OpenTrivia format to Cooped format
    return data.results.map(question => ({
      id: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'trivia', // All OpenTrivia questions are trivia type
      difficulty: DIFFICULTY_MAPPING[question.difficulty],
      question: decodeHTML(question.question),
      answer: decodeHTML(question.correct_answer),
      category: category,
      // Store all answers for reference (though we'll only use correct_answer)
      allAnswers: question.incorrect_answers.map(a => decodeHTML(a)),
      source: 'opentrivia',
      timeLimit: difficulty === 'easy' ? 60 : difficulty === 'medium' ? 45 : 30
    }));
  } catch (error) {
    console.error('Cooped: Error fetching from OpenTrivia API:', error);
    return null; // Fall back to local questions
  }
}

/**
 * Fetch multiple categories worth of questions
 * Useful for building a question cache
 * @param {string[]} categories - Array of Cooped categories
 * @param {string} difficulty - Challenge difficulty
 * @returns {Promise<Object[]>} Combined array of challenges
 */
export async function fetchQuestionsMultipleCategories(categories, difficulty) {
  try {
    const questionPromises = categories.map(cat =>
      fetchQuestionsFromAPI(cat, difficulty, 3)
    );

    const results = await Promise.all(questionPromises);

    // Flatten and filter out null results
    return results
      .filter(result => result !== null)
      .flat();
  } catch (error) {
    console.error('Cooped: Error fetching multiple categories:', error);
    return [];
  }
}

/**
 * Normalize answer for comparison
 * Handles case-insensitivity, whitespace, and special cases for true/false
 * @param {string} userAnswer - User's input
 * @param {string} correctAnswer - Correct answer from API
 * @returns {boolean} Whether answer is correct
 */
export function checkAPIAnswer(userAnswer, correctAnswer) {
  // Normalize both answers
  const normalized1 = userAnswer.toString().trim().toLowerCase();
  const normalized2 = correctAnswer.toString().trim().toLowerCase();

  // Check exact match
  if (normalized1 === normalized2) {
    return true;
  }

  // Handle true/false variations
  const trueVariations = ['true', 'yes', 'y', '1'];
  const falseVariations = ['false', 'no', 'n', '0'];

  if (trueVariations.includes(normalized2)) {
    return trueVariations.includes(normalized1);
  }

  if (falseVariations.includes(normalized2)) {
    return falseVariations.includes(normalized1);
  }

  // Handle "True" / "False" (OpenTrivia sometimes returns these)
  if (normalized2 === 'true' || normalized2 === 'false') {
    return normalized1 === normalized2;
  }

  return false;
}

/**
 * Check if question is a boolean (True/False) question
 * @param {string} question - Question text
 * @param {string} answer - Correct answer
 * @returns {boolean}
 */
export function isBooleanQuestion(question, answer) {
  const normalized = answer.toString().trim().toLowerCase();
  return normalized === 'true' || normalized === 'false';
}

/**
 * Get hint for boolean questions
 * @param {string} answer - Correct answer (True or False)
 * @returns {string} User-friendly hint
 */
export function getBooleanHint(answer) {
  const normalized = answer.toString().trim().toLowerCase();
  return normalized === 'true' ? '(write true or false)' : '(write true or false)';
}
