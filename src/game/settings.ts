import type { GameSettings } from '../types';
import { SCALES } from './scales';

// Default settings (current values = middle of each range)
export const DEFAULT_SETTINGS: GameSettings = {
  okThreshold: 18,
  collapseThreshold: 15,
  holdDuration: 750,
  pauseBetweenNotes: 600,
  enabledScales: ['G Major', 'G Minor Melodic', 'Bb Major', 'A Major', 'A Minor Melodic', 'D Major', 'D Minor Melodic', 'Tonalization 1A'],
  noCollapse: false,
  hideTunerWhenPlaying: false,
  trimTop: 0.2,
  scoreExponentP: 2,
  tauMultiplier: 1.8,
  basePointsPerNote: 50,
  bonusTauMultiplier: 1.0,
  bonusEpsilonCents: 1.5,
  bonusExponentQ: 1.0,
  bonusWeight: 10,
  fluencyWeight: 2,
  fluencyExponentQ: 2,
  fluencyThreshold: 0.5,
  autoReplay: true,
  autoReplayDelay: 3000,
};

// Settings ranges for sliders
export const SETTINGS_RANGES = {
  okThreshold: { min: 9, max: 27, step: 1 },           // hard (10) to easy (30)
  collapseThreshold: { min: 8, max: 22, step: 1 },     // hard (8) to easy (25)
  holdDuration: { min: 400, max: 1100, step: 50 },     // short (400) to long (1200)
  pauseBetweenNotes: { min: 300, max: 900, step: 50 }, // short (300) to long (1000)
  trimTop: { min: 0.00, max: 0.40, step: 0.05 },       // outlier trim fraction
  scoreExponentP: { min: 1.0, max: 4.0, step: 0.25 },  // curve sharpness
  tauMultiplier: { min: 1.0, max: 3.0, step: 0.1 },    // score sensitivity
  basePointsPerNote: { min: 10, max: 150, step: 5 },     // base points per note
  bonusWeight: { min: 0, max: 50, step: 5 },              // bonus weight (0 disables)
  bonusTauMultiplier: { min: 0.5, max: 3.0, step: 0.1 }, // bonus tau multiplier
  bonusEpsilonCents: { min: 0.5, max: 5.0, step: 0.25 }, // bonus epsilon
  bonusExponentQ: { min: 0.5, max: 2.0, step: 0.1 },    // bonus exponent q
  fluencyWeight: { min: 0, max: 5, step: 0.5 },           // fluency bonus multiplier
  fluencyExponentQ: { min: 1.0, max: 4.0, step: 0.5 },    // fluency curve exponent
  fluencyThreshold: { min: 0, max: 0.8, step: 0.05 },     // fluency threshold (0-0.8)
  autoReplayDelay: { min: 1000, max: 5000, step: 500 },  // auto-replay delay
} as const;

export const STORAGE_KEY = 'scaleTowerSettings';

// Load settings from localStorage
export function loadSettings(): GameSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<GameSettings>;
      // Merge with defaults to handle any missing fields
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        // Ensure enabledScales has at least one valid scale
        enabledScales: parsed.enabledScales?.filter(s => s in SCALES).length 
          ? parsed.enabledScales.filter(s => s in SCALES)
          : DEFAULT_SETTINGS.enabledScales,
      };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return { ...DEFAULT_SETTINGS };
}

// Save settings to localStorage
export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}
