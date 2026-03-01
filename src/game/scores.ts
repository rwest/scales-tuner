import type { ScoreEntry } from '../types';

// Save a score entry to localStorage
export function saveScore(entry: ScoreEntry) {
  try {
    const raw = localStorage.getItem('scaleTowerScores');
    const arr: ScoreEntry[] = raw ? (JSON.parse(raw) as ScoreEntry[]) : [];
    if (Array.isArray(arr)) {
      arr.push(entry);
      localStorage.setItem('scaleTowerScores', JSON.stringify(arr));
    } else {
      localStorage.setItem('scaleTowerScores', JSON.stringify([entry]));
    }
  } catch (e) {
    console.error('Failed to save score:', e);
  }
}

// Load scores from localStorage
export function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem('scaleTowerScores');
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown[];
    if (!Array.isArray(arr)) return [];
    function isScoreEntryLike(obj: unknown): obj is ScoreEntry {
      return (
        typeof obj === 'object' && obj !== null &&
        typeof (obj as { datetime?: unknown }).datetime === 'string' &&
        typeof (obj as { scale?: unknown }).scale === 'string' &&
        typeof (obj as { score?: unknown }).score === 'number' &&
        (
          (typeof (obj as { result?: unknown }).result === 'undefined') ||
          (obj as { result?: unknown }).result === 'success' ||
          (obj as { result?: unknown }).result === 'failed'
        )
      );
    }
    return arr.filter(isScoreEntryLike).map(e => ({
      datetime: e.datetime,
      scale: e.scale,
      score: e.score,
      result: e.result,
    }));
  } catch (e: unknown) {
    console.error('Failed to load scores:', e instanceof Error ? e.message : e);
    return [];
  }
}

// Clear all scores from localStorage
export function clearScores(): void {
  try {
    localStorage.removeItem('scaleTowerScores');
  } catch (e) {
    console.error('Failed to clear scores:', e);
  }
}
