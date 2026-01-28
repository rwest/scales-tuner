# AI Agent Instructions for Scale Tuner

Scale Tuner is a React + Vite browser game for violin practice. Players perform scales into their microphone and earn points for accurate intonation, building a tower that reflects tuning consistency.

## Architecture Overview

**Single-File Design**: The entire game logic lives in [src/scales-tuner.tsx](src/scales-tuner.tsx) (~1800 lines). UI, audio, game state, and rendering are tightly coupled for real-time responsiveness.

**Tech Stack**:
- React 19 with TypeScript
- Vite for dev server and builds
- Web Audio API for microphone input and pitch detection
- VexFlow for music notation rendering

**Game Loop**:
1. Microphone input → autocorrelation pitch detection
2. Compare detected frequency to target note frequency (in cents)
3. Collect accuracy samples when within `SAME_NOTE_THRESHOLD` (50¢)
4. Practice mode: Advance when continuously within OK threshold for hold duration
5. Test mode: Auto-advance after accumulating hold duration of in-range time
6. Per-note score: `exp(-avg_abs_cents / OK_THRESHOLD)` normalized to 100 total
7. Tower collapses when instability ≥ collapse threshold × note count

## Settings System

Many game parameters are now **user-configurable** via a Settings screen. The `GameSettings` interface includes:
- `okThreshold`: Cents window to accept a note
- `collapseThreshold`: Instability budget per note
- `holdDuration`: Ms to hold note before it locks
- `pauseBetweenNotes`: Ms delay after each note
- `enabledScales`: Which scales appear in the dropdown
- `noCollapse`: Prevent tower from collapsing
- `hideTunerWhenPlaying`: Hide pitch feedback during play

Settings are stored in `localStorage` under key `scaleTowerSettings`. Default values are in `DEFAULT_SETTINGS`, and slider ranges are in `SETTINGS_RANGES`.

The only non-configurable constant is `GAME_CONFIG.SAME_NOTE_THRESHOLD` (50¢).

## Critical Functions

**Pitch Detection**: `autoCorrelate(buffer, sampleRate)` — autocorrelation with RMS threshold (0.01) to reject noise. Returns Hz or -1.

**Accuracy**: `getCents(frequency, targetFrequency)` = `1200 * log₂(freq / target)`. Positive = sharp, negative = flat.

**Brick Behavior**:
- Angle = `cents × 1.5`
- Color: `getColorFromError()` interpolates Green→Red (sharp) or Green→Blue (flat)

**Scale System**: `SCALES` object defines note sequences. `getKeySignatureForScale()` maps to VexFlow key signatures.

## Workflow

```bash
npm run dev       # Dev server (localhost:5173)
npm run build     # Production build
npm run lint      # ESLint
npm run preview   # Preview build
```

Push to `main` triggers GitHub Actions deployment to GitHub Pages.

## Common Modifications

**Add a Scale**: 
1. Add notes to `SCALES` object
2. Add key signature to `getKeySignatureForScale()`
3. Add key signature accidentals to `KEY_SIGNATURE_ACCIDENTALS` if the key is new
4. Ensure notes exist in `NOTE_FREQUENCIES`
5. Add to `DEFAULT_SETTINGS.enabledScales`

**Adjust Defaults**: Edit `DEFAULT_SETTINGS` or `SETTINGS_RANGES`.

**Modify Colors**: Edit `getColorFromError()` function.

## Audio Pipeline

1. `getUserMedia({ audio: true })` requests microphone
2. `AudioContext` + `AnalyserNode` (fftSize 2048)
3. Audio processing runs at ~40Hz via `setInterval` (decoupled from rAF for iOS compatibility)
4. Visual updates via `requestAnimationFrame`
5. `playTone()` generates reference tones with harmonics

## Debugging

- Console for audio errors
- React DevTools for `gameState`, `settings`, `bricks`, `instability`
- iOS Safari throttles rAF—audio loop uses `setInterval` for reliability

## Commit Message Format

```
<type>: <subject (50 chars max)>

<body explaining why>
```

Types: `feat`, `fix`, `refactor`, `docs`, `perf`, `chore`

## References

- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [VexFlow](https://www.vexflow.com/)
- [Autocorrelation Pitch Detection](https://en.wikipedia.org/wiki/Autocorrelation)
- [Musical Cents](https://en.wikipedia.org/wiki/Cent_(music))
