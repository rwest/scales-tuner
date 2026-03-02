import type { NoteFrequencies, ScalesType } from '../types';

// Note frequencies for all scales (2 octaves)
export const NOTE_FREQUENCIES: NoteFrequencies = {
  'G3': 196.00, 'A3': 220.00, 'B3': 246.94, 'C4': 261.63, 'D4': 293.66,
  'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'A4': 440.00,
  'B4': 493.88, 'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46,
  'F#5': 739.99, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77, 'C6': 1046.50,
  'D6': 1174.66, 'E6': 1318.51,
  // Flats and accidentals
  'Bb3': 233.08, 'Eb4': 311.13, 'Bb4': 466.16, 'Eb5': 622.25, 'Bb5': 932.33,
  'C#4': 277.18, 'C#5': 554.37, 'C#6': 1108.73,
  'G#4': 415.30, 'G#5': 830.61,
};

export const SCALES: ScalesType = {
  'G Major': {
    notes: ['G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5', 'F#5', 'E5', 'D5', 'C5', 'B4', 'A4', 'G4', 'F#4', 'E4', 'D4', 'C4', 'B3', 'A3', 'G3'],
  },
  'G Minor Melodic': {
    notes: ['G3', 'A3', 'Bb3', 'C4', 'D4', 'E4', 'F#4', 'G4', 'A4', 'Bb4', 'C5', 'D5', 'E5', 'F#5', 'G5', 'F5', 'Eb5', 'D5', 'C5', 'Bb4', 'A4', 'G4', 'F4', 'Eb4', 'D4', 'C4', 'Bb3', 'A3', 'G3'],
  },
  'Bb Major': {
    notes: ['Bb3', 'C4', 'D4', 'Eb4', 'F4', 'G4', 'A4', 'Bb4', 'C5', 'D5', 'Eb5', 'F5', 'G5', 'A5', 'Bb5', 'A5', 'G5', 'F5', 'Eb5', 'D5', 'C5', 'Bb4', 'A4', 'G4', 'F4', 'Eb4', 'D4', 'C4', 'Bb3'],
  },
  'A Major': {
    notes: ['A3', 'B3', 'C#4', 'D4', 'E4', 'F#4', 'G#4', 'A4', 'B4', 'C#5', 'D5', 'E5', 'F#5', 'G#5', 'A5', 'G#5', 'F#5', 'E5', 'D5', 'C#5', 'B4', 'A4', 'G#4', 'F#4', 'E4', 'D4', 'C#4', 'B3', 'A3'],
  },
  'A Minor Melodic': {
    notes: ['A3', 'B3', 'C4', 'D4', 'E4', 'F#4', 'G#4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G#5', 'A5', 'G5', 'F5', 'E5', 'D5', 'C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4', 'B3', 'A3'],
  },
  'D Major': {
    notes: ['D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5', 'D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6', 'D6', 'C#6', 'B5', 'A5', 'G5', 'F#5', 'E5', 'D5', 'C#5', 'B4', 'A4', 'G4', 'F#4', 'E4', 'D4' ],
  },
  'D Minor Melodic': {
    notes: ['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C#5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C#6', 'D6', 'C6', 'Bb5', 'A5', 'G5', 'F5', 'E5', 'D5', 'C5', 'Bb4', 'A4', 'G4', 'F4', 'E4', 'D4'],
  },
  'Tonalization 1A': {
    notes: ['G4', 'B4', 'D5', 'G5', 'A5', 'B5', 'A5', 'G5', 'D5', 'E5', 'D5', 'B4', 'G4'],
  },
  'Minuet Measure': {
    notes: ['G4', 'D5', 'F#4', 'C5', 'G4', 'Bb4', 'A4'],
  },
};

// Key signature accidentals lookup (treble clef)
export const KEY_SIGNATURE_ACCIDENTALS: Record<string, Record<string, '#' | 'b'>> = {
  // Sharps
  'G': { F: '#' },
  'D': { F: '#', C: '#' },
  'A': { F: '#', C: '#', G: '#' },
  // Flats
  'F': { B: 'b' },
  'Bb': { B: 'b', E: 'b' },
  'Eb': { B: 'b', E: 'b', A: 'b' },
  // Natural
  'C': {},
};

export function getKeyAccidental(keySignature: string, letter: string): '#' | 'b' | null {
  const map = KEY_SIGNATURE_ACCIDENTALS[keySignature] || {};
  return map[letter.toUpperCase()] || null;
}

// Map scale names to VexFlow key signatures
export function getKeySignatureForScale(scaleName: string): string {
  const keyMap: { [key: string]: string } = {
    'G Major': 'G',
    'G Minor Melodic': 'Bb', // G Melodic Minor has 2 flats
    'Bb Major': 'Bb',
    'A Major': 'A',
    'A Minor Melodic': 'C', // A Melodic Minor has no key signature accidentals
    'D Major': 'D',
    'D Minor Melodic': 'F', // D Melodic Minor has 1 flat
    'Tonalization 1A': 'G',
    'Minuet Measure': 'Bb',
  };
  return keyMap[scaleName];
}
