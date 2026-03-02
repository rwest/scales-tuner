// Play a tone with harmonic richness (sounds louder than pure sine wave)
export async function playTone(frequency: number, duration: number = 0.75): Promise<void> {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    await audioContext.resume();

    const now = audioContext.currentTime;
    const endTime = now + duration;

    // Create multiple oscillators with different frequencies (harmonics) for richer sound
    const harmonics = [
      { frequency: frequency, volume: 0.3 },           // Fundamental
      { frequency: frequency * 2.002, volume: 0.15 },      // 2nd harmonic
      { frequency: frequency * 3.005, volume: 0.1 },       // 3rd harmonic
      { frequency: frequency * 4, volume: 0.08 },      // 4th harmonic
    ];

    const masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);

    // Set envelope (attack, sustain, release)
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.5, now + 0.05);        // Attack
    masterGain.gain.setValueAtTime(0.5, endTime - 0.1);              // Sustain
    masterGain.gain.linearRampToValueAtTime(0, endTime);             // Release

    harmonics.forEach(({ frequency: freq, volume }) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.frequency.value = freq;
      osc.type = 'triangle'; // Triangle wave for richer harmonics
      gain.gain.setValueAtTime(volume, now);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(endTime);
    });
  } catch (error) {
    console.error('Error playing tone:', error);
  }
}
