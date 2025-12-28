# Scale Tuner - Codebase Guide

Welcome to the **Scale Tuner** project! This document provides a comprehensive overview of the project structure, architecture, and key concepts to help you get started quickly.

## 📋 Project Overview

**Scale Tuner** (also called "Scale Tower") is a browser-based violin tuner game built with React and Vite. Players practice musical scales by playing into their microphone, earning points for accurate intonation, and building a tower that collapses if their tuning becomes too inconsistent.

### Core Gameplay Loop
1. Player selects a scale (Major or Melodic Minor) and optionally enables "safe mode"
2. Game displays the target note and enters playing state
3. Player performs the note on their instrument
4. Real-time pitch detection measures accuracy in cents (100 cents = 1 semitone)
5. Accurate playing locks the note and places a brick; mistakes increase instability
6. Tower collapses if instability gets too high (unless safe mode is enabled)
7. Completing all notes in the scale triggers success state

## 📁 Project Structure

```
scale-tuner/
├── public/                          # Static assets
├── src/
│   ├── violin-tuner-game.tsx       # Main game component (804 lines)
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
| **Linting** | ESLint 9 + TypeScript ESLint |

### Key Dependencies
- `react` & `react-dom`: UI framework
- `vite`: Lightning-fast dev server and build tool
- `@vitejs/plugin-react`: React integration for Vite
- `typescript`: Type safety

## 📄 Key Files Explained

### [src/violin-tuner-game.tsx](src/violin-tuner-game.tsx)
The heart of the application. This 804-line component contains:

#### **Type Definitions** (top of file)
- `GameState`: 'menu' | 'playing' | 'collapsed' | 'success'
- `ScaleName`: Keys of the SCALES object
- `Brick`, `TuningIndicator`, `PitchIndicatorProps`, etc.

#### **Data Constants**
- `NOTE_FREQUENCIES`: Map of note names to Hz (e.g., 'A4': 440.00)
- `SCALES`: Predefined scale patterns with note sequences
  - G Major, G Minor Melodic, Bb Major, A Major, A Minor Melodic, D Major

#### **Core Functions**

**Pitch Detection**
- `autoCorrelate()`: Implements autocorrelation algorithm for accurate pitch detection from audio buffer
  - Uses RMS (root mean square) to measure signal strength
  - Returns frequency in Hz or -1 if signal too weak

**Component Hooks**
- `useState`: Manages game state, current note, brick positions, instability level
- `useRef`: Maintains references to audio context and analyzer
- `useEffect`: Sets up Web Audio API on component mount
- `useCallback`: Memoizes event handlers to prevent unnecessary re-renders

**Rendering Functions** (return JSX)
- `renderMenu()`: Scale selection interface
- `renderGameScreen()`: Active gameplay UI
- `renderTuningIndicator()`: Visual feedback (sharp/flat indicator)
- `renderBricks()`: Stacked brick tower visualization
- `renderFallingBricks()`: Animation for bricks that fall during collapse

#### **Game Logic**
- **Accuracy Calculation**: Converts frequency to cents deviation from target note
- **Lock Mechanic**: Player must stay in-tune for a brief window to place a brick
- **Instability System**: Accuracy errors increase wobble; safe mode disables collapse
- **Tower Physics**: Bricks rotate based on placement accuracy; collapse triggers on high instability

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
- **playing**: Active gameplay
- **success**: All notes completed successfully
- **collapsed**: Tower fell (unless safe mode enabled)

## 🔊 Audio Processing Pipeline

1. **Microphone Access**: On game start, requests user permission via Web Audio API
2. **AudioContext**: Created to access the user's audio input
3. **AnalyserNode**: Samples audio and provides frequency data
4. **Buffer Processing**: Audio samples collected and analyzed every 50ms
5. **Pitch Detection**: `autoCorrelate()` function converts audio to frequency
6. **Accuracy Calculation**: Frequency → cents deviation → visual/game feedback

## 🎯 Key Concepts for Development

### Cents System
Cents measure pitch deviation: 100 cents = 1 semitone (half-step)
- Formula: `cents = 1200 * log₂(detectedFreq / targetFreq)`
- ±50 cents = "in-tune zone" (configurable threshold)
- Used for: UI indicator, accuracy scoring, instability calculation

### Note Frequencies
All frequencies follow standard 12-tone equal temperament tuning:
- A4 = 440 Hz (concert pitch)
- Octaves double the frequency
- 12 semitones per octave, each ~1.0595x previous

### Instability Meter
Accumulates when player is out of tune. Acts as "health bar":
- Increases when cents > threshold
- Decreases slowly over time when accurate
- Triggers collapse at max value (unless safe mode)

### Brick Tower
Visual representation of score:
- Each brick = successfully locked note
- Brick rotation angle = accuracy (perfectly in-tune = straight, errors = tilted)
- Tower collapse animation when instability maxes out

## 🚀 Getting Started for Contributors

### First Time Setup
```bash
npm install
npm run dev
```
Opens dev server at `http://localhost:5173` (or similar)

### Making Changes
1. **UI/Layout Changes**: Edit [App.jsx](src/App.jsx) or styling in [App.css](src/App.css)
2. **Game Logic**: Edit [violin-tuner-game.tsx](src/violin-tuner-game.tsx)
3. **Audio Algorithm**: Modify `autoCorrelate()` function
4. **Scales/Notes**: Update `SCALES` or `NOTE_FREQUENCIES` constants
5. **Styles**: Use [App.css](src/App.css) or [index.css](src/index.css)

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
1. Add note sequence to `SCALES` constant
2. Ensure all notes exist in `NOTE_FREQUENCIES`
3. Restart dev server to see in scale selector

### Adjusting In-Tune Window
Search for "threshold" or "THRESHOLD" in [violin-tuner-game.tsx](src/violin-tuner-game.tsx)
Default: ±50 cents

### Changing Tower Collapse Behavior
Look for `instability` state and its max threshold in [violin-tuner-game.tsx](src/violin-tuner-game.tsx)

### Modifying Accuracy Scoring
Search for score calculation in event handlers within [violin-tuner-game.tsx](src/violin-tuner-game.tsx)

## 🎓 Architecture Patterns

- **Single Component**: Most logic in one TSX file for simplicity
- **React Hooks**: `useState`, `useRef`, `useEffect`, `useCallback` for state management
- **Type Safety**: Full TypeScript with interfaces for game data structures
- **No External UI Library**: Uses HTML/CSS for DOM rendering
- **Event-Driven**: Audio processing triggers state updates at 50ms intervals

## 📚 References

- [Web Audio API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Autocorrelation for Pitch Detection](https://en.wikipedia.org/wiki/Autocorrelation#Application_to_pitch_detection)

---

**Last Updated**: December 28, 2025
