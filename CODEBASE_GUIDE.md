# Scale Tuner - Codebase Guide

Welcome to the **Scale Tuner** project! This document provides a comprehensive overview of the project structure, architecture, and key concepts to help you get started quickly.

## 📋 Project Overview

**Scale Tuner** (also called "Scale Tower") is a browser-based violin tuner game built with React and Vite. Players practice musical scales by playing into their microphone, earning points for accurate intonation, and building a tower that collapses if their tuning becomes too inconsistent.

### Links
- **Live Demo**: [https://rwest.github.io/scales-tuner/](https://rwest.github.io/scales-tuner/)
- **Repository**: [https://github.com/rwest/scales-tuner](https://github.com/rwest/scales-tuner)
- **Deployment**: Automatic via GitHub Actions on push to main branch

### Core Gameplay Loop
1. Player selects a scale and a mode (Practice or Test) from the menu.
2. Game displays the target note on both a musical staff and as text with a play button.
3. Player performs the note on their instrument.
4. Real-time pitch detection measures accuracy in cents (100 cents = 1 semitone).
5. Visual pitch indicator shows tuning status with color gradient (red=sharp, green=in-tune, blue=flat).
6. Practice mode: hold in-tune continuously to place a brick. Test mode: accumulate in-range time to auto-advance.
7. Each brick's color and rotation reflects tuning accuracy.
8. Scores accumulate per note and normalize to a 100-point total.
9. Tower collapses if instability exceeds the threshold (can be disabled in settings).
10. Completing all notes in the scale triggers success state with final score.

## 📁 Project Structure

```
scale-tuner/
├── .github/
│   ├── copilot-instructions.md     # AI agent instructions
│   └── workflows/
│       └── deploy.yml              # GitHub Actions deployment workflow
├── public/                          # Static assets
├── src/
│   ├── scales-tuner.tsx            # Main game component (~1800 lines)
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
| **UI Framework** | React 19 |
| **Language** | TypeScript (with JSX/TSX support) |
| **Build Tool** | Vite |
| **Audio API** | Web Audio API (native browser) |
| **Music Notation** | VexFlow (staff/note rendering) |
| **Linting** | ESLint + TypeScript ESLint |

## 📄 Key Files Explained

### [src/scales-tuner.tsx](src/scales-tuner.tsx)
The heart of the application. This single-file component contains all game logic, UI, and audio processing.

#### **Type Definitions**
- `GameState`: 'menu' | 'settings' | 'playing' | 'collapsed' | 'success'
- `GameMode`: 'practice' | 'test'
- `GameSettings`: User-configurable options (thresholds, durations, enabled scales)
- `Brick`, `TuningIndicator`, and various component prop interfaces

#### **Settings System**
The game has a **Settings screen** where users can customize:
- **OK Threshold**: Cents window to accept a note (affects difficulty)
- **Collapse Threshold**: Instability budget per note before tower falls
- **Hold Duration**: How long to hold a note before it locks
- **Pause Between Notes**: Delay after each note
- **Trim worst samples**: Fraction of outlier samples to remove from scoring (0-40%)
- **Curve shape (p)**: How sharply scores drop with error (1.0-4.0)
- **Score tolerance (k×GOOD)**: Cents window for good scores (1.0-3.0 multiplier)
- **Enabled Scales**: Which scales appear in the dropdown
- **Toggle options**: "Keep tower from collapsing", "Hide tuner when playing"

Settings are persisted to `localStorage` under the key `scaleTowerSettings`.

#### **Data Constants**
- `NOTE_FREQUENCIES`: Map of note names to Hz (A4 = 440 Hz standard)
- `SCALES`: Predefined scale patterns with note sequences
- `KEY_SIGNATURE_ACCIDENTALS`: Lookup for key signature accidentals
- `DEFAULT_SETTINGS`: Default values for all configurable options
- `SETTINGS_RANGES`: Min/max/step for each configurable slider
- `GAME_CONFIG.SAME_NOTE_THRESHOLD`: Non-configurable cents window (50¢) for recognizing same target note

#### **Core Functions**
- `autoCorrelate()`: Autocorrelation pitch detection from audio buffer
- `getCents()`: Calculate cents difference between frequencies
- `trimmedMeanAbs()`: Compute trimmed mean of absolute cents (robust error statistic)
- `getColorFromError()`: Map cents deviation to RGB color
- `getAngleFromError()`: Map cents deviation to brick rotation angle
- `getKeySignatureForScale()`: Map scale names to VexFlow key signatures
- `playTone()`: Generate reference tone with harmonics

#### **UI Components**
- `StaveNoteDisplay`: VexFlow music notation rendering
- `PitchIndicator`: Visual gradient bar for pitch accuracy
- `Brick`: Individual tower brick with color/rotation
- `FallingBrick`: Animated brick for collapse effect

### Other Files
- **[src/App.jsx](src/App.jsx)**: Wrapper that renders `ViolinTunerGame`
- **[src/main.jsx](src/main.jsx)**: React entry point with StrictMode
- **[index.html](index.html)**: HTML entry with `<div id="root">`

## 🎮 Game State Machine

```
menu ↔ settings
  ↓
playing → (success | collapsed) → menu
```

- **menu**: Scale/mode selection
- **settings**: User preferences configuration
- **playing**: Active gameplay
- **success**: All notes completed
- **collapsed**: Tower fell (unless disabled)

## 🔊 Audio Processing

1. Request microphone via `getUserMedia()`
2. Create `AudioContext` and `AnalyserNode` (FFT size 2048)
3. Audio loop runs at ~40Hz via `setInterval` for consistent pitch detection
4. Visual updates run via `requestAnimationFrame` (may be throttled on iOS)
5. `autoCorrelate()` converts time-domain audio to frequency
6. `getCents()` calculates deviation from target note

## 🎯 Key Concepts

### Cents System
- 100 cents = 1 semitone
- Formula: `cents = 1200 * log₂(detectedFreq / targetFreq)`
- Positive = sharp, negative = flat

### Scoring
- **Robust Error Statistic**: Uses trimmed mean of absolute cents (E) to reduce impact of outliers
  - By default, trims top 20% of worst samples
  - Always keeps at least 1 sample to avoid edge cases
- **Two-part scoring** per note: `pts = A × exp(-(E/τ_acc)^p) + B × log(1 + (τ_bonus/(E+ε))^q)`
  - **Accuracy term** (bounded): `A × exp(-(E/τ_acc)^p)` where `τ_acc = k × GOOD_THRESHOLD`
  - **Precision bonus** (unbounded, diminishing returns): `B × log(1 + (τ_bonus/(E+ε))^q)`
  - `GOOD_THRESHOLD = OK_THRESHOLD × 0.5`
- **Configurable parameters** in Settings:
  - `trimTop`: Fraction of outliers to trim (0.0-0.4, default 0.2)
  - `scoreExponentP` (p): Curve sharpness (1.0-4.0, default 2)
  - `tauMultiplier` (k): Score tolerance multiplier (1.0-3.0, default 1.8)
  - `basePointsPerNote` (A): Base accuracy points per note (200-3000, default 1000)
  - `bonusWeight` (B): Precision bonus weight (0-1000, default 200, 0 disables)
  - `bonusTauMultiplier`: Bonus tau multiplier (0.5-3.0, default 1.0)
  - `bonusEpsilonCents` (ε): Stability constant (0.5-5.0, default 1.5)
  - `bonusExponentQ` (q): Bonus curve exponent (0.5-2.0, default 1.0)
- Total score is the **sum** of per-note points (unbounded integer)
- **Design Goal**: Good midrange discrimination (5-20¢) with headroom for experts near 0¢

### Instability & Tower
- Each brick adds `abs(angle)` to instability (angle = cents × 1.5)
- Collapse when instability ≥ threshold × note count
- Brick colors: Green (in-tune) → Red (sharp) or Blue (flat)

## 🚀 Getting Started

```bash
npm install
npm run dev     # Dev server at localhost:5173
npm run build   # Production build
npm run lint    # Run ESLint
npm run preview # Preview production build
```

## 📝 Common Tasks

### Adding a New Scale
1. Add notes to `SCALES` object
2. Add key signature to `getKeySignatureForScale()`
3. Add key signature accidentals to `KEY_SIGNATURE_ACCIDENTALS` if the key is new
4. Ensure notes exist in `NOTE_FREQUENCIES`
5. Add to `DEFAULT_SETTINGS.enabledScales`

### Adjusting Defaults
Edit `DEFAULT_SETTINGS` for default values, or `SETTINGS_RANGES` for slider limits.

### Modifying Color Scheme
Edit `getColorFromError()` for brick/indicator colors.

## 🔍 Debugging

- **Console**: Check browser DevTools for audio errors
- **React DevTools**: Inspect `gameState`, `settings`, `bricks`, `instability`
- **Audio issues**: Verify microphone permission, test on Chrome

## Deployment

Automatic via GitHub Actions on push to `main`.

## 📚 References

- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [VexFlow](https://www.vexflow.com/)
- [Autocorrelation Pitch Detection](https://en.wikipedia.org/wiki/Autocorrelation#Application_to_pitch_detection)
- [Musical Cents](https://en.wikipedia.org/wiki/Cent_(music))

---

**Last Updated**: January 21, 2026
