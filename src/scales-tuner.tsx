import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import Vex from 'vexflow';

// Type definitions
type GameState = 'menu' | 'settings' | 'playing' | 'collapsed' | 'success';
type GameMode = 'practice' | 'test';

interface NoteFrequencies {
  [key: string]: number;
}

interface Scale {
  notes: string[];
}

interface ScalesType {
  [key: string]: Scale;
}

interface Brick {
  index: number;
  error: number;  // cents deviation from target
  angle: number;  // calculated rotation angle
  color: string;  // calculated color based on error
  note?: string;  // note name for display
}

interface TuningIndicator {
  word: string;
  number: string;
  color: string;
}

interface PitchIndicatorProps {
  cents: number;
}

interface BrickProps {
  index: number;
  angle: number;
  color: string;
  isLatest: boolean;
  opacity?: number;
  cumulativeError?: number;
  note?: string;
}

interface FallingBrickProps {
  brick: Brick;
  startTime: number;
}

// Settings interface for user-configurable options
interface GameSettings {
  okThreshold: number;          // cents ±window to accept a note (10-30, default 18)
  collapseThreshold: number;    // instability points per note before tower falls (8-25, default 15)
  holdDuration: number;         // ms to hold note in tune (400-1200, default 750)
  pauseBetweenNotes: number;    // ms to pause between notes (300-1000, default 600)
  enabledScales: string[];      // which scales appear in the dropdown
  noCollapse: boolean;          // prevent tower from collapsing
  hideTunerWhenPlaying: boolean; // hide pitch feedback while playing notes
  trimTop: number;              // fraction trimmed from top tail (0.0-0.4, default 0.2)
  scoreExponentP: number;       // p in exp(-(E/tau)^p) (1.0-4.0, default 2)
  tauMultiplier: number;        // k in tau = k*GOOD_THRESHOLD (1.0-3.0, default 1.8)
}

// Default settings (current values = middle of each range)
const DEFAULT_SETTINGS: GameSettings = {
  okThreshold: 18,
  collapseThreshold: 15,
  holdDuration: 750,
  pauseBetweenNotes: 600,
  enabledScales: ['G Major', 'G Minor Melodic', 'Bb Major', 'A Major', 'A Minor Melodic', 'D Major', 'D Minor Melodic', 'Tonalization 1A', 'Minuet Measure'],
  noCollapse: false,
  hideTunerWhenPlaying: false,
  trimTop: 0.2,
  scoreExponentP: 2,
  tauMultiplier: 2.0,
};

// Settings ranges for sliders
const SETTINGS_RANGES = {
  okThreshold: { min: 9, max: 27, step: 1 },           // hard (10) to easy (30)
  collapseThreshold: { min: 8, max: 22, step: 1 },     // hard (8) to easy (25)
  holdDuration: { min: 400, max: 1100, step: 50 },     // short (400) to long (1200)
  pauseBetweenNotes: { min: 300, max: 900, step: 50 }, // short (300) to long (1000)
  trimTop: { min: 0.00, max: 0.40, step: 0.05 },       // outlier trim fraction
  scoreExponentP: { min: 1.0, max: 3.0, step: 0.1 },  // curve sharpness
  tauMultiplier: { min: 1.0, max: 3.0, step: 0.1 },    // score sensitivity
} as const;

const STORAGE_KEY = 'scaleTowerSettings';

// Load settings from localStorage
function loadSettings(): GameSettings {
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
function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

// Game configuration constants (non-configurable)
const GAME_CONFIG = {
  SAME_NOTE_THRESHOLD: 50,      // cents ±to recognize same target note
} as const;

// Note frequencies for all scales (2 octaves)
const NOTE_FREQUENCIES: NoteFrequencies = {
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

const SCALES: ScalesType = {
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

// Autocorrelation pitch detection
function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / SIZE);

  if (rms < 0.01) return -1; // Not enough signal

  let r1 = 0, r2 = SIZE - 1;
  const threshold = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < threshold) { r2 = SIZE - i; break; }
  }

  const buf2 = buffer.slice(r1, r2);
  const c: number[] = Array.from({ length: buf2.length }, () => 0);

  for (let i = 0; i < buf2.length; i++) {
    for (let j = 0; j < buf2.length - i; j++) {
      c[i] += buf2[j] * buf2[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;

  let maxval = -1, maxpos = -1;
  for (let i = d; i < buf2.length; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  let T0 = maxpos;

  // Parabolic interpolation
  if (T0 > 0 && T0 < buf2.length - 1) {
    const x1: number = c[T0 - 1];
    const x2: number = c[T0];
    const x3: number = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);
  }

  return sampleRate / T0;
}

// Calculate cents difference between two frequencies
function getCents(frequency: number, targetFrequency: number): number {
  return 1200 * Math.log2(frequency / targetFrequency);
}

// Map error (cents) to brick angle
function getAngleFromError(error: number): number {
  return error * 1.5;
}

// Map error (cents) to brick color
function getColorFromError(error: number): string {
  const maxError = 50;
  const normalizedError = Math.max(-maxError, Math.min(maxError, error)) / maxError; // -1 to 1

  if (normalizedError > 0) {
    // sharp: interpolate from green to red
    const t = normalizedError; // 0 to 1
    const r = Math.round(34 + (239 - 34) * t);   // #22 to #ef
    const g = Math.round(229 - (229 - 68) * t);  // #e5 to #44
    const b = Math.round(95 - (95 - 68) * t);    // #5f to #44
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // flat: interpolate from green to blue
    const t = Math.abs(normalizedError); // 0 to 1
    const r = Math.round(34 - (34 - 42) * t);    // #22 to #2a
    const g = Math.round(229 - (229 - 122) * t); // #e5 to #7a
    const b = Math.round(95 + (255 - 95) * t);   // #5f to #fb
    return `rgb(${r}, ${g}, ${b})`;
  }
}

// Trimmed mean of absolute cents (removes top outliers)
function trimmedMeanAbs(samples: number[], trimTop: number): number {
  if (samples.length === 0) return 0;
  
  const abs = samples.map(c => Math.abs(c));
  abs.sort((a, b) => a - b);
  
  const keepCount = Math.max(1, Math.floor(abs.length * (1 - trimTop)));
  const trimmed = abs.slice(0, keepCount);
  
  return trimmed.reduce((sum, val) => sum + val, 0) / trimmed.length;
}

// Map scale names to VexFlow key signatures
function getKeySignatureForScale(scaleName: string): string {
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

// Friendly display for note names (use sharp/flat symbols)
function formatNoteDisplay(note: string): string {
  return note.replace(/#/g, '♯').replace(/b(?=\d)/g, '♭');
}

// Friendly display for scale names (use sharp/flat symbols)
function formatScaleName(name: string): string {
  return name.replace(/([A-G])b\b/g, '$1♭').replace(/#/g, '♯');
}

// Detect iPhone not in standalone mode (PWA installed to home screen)
function isIPhoneNotStandalone(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  const isIPhone = /iphone|ipod/.test(userAgent);
  const isStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isIPhone && !isStandalone;
}

// Key signature accidentals lookup (treble clef)
const KEY_SIGNATURE_ACCIDENTALS: Record<string, Record<string, '#' | 'b'>> = {
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

function getKeyAccidental(keySignature: string, letter: string): '#' | 'b' | null {
  const map = KEY_SIGNATURE_ACCIDENTALS[keySignature] || {};
  return map[letter.toUpperCase()] || null;
}

// Stave note display component
interface StaveNoteDisplayProps {
  note: string;
  keySignature: string;
}

function StaveNoteDisplay({ note, keySignature }: StaveNoteDisplayProps): ReactNode {
  const containerId = `stave-${note}-${keySignature}`;

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear previous content
    container.innerHTML = '';

    try {
      const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = Vex.Flow;

      // Create SVG renderer
      const renderer = new Renderer(container as HTMLDivElement, Renderer.Backends.SVG);
      renderer.resize(150, 150);
      const context = renderer.getContext();
      context.setFont('Arial', 10);

      // Set colors to white
      context.setStrokeStyle('white');
      context.setFillStyle('white');

      // Create stave
      const stave = new Stave(10, 10, 120);
      stave.addClef('treble').addKeySignature(keySignature);
      stave.setContext(context).draw();

      // Create the note - parse note string (e.g., "B3" -> "B/3", "Bb3" -> "Bb/3")
      const noteParts = note.match(/([A-G])([#b]?)(\d)/);
      if (!noteParts) return;

      const noteLetter = noteParts[1];
      const accidental = noteParts[2];
      const octave = noteParts[3];
      const noteString = `${noteLetter}${accidental}/${octave}`;

      // Create note object (half note)
      // Determine stem direction: notes above B4 should have stem down
      const octaveNum = parseInt(octave, 10);
      const shouldStemDown = octaveNum >= 5;
      const noteObj = new StaveNote({
        keys: [noteString],
        duration: 'h',
        stem_direction: shouldStemDown ? -1 : 1,
      });

      // Determine if we need to show an accidental (including naturals against key signature)
      const keySigAcc = getKeyAccidental(keySignature, noteLetter);
      const noteAcc: '#' | 'b' | null = accidental === '#' ? '#' : accidental === 'b' ? 'b' : null;
      let renderAcc: string | null = null;

      if (noteAcc !== keySigAcc) {
        if (noteAcc === null && keySigAcc) {
          renderAcc = 'n'; // natural to cancel key signature accidental
        } else if (noteAcc) {
          renderAcc = noteAcc; // sharp or flat explicit
        }
      }

      if (renderAcc) {
        noteObj.addModifier(new Accidental(renderAcc));
      }

      // Set note color to white
      noteObj.setStyle({ fillStyle: 'white', strokeStyle: 'white' });
      noteObj.setLedgerLineStyle({ strokeStyle: '#d1d5db' }); // Pale grey for ledger lines

      // Format and draw
      const voice = new Voice({ num_beats: 2, beat_value: 4 });
      voice.addTickables([noteObj]);

      new Formatter()
        .joinVoices([voice])
        .format([voice], 120);

      voice.draw(context, stave);
    } catch (error) {
      console.error('Error rendering stave:', error);
    }
  }, [note, keySignature, containerId]);

  return (
    <div
      id={containerId}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 150,
        minHeight: 150,
      }}
    />
  );
}

// Play a tone with harmonic richness (sounds louder than pure sine wave)
async function playTone(frequency: number, duration: number = 0.75): Promise<void> {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    await audioContext.resume();

    const now = audioContext.currentTime;
    const endTime = now + duration;

    // Create multiple oscillators with different frequencies (harmonics) for richer sound
    const harmonics = [
      { frequency: frequency, volume: 0.3 },           // Fundamental
      { frequency: frequency * 2.002, volume: 0.15 },      // 2nd harmonic
      { frequency: frequency * 3.005, volume: 0.1 },       // 3rd harmonic
      { frequency: frequency * 4, volume: 0.08 },      // 4th harmonic
    ];

    const masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);

    // Set envelope (attack, sustain, release)
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.5, now + 0.05);        // Attack
    masterGain.gain.setValueAtTime(0.5, endTime - 0.1);              // Sustain
    masterGain.gain.linearRampToValueAtTime(0, endTime);             // Release

    harmonics.forEach(({ frequency: freq, volume }) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.frequency.value = freq;
      osc.type = 'triangle'; // Triangle wave for richer harmonics
      gain.gain.setValueAtTime(volume, now);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(endTime);
    });
  } catch (error) {
    console.error('Error playing tone:', error);
  }
}

// Pitch indicator component
function PitchIndicator({ cents }: PitchIndicatorProps): ReactNode {
  const maxCents = 50; // +/- 50 cents range
  const clampedCents = Math.max(-maxCents, Math.min(maxCents, cents));
  const position = 50 - (clampedCents / maxCents) * 50; // 0-100%, inverted (0 = top = sharp)

  return (
    <div style={{
      position: 'relative',
      width: 60,
      height: 200,
      borderRadius: 30,
      overflow: 'hidden',
      boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    }}>
      {/* Gradient bar */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(to bottom, #ef4444 0%, #22e55f 50%, #2a7afbff 100%)',
      }} />

      {/* Center line */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        height: 2,
        background: 'rgba(255,255,255,0.8)',
        transform: 'translateY(-50%)',
      }} />

      {/* Moving circle indicator */}
      <div style={{
        position: 'absolute',
        top: `${position}%`,
        left: '50%',
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'white',
        border: '3px solid rgba(0,0,0,0.5)',
        transform: 'translate(-50%, -50%)',
        transition: 'top 0.05s ease-out',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}

// Brick component
function Brick({ index, angle, isLatest, opacity = 1, color, cumulativeError = 0, note }: BrickProps): ReactNode {
  const width = 60;
  const height = 16;
  const y = index * (height + 2);
  const xOffset = cumulativeError * 0.3; // Scale factor for visual effect

  return (
    <div
      style={{
        position: 'absolute',
        bottom: y,
        left: `calc(50% + ${xOffset}px)`,
        width: width,
        height: height,
        backgroundColor: color,
        border: '2px solid rgba(0,0,0,0.3)',
        borderRadius: 3,
        transform: `translateX(-50%) rotate(${angle}deg)`,
        transformOrigin: 'center bottom',
        transition: isLatest ? 'none' : 'all 0.3s ease',
        boxShadow: isLatest ? '0 0 10px rgba(255,255,255,0.5)' : '1px 2px 3px rgba(0,0,0,0.2)',
        opacity,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        color: 'rgba(0, 0, 0, 0.4)',
        fontWeight: 'bold',
      }}
    >
      {note ? formatNoteDisplay(note) : ''}
    </div>
  );
}

// Falling brick animation
function FallingBrick({ brick, startTime }: FallingBrickProps): ReactNode {
  const [pos, setPos] = useState<{ x: number; y: number; rotation: number }>({ x: 0, y: 0, rotation: brick.angle });

  useEffect(() => {
    const startY = brick.index * 18;
    const direction = brick.angle > 0 ? 1 : -1;
    const pauseDuration = 0.4; // seconds to pause before falling
    const easeInDuration = 0.3; // seconds to ease into the fall
    let frame: number;

    const animate = () => {
      const totalElapsed = (Date.now() - startTime) / 1000;
      
      // Pause at the beginning
      if (totalElapsed < pauseDuration) {
        setPos({ x: 0, y: startY, rotation: brick.angle });
        frame = requestAnimationFrame(animate);
        return;
      }

      const elapsed = totalElapsed - pauseDuration;
      
      // Apply ease-in curve for the first part of the animation
      let easeFactor = 1;
      if (elapsed < easeInDuration) {
        // Cubic ease-in: starts slow, speeds up
        const t = elapsed / easeInDuration;
        easeFactor = t * t * t;
      }

      const gravity = 400 * easeFactor;
      const horizontalSpeed = direction * 50 * Math.abs(brick.angle) / 10 * easeFactor;

      setPos({
        x: horizontalSpeed * elapsed,
        y: startY - (gravity * elapsed * elapsed),
        rotation: brick.angle + direction * elapsed * 180,
      });

      if (totalElapsed < 2.5) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [brick, startTime]);

  if (pos.y < -200) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: pos.y,
        left: `calc(50% + ${pos.x}px)`,
        width: 60,
        height: 16,
        backgroundColor: brick.color,
        border: '2px solid rgba(0,0,0,0.3)',
        borderRadius: 3,
        transform: `translateX(-50%) rotate(${pos.rotation}deg)`,
        opacity: 0.8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        color: 'rgba(0, 0, 0, 0.4)',
        fontWeight: 'bold',
      }}
    >
      {brick.note ? formatNoteDisplay(brick.note) : ''}
    </div>
  );
}

// Main game component
export default function ViolinTunerGame(): ReactNode {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('practice');
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [selectedScale, setSelectedScale] = useState<string>(() => {
    const loaded = loadSettings();
    return loaded.enabledScales[0] || 'G Major';
  });
  const [currentNoteIndex, setCurrentNoteIndex] = useState<number>(0);
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [instability, setInstability] = useState<number>(0);
  const [currentPitch, setCurrentPitch] = useState<number | null>(null);
  const [currentCents, setCurrentCents] = useState<number>(0);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [collapseTime, setCollapseTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noCollapse, setNoCollapse] = useState<boolean>(settings.noCollapse);
  const [score, setScore] = useState<number>(0);
  const [noteScores, setNoteScores] = useState<number[]>([]);
  const [isPausedBetweenNotes, setIsPausedBetweenNotes] = useState<boolean>(false);
  const [pauseAverageCents, setPauseAverageCents] = useState<number>(0);
  const [hideTunerWhenPlaying, setHideTunerWhenPlaying] = useState<boolean>(settings.hideTunerWhenPlaying);
  const [isAutoplayMode, setIsAutoplayMode] = useState<boolean>(false);
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [replayProgress, setReplayProgress] = useState<number>(0);
  const replayAnimRef = useRef<number | null>(null);

  // Derived thresholds from settings
  const OK_THRESHOLD = settings.okThreshold;
  const GOOD_THRESHOLD = settings.okThreshold * 0.5;
  const COLLAPSE_THRESHOLD = settings.collapseThreshold;
  const HOLD_DURATION = settings.holdDuration;
  const PAUSE_BETWEEN_NOTES = settings.pauseBetweenNotes;

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const noteStartTimeRef = useRef<number | null>(null);
  const accumulatedInRangeRef = useRef<number>(0);
  const noteSamplesRef = useRef<number[]>([]);
  const pauseStartTimeRef = useRef<number | null>(null);
  const autoplayNoteStartTimeRef = useRef<number | null>(null);
  const autoplayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replayStartRef = useRef<number | null>(null);
  // Refs for decoupled audio→visual updates (iOS Safari throttles rAF aggressively)
  const latestPitchRef = useRef<number | null>(null);
  const latestCentsRef = useRef<number>(0);
  const latestHoldProgressRef = useRef<number>(0);

  const scale = SCALES[selectedScale];
  const currentNote = scale?.notes[currentNoteIndex];
  const targetFrequency = NOTE_FREQUENCIES[currentNote];

  // Auto-replay countdown after success
  useEffect(() => {
    if (gameState !== 'success' && gameState !== 'collapsed') {
      setReplayProgress(0);
      replayStartRef.current = null;
      if (replayAnimRef.current !== null) {
        cancelAnimationFrame(replayAnimRef.current);
        replayAnimRef.current = null;
      }
      return;
    }
    const REPLAY_DELAY = 2000;
    replayStartRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - (replayStartRef.current ?? now);
      const progress = Math.min(elapsed / REPLAY_DELAY, 1);
      setReplayProgress(progress);
      if (progress < 1) {
        replayAnimRef.current = requestAnimationFrame(animate);
      } else {
        replayAnimRef.current = null;
        void startGame(gameMode);
      }
    };
    replayAnimRef.current = requestAnimationFrame(animate);
    return () => {
      if (replayAnimRef.current !== null) {
        cancelAnimationFrame(replayAnimRef.current);
        replayAnimRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  const startGame = async (mode: GameMode) => {
    setError(null);
    setGameMode(mode);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      await audioContext.resume();

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      setGameState('playing');
      setCurrentNoteIndex(0);
      setBricks([]);
      setInstability(0);
      setIsListening(true);
      setHoldProgress(0);
      setScore(0);
      setNoteScores([]);
      setIsPausedBetweenNotes(false);
      setIsAutoplayMode(false);
      setPauseAverageCents(0);
      holdStartRef.current = null;
      noteStartTimeRef.current = null;
      accumulatedInRangeRef.current = 0;
      noteSamplesRef.current = [];
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access and try again.');
      console.error(err);
    }
  };

  const startAutoplay = async () => {
    setIsAutoplayMode(true);
    autoplayNoteStartTimeRef.current = Date.now();
    const initialFrequency = targetFrequency;
    if (initialFrequency) {
      await playTone(initialFrequency, HOLD_DURATION / 1000);
    }
  };

  const stopAutoplay = () => {
    setIsAutoplayMode(false);
    if (autoplayTimeoutRef.current) {
      clearTimeout(autoplayTimeoutRef.current);
      autoplayTimeoutRef.current = null;
    }
  };

  const stopGame = useCallback(() => {
    setIsListening(false);
    setIsAutoplayMode(false);
    if (autoplayTimeoutRef.current) {
      clearTimeout(autoplayTimeoutRef.current);
      autoplayTimeoutRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
    }
  }, []);

  // Shared handler for adding a finished note (used by live and autoplay flows)
  const handleAddNote = useCallback((noteScore: number, error: number): boolean => {
    const angle = getAngleFromError(error);
    const color = getColorFromError(error);

    const newBrick = { index: bricks.length, error, angle, color, note: currentNote };
    const newInstability = instability + Math.abs(angle);

    setBricks(prev => [...prev, newBrick]);
    setInstability(newInstability);

    setNoteScores(prev => {
      const newScores = [...prev, noteScore];
      const total = newScores.reduce((a, b) => a + b, 0);
      const normalizedScore = Math.round((total / scale.notes.length) * 100);
      setScore(normalizedScore);
      return newScores;
    });

    if (newInstability >= COLLAPSE_THRESHOLD * scale.notes.length && !noCollapse) {
      setGameState('collapsed');
      setCollapseTime(Date.now());
      stopGame();
      return true; // ended
    }

    if (currentNoteIndex + 1 >= scale.notes.length) {
      setGameState('success');
      stopGame();
      return true; // ended
    }

    // Advance the display to the next note and enter pause between notes
    setCurrentNoteIndex(prev => prev + 1);
    setIsPausedBetweenNotes(true);
    pauseStartTimeRef.current = Date.now();
    holdStartRef.current = null;
    noteStartTimeRef.current = null;
    accumulatedInRangeRef.current = 0;
    noteSamplesRef.current = [];

    return false; // not ended
  }, [bricks.length, instability, scale, noCollapse, stopGame, currentNote, currentNoteIndex, COLLAPSE_THRESHOLD]);

  // Helper to accept a completed note (shared between practice and test modes)
  const acceptNote = useCallback(() => {
    // Use trimmed mean of absolute cents for robust error statistic
    const E = trimmedMeanAbs(noteSamplesRef.current, settings.trimTop);
    
    // Calculate tau and new score mapping
    const tau = settings.tauMultiplier * GOOD_THRESHOLD;
    const p = settings.scoreExponentP;
    const noteScore = Math.exp(-Math.pow(E / tau, p));
    
    // Calculate signed error for visuals (brick angle/color)
    const bias = noteSamplesRef.current.reduce((sum, c) => sum + c, 0);
    const sign = bias > 0 ? 1 : -1;
    const error = E * sign;
    const avgCentsForPauseDisplay = E * sign;
    
    // Debug logging for calibration (dev only)
    if (import.meta.env.DEV) {
      console.log('[Score Debug]', {
        sampleCount: noteSamplesRef.current.length,
        E: E.toFixed(2),
        tau: tau.toFixed(2),
        p: p,
        k: settings.tauMultiplier,
        trimTop: settings.trimTop,
        noteScore: noteScore.toFixed(4),
        error: error.toFixed(2),
      });
    }
    
    setPauseAverageCents(avgCentsForPauseDisplay);
    return handleAddNote(noteScore, error);
  }, [handleAddNote, settings.trimTop, settings.tauMultiplier, settings.scoreExponentP, GOOD_THRESHOLD]);

  // Advance autoplay to the next note
  const advanceAutoplayNote = useCallback((noteError: number) => {
    if (!isAutoplayMode) return;

    const nextIndex = currentNoteIndex + 1; // next note to play
    const ended = handleAddNote(0, noteError);
    if (ended) {
      setIsAutoplayMode(false);
      return;
    }

    // Prepare for next autoplay note
    autoplayNoteStartTimeRef.current = null;
    autoplayTimeoutRef.current = setTimeout(() => {
      setHoldProgress(0);
      autoplayNoteStartTimeRef.current = Date.now();
      const nextTargetFrequency = NOTE_FREQUENCIES[scale.notes[nextIndex]];
      if (nextTargetFrequency) {
        void playTone(nextTargetFrequency, HOLD_DURATION / 1000);
      }
    }, PAUSE_BETWEEN_NOTES);
  }, [isAutoplayMode, currentNoteIndex, scale, handleAddNote, HOLD_DURATION, PAUSE_BETWEEN_NOTES]);

  useEffect(() => {
    if (!isListening) return;

    // Cancel any orphaned timers before starting new loops
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (audioIntervalRef.current !== null) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }

    const pauseInRangeTimer = () => {
      if (noteStartTimeRef.current) {
        accumulatedInRangeRef.current += Date.now() - noteStartTimeRef.current;
        noteStartTimeRef.current = null;
      }
    };

    const resetForNextNote = () => {
      holdStartRef.current = null;
      noteStartTimeRef.current = null;
      accumulatedInRangeRef.current = 0;
      noteSamplesRef.current = [];
      latestHoldProgressRef.current = 0;
      setHoldProgress(0);
      setIsPausedBetweenNotes(false);
      setPauseAverageCents(0);
      pauseStartTimeRef.current = null;
    };

    // Flag to track if we've already accepted the note this cycle
    let noteAcceptedThisCycle = false;

    // HIGH-FREQUENCY AUDIO SAMPLING (runs every ~25ms regardless of rAF throttling)
    // This ensures pitch detection stays responsive even when iOS throttles animations
    const processAudio = () => {
      if (!analyserRef.current || !isListening || noteAcceptedThisCycle) return;

      // Handle autoplay note completion
      if (isAutoplayMode && autoplayNoteStartTimeRef.current) {
        const autoplayElapsed = Date.now() - autoplayNoteStartTimeRef.current;
        latestHoldProgressRef.current = Math.min(autoplayElapsed / HOLD_DURATION, 1);
        if (autoplayElapsed >= HOLD_DURATION) {
          const noteError = noteSamplesRef.current.length > 0 
            ? trimmedMeanAbs(noteSamplesRef.current, settings.trimTop) * (noteSamplesRef.current.reduce((sum, c) => sum + c, 0) > 0 ? 1 : -1)
            : 0;
          noteSamplesRef.current = [];
          noteAcceptedThisCycle = true;
          advanceAutoplayNote(noteError);
          autoplayNoteStartTimeRef.current = null;
          latestHoldProgressRef.current = 0;
          return;
        }
      }

      // Handle pause between notes
      if (isPausedBetweenNotes && pauseStartTimeRef.current) {
        const pauseElapsed = Date.now() - pauseStartTimeRef.current;
        if (pauseElapsed >= PAUSE_BETWEEN_NOTES) {
          resetForNextNote();
        }
        return;
      }

      const buffer = new Float32Array(analyserRef.current.fftSize);
      analyserRef.current.getFloatTimeDomainData(buffer);

      const pitch = autoCorrelate(buffer, audioContextRef.current!.sampleRate);

      if (isPausedBetweenNotes) return;

      if (pitch > 150 && pitch < 1500) {
        latestPitchRef.current = pitch;
        const cents = getCents(pitch, targetFrequency);
        latestCentsRef.current = cents;

        const withinSameNote = Math.abs(cents) < GAME_CONFIG.SAME_NOTE_THRESHOLD;

        if (withinSameNote) {
          noteSamplesRef.current.push(cents);

          if (!noteStartTimeRef.current) {
            noteStartTimeRef.current = Date.now();
          }

          if (gameMode === 'practice') {
            if (Math.abs(cents) < OK_THRESHOLD) {
              if (!holdStartRef.current) {
                holdStartRef.current = Date.now();
              }
              const holdTime = Date.now() - holdStartRef.current;
              if (!isAutoplayMode) {
                latestHoldProgressRef.current = Math.min(holdTime / HOLD_DURATION, 1);
              }

              if (holdTime >= HOLD_DURATION) {
                noteAcceptedThisCycle = true;
                acceptNote();
              }
            } else {
              holdStartRef.current = null;
              latestHoldProgressRef.current = 0;
            }
          } else {
            const elapsedInRange = accumulatedInRangeRef.current + (noteStartTimeRef.current ? Date.now() - noteStartTimeRef.current : 0);

            if (!isAutoplayMode) {
              latestHoldProgressRef.current = Math.min(elapsedInRange / HOLD_DURATION, 1);
            }
            if (elapsedInRange >= HOLD_DURATION) {
              noteAcceptedThisCycle = true;
              acceptNote();
            }
          }
        } else if (!isAutoplayMode) {
          pauseInRangeTimer();
          holdStartRef.current = null;
          latestHoldProgressRef.current = gameMode === 'test' ? Math.min(accumulatedInRangeRef.current / HOLD_DURATION, 1) : 0;
        }
      } else {
        latestPitchRef.current = null;
        if (!isAutoplayMode) {
          pauseInRangeTimer();
          holdStartRef.current = null;
          latestHoldProgressRef.current = gameMode === 'test' ? Math.min(accumulatedInRangeRef.current / HOLD_DURATION, 1) : 0;
        }
      }
    };

    // VISUAL UPDATE LOOP (rAF - may be throttled by iOS, but that's OK for visuals)
    // Reads from refs populated by the audio loop and updates React state for rendering
    const updateVisuals = () => {
      if (!isListening) return;

      // Sync ref values to React state for rendering
      setCurrentPitch(latestPitchRef.current);
      setCurrentCents(latestCentsRef.current);
      setHoldProgress(latestHoldProgressRef.current);

      animationRef.current = requestAnimationFrame(updateVisuals);
    };

    // Start both loops: audio at 40Hz (25ms), visuals at display refresh rate
    audioIntervalRef.current = setInterval(processAudio, 25);
    animationRef.current = requestAnimationFrame(updateVisuals);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
    };
  }, [isListening, targetFrequency, bricks, instability, currentNoteIndex, scale, stopGame, noCollapse, gameMode, noteScores, isPausedBetweenNotes, currentNote, isAutoplayMode, advanceAutoplayNote, handleAddNote, acceptNote, settings, OK_THRESHOLD, HOLD_DURATION, PAUSE_BETWEEN_NOTES]);

  // Version checking - periodically check for updates when on menu screen
  useEffect(() => {
    if (gameState !== 'menu') {
      return;
    }

    const currentBuildNumber = import.meta.env.VITE_BUILD_NUMBER || 'dev';
    
    const checkForUpdate = async () => {
      // Don't check in dev mode
      if (currentBuildNumber === 'dev') {
        return;
      }

      try {
        const baseUrl = import.meta.env.BASE_URL || '/';
        const versionUrl = `${baseUrl}version.json?t=${Date.now()}`; // Cache bust
        
        const response = await fetch(versionUrl, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!response.ok) {
          console.log('Version check failed - version.json not found');
          return;
        }

        const versionData = await response.json() as { buildNumber: string; buildDate: string; timestamp: number };
        const remoteBuildNumber = versionData.buildNumber;

        // Compare build numbers (they should be integers from GitHub run_number)
        const current = parseInt(currentBuildNumber, 10);
        const remote = parseInt(remoteBuildNumber, 10);

        if (!isNaN(remote) && !isNaN(current) && remote > current) {
          console.log(`Update available: ${current} -> ${remote}`);
          setUpdateAvailable(true);
        } else {
          console.log(`No update available (current: ${current}, remote: ${remote})`);
        }
      } catch (error) {
        console.log('Error checking for updates:', error);
      }
    };

    // Check immediately when menu loads
    void checkForUpdate();

    // Check every 5 minutes while on menu
    const interval = setInterval(() => void checkForUpdate(), 300000);

    return () => clearInterval(interval);
  }, [gameState]);

  const getTuningIndicator = (): TuningIndicator => {
    const displayCents = isPausedBetweenNotes ? pauseAverageCents : (isAutoplayMode && !currentPitch ? 0 : currentCents);
    const absDisplayCents = Math.abs(displayCents);
    if (!currentPitch && !isPausedBetweenNotes && !isAutoplayMode) return { word: 'Play the note...', number: '', color: '#888' };
    if (isAutoplayMode && !currentPitch) return { word: 'Good!', number: '(+0¢)', color: getColorFromError(0) };
    
    const sign = displayCents >= 0 ? '+' : '';
    const centText = `(${sign}${Math.round(displayCents)}¢)`;
    
    if (absDisplayCents < GOOD_THRESHOLD) {
      return { word: 'Good!', number: centText, color: getColorFromError(0) };
    }
    if (absDisplayCents < OK_THRESHOLD) {
      return { word: 'OK...', number: centText, color: getColorFromError(displayCents) };
    }
    if (displayCents > 0) {
      return { word: 'Sharp', number: centText, color: getColorFromError(displayCents) };
    }
    return { word: 'Flat', number: centText, color: getColorFromError(displayCents) };
  };

  const tuning = getTuningIndicator();

  // Menu screen
  if (gameState === 'menu') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 20,
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ flex: 1 }} />
        <h1 style={{ color: '#fff', fontSize: 32, marginBottom: 8 }}>🎻 Scale Tower</h1>
        <p style={{ color: '#94a3b8', marginBottom: 32, textAlign: 'center' }}>
          Play each note in tune to stack bricks.<br />
          Sloppy notes make the tower wobbly!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          <div>
            <label style={{ color: '#fff', display: 'block', marginBottom: 8 }}>Select Scale:</label>
            <select
              value={selectedScale}
              onChange={(e) => setSelectedScale(e.target.value)}
              style={{
                padding: '12px 24px',
                fontSize: 18,
                borderRadius: 8,
                border: 'none',
                background: '#334155',
                color: '#fff',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              {Object.keys(SCALES).filter(name => settings.enabledScales.includes(name)).map(name => (
                <option key={name} value={name}>{formatScaleName(name)}</option>
              ))}
            </select>
          </div>
          <label style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={noCollapse}
              onChange={(e) => {
                setNoCollapse(e.target.checked);
                const newSettings = { ...settings, noCollapse: e.target.checked };
                setSettings(newSettings);
                saveSettings(newSettings);
              }}
              style={{ width: 24, height: 24 }}
            />
            Keep tower from collapsing
          </label>
          <label style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={hideTunerWhenPlaying}
              onChange={(e) => {
                setHideTunerWhenPlaying(e.target.checked);
                const newSettings = { ...settings, hideTunerWhenPlaying: e.target.checked };
                setSettings(newSettings);
                saveSettings(newSettings);
              }}
              style={{ width: 24, height: 24 }}
            />
            Hide tuner when playing
          </label>
          <button
            onClick={() => setGameState('settings')}
            style={{
              marginTop: 8,
              padding: '8px 16px',
              fontSize: 18,
              borderRadius: 8,
              border: 'none',
              background: '#334155',
              color: '#fff',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            <span style={{ fontSize: 20 }}>⚙️</span> Settings
          </button>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <button
            onClick={() => void startGame('practice')}
            style={{
              flex: 1,
              width: 160,
              padding: '16px 24px',
              fontSize: 20,
              fontWeight: 'bold',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #22e55f 0%, #16c75c 100%)',
              color: '#fff',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(74, 222, 128, 0.4)',
            }}
          >
            Practice
          </button>
          <button
            onClick={() => void startGame('test')}
            style={{
              flex: 1,
              width: 160,
              padding: '16px 24px',
              fontSize: 20,
              fontWeight: 'bold',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#fff',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
            }}
          >
            Test
          </button>
        </div>

        {error && (
          <p style={{ color: '#f87171', marginTop: 16, textAlign: 'center' }}>{error}</p>
        )}

        <p style={{ color: '#64748b', marginTop: 32, fontSize: 14 }}>
          Requires microphone access
        </p>
        <div style={{ flex: 3 }} />

        <p style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>
          {import.meta.env.VITE_BUILD_NUMBER ? `v${import.meta.env.VITE_BUILD_NUMBER}` : 'dev'} • {__BUILD_DATE__}
        </p>

        {updateAvailable && (
          <div style={{
            marginBottom: 16,
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: 12,
            color: '#fff',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
            maxWidth: 320,
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
              🎉 Update Available!
            </div>
            <div style={{ fontSize: 14, marginBottom: 12 }}>
              A new version is available
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 24px',
                fontSize: 16,
                fontWeight: 'bold',
                borderRadius: 8,
                border: 'none',
                background: '#fff',
                color: '#059669',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              }}
            >
              Reload Now
            </button>
          </div>
        )}

        {isIPhoneNotStandalone() && (
          <div style={{
            position: 'fixed',
            bottom: 20,
            left: 20,
            right: 20,
            background: 'linear-gradient(135deg, #7594a2ff 0%, #416c74ff 100%)',
            padding: '12px 20px',
            borderRadius: 12,
            color: '#fff',
            fontSize: 14,
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)',
            maxWidth: 'calc(100% - 40px)',
          }}>
            <div>Install for full-screen benefits!</div>
            <div>Tap <svg style={{ display: 'inline-block', width: '1.5em', height: '1.5em', verticalAlign: 'middle', marginLeft: 4, marginRight: 4 }} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M5.5 23c-0.4 0 -0.75 -0.15 -1.05 -0.45 -0.3 -0.3 -0.45 -0.65 -0.45 -1.05V8.775c0 -0.4 0.15 -0.75 0.45 -1.05 0.3 -0.3 0.65 -0.45 1.05 -0.45h4.225v1.5H5.5V21.5h13V8.775h-4.275v-1.5H18.5c0.4 0 0.75 0.15 1.05 0.45 0.3 0.3 0.45 0.65 0.45 1.05V21.5c0 0.4 -0.15 0.75 -0.45 1.05 -0.3 0.3 -0.65 0.45 -1.05 0.45H5.5Zm5.725 -7.675V3.9l-2.2 2.2 -1.075 -1.075L11.975 1 16 5.025l-1.075 1.075 -2.2 -2.2v11.425h-1.5Z" stroke-width="0.5"></path>
            </svg> then "Add to Home Screen"</div>
          </div>
        )}
      </div>
    );
  }

  // Settings screen
  if (gameState === 'settings') {
    const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      saveSettings(newSettings);
      // If selected scale is no longer enabled, switch to first enabled
      if (key === 'enabledScales' && Array.isArray(value) && !value.includes(selectedScale)) {
        setSelectedScale(value[0] || 'G Major');
      }
    };

    const resetToDefaults = () => {
      setSettings({ ...DEFAULT_SETTINGS });
      saveSettings({ ...DEFAULT_SETTINGS });
      setSelectedScale(DEFAULT_SETTINGS.enabledScales[0]);
    };

    const toggleScale = (scaleName: string) => {
      const current = settings.enabledScales;
      if (current.includes(scaleName)) {
        // Don't allow disabling the last scale
        if (current.length > 1) {
          updateSetting('enabledScales', current.filter(s => s !== scaleName));
        }
      } else {
        updateSetting('enabledScales', [...current, scaleName]);
      }
    };

    // Helper to calculate slider position (0-100) from value
    const getSliderPercent = (value: number, min: number, max: number) => 
      ((value - min) / (max - min)) * 100;

    return (
      <div style={{
        minHeight: '100vh',
        maxHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 40,
        fontFamily: 'system-ui, sans-serif',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}>
        {/* Slider thumb styling for better touch targets on iOS */}
        <style>{`
          .settings-slider {
            -webkit-appearance: none;
            appearance: none;
            background: #475569;
            height: 8px;
            border-radius: 4px;
          }
          .settings-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid #fff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          }
          .settings-slider::-moz-range-thumb {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid #fff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          }
          .settings-slider::-moz-range-track {
            background: #475569;
            height: 8px;
            border-radius: 4px;
          }
        `}</style>
        <h1 style={{ color: '#fff', fontSize: 28, marginBottom: 24 }}>⚙️ Settings</h1>

        {/* Accuracy Slider (OK_THRESHOLD) */}
        <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
          <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>Accuracy Tolerance</span>
            <span style={{ color: '#94a3b8' }}>±{settings.okThreshold}¢</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#f87171', fontSize: 12 }}>Hard</span>
            <div style={{ flex: 1, position: 'relative', height: 24 }}>
              <input
                className="settings-slider"
                type="range"
                min={SETTINGS_RANGES.okThreshold.min}
                max={SETTINGS_RANGES.okThreshold.max}
                step={SETTINGS_RANGES.okThreshold.step}
                value={settings.okThreshold}
                onChange={(e) => updateSetting('okThreshold', Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              {/* Default marker */}
              <div style={{
                position: 'absolute',
                left: `${getSliderPercent(DEFAULT_SETTINGS.okThreshold, SETTINGS_RANGES.okThreshold.min, SETTINGS_RANGES.okThreshold.max)}%`,
                top: -4,
                width: 2,
                height: 8,
                background: '#64748b',
                pointerEvents: 'none',
              }} />
            </div>
            <span style={{ color: '#22e55f', fontSize: 12 }}>Easy</span>
          </div>
        </div>

        {/* Tower Stability Slider (COLLAPSE_THRESHOLD) */}
        <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
          <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>Tower Stability</span>
            <span style={{ color: '#94a3b8' }}>{settings.collapseThreshold} pts/note</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#f87171', fontSize: 12 }}>Hard</span>
            <div style={{ flex: 1, position: 'relative', height: 24 }}>
              <input
                className="settings-slider"
                type="range"
                min={SETTINGS_RANGES.collapseThreshold.min}
                max={SETTINGS_RANGES.collapseThreshold.max}
                step={SETTINGS_RANGES.collapseThreshold.step}
                value={settings.collapseThreshold}
                onChange={(e) => updateSetting('collapseThreshold', Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{
                position: 'absolute',
                left: `${getSliderPercent(DEFAULT_SETTINGS.collapseThreshold, SETTINGS_RANGES.collapseThreshold.min, SETTINGS_RANGES.collapseThreshold.max)}%`,
                top: -4,
                width: 2,
                height: 8,
                background: '#64748b',
                pointerEvents: 'none',
              }} />
            </div>
            <span style={{ color: '#22e55f', fontSize: 12 }}>Easy</span>
          </div>
        </div>

        {/* Hold Duration Slider */}
        <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
          <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>Hold Duration</span>
            <span style={{ color: '#94a3b8' }}>{settings.holdDuration}ms</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>Short</span>
            <div style={{ flex: 1, position: 'relative', height: 24 }}>
              <input
                className="settings-slider"
                type="range"
                min={SETTINGS_RANGES.holdDuration.min}
                max={SETTINGS_RANGES.holdDuration.max}
                step={SETTINGS_RANGES.holdDuration.step}
                value={settings.holdDuration}
                onChange={(e) => updateSetting('holdDuration', Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{
                position: 'absolute',
                left: `${getSliderPercent(DEFAULT_SETTINGS.holdDuration, SETTINGS_RANGES.holdDuration.min, SETTINGS_RANGES.holdDuration.max)}%`,
                top: -4,
                width: 2,
                height: 8,
                background: '#64748b',
                pointerEvents: 'none',
              }} />
            </div>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>Long</span>
          </div>
        </div>
        {/* Pause Between Notes Slider */}
        <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
          <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>Pause Between Notes</span>
            <span style={{ color: '#94a3b8' }}>{settings.pauseBetweenNotes}ms</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>Short</span>
            <div style={{ flex: 1, position: 'relative', height: 24 }}>
              <input
                className="settings-slider"
                type="range"
                min={SETTINGS_RANGES.pauseBetweenNotes.min}
                max={SETTINGS_RANGES.pauseBetweenNotes.max}
                step={SETTINGS_RANGES.pauseBetweenNotes.step}
                value={settings.pauseBetweenNotes}
                onChange={(e) => updateSetting('pauseBetweenNotes', Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{
                position: 'absolute',
                left: `${getSliderPercent(DEFAULT_SETTINGS.pauseBetweenNotes, SETTINGS_RANGES.pauseBetweenNotes.min, SETTINGS_RANGES.pauseBetweenNotes.max)}%`,
                top: -4,
                width: 2,
                height: 8,
                background: '#64748b',
                pointerEvents: 'none',
              }} />
            </div>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>Long</span>
          </div>
        </div>

        {/* Score Outlier Trim Slider */}
        <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
          <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>Trim worst samples</span>
            <span style={{ color: '#94a3b8' }}>{Math.round(settings.trimTop * 100)}%</span>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
            Remove outlier samples from scoring (higher = more forgiving)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>0%</span>
            <div style={{ flex: 1, position: 'relative', height: 24 }}>
              <input
                className="settings-slider"
                type="range"
                min={SETTINGS_RANGES.trimTop.min}
                max={SETTINGS_RANGES.trimTop.max}
                step={SETTINGS_RANGES.trimTop.step}
                value={settings.trimTop}
                onChange={(e) => updateSetting('trimTop', Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{
                position: 'absolute',
                left: `${getSliderPercent(DEFAULT_SETTINGS.trimTop, SETTINGS_RANGES.trimTop.min, SETTINGS_RANGES.trimTop.max)}%`,
                top: -4,
                width: 2,
                height: 8,
                background: '#64748b',
                pointerEvents: 'none',
              }} />
            </div>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>40%</span>
          </div>
        </div>

        {/* Score Curve Sharpness Slider */}
        <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
          <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>Curve shape (p)</span>
            <span style={{ color: '#94a3b8' }}>{settings.scoreExponentP.toFixed(2)}</span>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
            How sharply scores drop with error (higher = steeper penalty)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>Gentle</span>
            <div style={{ flex: 1, position: 'relative', height: 24 }}>
              <input
                className="settings-slider"
                type="range"
                min={SETTINGS_RANGES.scoreExponentP.min}
                max={SETTINGS_RANGES.scoreExponentP.max}
                step={SETTINGS_RANGES.scoreExponentP.step}
                value={settings.scoreExponentP}
                onChange={(e) => updateSetting('scoreExponentP', Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{
                position: 'absolute',
                left: `${getSliderPercent(DEFAULT_SETTINGS.scoreExponentP, SETTINGS_RANGES.scoreExponentP.min, SETTINGS_RANGES.scoreExponentP.max)}%`,
                top: -4,
                width: 2,
                height: 8,
                background: '#64748b',
                pointerEvents: 'none',
              }} />
            </div>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>Sharp</span>
          </div>
        </div>

        {/* Score Sensitivity Slider */}
        <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
          <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>Score tolerance (k×GOOD)</span>
            <span style={{ color: '#94a3b8' }}>
              k={settings.tauMultiplier.toFixed(1)} (τ={(settings.tauMultiplier * settings.okThreshold * 0.5).toFixed(1)}¢)
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
            Cents window for good scores (higher = more forgiving)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>Strict</span>
            <div style={{ flex: 1, position: 'relative', height: 24 }}>
              <input
                className="settings-slider"
                type="range"
                min={SETTINGS_RANGES.tauMultiplier.min}
                max={SETTINGS_RANGES.tauMultiplier.max}
                step={SETTINGS_RANGES.tauMultiplier.step}
                value={settings.tauMultiplier}
                onChange={(e) => updateSetting('tauMultiplier', Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{
                position: 'absolute',
                left: `${getSliderPercent(DEFAULT_SETTINGS.tauMultiplier, SETTINGS_RANGES.tauMultiplier.min, SETTINGS_RANGES.tauMultiplier.max)}%`,
                top: -4,
                width: 2,
                height: 8,
                background: '#64748b',
                pointerEvents: 'none',
              }} />
            </div>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>Forgiving</span>
          </div>
        </div>

        {/* Scale Selection */}
        <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
          <div style={{ color: '#fff', marginBottom: 12 }}>Enabled Scales</div>
          <div style={{ 
            background: 'rgba(255,255,255,0.05)', 
            borderRadius: 8, 
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {Object.keys(SCALES).map(scaleName => (
              <label 
                key={scaleName} 
                style={{ 
                  color: '#cbd5e1', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  cursor: 'pointer',
                  opacity: settings.enabledScales.length === 1 && settings.enabledScales.includes(scaleName) ? 0.5 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={settings.enabledScales.includes(scaleName)}
                  onChange={() => toggleScale(scaleName)}
                  disabled={settings.enabledScales.length === 1 && settings.enabledScales.includes(scaleName)}
                  style={{ width: 18, height: 18 }}
                />
                {formatScaleName(scaleName)}
              </label>
            ))}
          </div>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
            At least one scale must be enabled
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button
            onClick={resetToDefaults}
            style={{
              padding: '12px 24px',
              fontSize: 16,
              borderRadius: 8,
              border: 'none',
              background: '#475569',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Reset to Defaults
          </button>
          <button
            onClick={() => setGameState('menu')}
            style={{
              padding: '12px 24px',
              fontSize: 16,
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #22e55f 0%, #16c75c 100%)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // Game screen (playing, collapsed, or success)
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      boxSizing: 'border-box',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px',
      paddingTop: 'max(16px, env(safe-area-inset-top))',
      paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
      paddingLeft: 'max(16px, env(safe-area-inset-left))',
      paddingRight: 'max(16px, env(safe-area-inset-right))',
      fontFamily: 'system-ui, sans-serif',
      gap: 8,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: 24 }}>{formatScaleName(selectedScale)}</h2>
        <div style={{ color: '#22e55f', fontSize: 20, fontWeight: 'bold', marginTop: 4 }}>
          Score: {score}
        </div>
      </div>

      {/* Current note display */}
      {gameState === 'playing' && (
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: '4px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}>
          <p style={{ color: '#94a3b8', margin: '0 0 -32px 0', fontSize: 14 }}>
            Note {currentNoteIndex + 1} of {scale.notes.length}
          </p>
          {/* Top row: Note name and stave */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: 36, fontWeight: 'bold', minWidth: 80 }}>
                {currentNote ? formatNoteDisplay(currentNote) : ''}
              </div>
              <button
                onClick={() => void playTone(targetFrequency)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 30,
                  cursor: 'pointer',
                  padding: '8px',
                  marginTop: -12,
                  transition: 'transform 0.1s',
                }}
                onMouseDown={(e) => {
                  (e.target as HTMLElement).style.transform = 'scale(0.9)';
                }}
                onMouseUp={(e) => {
                  (e.target as HTMLElement).style.transform = 'scale(1)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.transform = 'scale(1)';
                }}
                title={`${Math.round(targetFrequency)} Hz`}
              >
                🔊
              </button>
            </div>
            {/* Stave display */}
            <StaveNoteDisplay note={currentNote} keySignature={getKeySignatureForScale(selectedScale)} />
          </div>

          {/* Bottom row: Tuning feedback and progress */}
          <div style={{ textAlign: 'center', marginTop: '-38px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: 150,
              color: (hideTunerWhenPlaying && !isPausedBetweenNotes && !isAutoplayMode) ? '#888' : tuning.color,
              fontSize: 18,
              fontWeight: 'bold',
            }}>
              <span>{(hideTunerWhenPlaying && !isPausedBetweenNotes && !isAutoplayMode) ? 'Play the note...' : tuning.word}</span>
              { !((hideTunerWhenPlaying && !isPausedBetweenNotes && !isAutoplayMode)) && tuning.number && <span style={{ fontFamily: 'monospace' }}>{tuning.number}</span>}
            </div>

            {/* Hold progress bar */}
            <div style={{
              width: 150,
              height: 8,
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 4,
              marginTop: 8,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${holdProgress * 100}%`,
                height: '100%',
                background: ((hideTunerWhenPlaying && !isPausedBetweenNotes && !isAutoplayMode) ? '#ffffff' : (gameMode === 'test' ? '#ffffff' : (isAutoplayMode ? '#a78bfa' : '#22e55f'))),
                transition: 'width 0.05s ease-out',
              }} />
            </div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
              {isAutoplayMode ? 'Autoplay...' : (gameMode === 'practice' ? 'Hold in tune...' : 'Playing note...')}
            </div>
          </div>
        </div>
      )}

      {/* Instability meter */}
      <div style={{
        width: '100%',
        maxWidth: 200,
        flexShrink: 0,
      }}>
        <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, textAlign: 'center' }}>
          Tower Wobble
        </div>
        <div style={{
          width: '100%',
          height: 12,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 6,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.min(100, (instability / (COLLAPSE_THRESHOLD * scale.notes.length)) * 100)}%`,
            height: '100%',
            background: getColorFromError(instability / (COLLAPSE_THRESHOLD * scale.notes.length ) * 50),
            transition: 'all 0.4s ease',
          }} />
        </div>
      </div>

      {/* Pitch indicator and Tower side by side - flex grow for spacing */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 16,
        flex: 1,
        minHeight: 100,
      }}>
        {/* Pitch indicator - always visible during gameplay */}
        {gameState === 'playing' && (
          <div style={{ opacity: (hideTunerWhenPlaying && !isPausedBetweenNotes) ? 0.3 : (isPausedBetweenNotes || currentPitch ? 1 : 0.3), flexShrink: 1}}>
            <PitchIndicator cents={(hideTunerWhenPlaying && !isPausedBetweenNotes) ? 0 : (isPausedBetweenNotes ? pauseAverageCents : (currentPitch ? currentCents : 0))} />
          </div>
        )}

        {/* Tower */}
        <div style={{
          position: 'relative',
          width: 140,
          height: 'auto',
          maxHeight: 350,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          flexShrink: 1,
        }}>
          {/* Ground */}
          <div style={{
            position: 'absolute',
            bottom: -10,
            width: 120,
            height: 20,
            background: 'linear-gradient(to top, #4a3728, #5c4333)',
            borderRadius: 4,
          }} />

          {/* Bricks */}
          {gameState === 'collapsed' ? (
            bricks.map((brick, i) => (
              <FallingBrick key={i} brick={brick} startTime={collapseTime!} />
            ))
          ) : (
            bricks.map((brick, i) => {
              const cumulativeError = bricks.slice(0, i).reduce((sum, b) => sum + b.error, 0);
              return (
                <Brick
                  key={i}
                  index={brick.index}
                  angle={brick.angle}
                  color={brick.color}
                  isLatest={i === bricks.length - 1}
                  cumulativeError={cumulativeError}
                  note={brick.note}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Game over states */}
      {gameState === 'collapsed' && (
        <div style={{
          textAlign: 'center',
          marginTop: 24,
        }}>
          <h2 style={{ color: '#f87171', fontSize: 28 }}>Tower Collapsed!</h2>
          <p style={{ color: '#94a3b8' }}>
            Made it to note {currentNoteIndex + 1} of {scale.notes.length}
          </p>
          <div style={{ color: '#fff', fontSize: 32, fontWeight: 'bold', marginTop: 8 }}>
            Final Score: {score}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16, maxWidth: 300 }}>
            <button
              onClick={() => setGameState('menu')}
              style={{
                flex: 1,
                width: '150px',
                padding: '12px 24px',
                fontSize: 16,
                borderRadius: 8,
                border: 'none',
                background: '#475569',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Menu
            </button>
            <button
              onClick={() => void startGame(gameMode)}
              style={{
                flex: 1,
                width: '150px',
                padding: '12px 24px',
                fontSize: 16,
                borderRadius: 8,
                border: 'none',
                background: `linear-gradient(to right, #f87171 ${replayProgress * 100}%, #475569 ${replayProgress * 100}%)`,
                color: '#fff',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {gameState === 'success' && (
        <div style={{
          textAlign: 'center',
          marginTop: 24,
        }}>
          <h2 style={{ color: '#22e55f', fontSize: 28 }}>🎉 Completed Scale!</h2>
          <p style={{ color: '#94a3b8' }}>
            Completed {selectedScale}
          </p>
          <div style={{ color: '#22e55f', fontSize: 36, fontWeight: 'bold', marginTop: 8 }}>
            Score: {score}
          </div>
          <p style={{ color: '#94a3b8', marginTop: 4 }}>
            Tower stability: {Math.round((1 - instability / (COLLAPSE_THRESHOLD * scale.notes.length)) * 100)}%
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16, maxWidth: 300 }}>
            <button
              onClick={() => setGameState('menu')}
              style={{
                flex: 1,
                width: '150px',
                padding: '12px 24px',
                fontSize: 16,
                borderRadius: 8,
                border: 'none',
                background: '#475569',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Menu
            </button>
            <button
              onClick={() => void startGame(gameMode)}
              style={{
                flex: 1,
                width: '150px',
                padding: '12px 24px',
                fontSize: 16,
                borderRadius: 8,
                border: 'none',
                background: `linear-gradient(to right, #22c55e ${replayProgress * 100}%, #475569 ${replayProgress * 100}%)`,
                color: '#fff',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Buttons during play */}
      {gameState === 'playing' && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16, maxWidth: 450, flexShrink: 0 }}>
          <button
            onClick={() => { stopGame(); setGameState('menu'); }}
            style={{
              flex: 1,
              width: '100px',
              padding: '12px 24px',
              fontSize: 16,
              borderRadius: 8,
              border: 'none',
              background: '#475569',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Menu
          </button>
          <button
            onClick={() => isAutoplayMode ? stopAutoplay() : void startAutoplay()}
            style={{
              flex: 1,
              width: '100px',
              padding: '12px 24px',
              fontSize: 16,
              borderRadius: 8,
              border: 'none',
              background: isAutoplayMode ? '#f59e0b' : '#10b981',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {isAutoplayMode ? 'Pause' : 'Autoplay'}
          </button>
          <button
            onClick={() => void startGame(gameMode)}
            style={{
              flex: 1,
              width: '100px',
              padding: '12px 24px',
              fontSize: 16,
              borderRadius: 8,
              border: 'none',
              background: '#3b82f6',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Restart
          </button>
        </div>
      )}
    </div>
  );
}

