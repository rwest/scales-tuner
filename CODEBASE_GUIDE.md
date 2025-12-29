# Scale Tuner - Codebase Guide

Welcome to the **Scale Tuner** project! This document provides a comprehensive overview of the project structure, architecture, and key concepts to help you get started quickly.

## 📋 Project Overview

**Scale Tuner** (also called "Scale Tower") is a browser-based violin tuner game built with React and Vite. Players practice musical scales by playing into their microphone, earning points for accurate intonation, and building a tower that collapses if their tuning becomes too inconsistent.

### Core Gameplay Loop
1. Player selects a scale and a mode (Practice or Test), and optionally enables "Keep tower from collapsing".
2. Game displays the target note on both a musical staff and as text with a play button.
3. Player performs the note on their instrument.
4. Real-time pitch detection measures accuracy in cents (100 cents = 1 semitone).
5. Visual pitch indicator shows tuning status with color gradient (red=sharp, green=in-tune, blue=flat).
6. Practice: hold in-tune for `HOLD_DURATION` to place a brick. Test: collect `HOLD_DURATION` of samples within `SAME_NOTE_THRESHOLD` and auto-advance.
7. Each brick's color and rotation reflects tuning accuracy.
8. Scores accumulate per note (mode-specific formulas) and normalize to a 100-point total.
9. Tower collapses if instability reaches 120 points (unless collapse disabled).
10. Completing all notes in the scale triggers success state with final score.

## 📁 Project Structure

```
scale-tuner/
├── public/                          # Static assets
├── src/
│   ├── violin-tuner-game.tsx       # Main game component
│   ├── App.jsx                     # React app wrapper
│   ├── main.jsx                    # React entry point
│   ├── App.css                     # App styling
│   ├── index.css                   # Global styles
│   └── assets/                     # Image/media assets
├── index.html                      # HTML entry point
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── vite.config.js                  # Vite build configuration
├── eslint.config.js                # ESLint configuration
└── README.md                       # User-facing documentation
```

## 🔧 Technology Stack

| Purpose | Technology |
|---------|-----------|
| **UI Framework** | React 19.2 |
| **Language** | TypeScript (with JSX/TSX support) |
| **Build Tool** | Vite 7.2 |
| **Audio API** | Web Audio API (native browser) |
| **Music Notation** | VexFlow (staff/note rendering) |
| **Linting** | ESLint 9 + TypeScript ESLint |

### Key Dependencies
- `react` & `react-dom`: UI framework
- `vite`: Lightning-fast dev server and build tool
- `vexflow`: Music notation rendering library for displaying notes on staff
- `@vitejs/plugin-react`: React integration for Vite
- `typescript`: Type safety

## 📄 Key Files Explained

### [src/violin-tuner-game.tsx](src/violin-tuner-game.tsx)
The heart of the application. This 967-line component contains:

#### **Type Definitions** (top of file)
- `GameState`: 'menu' | 'playing' | 'collapsed' | 'success'
- `GameMode`: 'practice' | 'test'
- `ScaleName`: Keys of the SCALES object
- `Brick`, `TuningIndicator`, `PitchIndicatorProps`, `BrickProps`, `FallingBrickProps`, `StaveNoteDisplayProps`

#### **Data Constants**
- `NOTE_FREQUENCIES`: Map of note names to Hz (e.g., 'A4': 440.00), includes sharps and flats
- `SCALES`: Predefined scale patterns with note sequences
  - G Major, G Minor Melodic, Bb Major, A Major, A Minor Melodic, D Major, Tonalization 1A
- `KEY_SIGNATURE_ACCIDENTALS`: Lookup for key signature accidentals in treble clef
- `IN_TUNE_THRESHOLD`: Cents window to accept a note as in-tune (default 18¢)
- `SAME_NOTE_THRESHOLD`: Cents window to recognize the same target note for timing/sampling (default 50¢)
- `HOLD_DURATION`: Milliseconds to collect/hold before advancing (default 750ms)

#### **Core Functions**

**Pitch Detection**
- `autoCorrelate()`: Implements autocorrelation algorithm for accurate pitch detection from audio buffer
  - Uses RMS (root mean square) to measure signal strength
  - Returns frequency in Hz or -1 if signal too weak

**Helper Functions**
- `getCents()`: Calculates cents difference between detected and target frequencies
- `getKeySignatureForScale()`: Maps scale names to VexFlow key signatures
- `formatNoteDisplay()`: Converts note names with sharps/flats to Unicode symbols (♯/♭)
- `getKeyAccidental()`: Determines if a note needs an accidental based on key signature

**UI Components**
- `StaveNoteDisplay`: React component that renders musical notation using VexFlow library
  - Shows current target note on a staff with correct key signature
  - Handles stem direction (notes above B4 have stems down)
  - Displays accidentals and respects key signatures
- `PitchIndicator`: Visual gradient bar showing pitch accuracy (red=sharp, green=in-tune, blue=flat)
- `Brick`: Individual brick component with color based on tuning accuracy
- `FallingBrick`: Animated brick component for tower collapse

**Audio Functions**
- `playTone()`: Generates reference tone using Web Audio API with multiple harmonics for richer sound

#### **Game Logic**
- **Accuracy Calculation**: Converts frequency to cents deviation from target note
- **Modes**:
  - **Practice**: Timer runs only while within `SAME_NOTE_THRESHOLD`. Advance when in-tune (within `IN_TUNE_THRESHOLD`) for `HOLD_DURATION`.
    - Per-note score: \(\exp\big(\!-\text{avg\_abs\_cents}/\text{IN\_TUNE\_THRESHOLD}\big)\) using samples collected while in-range.
  - **Test**: Collect samples for `HOLD_DURATION` while within `SAME_NOTE_THRESHOLD`, average absolute cents, then auto-advance (even if not in-tune).
    - Per-note score: \(\exp\big(\!-\text{avg\_abs\_cents}/\text{IN\_TUNE\_THRESHOLD}\big)\)
- **Score Normalization**: Sum per-note scores and normalize to a 100-point total across the scale.
- **Instability System**: Accumulates based on brick angle; collapses at 120 points (unless "Keep tower from collapsing" enabled).
- **Color System**: Bricks and pitch indicator use matching gradient (red→green→blue)
  - Sharp notes: Green (#22e55f) → Red (#ef4444)
  - Flat notes: Green (#22e55f) → Blue (#2a7afbff)
- **Tower Physics**: Bricks rotate based on placement accuracy (angle = cents × 1.5)

#### **Main Game Component Hooks**
- `useState`: Manages game state, current note, bricks array, instability, pitch, score
- `useRef`: Maintains references to AudioContext, AnalyserNode, animation frame, hold timer, media stream
- `useEffect`: Pitch detection loop runs continuously during gameplay
- `useCallback`: `stopGame()` cleanup function for audio resources

### [src/App.jsx](src/App.jsx)
Simple wrapper component that renders the main `ViolinTunerGame` component. Imports styles and provides the app structure.

### [src/main.jsx](src/main.jsx)
React entry point. Creates the root and renders the App component with StrictMode for development warnings.

### [src/index.css](src/index.css)
Global styles and CSS variables used throughout the app.

### [src/App.css](src/App.css)
Component-specific styling for the main app layout.

### [index.html](index.html)
HTML entry point with a `<div id="root">` where React mounts.

### [package.json](package.json)
- **name**: "scale-tuner"
- **scripts**:
  - `npm run dev`: Start Vite dev server (hot reload)
  - `npm run build`: Production build
  - `npm run lint`: Run ESLint
  - `npm run preview`: Preview production build locally

## 🎮 Game State Machine

```
menu → playing → (success | collapsed) → menu
```

- **menu**: Initial state; player selects scale
- **playing**: Active gameplay (Practice or Test)
- **success**: All notes completed successfully
- **collapsed**: Tower fell (unless safe mode enabled)

## 🔊 Audio Processing Pipeline

1. **Microphone Access**: On game start, requests user permission via `navigator.mediaDevices.getUserMedia()`
2. **AudioContext**: Created to access the user's audio input
3. **AnalyserNode**: Connected to microphone stream with FFT size of 2048
4. **Buffer Processing**: Audio samples collected every animation frame (~60fps)
5. **Pitch Detection**: `autoCorrelate()` function converts time-domain audio data to frequency
6. **Accuracy Calculation**: `getCents()` converts frequency to cents deviation from target
7. **Visual Feedback**: Pitch indicator, tuning text, and hold progress bar update in real-time
8. **Tone Generation**: `playTone()` creates reference pitches with multiple harmonics for richer sound

## 🎯 Key Concepts for Development

### Cents System
Cents measure pitch deviation: 100 cents = 1 semitone (half-step)
- Formula: `cents = 1200 * log₂(detectedFreq / targetFreq)`
- ±18 cents = "in-tune zone" (threshold to accept note)
- Used for: UI indicator, accuracy scoring, brick angle, instability calculation

### Scoring System
- Total: Normalize the sum of per-note scores to 100 points for the entire scale.
- Practice Mode per-note: \(\exp\big(\!-(\text{time\_taken} - \text{HOLD\_DURATION})/\text{HOLD\_DURATION}\big)\)
  - Timer runs only while within `SAME_NOTE_THRESHOLD` of the target.
  - Perfect at `HOLD_DURATION` ≈ 1.0; longer times reduce score exponentially.
- Test Mode per-note: \(\exp\big(\!-\text{avg\_abs\_cents}/\text{IN\_TUNE\_THRESHOLD}\big)\)
  - Averages absolute cents over `HOLD_DURATION` within `SAME_NOTE_THRESHOLD`.
  - Advances even if not within `IN_TUNE_THRESHOLD`.
- Final score displayed on success/collapse screens.

### Hold Duration System
- Practice: Must maintain in-tune pitch for `HOLD_DURATION` to lock a note (progress bar shows hold).
- Test: Collect `HOLD_DURATION` of samples while within `SAME_NOTE_THRESHOLD` (progress bar shows sampling window).
- Timing/sampling pauses if silent or playing outside `SAME_NOTE_THRESHOLD`.

### Note Frequencies
All frequencies follow standard 12-tone equal temperament tuning:
- A4 = 440 Hz (concert pitch)
- Octaves double the frequency
- 12 semitones per octave, each ~1.0595x previous

### Instability Meter
Accumulates based on brick placement accuracy:
- Each brick adds `Math.abs(angle)` to instability score
- Brick angle = cents × 1.5, so more out-of-tune = more instability
- Maximum instability threshold: 120 points
- Triggers tower collapse when exceeded (unless "Keep tower from collapsing" is checked)
- Visual indicator shows remaining stability with color coding:
  - Green (< 50 instability): Safe
  - Yellow (50-75 instability): Warning
  - Red (75+ instability): Danger

### Brick Tower
Visual representation of performance:
- Each brick = successfully locked note
- Brick color matches pitch indicator gradient:
  - Sharp: Green → Red interpolation
  - Flat: Green → Blue interpolation
  - Perfect: Pure green
- Brick rotation angle = cents × 1.5 (visual indication of accuracy)
- Latest brick highlighted with glow effect
- Tower collapse animation when instability exceeds threshold

### Music Notation Display
Uses VexFlow library to render proper musical notation:
- Shows current target note on treble clef staff
- Displays correct key signature for selected scale
- Handles accidentals (sharps, flats, naturals) properly
- Stem direction follows standard notation (stems down for notes above B4)
- Allows players to see "what it should look like" on sheet music

## 🚀 Getting Started for Contributors

### First Time Setup
```bash
npm install
npm run dev
```
Opens dev server at `http://localhost:5173` (or similar)

### Making Changes
1. **UI/Layout Changes**: Edit JSX in [violin-tuner-game.tsx](src/violin-tuner-game.tsx) (most styling is inline)
2. **Game Logic**: Edit state management and hooks in [violin-tuner-game.tsx](src/violin-tuner-game.tsx)
3. **Audio Algorithm**: Modify `autoCorrelate()` function for pitch detection
4. **Scales/Notes**: Update `SCALES` or `NOTE_FREQUENCIES` constants
5. **Key Signatures**: Update `KEY_SIGNATURE_ACCIDENTALS` and `getKeySignatureForScale()` function
6. **Visual Tuning**: Adjust `PitchIndicator` or `Brick` color calculations
7. **Music Notation**: Modify `StaveNoteDisplay` component (uses VexFlow API)

8. **Modes & Scoring**: Tweak `IN_TUNE_THRESHOLD`, `SAME_NOTE_THRESHOLD`, `HOLD_DURATION`, and scoring formulas in the pitch loop.

### Testing Changes
- Use `npm run dev` for hot-reload testing
- Desktop Chrome recommended (best audio API support)
- Allow microphone permissions when prompted

### Building for Production
```bash
npm run build
npm run preview
```

## 🔍 Debugging Tips

### Audio Issues
- Check browser console for errors: `F12 → Console`
- Verify microphone permission granted
- Test on Chrome (best Web Audio API support)
- Audio context may require user interaction; start button necessary

### Game Logic Issues
- Use React DevTools browser extension to inspect state
- Add `console.log()` in event handlers to trace execution
- Check `instability`, `currentNoteIndex`, and `gameState` values

### Styling Issues
- DevTools Inspector (F12 → Elements) to inspect DOM
- CSS Cascade: [App.css](src/App.css) overrides [index.css](src/index.css)
- React components may use inline styles or className attributes

## 📝 Common Tasks

### Adding a New Scale
1. Add note sequence to `SCALES` constant in [violin-tuner-game.tsx](src/violin-tuner-game.tsx)
2. Add key signature mapping in `getKeySignatureForScale()` function
3. Ensure all notes exist in `NOTE_FREQUENCIES`
4. Add any new accidentals to `KEY_SIGNATURE_ACCIDENTALS` if needed
5. Restart dev server to see in scale selector

### Adjusting In-Tune Window
Search for `IN_TUNE_THRESHOLD` constant in [violin-tuner-game.tsx](src/violin-tuner-game.tsx)
- Default: 18 cents
- Smaller = stricter tuning requirement
- Larger = more forgiving

### Changing Hold Duration
Search for `HOLD_DURATION` constant in [violin-tuner-game.tsx](src/violin-tuner-game.tsx)
- Default: 750ms
- Controls how long player must maintain in-tune pitch

### Changing Tower Collapse Behavior
Look for `COLLAPSE_THRESHOLD` constant in [violin-tuner-game.tsx](src/violin-tuner-game.tsx)
- Default: 120 instability points
- Higher = more forgiving (tower can handle more error)
- Lower = stricter (tower collapses sooner)

### Modifying Accuracy Scoring
Search for score calculation in the `detectPitchLoop` function.
- Practice: `exp(-(time_taken - HOLD_DURATION)/HOLD_DURATION)`
- Test: `exp(-avg_abs_cents/IN_TUNE_THRESHOLD)`
- Adjust denominators to make scoring more or less generous.

### Adjusting Color Scheme
- **Pitch Indicator gradient**: Edit CSS gradient in `PitchIndicator` component
- **Brick colors**: Modify RGB interpolation in `Brick` component
- Current scheme: Red (#ef4444) → Green (#22e55f) → Blue (#2a7afbff)

## 🎓 Architecture Patterns

- **Single Component**: Most logic in one TSX file for simplicity
- **React Hooks**: `useState`, `useRef`, `useEffect`, `useCallback` for state management
- **Type Safety**: Full TypeScript with interfaces for game data structures
- **No External UI Library**: Uses HTML/CSS for DOM rendering
- **Event-Driven**: Audio processing runs each animation frame for responsive feedback

## 📚 References

- [Web Audio API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [VexFlow Music Notation Library](https://www.vexflow.com/)
- [Autocorrelation for Pitch Detection](https://en.wikipedia.org/wiki/Autocorrelation#Application_to_pitch_detection)
- [Musical Cents System](https://en.wikipedia.org/wiki/Cent_(music))

---

**Last Updated**: December 28, 2025
