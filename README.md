# Scale Tower 🎻
A browser-based violin tuner game built with React and Vite. Play scales into your mic, stack bricks for in-tune notes, and keep the tower from collapsing as instability rises with sloppy intonation.

## Features
- Live pitch detection via Web Audio API with cents readout and visual pitch meter.
- Multiple built-in scales (major and melodic minor) across two octaves.
- Accuracy-based scoring and an instability meter that triggers tower collapse unless you enable the safe mode toggle.
- Hold-to-lock mechanic: stay within the tuning window briefly to place each brick and move to the next note.

## Getting started
1) Install dependencies: `npm install`
2) Run the dev server: `npm run dev`
3) Open the shown local URL in a desktop browser (Chrome recommended).
4) Allow microphone access when prompted; audio input is required for gameplay.

## How to play
- Choose a scale and optionally enable "Keep tower from collapsing."
- Hit Start, then play the displayed note on your instrument.
- Keep the pitch within the in-tune window until the progress bar fills to drop a brick.
- Advance through every note of the scale; accuracy earns points and reduces wobble.


## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
