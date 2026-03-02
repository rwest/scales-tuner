import { useEffect, useRef, useState } from 'react';
import { autoCorrelate } from './pitchDetection';

interface UsePitchDetectionOptions {
  /** true when the game is active and the mic should be captured */
  enabled: boolean;
  /** Called once per audio sample interval (~25ms) with the detected pitch */
  onPitchDetected: (pitch: number | null) => void;
  fftSize?: number;
  sampleIntervalMs?: number;
}

interface UsePitchDetectionResult {
  /** Microphone permission / setup error, or null */
  error: string | null;
}

/**
 * Manages the Web Audio API lifecycle:
 * - Requests microphone access when `enabled` becomes true
 * - Creates AudioContext + AnalyserNode
 * - Runs pitch detection at `sampleIntervalMs` (default 25ms)
 * - Cleans up when `enabled` becomes false or the component unmounts
 */
export function useAudioPitchDetection({
  enabled,
  onPitchDetected,
  fftSize = 2048,
  sampleIntervalMs = 25,
}: UsePitchDetectionOptions): UsePitchDetectionResult {
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Keep a stable ref to the callback so the interval doesn't need to restart when it changes
  const onPitchDetectedRef = useRef(onPitchDetected);
  useEffect(() => { onPitchDetectedRef.current = onPitchDetected; });

  useEffect(() => {
    if (!enabled) {
      // Cleanup audio resources
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      return;
    }

    let cancelled = false;

    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;

        const AudioContextClass =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioContext = new AudioContextClass();
        await audioContext.resume();

        if (cancelled) {
          void audioContext.close();
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = fftSize;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        setError(null);

        // Start the pitch detection interval
        intervalRef.current = setInterval(() => {
          if (!analyserRef.current || !audioContextRef.current) return;
          const buffer = new Float32Array(analyserRef.current.fftSize);
          analyserRef.current.getFloatTimeDomainData(buffer);
          const pitch = autoCorrelate(buffer, audioContextRef.current.sampleRate);
          onPitchDetectedRef.current(pitch > 0 ? pitch : null);
        }, sampleIntervalMs);
      } catch (err) {
        if (!cancelled) {
          setError('Microphone access denied. Please allow microphone access and try again.');
          console.error(err);
        }
      }
    };

    void setup();

    return () => {
      cancelled = true;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
    };
  // onPitchDetected is accessed via ref — intentionally omitted from deps
  }, [enabled, fftSize, sampleIntervalMs]);

  return { error };
}
