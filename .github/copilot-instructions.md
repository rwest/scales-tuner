# AI Agent Instructions for Scale Tuner

Scale Tuner is a React + Vite browser game for violin practice. Players perform scales into their microphone and earn points for accurate intonation, building a tower that reflects tuning consistency.

## Architecture Overview

**Single-File Design**: The entire game logic lives in [src/scales-tuner.tsx](src/scales-tuner.tsx) (~1100 lines). This is intentional—UI, audio, game state, and rendering are tightly coupled for real-time responsiveness.

**Tech Stack**:
- React 19 with TypeScript for type-safe state management
- Vite for dev server (fast HMR) and production builds
- Web Audio API for microphone input and pitch detection
- VexFlow for music notation rendering (treble clef with key signatures)
- ESLint + TypeScript ESLint for code quality

**Game Loop**:
1. Microphone input → autocorrelation pitch detection
2. Compare detected frequency to target note frequency (in cents, where 100 cents = 1 semitone)
3. Collect accuracy samples continuously when within `SAME_NOTE_THRESHOLD` (default 50¢)
4. Practice mode: Advance when continuously in-tune for `HOLD_DURATION` (750ms)
5. Test mode: Auto-advance after accumulating `HOLD_DURATION` of in-range time
6. Per-note score: `exp(-avg_abs_cents / IN_TUNE_THRESHOLD)` normalized to 100 total
7. Each brick's color and angle reflect tuning accuracy; tower collapses if instability > 120 points

## Key Constants & Tuning Parameters

All in [src/scales-tuner.tsx](src/scales-tuner.tsx):

```typescript
const IN_TUNE_THRESHOLD = 18;        // ±cents window to accept a note
const SAME_NOTE_THRESHOLD = 50;      // ±cents to recognize same target note
const HOLD_DURATION = 750;           // milliseconds to lock a note
const COLLAPSE_THRESHOLD = 120;      // instability points before tower falls
```

Samples are **collected continuously** when within `SAME_NOTE_THRESHOLD`, persist across pauses/silence, and accumulate until the note completes. This distinction matters for understanding why scores don't reset if you briefly stop playing.

## Critical Functions & Patterns

**Pitch Detection**: `autoCorrelate(buffer, sampleRate)` implements autocorrelation with RMS signal threshold (0.01) to reject noise. Returns frequency in Hz or -1 if too quiet.

**Accuracy Calculation**: `getCents(frequency, targetFrequency)` = `1200 * log₂(frequency / targetFrequency)`. Positive = sharp, negative = flat.

**Brick Behavior**:
- Angle = `cents × 1.5` (visual indicator of intonation)
- Color: Green (in-tune) → Red (sharp) or Blue (flat) gradient
- `getColorFromError()` interpolates RGB based on cents deviation (clamped to ±50¢)

**Scale System**: `SCALES` object defines note sequences (up to 2 octaves). Each scale has a key signature; `getKeySignatureForScale()` maps to VexFlow key signatures ('G', 'Bb', 'A', 'D', 'C').

## Workflow & Building

```bash
npm run dev       # Start Vite dev server (http://localhost:5173)
npm run build     # Production build → dist/
npm run lint      # Run ESLint
npm run preview   # Serve dist/ locally
```

**ESLint Config**: Flat config with TypeScript support; ignores `dist/`. Rules allow uppercase pattern variables (e.g., `const G_MAJOR_SCALE`).

**Vite Config**: Base path `/scales-tuner/` for GitHub Pages; dev server allows ngrok domains for iPhone testing over HTTPS.

**Auto-Deployment**: Push to `main` triggers GitHub Actions → builds and deploys to GitHub Pages.

## Development Patterns

**React Hooks Usage**:
- `useState`: Game state, current note, bricks array, pitch, score, instability
- `useRef`: AudioContext, AnalyserNode, media stream, animation frame ID, timers
- `useEffect`: Pitch detection loop (continuous during gameplay)
- `useCallback`: `stopGame()` cleanup function for audio resources

**Component Structure**: `StaveNoteDisplay` (VexFlow rendering), `PitchIndicator` (gradient bar), `Brick` (tower piece), `FallingBrick` (collapse animation).

**Event Binding**: Game reacts to `gameState` and `currentNoteIndex` changes; UI renders conditionally based on these values.

## Common Modifications

**Add a Scale**: 
1. Add notes to `SCALES` object
2. Add key signature to `getKeySignatureForScale()` map
3. Ensure notes exist in `NOTE_FREQUENCIES` (add sharps/flats if needed)

**Adjust Tuning Strictness**: Lower `IN_TUNE_THRESHOLD` (now 18¢) for stricter grading.

**Change Hold Timing**: Modify `HOLD_DURATION` (now 750ms).

**Modify Color Scheme**: Edit RGB interpolation in `getColorFromError()` function (currently: green→red for sharp, green→blue for flat).

**Music Notation**: Update `getKeySignatureForScale()` or `StaveNoteDisplay` to change treble clef rendering.

## Testing Notes

- **Desktop Chrome recommended** for best Web Audio API support
- Microphone permission required; grant when prompted
- Use `npm run dev` for hot-reload testing
- For mobile testing: use ngrok tunnel with `npm run dev` (see README.md)

## Audio Pipeline & Web Audio API

1. `navigator.mediaDevices.getUserMedia({ audio: true })` requests microphone
2. Create `AudioContext` and connect media stream → `AnalyserNode`
3. `AnalyserNode.fftSize = 2048` (frequency resolution)
4. Every animation frame: `getByteFrequencyData()` or `getByteTimeDomainData()` → `autoCorrelate()`
5. Reference tone generation: `playTone()` creates sine wave + harmonics via `OscillatorNode`

**Important**: AudioContext suspend/resume may be required depending on browser autoplay policies; test on multiple browsers.

## Debugging Guide

- **Console logs**: Check browser DevTools → Console for audio errors
- **React DevTools**: Inspect `gameState`, `currentNoteIndex`, `bricks` array, `instability`
- **Hold/Timing Issues**: Check `HOLD_DURATION` and sample collection logic in pitch loop
- **Color Mismatches**: Verify RGB values in `getColorFromError()` match intended gradient
- **Pitch Detection Failing**: Increase RMS threshold in `autoCorrelate()` or check microphone input

## Commit Message Guidelines

After each modification, draft a commit message with:

**Format**:
```
<type>: <subject (50 chars max)>

<body (explain the why, not just the what)>
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `perf`, `chore`

**Examples**:
```
feat: Add A Melodic Minor scale

Added A Melodic Minor to SCALES with correct ascending intervals.
Updated getKeySignatureForScale() to use C (no accidentals).
Allows users to practice this common violin etude scale.
```

```
fix: Lower IN_TUNE_THRESHOLD to 15 cents

Reduced from 18¢ to enforce stricter intonation accuracy.
Users reported too-lenient grading; narrower window aligns
with professional tuning expectations.
```

```
perf: Optimize autocorrelation RMS calculation

Cache RMS computation to avoid recalculating per buffer.
Pitch detection now 5-10% faster on mobile devices.
```

**Body tips**:
- Keep to 2-3 sentences
- Explain the motivation (why this change was needed)
- Mention any side effects or dependencies
- Reference specific constants/functions if changed

## References

- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [VexFlow Music Notation](https://www.vexflow.com/)
- [Autocorrelation Pitch Detection](https://en.wikipedia.org/wiki/Autocorrelation#Application_to_pitch_detection)
- [Musical Cents](https://en.wikipedia.org/wiki/Cent_(music))
- [Equal Temperament Tuning](https://en.wikipedia.org/wiki/Equal_temperament)
