import type { GameSettings } from '../types';

// Trimmed mean of absolute cents (removes top outliers)
export function trimmedMeanAbs(samples: number[], trimTop: number): number {
  if (samples.length === 0) return 0;
  
  const abs = samples.map(c => Math.abs(c));
  abs.sort((a, b) => a - b);
  
  const keepCount = Math.max(1, Math.floor(abs.length * (1 - trimTop)));
  const trimmed = abs.slice(0, keepCount);
  
  return trimmed.reduce((sum, val) => sum + val, 0) / trimmed.length;
}

// Two-part per-note scoring: bounded accuracy + unbounded precision bonus
export function notePointsFromE(E: number, GOOD: number, settings: GameSettings): number {
  // accuracy term (bounded 0–A)
  const tauAcc = settings.tauMultiplier * GOOD;
  const s = Math.exp(-Math.pow(E / tauAcc, settings.scoreExponentP));

  // bonus term (log-reciprocal, unbounded, diminishing returns)
  const tauBonus = settings.bonusTauMultiplier * GOOD;
  const eps = settings.bonusEpsilonCents;
  const b = Math.log(1 + Math.pow(tauBonus / (E + eps), settings.bonusExponentQ));

  return settings.basePointsPerNote * s + settings.bonusWeight * b;
}

// Utility to compute total score with fluency bonus
export function getTotalScore(baseScore: number, fluencyFraction: number, settings: GameSettings): { totalScore: number; bonusPercent: number } {
  let bonusPercent = 0;
  let totalScore = baseScore;
  if (settings.fluencyWeight > 0) {
    const fluencyBase = Math.max(0, (fluencyFraction - settings.fluencyThreshold) / (1 - settings.fluencyThreshold));
    const rawPercent = settings.fluencyWeight * Math.pow(fluencyBase, settings.fluencyExponentQ) * 100;
    bonusPercent = Math.round(rawPercent / 5) * 5;
    totalScore = Math.round(baseScore * (1 + bonusPercent / 100));
  }
  return { totalScore, bonusPercent };
}
