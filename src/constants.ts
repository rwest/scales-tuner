// Game configuration constants (non-configurable)
export const GAME_CONFIG = {
  SAME_NOTE_THRESHOLD: 50,      // cents ±to recognize same target note
} as const;

// Streak multiplier tiers and colors (ordered highest-first for matching)
export const MULTIPLIER_TIERS = [
  { streak: 15, multiplier: 8, color: '#af9ef6' },
  { streak: 10, multiplier: 4, color: '#63cef8' },
  { streak:  5, multiplier: 2, color: '#facc15' },
] as const;
