# Scale Tower 🎻
A browser-based violin tuner game built with React and Vite. Optimized for iPhone and mobile browsers (add to Home Screen for fullscreen), but also works on desktop. Play scales into your mic, stack bricks for in-tune notes, and keep the tower from collapsing as instability rises with sloppy intonation.

🎮 **[Play the live demo](https://rwest.github.io/scales-tuner/)** | 📦 **[GitHub Repository](https://github.com/rwest/scales-tuner)**

## Features
- Live pitch detection via Web Audio API with cents readout and visual pitch meter.
- Built-in scales including G/B♭/A/D Major, G/A Melodic Minor, and Tonalization 1A.
- Two gameplay modes: Practice (continuous hold) and Test (accumulated time).
- Music staff display with correct key signature (VexFlow).
- Configurable difficulty via Settings screen (thresholds, timing, enabled scales).
- Accuracy-based scoring normalized to 100 points per scale.

## Getting Started

### Play Online
Visit **[https://rwest.github.io/scales-tuner/](https://rwest.github.io/scales-tuner/)** to play immediately in your browser.

### Run Locally
```bash
git clone git@github.com:rwest/scales-tuner.git
cd scales-tuner
npm install
npm run dev
```
Open the shown local URL and allow microphone access when prompted.

#### Testing on iPhone with ngrok
Microphone access requires HTTPS. To test on iPhone, install [ngrok](https://ngrok.com/download) if you haven't already (the free tier works fine). Then:

1. Start the dev server: `npm run dev`
2. In a new terminal: `ngrok http 5173`
3. Open the `https://` forwarding URL on your iPhone
4. Allow microphone access when prompted

## How to Play
1. Choose a scale from the dropdown.
2. Pick a mode: **Practice** (green) or **Test** (blue).
3. Play the displayed note; tap the speaker icon to hear a reference pitch.
4. Keep the pitch indicator centered (green) to fill the progress bar.
5. Stack a brick for each note; finish the scale to see your score.

### Modes
- **Practice**: Hold continuously within the OK threshold to advance. Leaving the window resets the timer but samples still count for scoring.
- **Test**: Accumulate in-range time (can pause and resume). Auto-advances after enough accumulated time.

Both modes score each note as `exp(-avg_abs_cents / OK_THRESHOLD)`, normalized to 100 total.

## Settings
Access the Settings screen from the menu to customize:
- **OK Threshold**: Cents window to accept a note (difficulty)
- **Collapse Threshold**: Instability budget before tower falls
- **Hold Duration**: How long to hold a note
- **Pause Between Notes**: Delay after each note
- **Enabled Scales**: Choose which scales appear in the dropdown
- **Toggle options**: Keep tower from collapsing, Hide tuner while playing

Settings persist in your browser's local storage.
