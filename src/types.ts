// Type definitions

export type GameState = 'menu' | 'settings' | 'playing' | 'collapsed' | 'success' | 'scores';
export type GameMode = 'practice' | 'test';

export interface NoteFrequencies {
  [key: string]: number;
}

export interface Scale {
  notes: string[];
}

export interface ScalesType {
  [key: string]: Scale;
}

export interface Brick {
  index: number;
  error: number;  // cents deviation from target
  angle: number;  // calculated rotation angle
  color: string;  // calculated color based on error
  note?: string;  // note name for display
  points?: number; // points earned for this note (after multiplier)
  basePoints?: number; // points before multiplier
  multiplier?: number; // streak multiplier (1, 2, 4, or 8)
}

export interface TuningIndicator {
  word: string;
  number: string;
  color: string;
}

export interface PitchIndicatorProps {
  cents: number;
}

export interface BrickProps {
  index: number;
  angle: number;
  color: string;
  isLatest: boolean;
  opacity?: number;
  cumulativeError?: number;
  note?: string;
  points?: number;
}

export interface FallingBrickProps {
  brick: Brick;
  startTime: number;
}

export interface ScoreEntry {
  datetime: string; // ISO string
  scale: string;
  score: number;
  result?: 'success' | 'failed';
}

// Settings interface for user-configurable options
export interface GameSettings {
  okThreshold: number;          // cents ±window to accept a note (10-30, default 18)
  collapseThreshold: number;    // instability points per note before tower falls (8-25, default 15)
  holdDuration: number;         // ms to hold note in tune (400-1200, default 750)
  pauseBetweenNotes: number;    // ms to pause between notes (300-1000, default 600)
  enabledScales: string[];      // which scales appear in the dropdown
  noCollapse: boolean;          // prevent tower from collapsing
  hideTunerWhenPlaying: boolean; // hide pitch feedback while playing notes
  trimTop: number;              // fraction trimmed from top tail (0.0-0.4, default 0.2)
  // accuracy term parameters
  scoreExponentP: number;       // p in exp(-(E/tau)^p) (1.0-4.0, default 2)
  tauMultiplier: number;        // k in tau = k*GOOD_THRESHOLD (1.0-3.0, default 1.8)
  basePointsPerNote: number;    // A, base points per note (200-3000, default 1000)
  // bonus term parameters (log-reciprocal)
  bonusTauMultiplier: number;   // bonus tau = k_b * GOOD (0.5-3.0, default 1.0)
  bonusEpsilonCents: number;    // eps stabiliser in cents (0.5-5.0, default 1.5)
  bonusExponentQ: number;       // q exponent (0.5-2.0, default 1.0)
  bonusWeight: number;          // B, bonus weight (0-1000, default 200, 0 disables)
  fluencyWeight: number;        // b, fluency bonus multiplier (0-5, default 2, 0 disables)
  fluencyExponentQ: number;     // q, fluency curve exponent (1.0-4.0, default 2)
  fluencyThreshold: number;     // minimum in-tune fraction for bonus (0-0.8, default 0.5)
  autoReplay: boolean;          // automatically restart after completion
  autoReplayDelay: number;      // ms before auto-replay triggers (1000-5000, default 3000)
}
