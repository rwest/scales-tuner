# AI Agent Instructions for Scale Tuner

Scale Tuner is a React + Vite browser game for violin practice. Players perform scales into their microphone and earn points for accurate intonation, building a tower that reflects tuning consistency.

## Architecture Overview

**Module Structure**: Game logic is split across focused standalone modules; `scales-tuner.tsx` contains only React UI code (~1000 lines).

```
src/
├── types.ts                  # All shared interfaces and type aliases
├── constants.ts              # GAME_CONFIG, MULTIPLIER_TIERS
├── audio/
│   ├── pitchDetection.ts     # autoCorrelate, getCents
│   └── playTone.ts           # playTone
├── game/
│   ├── scales.ts             # NOTE_FREQUENCIES, SCALES, key signature helpers
│   ├── scoring.ts            # trimmedMeanAbs, notePointsFromE, getTotalScore
│   ├── settings.ts           # DEFAULT_SETTINGS, SETTINGS_RANGES, load/save
│   └── scores.ts             # saveScore, loadScores, clearScores
├── utils/
│   └── formatting.ts         # formatNoteDisplay, formatScaleName, color/angle helpers
└── scales-tuner.tsx          # Main component (React UI only)
```

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
6. Per-note score: Uses trimmed mean of absolute cents (E) with shaped curve `exp(-(E/tau)^p)` where tau = k × GOOD_THRESHOLD
7. Tower collapses when instability ≥ collapse threshold × note count

## Settings System

Many game parameters are **user-configurable** via a Settings screen. The `GameSettings` interface (in `src/types.ts`) includes:
- `okThreshold`: Cents window to accept a note
- `collapseThreshold`: Instability budget per note
- `holdDuration`: Ms to hold note before it locks
- `pauseBetweenNotes`: Ms delay after each note
- `enabledScales`: Which scales appear in the dropdown
- `noCollapse`: Prevent tower from collapsing
- `hideTunerWhenPlaying`: Hide pitch feedback during play
- `trimTop`: Fraction of outlier samples to trim from scoring (0.0-0.4, default 0.2)
- `scoreExponentP`: Curve sharpness parameter p (1.0-4.0, default 2)
- `tauMultiplier`: Score tolerance multiplier k (1.0-3.0, default 1.8)
- `basePointsPerNote`: Base accuracy points per note A (default 50)
- `bonusWeight` / `bonusTauMultiplier` / `bonusEpsilonCents` / `bonusExponentQ`: Precision bonus parameters
- `fluencyWeight` / `fluencyExponentQ` / `fluencyThreshold`: Fluency bonus parameters
- `autoReplay` / `autoReplayDelay`: Auto-restart after completion

Settings are stored in `localStorage` under key `scaleTowerSettings`. Default values are in `DEFAULT_SETTINGS` (`src/game/settings.ts`), and slider ranges are in `SETTINGS_RANGES`.

The only non-configurable constant is `GAME_CONFIG.SAME_NOTE_THRESHOLD` (50¢) in `src/constants.ts`.

## Critical Functions

**Pitch Detection** (`src/audio/pitchDetection.ts`): `autoCorrelate(buffer, sampleRate)` — autocorrelation with RMS threshold (0.01) to reject noise. Returns Hz or -1.

**Accuracy** (`src/audio/pitchDetection.ts`): `getCents(frequency, targetFrequency)` = `1200 * log₂(freq / target)`. Positive = sharp, negative = flat.

**Scoring** (`src/game/scoring.ts`): `trimmedMeanAbs(samples, trimTop)` — computes robust error statistic E by:
1. Taking absolute value of all samples
2. Sorting ascending
3. Trimming top fraction (default 20%)
4. Computing mean of remaining samples (always keeps at least 1)

Per-note score: `A × exp(-(E/τ)^p) + B × log(1 + (τ_bonus/(E+ε))^q)` where τ = k × GOOD_THRESHOLD.

**Brick Behavior**:
- Angle = `cents × 1.5` (uses signed error E × sign)
- Color: `getColorFromError()` (`src/utils/formatting.ts`) interpolates Green→Red (sharp) or Green→Blue (flat)

**Scale System** (`src/game/scales.ts`): `SCALES` object defines note sequences. `getKeySignatureForScale()` maps to VexFlow key signatures.

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
1. Add notes to `SCALES` in `src/game/scales.ts`
2. Add key signature to `getKeySignatureForScale()` in `src/game/scales.ts`
3. Add key signature accidentals to `KEY_SIGNATURE_ACCIDENTALS` in `src/game/scales.ts` if the key is new
4. Ensure notes exist in `NOTE_FREQUENCIES` in `src/game/scales.ts`
5. Add to `DEFAULT_SETTINGS.enabledScales` in `src/game/settings.ts`

**Adjust Defaults**: Edit `DEFAULT_SETTINGS` or `SETTINGS_RANGES` in `src/game/settings.ts`.

**Modify Colors**: Edit `getColorFromError()` in `src/utils/formatting.ts`.

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
