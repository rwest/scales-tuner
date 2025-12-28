import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';

// Type definitions
type GameState = 'menu' | 'playing' | 'collapsed' | 'success';
type ScaleName = keyof typeof SCALES;

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
  angle: number;
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
  isLatest: boolean;
  opacity?: number;
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
  const c = new Array(buf2.length).fill(0);
  
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
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
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

// Play a tone with harmonic richness (sounds louder than pure sine wave)
function playTone(frequency: number, duration: number = 0.5): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContext.resume();
    
    const now = audioContext.currentTime;
    const endTime = now + duration;
    
    // Create multiple oscillators with different frequencies (harmonics) for richer sound
    const harmonics = [
      { frequency: frequency, volume: 0.3 },           // Fundamental
      { frequency: frequency * 2, volume: 0.15 },      // 2nd harmonic
      { frequency: frequency * 3, volume: 0.1 },       // 3rd harmonic
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
        background: 'linear-gradient(to bottom, #ef4444 0%, #f97316 20%, #facc15 40%, #22e55f 50%, #facc15 60%, #f97316 80%, #ef4444 100%)',
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
function Brick({ index, angle, isLatest, opacity = 1 }: BrickProps): ReactNode {
  const width = 60;
  const height = 16;
  const y = index * (height + 2);
  
  const hue = Math.max(0, 142 - Math.abs(angle) * 9.5);
  const saturation = 100; //Math.min(Math.abs(angle) * 3, 80);
  
  return (
    <div
      style={{
        position: 'absolute',
        bottom: y,
        left: '50%',
        width: width,
        height: height,
        backgroundColor: `hsl(${hue}, ${saturation}%, 45%)`,
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
    let frame: number;
    
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const gravity = 400;
      const horizontalSpeed = direction * 50 * Math.abs(brick.angle) / 10;
      
      setPos({
        x: horizontalSpeed * elapsed,
        y: startY - (gravity * elapsed * elapsed),
        rotation: brick.angle + direction * elapsed * 180,
      });
      
      if (elapsed < 2) {
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
        backgroundColor: 'hsl(0, 60%, 45%)',
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
  const [selectedScale, setSelectedScale] = useState<ScaleName>('G Major');
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
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const scale = SCALES[selectedScale];
  const currentNote = scale?.notes[currentNoteIndex];
  const targetFrequency = NOTE_FREQUENCIES[currentNote];

  const HOLD_DURATION = 750; // ms to hold note in tune
  const IN_TUNE_THRESHOLD = 18; // cents
  const COLLAPSE_THRESHOLD = 120; // instability points

  const startGame = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
      holdStartRef.current = null;
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
      audioContextRef.current.close();
    }
  }, []);

  const detectPitch = useCallback(() => {
    if (!analyserRef.current || !isListening) return;

    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);
    
    const pitch = autoCorrelate(buffer, audioContextRef.current!.sampleRate);
    
    if (pitch > 0 && pitch > 150 && pitch < 1500) {
      setCurrentPitch(pitch);
      const cents = getCents(pitch, targetFrequency);
      setCurrentCents(cents);
      
      // Check if in tune
      if (Math.abs(cents) < IN_TUNE_THRESHOLD) {
        if (!holdStartRef.current) {
          holdStartRef.current = Date.now();
        }
        const holdTime = Date.now() - holdStartRef.current;
        setHoldProgress(Math.min(holdTime / HOLD_DURATION, 1));
        
        if (holdTime >= HOLD_DURATION) {
          // Note accepted!
          const angle = cents * 1.5; // Convert cents to angle
          const newBrick = { index: bricks.length, angle };
          const newInstability = instability + Math.abs(angle);
          
          // Calculate score based on accuracy (max points per note)
          const maxPointsPerNote = 100 / scale.notes.length;
          const absCents = Math.abs(cents);
          let accuracy;
          if (absCents < 5) accuracy = 1.0;      // Perfect
          else if (absCents < 10) accuracy = 0.8; // Great
          else accuracy = 0.6;                    // Good
          const pointsEarned = maxPointsPerNote * accuracy;
          
          setBricks(prev => [...prev, newBrick]);
          setInstability(newInstability);
          setScore(prev => Math.round(prev + pointsEarned));
          setHoldProgress(0);
          holdStartRef.current = null;
          
          if (newInstability >= COLLAPSE_THRESHOLD && !noCollapse) {
            // Tower collapses!
            setGameState('collapsed');
            setCollapseTime(Date.now());
            stopGame();
            return;
          }
          
          if (currentNoteIndex + 1 >= scale.notes.length) {
            // Scale complete!
            setGameState('success');
            stopGame();
            return;
          }
          
          setCurrentNoteIndex(prev => prev + 1);
        }
      } else {
        holdStartRef.current = null;
        setHoldProgress(0);
      }
    } else {
      setCurrentPitch(null);
      holdStartRef.current = null;
      setHoldProgress(0);
    }
  }, [isListening, targetFrequency, bricks, instability, currentNoteIndex, scale, stopGame, noCollapse]);

  useEffect(() => {
    if (isListening) {
      animationRef.current = requestAnimationFrame(detectPitch);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isListening, detectPitch]);

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
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <label style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <input
            type="checkbox"
            checked={noCollapse}
            onChange={(e) => setNoCollapse(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          Keep tower from collapsing
        </label>
        
        <button
          onClick={startGame}
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
          Start
        </button>
        
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
        <h2 style={{ color: '#fff', margin: 0 }}>{selectedScale}</h2>
        <p style={{ color: '#94a3b8', margin: '4px 0' }}>
          Note {currentNoteIndex + 1} of {scale.notes.length}
        </p>
        <div style={{ color: '#22e55f', fontSize: 24, fontWeight: 'bold', marginTop: 8 }}>
          Score: {score}/100
        </div>
      </div>

      {/* Current note display */}
      {gameState === 'playing' && (
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: '16px 32px',
          marginBottom: 16,
          textAlign: 'center',
        }}>
          <div style={{ color: '#fff', fontSize: 48, fontWeight: 'bold' }}>
            {currentNote}
          </div>
          <button
            onClick={() => playTone(targetFrequency)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 32,
              cursor: 'pointer',
              padding: '8px',
              marginTop: 8,
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
          <div style={{ color: tuning.color, fontSize: 18, marginTop: 8, fontWeight: 'bold' }}>
            {tuning.text}
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
              background: holdProgress === 1 ? '#22e55f' : '#facc15',
              transition: 'width 0.05s linear',
            }} />
          </div>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
            Hold in tune...
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
            width: `${(1 - instability / COLLAPSE_THRESHOLD) * 100}%`,
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
          <div style={{ opacity: currentPitch ? 1 : 0.3 }}>
            <PitchIndicator cents={currentPitch ? currentCents : 0} />
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
            bricks.map((brick, i) => (
              <Brick
                key={i}
                index={brick.index}
                angle={brick.angle}
                isLatest={i === bricks.length - 1}
              />
            ))
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
              marginTop: 16,
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {gameState === 'success' && (
        <div style={{
          textAlign: 'center',
          marginTop: 24,
        }}>
          <h2 style={{ color: '#22e55f', fontSize: 28 }}>🎉 Perfect Scale!</h2>
          <p style={{ color: '#94a3b8' }}>
            Completed {selectedScale}
          </p>
          <div style={{ color: '#22e55f', fontSize: 36, fontWeight: 'bold', marginTop: 8 }}>
            Score: {score}/100
          </div>
          <p style={{ color: '#94a3b8', marginTop: 4 }}>
            Tower stability: {Math.round((1 - instability / COLLAPSE_THRESHOLD) * 100)}%
          </p>
          <button
            onClick={() => setGameState('menu')}
            style={{
              padding: '12px 32px',
              fontSize: 16,
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
              color: '#fff',
              cursor: 'pointer',
              marginTop: 16,
            }}
          >
            Play Again
          </button>
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

