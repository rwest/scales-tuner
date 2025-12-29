# Scale Tower 🎻
A browser-based violin tuner game built with React and Vite. Play scales into your mic, stack bricks for in-tune notes, and keep the tower from collapsing as instability rises with sloppy intonation.

## Features
- Live pitch detection via Web Audio API with cents readout and visual pitch meter.
- Built-in scales including G/Bb/A/D Major, G/A Melodic Minor, and Tonalization 1A.
- Two gameplay modes: Practice and Test, each with tailored scoring.
- Music staff display with correct key signature (VexFlow) and proper stem direction.
- Accuracy-based scoring and instability meter (collapse optional via toggle).
- Hold/sampling window: place bricks by staying accurate or by completing a sampling window (mode-dependent).

## Getting started
1) Install dependencies: `npm install`
2) Run the dev server: `npm run dev`
3) Open the shown local URL in a desktop browser (Chrome recommended).
4) Allow microphone access when prompted; audio input is required for gameplay.

## How to play
- Choose a scale and optionally enable "Keep tower from collapsing" (applies to both modes).
- Pick a mode:
	- Practice: press the green Practice button.
	- Test: press the blue Test button.
- Play the displayed note; use the speaker button to hear a reference pitch.
- Progress bar behavior:
	- Practice: fills while your pitch is within the in-tune window; locks after the hold duration.
	- Test: fills while your pitch is within the same-note window; auto-advances after the sampling duration.
- Stack a brick for each note; finish the scale to see your score.

## Modes
- **Practice Mode**
	- Timing runs only while you are within the same-note threshold (recognizing the correct target).
	- Advance when you stay in-tune for the hold duration.
	- Per-note score ≈ `exp(-(time_taken − HOLD_DURATION)/HOLD_DURATION)`.

- **Test Mode**
	- Collects pitch samples for the hold duration while within the same-note threshold; auto-advances afterward.
	- Per-note score ≈ `exp(-avg_abs_cents/IN_TUNE_THRESHOLD)`.

### Scoring & thresholds
- Scores are normalized to 100 total across the whole scale.
- In-tune window (`IN_TUNE_THRESHOLD`): default 18 cents.
- Same-note window (`SAME_NOTE_THRESHOLD`): default 50 cents.
- Hold/sampling duration (`HOLD_DURATION`): default 750 ms.
- See implementation in [src/violin-tuner-game.tsx](src/violin-tuner-game.tsx).


## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
