/**
 * Mascot utility functions
 * Handles mascot progression, unlocks, and customization
 */

import { MASCOT_STAGES, XP_REWARDS } from '../types/types.js';

/**
 * Get current mascot stage based on experience
 * @param {number} experience - Total user experience
 * @returns {MascotStage}
 */
export function getCurrentStage(experience) {
  // Find the highest stage the user has achieved
  for (let i = MASCOT_STAGES.length - 1; i >= 0; i--) {
    if (experience >= MASCOT_STAGES[i].requiredExperience) {
      return MASCOT_STAGES[i];
    }
  }
  return MASCOT_STAGES[0]; // Default to egg
}

/**
 * Get next mascot stage
 * @param {number} currentStage - Current stage number
 * @returns {MascotStage|null}
 */
export function getNextStage(currentStage) {
  if (currentStage < MASCOT_STAGES.length - 1) {
    return MASCOT_STAGES[currentStage + 1];
  }
  return null; // Already at max stage
}

/**
 * Calculate progress to next stage
 * @param {number} experience - Current experience
 * @param {number} currentStageNum - Current stage number
 * @returns {{current: number, required: number, percentage: number}}
 */
export function getProgressToNextStage(experience, currentStageNum) {
  const nextStage = getNextStage(currentStageNum);

  if (!nextStage) {
    // Max level reached
    return {
      current: experience,
      required: experience,
      percentage: 100
    };
  }

  const currentStageXP = MASCOT_STAGES[currentStageNum].requiredExperience;
  const nextStageXP = nextStage.requiredExperience;
  const progressXP = experience - currentStageXP;
  const requiredXP = nextStageXP - currentStageXP;
  const percentage = Math.min(100, Math.floor((progressXP / requiredXP) * 100));

  return {
    current: progressXP,
    required: requiredXP,
    percentage
  };
}

/**
 * Calculate XP reward based on difficulty and performance
 * @param {string} difficulty - Challenge difficulty
 * @param {boolean} success - Whether challenge was completed
 * @param {number} timeSpent - Time spent on challenge in milliseconds
 * @returns {number}
 */
export function calculateXPReward(difficulty, success, timeSpent) {
  if (!success) return 0;

  const baseXP = XP_REWARDS[difficulty] || XP_REWARDS.medium;

  // Bonus for completing quickly (within 30 seconds)
  const speedBonus = timeSpent < 30000 ? Math.floor(baseXP * 0.2) : 0;

  return baseXP + speedBonus;
}

/**
 * Check if mascot has leveled up
 * @param {number} oldExperience - Experience before
 * @param {number} newExperience - Experience after
 * @returns {{leveledUp: boolean, newStage: MascotStage|null, oldStage: number, newStageNum: number}}
 */
export function checkLevelUp(oldExperience, newExperience) {
  const oldStage = getCurrentStage(oldExperience);
  const newStage = getCurrentStage(newExperience);

  const leveledUp = newStage.stage > oldStage.stage;

  return {
    leveledUp,
    newStage: leveledUp ? newStage : null,
    oldStage: oldStage.stage,
    newStageNum: newStage.stage
  };
}

/**
 * Get unlocked items at current stage
 * @param {number} stageNum - Current stage number
 * @returns {string[]}
 */
export function getUnlockedItems(stageNum) {
  const allUnlocks = [];

  for (let i = 0; i <= stageNum && i < MASCOT_STAGES.length; i++) {
    allUnlocks.push(...MASCOT_STAGES[i].unlockedItems);
  }

  return allUnlocks;
}

/**
 * Get mascot image URL for current stage
 * @param {number} stageNum - Stage number
 * @returns {string}
 */
export function getMascotImageUrl(stageNum) {
  const stage = MASCOT_STAGES[stageNum] || MASCOT_STAGES[0];
  return chrome.runtime.getURL(stage.imageUrl);
}

/**
 * Get encouraging message based on context
 * @param {string} context - 'success', 'failure', 'streak', 'levelup'
 * @param {number} stageNum - Current mascot stage
 * @returns {string}
 */
export function getMascotMessage(context, stageNum = 0) {
  const messages = {
    success: {
      0: [
        "Egg-cellent work! Keep going!",
        "You're helping me hatch!",
        "Great job! I'm growing!"
      ],
      1: [
        "Cheep cheep! You did it!",
        "Nice work! I'm learning from you!",
        "Keep it up! We're getting stronger!"
      ],
      2: [
        "Fantastic! Our focus is growing!",
        "Well done! Knowledge is power!",
        "Great job! Let's keep this momentum!"
      ],
      3: [
        "Brilliant! Your dedication shows!",
        "Excellent work! Wisdom comes from practice!",
        "Outstanding! We're unstoppable!"
      ],
      4: [
        "Magnificent! True mastery!",
        "Incredible! The path to enlightenment!",
        "Supreme work! We've achieved greatness!"
      ]
    },
    failure: {
      0: [
        "Don't worry! Even eggs need time to hatch.",
        "Try again! Practice makes perfect.",
        "It's okay! Learning is a journey."
      ],
      1: [
        "Cheep! Don't give up! Try once more!",
        "Every attempt makes us stronger!",
        "No worries! Let's try another approach!"
      ],
      2: [
        "Even chickens stumble! Let's go again!",
        "Mistakes help us grow! One more try!",
        "Don't worry! Success is just ahead!"
      ],
      3: [
        "Wise ones know failure teaches best!",
        "A momentary setback on the path to greatness!",
        "Let's use this as a learning opportunity!"
      ],
      4: [
        "Even masters face challenges!",
        "Wisdom comes from overcoming obstacles!",
        "This is just another step in our journey!"
      ]
    },
    streak: [
      "Your streak is on fire!",
      "Consistency is key! Keep going!",
      "Amazing dedication! The streak continues!",
      "Day after day, you're building greatness!",
      "Your commitment is inspiring!"
    ],
    levelup: [
      "LEVEL UP! I'm evolving!",
      "We did it! I've reached a new form!",
      "Amazing! Our bond grows stronger!",
      "Congratulations! New powers unlocked!",
      "Incredible! We've achieved a new milestone!"
    ]
  };

  const contextMessages = messages[context];

  if (Array.isArray(contextMessages)) {
    return contextMessages[Math.floor(Math.random() * contextMessages.length)];
  } else if (contextMessages && contextMessages[stageNum]) {
    const stageMessages = contextMessages[stageNum];
    return stageMessages[Math.floor(Math.random() * stageMessages.length)];
  }

  return "Keep going!";
}

/**
 * Get all mascot stages info (for UI)
 * @returns {MascotStage[]}
 */
export function getAllStages() {
  return MASCOT_STAGES;
}

/**
 * Get fun facts about chickens (for loading screens or transitions)
 * @returns {string}
 */
export function getChickenFact() {
  const facts = [
    "Chickens can remember over 100 different faces!",
    "A chicken's heart beats about 280-315 times per minute.",
    "Chickens have more bones in their necks than giraffes!",
    "The record for most eggs laid in one day is 7!",
    "Chickens can see and dream in full color.",
    "Baby chicks start communicating before they even hatch!",
    "Chickens have their own unique language with over 30 distinct sounds.",
    "A chicken can run up to 9 mph!",
    "Chickens are descendants of the Tyrannosaurus Rex!",
    "Chickens can taste salt, but not sweet things."
  ];

  return facts[Math.floor(Math.random() * facts.length)];
}
