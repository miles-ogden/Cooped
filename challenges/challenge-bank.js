/**
 * Challenge bank with various types of puzzles and questions
 * Each challenge type has multiple difficulties
 */

export const CHALLENGE_TYPES = {
  TRIVIA: 'trivia',
  MATH: 'math',
  WORD: 'word',
  MEMORY: 'memory',
  TYPING: 'typing'
};

/**
 * Trivia challenges - General knowledge questions
 */
const triviaEasy = [
  { question: 'What is the capital of France?', answer: 'Paris', category: 'Geography' },
  { question: 'How many days are in a week?', answer: '7', category: 'General' },
  { question: 'What color is the sky on a clear day?', answer: 'Blue', category: 'Science' },
  { question: 'What is 2 + 2?', answer: '4', category: 'Math' },
  { question: 'What animal says "meow"?', answer: 'Cat', category: 'Animals' },
  { question: 'What planet do we live on?', answer: 'Earth', category: 'Science' },
  { question: 'How many legs does a spider have?', answer: '8', category: 'Animals' },
  { question: 'What is the opposite of hot?', answer: 'Cold', category: 'General' },
  { question: 'What do bees make?', answer: 'Honey', category: 'Nature' },
  { question: 'What color are emeralds?', answer: 'Green', category: 'General' }
];

const triviaMedium = [
  { question: 'What is the largest ocean on Earth?', answer: 'Pacific', category: 'Geography' },
  { question: 'Who painted the Mona Lisa?', answer: 'Leonardo da Vinci', category: 'Art' },
  { question: 'What is the chemical symbol for gold?', answer: 'Au', category: 'Science' },
  { question: 'In what year did World War II end?', answer: '1945', category: 'History' },
  { question: 'What is the smallest prime number?', answer: '2', category: 'Math' },
  { question: 'What is the largest mammal in the world?', answer: 'Blue Whale', category: 'Animals' },
  { question: 'How many continents are there?', answer: '7', category: 'Geography' },
  { question: 'What is the speed of light in km/s?', answer: '300000', category: 'Science' },
  { question: 'Who wrote "Romeo and Juliet"?', answer: 'Shakespeare', category: 'Literature' },
  { question: 'What is the capital of Japan?', answer: 'Tokyo', category: 'Geography' }
];

const triviaHard = [
  { question: 'What is the Planck constant approximately? (in J⋅s)', answer: '6.626e-34', category: 'Physics' },
  { question: 'Who was the first computer programmer?', answer: 'Ada Lovelace', category: 'Technology' },
  { question: 'What is the oldest known civilization?', answer: 'Sumerian', category: 'History' },
  { question: 'What is the rarest blood type?', answer: 'AB negative', category: 'Science' },
  { question: 'In what year was the World Wide Web invented?', answer: '1989', category: 'Technology' },
  { question: 'What is the largest desert in the world?', answer: 'Antarctic', category: 'Geography' },
  { question: 'Who discovered penicillin?', answer: 'Alexander Fleming', category: 'Science' },
  { question: 'What is the longest river in the world?', answer: 'Nile', category: 'Geography' },
  { question: 'What programming language was created by Guido van Rossum?', answer: 'Python', category: 'Technology' },
  { question: 'What is the study of mushrooms called?', answer: 'Mycology', category: 'Science' }
];

/**
 * Math challenges - Quick calculations
 */
const mathEasy = [
  { question: 'What is 15 + 27?', answer: '42' },
  { question: 'What is 50 - 18?', answer: '32' },
  { question: 'What is 6 × 7?', answer: '42' },
  { question: 'What is 100 ÷ 4?', answer: '25' },
  { question: 'What is 12 + 12?', answer: '24' },
  { question: 'What is 9 × 9?', answer: '81' },
  { question: 'What is 45 - 17?', answer: '28' },
  { question: 'What is 8 × 5?', answer: '40' },
  { question: 'What is 36 ÷ 6?', answer: '6' },
  { question: 'What is 25 + 25?', answer: '50' }
];

const mathMedium = [
  { question: 'What is 123 + 456?', answer: '579' },
  { question: 'What is 15²?', answer: '225' },
  { question: 'What is 144 ÷ 12?', answer: '12' },
  { question: 'What is 25 × 4 - 10?', answer: '90' },
  { question: 'What is √64?', answer: '8' },
  { question: 'What is 3³ (3 cubed)?', answer: '27' },
  { question: 'What is 17 × 3?', answer: '51' },
  { question: 'What is 200 - 87?', answer: '113' },
  { question: 'What is 18 × 6?', answer: '108' },
  { question: 'What is 1000 ÷ 25?', answer: '40' }
];

const mathHard = [
  { question: 'What is 234 × 17?', answer: '3978' },
  { question: 'What is √289?', answer: '17' },
  { question: 'What is 2⁸ (2 to the power of 8)?', answer: '256' },
  { question: 'What is 45% of 160?', answer: '72' },
  { question: 'What is 17² - 13²?', answer: '120' },
  { question: 'If a = 5 and b = 7, what is 3a + 2b?', answer: '29' },
  { question: 'What is the next prime number after 89?', answer: '97' },
  { question: 'What is 15! ÷ 13!? (factorial)', answer: '210' },
  { question: 'What is the area of a circle with radius 5? (use π ≈ 3.14)', answer: '78.5' },
  { question: 'Solve for x: 2x + 7 = 23', answer: '8' }
];

/**
 * Word challenges - Anagrams and word puzzles
 */
const wordEasy = [
  { question: 'Unscramble: TAC', answer: 'Cat' },
  { question: 'Unscramble: ETRE', answer: 'Tree' },
  { question: 'Unscramble: OKOB', answer: 'Book' },
  { question: 'Unscramble: SUEMO', answer: 'Mouse' },
  { question: 'What word is the opposite of "day"?', answer: 'Night' },
  { question: 'Unscramble: RTAEH', answer: 'Heart' },
  { question: 'Complete: Happy as a ___', answer: 'Clam' },
  { question: 'Unscramble: NOMO', answer: 'Moon' },
  { question: 'Unscramble: RSTAW', answer: 'Straw' },
  { question: 'What is a baby chicken called?', answer: 'Chick' }
];

const wordMedium = [
  { question: 'Unscramble: CMREOPTU', answer: 'Computer' },
  { question: 'Unscramble: LPHNAEET', answer: 'Elephant' },
  { question: 'What 5-letter word becomes shorter when you add two letters?', answer: 'Short' },
  { question: 'Unscramble: KRBAOD', answer: 'Keyboard' },
  { question: 'Unscramble: TNIUAMON', answer: 'Mountain' },
  { question: 'Unscramble: CALNEBA', answer: 'Balance' },
  { question: 'What word means both "a citrus fruit" and "a color"?', answer: 'Orange' },
  { question: 'Unscramble: HCKNCIE', answer: 'Chicken' },
  { question: 'Unscramble: DIWONW', answer: 'Window' },
  { question: 'What 7-letter word has hundreds of letters in it?', answer: 'Mailbox' }
];

const wordHard = [
  { question: 'Unscramble: EOUQTNSI', answer: 'Question' },
  { question: 'Unscramble: ODRHMOLAC', answer: 'Chlorodam' },
  { question: 'What is an anagram of "listen"?', answer: 'Silent' },
  { question: 'Unscramble: OGMIRPAGNMR', answer: 'Programming' },
  { question: 'What word can go before "light", "break", and "fast"?', answer: 'Day' },
  { question: 'Unscramble: PLOHHPIYSO', answer: 'Philosophy' },
  { question: 'What is an anagram of "astronomers"?', answer: 'Moon starers' },
  { question: 'Unscramble: NEDLACRA', answer: 'Calendar' },
  { question: 'Palindrome: What 5-letter word reads the same forwards and backwards?', answer: 'Kayak' },
  { question: 'Unscramble: TXUEONICN', answer: 'Execution' }
];

/**
 * Typing challenges - Type the phrase correctly
 */
const typingEasy = [
  { question: 'Type this: The quick brown fox', answer: 'The quick brown fox' },
  { question: 'Type this: Focus is key', answer: 'Focus is key' },
  { question: 'Type this: Stay productive', answer: 'Stay productive' },
  { question: 'Type this: One step at a time', answer: 'One step at a time' },
  { question: 'Type this: You can do it', answer: 'You can do it' }
];

const typingMedium = [
  { question: 'Type this: The early bird catches the worm', answer: 'The early bird catches the worm' },
  { question: 'Type this: Practice makes perfect progress', answer: 'Practice makes perfect progress' },
  { question: 'Type this: Knowledge is power', answer: 'Knowledge is power' },
  { question: 'Type this: Small steps lead to big changes', answer: 'Small steps lead to big changes' },
  { question: 'Type this: Consistency beats intensity', answer: 'Consistency beats intensity' }
];

const typingHard = [
  { question: 'Type this: The greatest glory in living lies not in never falling, but in rising every time we fall', answer: 'The greatest glory in living lies not in never falling, but in rising every time we fall' },
  { question: 'Type this: Success is not final, failure is not fatal: it is the courage to continue that counts', answer: 'Success is not final, failure is not fatal: it is the courage to continue that counts' },
  { question: 'Type this: Programming is the art of telling another human what one wants the computer to do', answer: 'Programming is the art of telling another human what one wants the computer to do' }
];

/**
 * Memory challenges - Remember and recall
 */
const memoryEasy = [
  { question: 'Remember this number: 573. Now type it back.', answer: '573' },
  { question: 'Remember this word: LAMP. Now type it back.', answer: 'Lamp' },
  { question: 'Remember these colors: Red Blue. Now type them (space separated).', answer: 'Red Blue' },
  { question: 'Remember this: 42. Now type it back.', answer: '42' },
  { question: 'Remember this word: FOCUS. Now type it back.', answer: 'Focus' }
];

const memoryMedium = [
  { question: 'Remember this sequence: 7 3 9 2. Now type it back (space separated).', answer: '7 3 9 2' },
  { question: 'Remember these words: Sky Tree Bird. Now type them (space separated).', answer: 'Sky Tree Bird' },
  { question: 'Remember this: A5K9L2. Now type it back.', answer: 'A5K9L2' },
  { question: 'Remember this pattern: X O X O X. Now type it back (space separated).', answer: 'X O X O X' }
];

const memoryHard = [
  { question: 'Remember: 8 2 7 4 1 9 3 6. Now type it back (space separated).', answer: '8 2 7 4 1 9 3 6' },
  { question: 'Remember: Mountain River Valley Forest. Now type them (space separated).', answer: 'Mountain River Valley Forest' },
  { question: 'Remember: B7F3K9M2P5. Now type it back.', answer: 'B7F3K9M2P5' }
];

/**
 * Get random challenge by type and difficulty
 */
export function getRandomChallenge(type, difficulty) {
  let pool = [];

  switch (type) {
    case CHALLENGE_TYPES.TRIVIA:
      pool = difficulty === 'easy' ? triviaEasy
        : difficulty === 'medium' ? triviaMedium
        : triviaHard;
      break;
    case CHALLENGE_TYPES.MATH:
      pool = difficulty === 'easy' ? mathEasy
        : difficulty === 'medium' ? mathMedium
        : mathHard;
      break;
    case CHALLENGE_TYPES.WORD:
      pool = difficulty === 'easy' ? wordEasy
        : difficulty === 'medium' ? wordMedium
        : wordHard;
      break;
    case CHALLENGE_TYPES.TYPING:
      pool = difficulty === 'easy' ? typingEasy
        : difficulty === 'medium' ? typingMedium
        : typingHard;
      break;
    case CHALLENGE_TYPES.MEMORY:
      pool = difficulty === 'easy' ? memoryEasy
        : difficulty === 'medium' ? memoryMedium
        : memoryHard;
      break;
    default:
      pool = triviaMedium;
  }

  const challenge = pool[Math.floor(Math.random() * pool.length)];

  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    difficulty,
    question: challenge.question,
    answer: challenge.answer,
    category: challenge.category || type,
    timeLimit: difficulty === 'easy' ? 60 : difficulty === 'medium' ? 45 : 30
  };
}

/**
 * Check if answer is correct (case-insensitive, trimmed)
 */
export function checkAnswer(userAnswer, correctAnswer) {
  const normalized1 = userAnswer.toString().trim().toLowerCase();
  const normalized2 = correctAnswer.toString().trim().toLowerCase();

  return normalized1 === normalized2;
}
