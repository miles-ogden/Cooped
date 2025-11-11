/**
 * Challenge bank with various types of puzzles and questions
 * Hybrid system: fetches from OpenTriviaDB API first, falls back to local questions
 */

import { fetchQuestionsFromAPI, checkAPIAnswer, isBooleanQuestion, getBooleanHint } from '../src/utils/api.js';

export const CHALLENGE_TYPES = {
  MATH: 'math',
  VOCABULARY: 'vocabulary',
  HISTORY: 'history',
  GENERAL_KNOWLEDGE: 'general-knowledge'
};

/**
 * Math challenges - Arithmetic with non-round numbers
 */
const mathEasyNew = [
  { question: 'What is 72 + 14?', answer: '86', category: 'math' },
  { question: 'What is 95 - 23?', answer: '72', category: 'math' },
  { question: 'What is 17 × 6?', answer: '102', category: 'math' },
  { question: 'What is 84 ÷ 7?', answer: '12', category: 'math' },
  { question: 'What is 58 + 37?', answer: '95', category: 'math' },
  { question: 'What is 113 - 45?', answer: '68', category: 'math' },
  { question: 'What is 23 × 4?', answer: '92', category: 'math' },
  { question: 'What is 63 ÷ 9?', answer: '7', category: 'math' },
  { question: 'What is 71 + 19?', answer: '90', category: 'math' },
  { question: 'What is 154 - 76?', answer: '78', category: 'math' }
];

const mathMediumNew = [
  { question: 'What is 247 + 185?', answer: '432', category: 'math' },
  { question: 'What is 523 - 237?', answer: '286', category: 'math' },
  { question: 'What is 34 × 17?', answer: '578', category: 'math' },
  { question: 'What is 312 ÷ 8?', answer: '39', category: 'math' },
  { question: 'What is 18²?', answer: '324', category: 'math' },
  { question: 'What is √169?', answer: '13', category: 'math' },
  { question: 'What is 45% of 240?', answer: '108', category: 'math' },
  { question: 'What is 7³?', answer: '343', category: 'math' },
  { question: 'What is 625 ÷ 25?', answer: '25', category: 'math' },
  { question: 'What is 29 × 13?', answer: '377', category: 'math' }
];

const mathHardNew = [
  { question: 'What is 456 × 23?', answer: '10488', category: 'math' },
  { question: 'What is 1234 ÷ 17?', answer: '72.59', category: 'math' },
  { question: 'What is √841?', answer: '29', category: 'math' },
  { question: 'What is 12²?', answer: '144', category: 'math' },
  { question: 'What is 2⁹?', answer: '512', category: 'math' },
  { question: 'What is 73% of 350?', answer: '255.5', category: 'math' },
  { question: 'Solve: 3x + 15 = 42. What is x?', answer: '9', category: 'math' },
  { question: 'What is the area of a rectangle: 23 × 17?', answer: '391', category: 'math' },
  { question: 'What is 15! ÷ 14!? (factorial)', answer: '15', category: 'math' },
  { question: 'What is 89 × 76?', answer: '6764', category: 'math' }
];

/**
 * Vocabulary challenges - Use word in context
 */
const vocabularyEasy = [
  { question: 'Use this word in a sentence: HAPPY', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: RUN', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: BLUE', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: JUMP', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: BRIGHT', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: QUICK', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: FRIEND', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: LEARN', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: MORNING', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: BEAUTIFUL', answer: null, category: 'vocabulary', requiresContextValidation: true }
];

const vocabularyMedium = [
  { question: 'Use this word in a sentence: ELOQUENT', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: MELANCHOLY', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: TENACIOUS', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: AMBIGUOUS', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: RESILIENT', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: PRAGMATIC', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: OBSCURE', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: METICULOUS', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: EPHEMERAL', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: VIVACIOUS', answer: null, category: 'vocabulary', requiresContextValidation: true }
];

const vocabularyHard = [
  { question: 'Use this word in a sentence: INCONGRUOUS', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: SANGUINE', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: OBFUSCATE', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: PERSPICACIOUS', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: SERENDIPITY', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: PELLUCID', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: CAPRICIOUS', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: MAGNANIMOUS', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: PROPITIOUS', answer: null, category: 'vocabulary', requiresContextValidation: true },
  { question: 'Use this word in a sentence: UBIQUITOUS', answer: null, category: 'vocabulary', requiresContextValidation: true }
];

/**
 * History challenges - General history questions
 */
const historyEasy = [
  { question: 'In what year did the Titanic sink?', answer: '1912', category: 'history' },
  { question: 'Who was the first President of the United States?', answer: 'George Washington', category: 'history' },
  { question: 'In what year did World War II end?', answer: '1945', category: 'history' },
  { question: 'Who invented the light bulb?', answer: 'Thomas Edison', category: 'history' },
  { question: 'In what year did man first land on the moon?', answer: '1969', category: 'history' },
  { question: 'Who wrote the Declaration of Independence?', answer: 'Thomas Jefferson', category: 'history' },
  { question: 'In what year was the Great Wall of China completed?', answer: '1644', category: 'history' },
  { question: 'Who was the first Emperor of Rome?', answer: 'Augustus', category: 'history' },
  { question: 'In what year did Christopher Columbus reach America?', answer: '1492', category: 'history' },
  { question: 'Who painted the Mona Lisa?', answer: 'Leonardo da Vinci', category: 'history' }
];

const historyMedium = [
  { question: 'In what year did the French Revolution begin?', answer: '1789', category: 'history' },
  { question: 'Who was the first woman to win a Nobel Prize?', answer: 'Marie Curie', category: 'history' },
  { question: 'In what year was the Russian Revolution?', answer: '1917', category: 'history' },
  { question: 'Who discovered penicillin?', answer: 'Alexander Fleming', category: 'history' },
  { question: 'In what year did the Berlin Wall fall?', answer: '1989', category: 'history' },
  { question: 'Who was the first person to circumnavigate the globe?', answer: 'Ferdinand Magellan', category: 'history' },
  { question: 'In what year was the American Declaration of Independence signed?', answer: '1776', category: 'history' },
  { question: 'Who invented the telephone?', answer: 'Alexander Graham Bell', category: 'history' },
  { question: 'In what year did the Magna Carta get signed?', answer: '1215', category: 'history' },
  { question: 'Who was the first Emperor of Japan?', answer: 'Jimmu', category: 'history' }
];

const historyHard = [
  { question: 'In what year was the Battle of Hastings?', answer: '1066', category: 'history' },
  { question: 'Who was the first computer programmer?', answer: 'Ada Lovelace', category: 'history' },
  { question: 'In what year did the Library of Alexandria burn?', answer: '48', category: 'history' },
  { question: 'Who was the longest-reigning British monarch (before Queen Elizabeth II)?', answer: 'King George III', category: 'history' },
  { question: 'In what year was the Treaty of Versailles signed?', answer: '1919', category: 'history' },
  { question: 'Who led the Cuban Missile Crisis?', answer: 'John F Kennedy', category: 'history' },
  { question: 'In what year did the Ottoman Empire fall?', answer: '1922', category: 'history' },
  { question: 'Who was the oldest civilization known to history?', answer: 'Sumerian', category: 'history' },
  { question: 'In what year was the printing press invented?', answer: '1440', category: 'history' },
  { question: 'Who was the first African American President of the United States?', answer: 'Barack Obama', category: 'history' }
];

/**
 * General Knowledge challenges - Mix of various topics
 */
const generalKnowledgeEasy = [
  { question: 'What is the capital of France?', answer: 'Paris', category: 'general-knowledge' },
  { question: 'How many days are in a week?', answer: '7', category: 'general-knowledge' },
  { question: 'What color is the sky on a clear day?', answer: 'Blue', category: 'general-knowledge' },
  { question: 'What animal says "meow"?', answer: 'Cat', category: 'general-knowledge' },
  { question: 'What planet do we live on?', answer: 'Earth', category: 'general-knowledge' },
  { question: 'How many legs does a spider have?', answer: '8', category: 'general-knowledge' },
  { question: 'What do bees make?', answer: 'Honey', category: 'general-knowledge' },
  { question: 'What color are emeralds?', answer: 'Green', category: 'general-knowledge' },
  { question: 'What is the largest ocean on Earth?', answer: 'Pacific', category: 'general-knowledge' },
  { question: 'What is the largest mammal in the world?', answer: 'Blue Whale', category: 'general-knowledge' }
];

const generalKnowledgeMedium = [
  { question: 'What is the chemical symbol for gold?', answer: 'Au', category: 'general-knowledge' },
  { question: 'How many continents are there?', answer: '7', category: 'general-knowledge' },
  { question: 'What is the speed of light in km/s?', answer: '300000', category: 'general-knowledge' },
  { question: 'What is the capital of Japan?', answer: 'Tokyo', category: 'general-knowledge' },
  { question: 'What is the highest mountain in the world?', answer: 'Mount Everest', category: 'general-knowledge' },
  { question: 'How many sides does a hexagon have?', answer: '6', category: 'general-knowledge' },
  { question: 'What is the boiling point of water in Celsius?', answer: '100', category: 'general-knowledge' },
  { question: 'What is the smallest country in the world?', answer: 'Vatican City', category: 'general-knowledge' },
  { question: 'How many strings does a standard guitar have?', answer: '6', category: 'general-knowledge' },
  { question: 'What gas do plants breathe in?', answer: 'Carbon dioxide', category: 'general-knowledge' }
];

const generalKnowledgeHard = [
  { question: 'What is the Planck constant approximately? (in J⋅s)', answer: '6.626e-34', category: 'general-knowledge' },
  { question: 'What is the rarest blood type?', answer: 'AB negative', category: 'general-knowledge' },
  { question: 'What is the largest desert in the world?', answer: 'Antarctic', category: 'general-knowledge' },
  { question: 'What is the longest river in the world?', answer: 'Nile', category: 'general-knowledge' },
  { question: 'What programming language was created by Guido van Rossum?', answer: 'Python', category: 'general-knowledge' },
  { question: 'What is the oldest known civilization?', answer: 'Sumerian', category: 'general-knowledge' },
  { question: 'How many bones are in the human body?', answer: '206', category: 'general-knowledge' },
  { question: 'What is the symbol for Iron on the periodic table?', answer: 'Fe', category: 'general-knowledge' },
  { question: 'How many strings does a cello have?', answer: '4', category: 'general-knowledge' },
  { question: 'What is the escape velocity from Earth? (km/s)', answer: '11.2', category: 'general-knowledge' }
];


/**
 * Get random challenge - tries API first, falls back to local questions
 * @param {string} type - Challenge type
 * @param {string} difficulty - Challenge difficulty
 * @param {string[]} [enabledCategories] - Optional array of enabled categories to filter by
 * @returns {Promise<Object>} Challenge object
 */
export async function getRandomChallenge(type, difficulty, enabledCategories = null) {
  // For trivia questions, try to fetch from API
  if (type === CHALLENGE_TYPES.TRIVIA && enabledCategories && enabledCategories.length > 0) {
    try {
      // Pick a random enabled category
      const category = enabledCategories[Math.floor(Math.random() * enabledCategories.length)];

      // Try to fetch from OpenTrivia API
      const apiQuestions = await fetchQuestionsFromAPI(category, difficulty, 1);

      if (apiQuestions && apiQuestions.length > 0) {
        const challenge = apiQuestions[0];
        return {
          ...challenge,
          isBooleanQuestion: isBooleanQuestion(challenge.question, challenge.answer),
          booleanHint: getBooleanHint(challenge.answer)
        };
      }
    } catch (error) {
      console.log('Cooped: API fetch failed, using local questions:', error);
      // Fall through to local questions
    }
  }

  // Fall back to local questions
  return getRandomChallengeLocal(type, difficulty, enabledCategories);
}

/**
 * Get random challenge from local storage
 * @param {string} type - Challenge type
 * @param {string} difficulty - Challenge difficulty
 * @param {string[]} [enabledCategories] - Optional array of enabled categories to filter by
 */
function getRandomChallengeLocal(type, difficulty, enabledCategories = null) {
  let pool = [];

  switch (type) {
    case CHALLENGE_TYPES.MATH:
      pool = difficulty === 'easy' ? mathEasyNew
        : difficulty === 'medium' ? mathMediumNew
        : mathHardNew;
      break;
    case CHALLENGE_TYPES.VOCABULARY:
      pool = difficulty === 'easy' ? vocabularyEasy
        : difficulty === 'medium' ? vocabularyMedium
        : vocabularyHard;
      break;
    case CHALLENGE_TYPES.HISTORY:
      pool = difficulty === 'easy' ? historyEasy
        : difficulty === 'medium' ? historyMedium
        : historyHard;
      break;
    case CHALLENGE_TYPES.GENERAL_KNOWLEDGE:
      pool = difficulty === 'easy' ? generalKnowledgeEasy
        : difficulty === 'medium' ? generalKnowledgeMedium
        : generalKnowledgeHard;
      break;
    default:
      pool = generalKnowledgeMedium;
  }

  // Filter by enabled categories if provided
  if (enabledCategories && enabledCategories.length > 0) {
    pool = pool.filter(challenge =>
      enabledCategories.includes(challenge.category || type)
    );
  }

  // Fallback to original pool if filtered pool is empty
  if (pool.length === 0) {
    switch (type) {
      case CHALLENGE_TYPES.MATH:
        pool = difficulty === 'easy' ? mathEasyNew
          : difficulty === 'medium' ? mathMediumNew
          : mathHardNew;
        break;
      case CHALLENGE_TYPES.VOCABULARY:
        pool = difficulty === 'easy' ? vocabularyEasy
          : difficulty === 'medium' ? vocabularyMedium
          : vocabularyHard;
        break;
      case CHALLENGE_TYPES.HISTORY:
        pool = difficulty === 'easy' ? historyEasy
          : difficulty === 'medium' ? historyMedium
          : historyHard;
        break;
      case CHALLENGE_TYPES.GENERAL_KNOWLEDGE:
        pool = difficulty === 'easy' ? generalKnowledgeEasy
          : difficulty === 'medium' ? generalKnowledgeMedium
          : generalKnowledgeHard;
        break;
      default:
        pool = generalKnowledgeMedium;
    }
  }

  const challenge = pool[Math.floor(Math.random() * pool.length)];

  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    difficulty,
    question: challenge.question,
    answer: challenge.answer,
    category: challenge.category || type,
    requiresContextValidation: challenge.requiresContextValidation || false,
    timeLimit: difficulty === 'easy' ? 60 : difficulty === 'medium' ? 45 : 30,
    source: 'local'
  };
}

/**
 * Check if answer is correct
 * Handles both local and API questions with lenient matching
 * For vocabulary challenges, uses fuzzy matching with context validation
 * @param {string} userAnswer - User's input
 * @param {string} correctAnswer - Correct answer (null for vocabulary challenges)
 * @param {Object} [challenge] - Full challenge object (for vocabulary validation)
 * @returns {boolean} Whether answer is correct
 */
export function checkAnswer(userAnswer, correctAnswer, challenge = null) {
  // For vocabulary challenges, validate with context
  if (challenge && challenge.requiresContextValidation && correctAnswer === null) {
    return validateVocabularyUsage(userAnswer, challenge.question);
  }

  // Use the API answer checker which handles all edge cases
  return checkAPIAnswer(userAnswer, correctAnswer);
}

/**
 * Validate vocabulary challenge response using fuzzy matching with context
 * Checks if the word is used in a proper sentence context
 * @param {string} userAnswer - User's sentence
 * @param {string} questionText - Original question text (contains the word in caps)
 * @returns {boolean} Whether the word is properly used in context
 */
export function validateVocabularyUsage(userAnswer, questionText) {
  // Extract the word from the question (format: "Use this word in a sentence: WORD")
  const wordMatch = questionText.match(/in a sentence: (\w+)/i);
  if (!wordMatch) return false;

  const targetWord = wordMatch[1].toLowerCase();
  const answerLower = userAnswer.toLowerCase();

  // Check 1: Does the answer contain the word?
  if (!answerLower.includes(targetWord)) {
    return false;
  }

  // Check 2: Is the answer long enough? (At least 10 words to ensure context usage)
  const wordCount = userAnswer.trim().split(/\s+/).length;
  if (wordCount < 10) {
    return false;
  }

  // If both checks pass, consider it a valid usage
  return true;
}
