import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import Vex from 'vexflow';

// Type definitions
type GameState = 'menu' | 'playing' | 'collapsed' | 'success';
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
}

interface TuningIndicator {
  text: string;
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
}

interface FallingBrickProps {
  brick: Brick;
  startTime: number;
}

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
    notes: ['G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5'],
  },
  'G Minor Melodic': {
    notes: ['G3', 'A3', 'Bb3', 'C4', 'D4', 'E4', 'F#4', 'G4', 'A4', 'Bb4', 'C5', 'D5', 'E5', 'F#5', 'G5'],
  },
  'Bb Major': {
    notes: ['Bb3', 'C4', 'D4', 'Eb4', 'F4', 'G4', 'A4', 'Bb4', 'C5', 'D5', 'Eb5', 'F5', 'G5', 'A5', 'Bb5'],
  },
  'A Major': {
    notes: ['A3', 'B3', 'C#4', 'D4', 'E4', 'F#4', 'G#4', 'A4', 'B4', 'C#5', 'D5', 'E5', 'F#5', 'G#5', 'A5'],
  },
  'A Minor Melodic': {
    notes: ['A3', 'B3', 'C4', 'D4', 'E4', 'F#4', 'G#4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G#5', 'A5'],
  },
  'D Major': {
    notes: ['D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5', 'D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6', 'D6'],
  },
  'Tonalization 1A': {
    notes: ['G4', 'B4', 'D5', 'G5', 'A5', 'B5', 'A5', 'G5', 'D5', 'E5', 'D5', 'B4', 'G4'],
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

function averageAbsoluteCents(samples: number[]): number {
  return samples.length
    ? samples.reduce((sum, c) => sum + Math.abs(c), 0) / samples.length
    : 0;
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
    'Tonalization 1A': 'G',
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

// Key signature accidentals lookup (treble clef)
const KEY_SIGNATURE_ACCIDENTALS: Record<string, Record<string, '#' | 'b'>> = {
  // Sharps
  'G': { F: '#' },
  'D': { F: '#', C: '#' },
  'A': { F: '#', C: '#', G: '#' },
  // Flats
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
async function playTone(frequency: number, duration: number = 0.5): Promise<void> {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    await audioContext.resume();

    const now = audioContext.currentTime;
    const endTime = now + duration;

    // Create multiple oscillators with different frequencies (harmonics) for richer sound
    const harmonics = [
      { frequency: frequency, volume: 0.3 },           // Fundamental
      { frequency: frequency * 2.005, volume: 0.15 },      // 2nd harmonic
      { frequency: frequency * 3.01, volume: 0.1 },       // 3rd harmonic
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
        transition: 'top 0.1s ease-out',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}

// Brick component
function Brick({ index, angle, isLatest, opacity = 1, color, cumulativeError = 0 }: BrickProps): ReactNode {
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
      }}
    />
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
      }}
    />
  );
}

// Main game component
export default function ViolinTunerGame(): ReactNode {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('practice');
  const [selectedScale, setSelectedScale] = useState<string>('G Major');
  const [currentNoteIndex, setCurrentNoteIndex] = useState<number>(0);
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [instability, setInstability] = useState<number>(0);
  const [currentPitch, setCurrentPitch] = useState<number | null>(null);
  const [currentCents, setCurrentCents] = useState<number>(0);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [collapseTime, setCollapseTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noCollapse, setNoCollapse] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [noteScores, setNoteScores] = useState<number[]>([]);
  const [isPausedBetweenNotes, setIsPausedBetweenNotes] = useState<boolean>(false);
  const [pauseAverageCents, setPauseAverageCents] = useState<number>(0);
  const [hideTunerWhenPlaying, setHideTunerWhenPlaying] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const noteStartTimeRef = useRef<number | null>(null);
  const accumulatedInRangeRef = useRef<number>(0);
  const noteSamplesRef = useRef<number[]>([]);
  const pauseStartTimeRef = useRef<number | null>(null);

  const scale = SCALES[selectedScale];
  const currentNote = scale?.notes[currentNoteIndex];
  const targetFrequency = NOTE_FREQUENCIES[currentNote];

  const HOLD_DURATION = 750; // ms to hold note in tune
  const IN_TUNE_THRESHOLD = 18; // cents
  const SAME_NOTE_THRESHOLD = 50; // cents - for recognizing correct note
  const COLLAPSE_THRESHOLD = 120; // instability points
  const PAUSE_BETWEEN_NOTES = 600; // ms to pause and show average pitch after note accepted

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

  const stopGame = useCallback(() => {
    setIsListening(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
    }
  }, []);

  useEffect(() => {
    if (!isListening) return;

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
      setHoldProgress(0);
      setIsPausedBetweenNotes(false);
      setPauseAverageCents(0);
      pauseStartTimeRef.current = null;
    };

    const addNoteResult = (noteScore: number, error: number) => {
      const angle = getAngleFromError(error);
      const color = getColorFromError(error);
      const newBrick = { index: bricks.length, error, angle, color };
      const newInstability = instability + Math.abs(angle);

      setBricks(prev => [...prev, newBrick]);
      setInstability(newInstability);
      setNoteScores(prev => [...prev, noteScore]);

      const totalScore = [...noteScores, noteScore].reduce((a, b) => a + b, 0);
      const normalizedScore = Math.round((totalScore / scale.notes.length) * 100);
      setScore(normalizedScore);

      // Calculate average cents for display during pause
      const avgCents = averageAbsoluteCents(noteSamplesRef.current) * (noteSamplesRef.current.reduce((sum, c) => sum + c, 0) > 0 ? 1 : -1);
      setPauseAverageCents(avgCents);

      if (newInstability >= COLLAPSE_THRESHOLD && !noCollapse) {
        setGameState('collapsed');
        setCollapseTime(Date.now());
        stopGame();
        return;
      }

      if (currentNoteIndex + 1 >= scale.notes.length) {
        setGameState('success');
        stopGame();
        return;
      }

      // Start pause before advancing to next note
      setIsPausedBetweenNotes(true);
      pauseStartTimeRef.current = Date.now();
      holdStartRef.current = null;
      noteStartTimeRef.current = null;
      accumulatedInRangeRef.current = 0;
      noteSamplesRef.current = [];
    };

    const detectPitchLoop = () => {
      if (!analyserRef.current || !isListening) return;

      // Handle pause between notes
      if (isPausedBetweenNotes && pauseStartTimeRef.current) {
        const pauseElapsed = Date.now() - pauseStartTimeRef.current;
        if (pauseElapsed >= PAUSE_BETWEEN_NOTES) {
          // Advance to next note
          resetForNextNote();
          setCurrentNoteIndex(prev => prev + 1);
        } else {
          // Still paused, keep showing pitch indicator with average cents
          animationRef.current = requestAnimationFrame(detectPitchLoop);
          return;
        }
      }

      const buffer = new Float32Array(analyserRef.current.fftSize);
      analyserRef.current.getFloatTimeDomainData(buffer);

      const pitch = autoCorrelate(buffer, audioContextRef.current!.sampleRate);

      // Skip pitch processing during pause
      if (isPausedBetweenNotes) {
        animationRef.current = requestAnimationFrame(detectPitchLoop);
        return;
      }

      if (pitch > 0 && pitch > 150 && pitch < 1500) {
        setCurrentPitch(pitch);
        const cents = getCents(pitch, targetFrequency);
        setCurrentCents(cents);

        const withinSameNote = Math.abs(cents) < SAME_NOTE_THRESHOLD;

        if (withinSameNote) {
          // Start timing if not already started
          if (!noteStartTimeRef.current) {
            noteStartTimeRef.current = Date.now();
          }

          if (gameMode === 'practice') {
            // Practice mode: check if in tune
            noteSamplesRef.current.push(cents);

            if (Math.abs(cents) < IN_TUNE_THRESHOLD) {
              if (!holdStartRef.current) {
                holdStartRef.current = Date.now();
              }
              const holdTime = Date.now() - holdStartRef.current;
              setHoldProgress(Math.min(holdTime / HOLD_DURATION, 1));

              if (holdTime >= HOLD_DURATION) {
                // Note accepted!
                const avgAbsCents = averageAbsoluteCents(noteSamplesRef.current);
                const noteScore = Math.exp(-avgAbsCents / IN_TUNE_THRESHOLD);

                const bias = noteSamplesRef.current.reduce((sum, c) => sum + c, 0);
                const error = avgAbsCents * (bias > 0 ? 1 : -1);
                addNoteResult(noteScore, error);
              }
            } else {
              holdStartRef.current = null;
              setHoldProgress(0);
            }
          } else {
            // Test mode: collect samples
            const elapsedInRange = accumulatedInRangeRef.current + (noteStartTimeRef.current ? Date.now() - noteStartTimeRef.current : 0);
            noteSamplesRef.current.push(cents);
            setHoldProgress(Math.min(elapsedInRange / HOLD_DURATION, 1));

            if (elapsedInRange >= HOLD_DURATION) {
              // Calculate average error
              const avgAbsCents = averageAbsoluteCents(noteSamplesRef.current);
              const noteScore = Math.exp(-avgAbsCents / IN_TUNE_THRESHOLD);

              const bias = noteSamplesRef.current.reduce((sum, c) => sum + c, 0);
              const error = avgAbsCents * (bias > 0 ? 1 : -1);
              addNoteResult(noteScore, error);
            }
          }
        } else {
          // Outside SAME_NOTE_THRESHOLD - pause timers, keep samples
          pauseInRangeTimer();
          holdStartRef.current = null;
          setHoldProgress(gameMode === 'test' ? Math.min(accumulatedInRangeRef.current / HOLD_DURATION, 1) : 0);
        }
      } else {
        setCurrentPitch(null);
        pauseInRangeTimer();
        holdStartRef.current = null;
        setHoldProgress(gameMode === 'test' ? Math.min(accumulatedInRangeRef.current / HOLD_DURATION, 1) : 0);
      }

      animationRef.current = requestAnimationFrame(detectPitchLoop);
    };

    animationRef.current = requestAnimationFrame(detectPitchLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isListening, targetFrequency, bricks, instability, currentNoteIndex, scale, stopGame, noCollapse, gameMode, noteScores, isPausedBetweenNotes, PAUSE_BETWEEN_NOTES]);

  const getTuningIndicator = (): TuningIndicator => {
    if (!currentPitch) return { text: 'Play the note...', color: '#888' };
    if (Math.abs(currentCents) < IN_TUNE_THRESHOLD) return { text: '✓ In Tune!', color: '#22e55f' };
    if (currentCents > 0) return { text: `Sharp (+${Math.round(currentCents)}¢)`, color: '#f97316' };
    return { text: `Flat (${Math.round(currentCents)}¢)`, color: '#3b82f6' };
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
        justifyContent: 'center',
        padding: 20,
        fontFamily: 'system-ui, sans-serif',
      }}>
        <h1 style={{ color: '#fff', fontSize: 32, marginBottom: 8 }}>🎻 Scale Tower</h1>
        <p style={{ color: '#94a3b8', marginBottom: 32, textAlign: 'center' }}>
          Play each note in tune to stack bricks.<br />
          Sloppy notes make the tower wobbly!
        </p>

        <div style={{ marginBottom: 24 }}>
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
            }}
          >
            {Object.keys(SCALES).map(name => (
              <option key={name} value={name}>{formatScaleName(name)}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          <label style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={noCollapse}
              onChange={(e) => setNoCollapse(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            Keep tower from collapsing
          </label>
          <label style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={hideTunerWhenPlaying}
              onChange={(e) => setHideTunerWhenPlaying(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            Hide tuner when playing
          </label>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <button
            onClick={() => void startGame('practice')}
            style={{
              padding: '16px 48px',
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
              padding: '16px 48px',
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
      </div>
    );
  }

  // Game screen (playing, collapsed, or success)
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: 20,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h2 style={{ color: '#fff', margin: 0 }}>{formatScaleName(selectedScale)}</h2>
        <div style={{ color: '#22e55f', fontSize: 24, fontWeight: 'bold', marginTop: 8 }}>
          Score: {score}/100
        </div>
      </div>

      {/* Current note display */}
      {gameState === 'playing' && (
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: '8px 32px',
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}>
          <p style={{ color: '#94a3b8', margin: '4px 0 -32px 0' }}>
            Note {currentNoteIndex + 1} of {scale.notes.length}
          </p>
          {/* Top row: Note name and stave */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: 48, fontWeight: 'bold', minWidth: 100 }}>
                {currentNote ? formatNoteDisplay(currentNote) : ''}
              </div>
              <button
                onClick={() => void playTone(targetFrequency)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 32,
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
          <div style={{ textAlign: 'center', marginTop: '-32px' }}>
            <div style={{ color: hideTunerWhenPlaying && !isPausedBetweenNotes ? '#888' : tuning.color, fontSize: 18, fontWeight: 'bold' }}>
              {hideTunerWhenPlaying && !isPausedBetweenNotes ? 'Play the note...' : tuning.text}
            </div>

            {/* Hold progress bar */}
            <div style={{
              width: 150,
              height: 8,
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 4,
              marginTop: 12,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${holdProgress * 100}%`,
                height: '100%',
                background: (hideTunerWhenPlaying && !isPausedBetweenNotes) ? '#ffffff' : (gameMode === 'test' ? '#ffffff' : '#22e55f'),
                transition: 'width 0.05s linear',
              }} />
            </div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
              {gameMode === 'practice' ? 'Hold in tune...' : 'Playing note...'}
            </div>
          </div>
        </div>
      )}

      {/* Instability meter */}
      <div style={{
        width: 200,
        marginBottom: 16,
      }}>
        <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, textAlign: 'center' }}>
          Tower Stability
        </div>
        <div style={{
          width: '100%',
          height: 12,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 6,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.max(0, (1 - instability / COLLAPSE_THRESHOLD) * 100)}%`,
            height: '100%',
            background: instability < 50 ? '#22e55f' : instability < 75 ? '#facc15' : '#f87171',
            transition: 'all 0.3s ease',
          }} />
        </div>
      </div>

      {/* Pitch indicator and Tower side by side */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 24,
        marginBottom: 16,
      }}>
        {/* Pitch indicator - always visible during gameplay */}
        {gameState === 'playing' && (
          <div style={{ opacity: (hideTunerWhenPlaying && !isPausedBetweenNotes) ? 0.3 : (isPausedBetweenNotes || currentPitch ? 1 : 0.3) }}>
            <PitchIndicator cents={(hideTunerWhenPlaying && !isPausedBetweenNotes) ? 0 : (isPausedBetweenNotes ? pauseAverageCents : (currentPitch ? currentCents : 0))} />
          </div>
        )}

        {/* Tower */}
        <div style={{
          position: 'relative',
          width: 200,
          height: 350,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}>
          {/* Ground */}
          <div style={{
            position: 'absolute',
            bottom: -10,
            width: 180,
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
            Final Score: {score}/100
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
            <button
              onClick={() => void startGame(gameMode)}
              style={{
                padding: '12px 32px',
                fontSize: 16,
                borderRadius: 8,
                border: 'none',
                background: '#f87171',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => setGameState('menu')}
              style={{
                padding: '12px 32px',
                fontSize: 16,
                borderRadius: 8,
                border: 'none',
                background: '#475569',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Back to Menu
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
            Score: {score}/100
          </div>
          <p style={{ color: '#94a3b8', marginTop: 4 }}>
            Tower stability: {Math.round((1 - instability / COLLAPSE_THRESHOLD) * 100)}%
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
            <button
              onClick={() => void startGame(gameMode)}
              style={{
                padding: '12px 32px',
                fontSize: 16,
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Play Again
            </button>
            <button
              onClick={() => setGameState('menu')}
              style={{
                padding: '12px 32px',
                fontSize: 16,
                borderRadius: 8,
                border: 'none',
                background: '#475569',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}

      {/* Back button during play */}
      {gameState === 'playing' && (
        <button
          onClick={() => { stopGame(); setGameState('menu'); }}
          style={{
            padding: '8px 16px',
            fontSize: 14,
            borderRadius: 6,
            border: 'none',
            background: 'rgba(255,255,255,0.1)',
            color: '#94a3b8',
            cursor: 'pointer',
            marginTop: 24,
          }}
        >
          ← Back to Menu
        </button>
      )}
    </div>
  );
}

