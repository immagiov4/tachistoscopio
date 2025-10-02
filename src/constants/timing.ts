// Centralized timing constants to avoid magic numbers
export const TIMING = {
  // Countdown
  COUNTDOWN_START: 3,
  COUNTDOWN_INTERVAL: 1000,
  
  // Display timing
  STIMULUS_DURATION: 500,
  TRANSITION_DURATION: 300,
  
  // Redirects
  REDIRECT_DELAY: 3000,
  
  // Intervals
  MIN_INTERVAL: 50,
} as const;

export const VALIDATION = {
  // Input limits
  MAX_INPUT_LENGTH: 255,
  MAX_WORD_LENGTH: 50,
  MAX_WORDS_PER_LIST: 1000,
  MIN_WORD_LENGTH: 2,
  
  // Password requirements
  MIN_PASSWORD_LENGTH: 8,
  
  // Rate limiting
  RATE_LIMIT_WINDOW: 5 * 60 * 1000, // 5 minutes
  RATE_LIMIT_MAX_REQUESTS: 10,
} as const;
