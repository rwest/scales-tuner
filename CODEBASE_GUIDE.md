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
│   ├── types.ts                    # All shared interfaces and type aliases
│   ├── constants.ts                # GAME_CONFIG, MULTIPLIER_TIERS
│   ├── audio/
│   │   ├── pitchDetection.ts       # autoCorrelate, getCents
│   │   └── playTone.ts             # playTone
│   ├── game/
│   │   ├── scales.ts               # NOTE_FREQUENCIES, SCALES, key signature helpers
│   │   ├── scoring.ts              # trimmedMeanAbs, notePointsFromE, getTotalScore
│   │   ├── settings.ts             # DEFAULT_SETTINGS, SETTINGS_RANGES, load/save
│   │   └── scores.ts               # saveScore, loadScores, clearScores
│   ├── utils/
│   │   └── formatting.ts           # formatNoteDisplay, formatScaleName, color/angle helpers
│   ├── scales-tuner.tsx            # Main game component (React UI only, ~1000 lines)
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
The main React component (~1000 lines). Contains only UI and React-specific logic — all pure functions and data have been extracted into standalone modules.

#### **UI Components**
- `StaveNoteDisplay`: VexFlow music notation rendering
- `PitchIndicator`: Visual gradient bar for pitch accuracy
- `Brick`: Individual tower brick with color/rotation
- `FallingBrick`: Animated brick for collapse effect
- `ViolinTunerGame`: Root game component with all state management

### [src/types.ts](src/types.ts)
All shared TypeScript interfaces and type aliases:
- `GameState`: `'menu' | 'settings' | 'playing' | 'collapsed' | 'success' | 'scores'`
- `GameMode`: `'practice' | 'test'`
- `GameSettings`: User-configurable options (thresholds, durations, enabled scales)
- `Brick`, `TuningIndicator`, and component prop interfaces
- `ScoreEntry`: Shape of a saved score record

### [src/constants.ts](src/constants.ts)
Non-configurable game constants:
- `GAME_CONFIG.SAME_NOTE_THRESHOLD`: 50¢ window for recognizing same target note
- `MULTIPLIER_TIERS`: Streak multiplier thresholds and colors

### [src/game/scales.ts](src/game/scales.ts)
Scale data and key signature helpers:
- `NOTE_FREQUENCIES`: Map of note names to Hz (A4 = 440 Hz standard)
- `SCALES`: Predefined scale patterns with note sequences
- `KEY_SIGNATURE_ACCIDENTALS`: Lookup for key signature accidentals
- `getKeySignatureForScale()`: Map scale names to VexFlow key signatures
- `getKeyAccidental()`: Look up accidental for a note letter in a key

### [src/game/scoring.ts](src/game/scoring.ts)
Scoring math:
- `trimmedMeanAbs()`: Robust error statistic (trimmed mean of absolute cents)
- `notePointsFromE()`: Two-part per-note scoring (accuracy + precision bonus)
- `getTotalScore()`: Applies fluency bonus to base score

### [src/game/settings.ts](src/game/settings.ts)
Settings persistence:
- `DEFAULT_SETTINGS`: Default values for all configurable options
- `SETTINGS_RANGES`: Min/max/step for each configurable slider
- `STORAGE_KEY`: localStorage key (`'scaleTowerSettings'`)
- `loadSettings()` / `saveSettings()`: Read/write to localStorage

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
- **Toggle options**: "Keep tower from collapsing", "Hide tuner when playing", "Auto replay"

Settings are persisted to `localStorage` under the key `scaleTowerSettings`.

### [src/game/scores.ts](src/game/scores.ts)
Score history persistence:
- `saveScore()` / `loadScores()` / `clearScores()`: CRUD for score entries in localStorage

### [src/audio/pitchDetection.ts](src/audio/pitchDetection.ts)
- `autoCorrelate()`: Autocorrelation pitch detection from audio buffer
- `getCents()`: Calculate cents difference between two frequencies

### [src/audio/playTone.ts](src/audio/playTone.ts)
- `playTone()`: Generate reference tone with harmonics using Web Audio API

### [src/utils/formatting.ts](src/utils/formatting.ts)
- `getColorFromError()`: Map cents deviation to RGB color
- `getAngleFromError()`: Map cents deviation to brick rotation angle
- `formatNoteDisplay()` / `formatScaleName()`: Human-friendly note/scale names with symbols
- `isIPhoneNotStandalone()`: Detect iPhone not running as installed PWA

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
1. Add notes to `SCALES` in `src/game/scales.ts`
2. Add key signature to `getKeySignatureForScale()` in `src/game/scales.ts`
3. Add key signature accidentals to `KEY_SIGNATURE_ACCIDENTALS` in `src/game/scales.ts` if the key is new
4. Ensure notes exist in `NOTE_FREQUENCIES` in `src/game/scales.ts`
5. Add to `DEFAULT_SETTINGS.enabledScales` in `src/game/settings.ts`

### Adjusting Defaults
Edit `DEFAULT_SETTINGS` in `src/game/settings.ts` for default values, or `SETTINGS_RANGES` for slider limits.

### Modifying Color Scheme
Edit `getColorFromError()` in `src/utils/formatting.ts` for brick/indicator colors.

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

**Last Updated**: March 2026
