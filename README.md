# Scale Tower 🎻
A browser-based violin tuner game built with React and Vite. Play scales into your mic, stack bricks for in-tune notes, and keep the tower from collapsing as instability rises with sloppy intonation.

🎮 **[Play the live demo](https://rwest.github.io/scales-tuner/)** | 📦 **[GitHub Repository](https://github.com/rwest/scales-tuner)**

## Features
- Live pitch detection via Web Audio API with cents readout and visual pitch meter.
- Built-in scales including G/Bb/A/D Major, G/A Melodic Minor, and Tonalization 1A.
- Two gameplay modes: Practice and Test, each with tailored scoring.
- Music staff display with correct key signature (VexFlow) and proper stem direction.
- Accuracy-based scoring and instability meter (collapse optional via toggle).
- Hold/sampling window: place bricks by staying accurate or by completing a sampling window (mode-dependent).

## Getting started

### Play Online
Visit **[https://rwest.github.io/scales-tuner/](https://rwest.github.io/scales-tuner/)** to play immediately in your browser.

### Run Locally
1) Clone the repository: `git clone git@github.com:rwest/scales-tuner.git`
2) Install dependencies: `npm install`
3) Run the dev server: `npm run dev`
4) Open the shown local URL in a desktop browser.
5) Allow microphone access when prompted; audio input is required for gameplay.

#### Testing on iPhone with ngrok
Microphone access requires HTTPS, so to test on an iPhone:

1) Install [ngrok](https://ngrok.com/download) if you haven't already
2) Start the dev server: `npm run dev` (note the port, typically 5173)
3) In a new terminal, create an HTTPS tunnel: `ngrok http 5173`
4) Copy the `https://` forwarding URL from ngrok's output
5) Open that URL on your iPhone
6) Allow microphone access when prompted

Note: The free ngrok tier works fine for development testing.

## How to play
- Choose a scale and optionally enable "Keep tower from collapsing" (applies to both modes).
- Pick a mode:
	- Practice: press the green Practice button.
	- Test: press the blue Test button.
- Play the displayed note; use the speaker button to hear a reference pitch.
- Progress bar behavior:
	- Practice: fills while continuously in-tune; resets if you drift out but samples remain for scoring.
	- Test: fills with accumulated in-range time; pauses when out-of-range but resumes where it left off.
- Stack a brick for each note; finish the scale to see your score.

## Modes
- **Practice Mode**
	- Advance when you stay continuously in-tune for the hold duration.
	- Leaving the in-tune window resets the hold timer but samples persist for scoring.
	- Per-note score ≈ `exp(-avg_abs_cents/IN_TUNE_THRESHOLD)` (average of all samples collected during note attempt).

- **Test Mode**
	- Accumulates time while within the same-note threshold; pauses timer when out-of-range.
	- Auto-advances after accumulating the hold duration of in-range time.
	- Per-note score ≈ `exp(-avg_abs_cents/IN_TUNE_THRESHOLD)` (average of all samples collected).

### Scoring & thresholds
- Scores are normalized to 100 total across the whole scale.
- In-tune window (`IN_TUNE_THRESHOLD`): default 18 cents.
- Same-note window (`SAME_NOTE_THRESHOLD`): default 50 cents.
- Hold/sampling duration (`HOLD_DURATION`): default 750 ms.
- See implementation in [src/scales-tuner.tsx](src/scales-tuner.tsx).


## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
