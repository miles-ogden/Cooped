/**
 * Core type definitions for Cooped extension
 * Designed with future scalability in mind (mobile app, co-op features, cloud sync)
 */

/**
 * @typedef {Object} UserStats
 * @property {number} challengesCompleted - Total challenges successfully completed
 * @property {number} currentStreak - Current consecutive days with activity (fire emoji counter)
 * @property {number} longestStreak - Longest streak ever achieved
 * @property {number} totalTimeBlocked - Total milliseconds blocked from distracting sites
 * @property {number} experience - Total XP earned (legacy)
 * @property {number} level - Current user level (legacy)
 * @property {number} lastActivityDate - Timestamp of last activity (for streak calculation)
 * @property {number} points - Current points (converts to eggs weekly)
 * @property {number} eggs - Current egg balance (premium currency)
 * @property {number} lastEggConversion - Timestamp of last egg conversion (Sunday 9 AM PST)
 * @property {string} rank - Current rank tier (Egg, Chick, Pecker, Chicken, HEN)
 * @property {number} lastDayChecked - Last calendar day checked for avoidance bonus (midnight UTC)
 */

/**
 * @typedef {Object} User
 * @property {string} id - Unique user identifier (future: for cloud sync)
 * @property {UserStats} stats - User statistics
 * @property {number} createdAt - Account creation timestamp
 */

/**
 * @typedef {Object} MascotCustomization
 * @property {string} [hatId] - ID of equipped hat
 * @property {string} [accessoryId] - ID of equipped accessory
 * @property {string} [backgroundColor] - Background color hex code
 */

/**
 * @typedef {Object} Mascot
 * @property {number} currentStage - Current evolution stage (0-based)
 * @property {string[]} unlocks - Array of unlocked item IDs
 * @property {MascotCustomization} customizations - Current appearance settings
 * @property {string} name - Mascot's custom name (future feature)
 */

/**
 * @typedef {Object} Settings
 * @property {string[]} blockedSites - Array of URL patterns to block
 * @property {('easy'|'medium'|'hard')} challengeDifficulty - Challenge difficulty level
 * @property {string[]} enabledChallengeTypes - Array of enabled challenge type IDs
 * @property {string[]} enabledCategories - Array of enabled learning categories
 * @property {boolean} soundEnabled - Whether sound effects are enabled
 * @property {boolean} animationsEnabled - Whether animations are enabled
 * @property {number} gracePeriodSeconds - Seconds before challenge appears (future)
 * @property {boolean} coopMode - Enable co-op features (future)
 * @property {string} [teamId] - Team ID if in co-op mode (future)
 */

/**
 * @typedef {Object} Session
 * @property {string} id - Unique session identifier
 * @property {number} timestamp - When the session occurred
 * @property {string} site - URL or domain that was blocked
 * @property {string} challengeType - Type of challenge presented
 * @property {boolean} success - Whether user completed the challenge
 * @property {number} timeSpent - Milliseconds spent on challenge
 * @property {number} experienceGained - XP earned from this session
 * @property {boolean} [syncedToCloud] - Whether synced to cloud (future)
 */

/**
 * @typedef {Object} Challenge
 * @property {string} id - Unique challenge identifier
 * @property {string} type - Challenge type (trivia, math, word, memory, typing)
 * @property {string} question - The challenge question/prompt
 * @property {string} answer - Correct answer (case-insensitive)
 * @property {string[]} [options] - Multiple choice options (if applicable)
 * @property {('easy'|'medium'|'hard')} difficulty - Challenge difficulty
 * @property {string} [category] - Subject category (future: for targeted learning)
 * @property {number} [timeLimit] - Time limit in seconds (future)
 * @property {string} [hint] - Optional hint text (future)
 */

/**
 * @typedef {Object} MascotStage
 * @property {number} stage - Stage number
 * @property {string} name - Stage name (e.g., "Chick", "Teen Chicken", "Wise Rooster")
 * @property {string} description - Stage description
 * @property {number} requiredExperience - XP needed to reach this stage
 * @property {string} imageUrl - Path to mascot image for this stage
 * @property {string[]} unlockedItems - Items unlocked at this stage
 */

/**
 * @typedef {Object} AppState
 * @property {User} user - User data
 * @property {Mascot} mascot - Mascot data
 * @property {Settings} settings - User settings
 * @property {Session[]} sessions - Recent sessions (limited to last 100)
 */

/**
 * Default application state
 */
export const DEFAULT_STATE = {
  user: {
    id: null, // Generated on first install
    stats: {
      challengesCompleted: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalTimeBlocked: 0,
      experience: 0,
      level: 1,
      lastActivityDate: Date.now(),
      points: 0,
      eggs: 10,
      lastEggConversion: Date.now(),
      rank: 'Egg',
      lastDayChecked: Math.floor(Date.now() / (24 * 60 * 60 * 1000))
    },
    createdAt: Date.now()
  },
  mascot: {
    currentStage: 0,
    unlocks: [],
    customizations: {
      backgroundColor: '#87CEEB'
    },
    name: 'Clucky'
  },
  settings: {
    blockedSites: [
      '*://www.youtube.com/*',
      '*://www.instagram.com/*',
      '*://www.facebook.com/*',
      '*://www.tiktok.com/*'
    ],
    challengeDifficulty: 'medium',
    enabledChallengeTypes: ['trivia', 'math', 'word'],
    enabledCategories: ['general-knowledge', 'vocabulary', 'history', 'math'],
    soundEnabled: true,
    animationsEnabled: true,
    gracePeriodSeconds: 0,
    coopMode: false,
    teamId: null
  },
  sessions: []
};

/**
 * Mascot evolution stages
 */
export const MASCOT_STAGES = [
  {
    stage: 0,
    name: 'Egg',
    description: 'Your journey begins! Complete challenges to hatch.',
    requiredExperience: 0,
    imageUrl: 'src/assets/mascot/stage0-egg.png',
    unlockedItems: []
  },
  {
    stage: 1,
    name: 'Chick',
    description: 'A curious little chick ready to learn!',
    requiredExperience: 100,
    imageUrl: 'src/assets/mascot/stage1-chick.png',
    unlockedItems: ['hat-basic']
  },
  {
    stage: 2,
    name: 'Young Chicken',
    description: 'Growing stronger and smarter every day.',
    requiredExperience: 500,
    imageUrl: 'src/assets/mascot/stage2-young.png',
    unlockedItems: ['hat-scholar', 'accessory-book']
  },
  {
    stage: 3,
    name: 'Smart Chicken',
    description: 'A knowledgeable chicken with focus and determination.',
    requiredExperience: 1500,
    imageUrl: 'src/assets/mascot/stage3-smart.png',
    unlockedItems: ['hat-graduation', 'accessory-glasses']
  },
  {
    stage: 4,
    name: 'Wise Rooster',
    description: 'The ultimate form! A master of focus and wisdom.',
    requiredExperience: 5000,
    imageUrl: 'src/assets/mascot/stage4-wise.png',
    unlockedItems: ['hat-crown', 'accessory-cape', 'bg-galaxy']
  }
];

/**
 * XP rewards by difficulty
 */
export const XP_REWARDS = {
  easy: 10,
  medium: 25,
  hard: 50
};

/**
 * Challenge categories for learning paths
 */
export const CHALLENGE_CATEGORIES = {
  GENERAL_KNOWLEDGE: 'general-knowledge',
  VOCABULARY: 'vocabulary',
  HISTORY: 'history',
  MATH: 'math'
};

/**
 * Category metadata
 */
export const CATEGORY_INFO = {
  'general-knowledge': {
    name: 'General Knowledge',
    description: 'Mix of facts from history, science, geography, and more',
    emoji: '🧠',
    color: '#667eea'
  },
  'vocabulary': {
    name: 'Vocabulary',
    description: 'Word definitions, synonyms, and language learning',
    emoji: '📚',
    color: '#764ba2'
  },
  'history': {
    name: 'History',
    description: 'Historical events, dates, and famous figures',
    emoji: '⏰',
    color: '#f093fb'
  },
  'math': {
    name: 'Math',
    description: 'Arithmetic, algebra, and problem-solving',
    emoji: '🔢',
    color: '#4facfe'
  }
};

/**
 * Rank tiers - progress based on challenges answered
 */
export const RANK_TIERS = [
  { name: 'Egg', minChallenges: 0, emoji: '🥚' },
  { name: 'Chick', minChallenges: 20, emoji: '🐣' },
  { name: 'Pecker', minChallenges: 50, emoji: '🐦' },
  { name: 'Chicken', minChallenges: 100, emoji: '🐔' },
  { name: 'HEN', minChallenges: 200, emoji: '🐓' }
];

/**
 * Cosmetics catalog - each costs 5 eggs
 */
export const COSMETICS_CATALOG = [
  // Backgrounds
  { id: 'bg-sunset', name: 'Sunset Background', type: 'background', price: 5, emoji: '🌅' },
  { id: 'bg-ocean', name: 'Ocean Background', type: 'background', price: 5, emoji: '🌊' },
  { id: 'bg-forest', name: 'Forest Background', type: 'background', price: 5, emoji: '🌲' },
  { id: 'bg-space', name: 'Space Background', type: 'background', price: 5, emoji: '⭐' },

  // Hats
  { id: 'hat-crown', name: 'Golden Crown', type: 'hat', price: 5, emoji: '👑' },
  { id: 'hat-party', name: 'Party Hat', type: 'hat', price: 5, emoji: '🎉' },
  { id: 'hat-wizard', name: 'Wizard Hat', type: 'hat', price: 5, emoji: '🧙' },
  { id: 'hat-flower', name: 'Flower Crown', type: 'hat', price: 5, emoji: '🌸' },

  // Scarves
  { id: 'scarf-red', name: 'Red Scarf', type: 'scarf', price: 5, emoji: '🔴' },
  { id: 'scarf-blue', name: 'Blue Scarf', type: 'scarf', price: 5, emoji: '🔵' },
  { id: 'scarf-rainbow', name: 'Rainbow Scarf', type: 'scarf', price: 5, emoji: '🌈' },

  // Shoes
  { id: 'shoes-sparkle', name: 'Sparkly Shoes', type: 'shoes', price: 5, emoji: '✨' },
  { id: 'shoes-cowboy', name: 'Cowboy Boots', type: 'shoes', price: 5, emoji: '🤠' },
  { id: 'shoes-roller', name: 'Roller Skates', type: 'shoes', price: 5, emoji: '🛼' },

  // Nests
  { id: 'nest-golden', name: 'Golden Nest', type: 'nest', price: 5, emoji: '✨' },
  { id: 'nest-cozy', name: 'Cozy Nest', type: 'nest', price: 5, emoji: '🏠' },
  { id: 'nest-rainbow', name: 'Rainbow Nest', type: 'nest', price: 5, emoji: '🌈' }
];

/**
 * Website metadata for displaying icons and names
 */
export const WEBSITE_METADATA = {
  'youtube.com': {
    name: 'YouTube',
    logo: '../assets/logos/youtube-logo.png',
    emoji: '▶️',
    color: '#FF0000'
  },
  'instagram.com': {
    name: 'Instagram',
    logo: '../assets/logos/instagram-logo.png',
    emoji: '📷',
    color: '#E4405F'
  },
  'facebook.com': {
    name: 'Facebook',
    logo: '../assets/logos/facebook-logo.png',
    emoji: '👥',
    color: '#1877F2'
  },
  'tiktok.com': {
    name: 'TikTok',
    logo: '../assets/logos/tiktok-logo.png',
    emoji: '🎵',
    color: '#25F4EE'
  }
};

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  APP_STATE: 'cooped_app_state',
  USER: 'cooped_user',
  MASCOT: 'cooped_mascot',
  SETTINGS: 'cooped_settings',
  SESSIONS: 'cooped_sessions',
  SITE_INTERVALS: 'cooped_site_intervals',
  ACTIVE_TIME_SESSION: 'cooped_active_time_session'
};
