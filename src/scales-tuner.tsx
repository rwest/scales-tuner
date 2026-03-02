import React, { useReducer, useEffect, useRef, useCallback, ReactNode } from 'react';
import type { TuningIndicator } from './types';
import { GAME_CONFIG, MULTIPLIER_TIERS } from './constants';
import { NOTE_FREQUENCIES, SCALES, getKeySignatureForScale } from './game/scales';
import { trimmedMeanAbs, notePointsFromE, getTotalScore } from './game/scoring';
import { DEFAULT_SETTINGS, saveSettings } from './game/settings';
import { saveScore } from './game/scores';
import { getCents } from './audio/pitchDetection';
import { useAudioPitchDetection } from './audio/useAudioPitchDetection';
import { playTone } from './audio/playTone';
import { getAngleFromError, getColorFromError, formatNoteDisplay, formatScaleName } from './utils/formatting';
import { gameReducer, createInitialState } from './game/gameState';
import StaveNoteDisplay from './components/StaveNoteDisplay';
import PitchIndicator from './components/PitchIndicator';
import Brick from './components/Brick';
import FallingBrick from './components/FallingBrick';
import ScoreSummary from './components/ScoreSummary';
import MenuScreen from './components/MenuScreen';
import ScoresScreen from './components/ScoresScreen';
import SettingsScreen from './components/SettingsScreen';

// Main game component
export default function ViolinTunerGame(): ReactNode {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const {
    screen: gameState, gameMode, settings, selectedScale, currentNoteIndex,
    bricks, instability, currentPitch, currentCents, isListening, holdProgress,
    collapseTime, error, noCollapse, score, isPausedBetweenNotes,
    pauseAverageCents, hideTunerWhenPlaying, isAutoplayMode, updateAvailable,
    replayProgress, fluencyFraction,
  } = state;
  const replayAnimRef = useRef<number | null>(null);

  // Derived thresholds from settings
  const OK_THRESHOLD = settings.okThreshold;
  const GOOD_THRESHOLD = settings.okThreshold * 0.5;
  const COLLAPSE_THRESHOLD = settings.collapseThreshold;
  const HOLD_DURATION = settings.holdDuration;
  const PAUSE_BETWEEN_NOTES = settings.pauseBetweenNotes;

  const animationRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const noteStartTimeRef = useRef<number | null>(null);
  const accumulatedInRangeRef = useRef<number>(0);
  const noteSamplesRef = useRef<number[]>([]);
  const goodStreakRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number | null>(null);
  const autoplayNoteStartTimeRef = useRef<number | null>(null);
  const autoplayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replayStartRef = useRef<number | null>(null);
  // Fluency tracking refs: count in-tune vs total audio samples across the whole scale
  const fluencyInTuneSamplesRef = useRef<number>(0);
  const fluencyTotalSamplesRef = useRef<number>(0);
  const fluencyStartedRef = useRef<boolean>(false);
  // Refs for decoupled audio→visual updates (iOS Safari throttles rAF aggressively)
  const latestPitchRef = useRef<number | null>(null);
  const latestCentsRef = useRef<number>(0);
  const latestHoldProgressRef = useRef<number>(0);

  const scale = SCALES[selectedScale];
  const currentNote = scale?.notes[currentNoteIndex];
  const targetFrequency = NOTE_FREQUENCIES[currentNote];

  // Auto-replay countdown after success
  useEffect(() => {
    if ((gameState !== 'success' && gameState !== 'collapsed') || !settings.autoReplay) {
      dispatch({ type: 'SET_REPLAY_PROGRESS', progress: 0 });
      replayStartRef.current = null;
      if (replayAnimRef.current !== null) {
        cancelAnimationFrame(replayAnimRef.current);
        replayAnimRef.current = null;
      }
      return;
    }
    const REPLAY_DELAY = settings.autoReplayDelay;
    replayStartRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - (replayStartRef.current ?? now);
      const progress = Math.min(elapsed / REPLAY_DELAY, 1);
      dispatch({ type: 'SET_REPLAY_PROGRESS', progress });
      if (progress < 1) {
        replayAnimRef.current = requestAnimationFrame(animate);
      } else {
        replayAnimRef.current = null;
        void startGame(gameMode);
      }
    };
    replayAnimRef.current = requestAnimationFrame(animate);
    return () => {
      if (replayAnimRef.current !== null) {
        cancelAnimationFrame(replayAnimRef.current);
        replayAnimRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, settings.autoReplay, settings.autoReplayDelay]);

  const startGame = (mode: typeof gameMode) => {
    // Audio setup is handled by useAudioPitchDetection (responds to isListening)
    dispatch({ type: 'START_GAME', mode });
    holdStartRef.current = null;
    noteStartTimeRef.current = null;
    accumulatedInRangeRef.current = 0;
    noteSamplesRef.current = [];
    goodStreakRef.current = 0;
    fluencyInTuneSamplesRef.current = 0;
    fluencyTotalSamplesRef.current = 0;
    fluencyStartedRef.current = false;
  };

  const startAutoplay = async () => {
    dispatch({ type: 'SET_AUTOPLAY', active: true });
    autoplayNoteStartTimeRef.current = Date.now();
    const initialFrequency = targetFrequency;
    if (initialFrequency) {
      await playTone(initialFrequency, HOLD_DURATION / 1000);
    }
  };

  const stopAutoplay = () => {
    dispatch({ type: 'SET_AUTOPLAY', active: false });
    if (autoplayTimeoutRef.current) {
      clearTimeout(autoplayTimeoutRef.current);
      autoplayTimeoutRef.current = null;
    }
  };

  const stopGame = useCallback(() => {
    // Audio teardown handled by useAudioPitchDetection (responds to isListening: false)
    if (autoplayTimeoutRef.current) {
      clearTimeout(autoplayTimeoutRef.current);
      autoplayTimeoutRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Shared handler for adding a finished note (used by live and autoplay flows)
  const handleAddNote = useCallback((notePoints: number, error: number, multiplier?: number, basePoints?: number): boolean => {
    const angle = getAngleFromError(error);
    const color = getColorFromError(error);

    const newBrick = { index: bricks.length, error, angle, color, note: currentNote, points: notePoints, basePoints, multiplier };
    const newInstability = instability + Math.abs(angle);

    if (newInstability >= COLLAPSE_THRESHOLD * scale.notes.length && !noCollapse) {
      dispatch({ type: 'TOWER_COLLAPSED', brick: newBrick, points: notePoints });
      stopGame();
      return true; // ended
    }

    if (currentNoteIndex + 1 >= scale.notes.length) {
      dispatch({ type: 'SCALE_COMPLETED', brick: newBrick, points: notePoints });
      stopGame();
      return true; // ended
    }

    // Advance to next note and enter pause
    dispatch({ type: 'NOTE_ACCEPTED', brick: newBrick, points: notePoints });
    pauseStartTimeRef.current = Date.now();
    holdStartRef.current = null;
    noteStartTimeRef.current = null;
    accumulatedInRangeRef.current = 0;
    noteSamplesRef.current = [];

    return false; // not ended
  }, [bricks.length, instability, scale, noCollapse, stopGame, currentNote, currentNoteIndex, COLLAPSE_THRESHOLD]);

  // Helper to accept a completed note (shared between practice and test modes)
  const acceptNote = useCallback(() => {
    const GOOD = GOOD_THRESHOLD;
    const E = trimmedMeanAbs(noteSamplesRef.current, settings.trimTop);

    // Keep sign logic for visuals (brick angle/color)
    const bias = noteSamplesRef.current.reduce((sum, c) => sum + c, 0);
    const signedError = E * (bias > 0 ? 1 : -1);

    // Compute points for this note (two-part: accuracy + bonus)
    const basePts = notePointsFromE(E, GOOD, settings);

    // Streak multiplier from tiers
    const isOk = E < OK_THRESHOLD;
    const oldStreak = goodStreakRef.current;
    const tier = isOk ? MULTIPLIER_TIERS.find(t => oldStreak >= t.streak) : undefined;
    const multiplier = tier ? tier.multiplier : 1;
    const pts = basePts * multiplier;

    if (isOk) {
      goodStreakRef.current = oldStreak + 1;
    } else {
      goodStreakRef.current = 0;
    }

    // Debug logging for calibration (dev only)
    if (import.meta.env.DEV) {
      const tauAcc = settings.tauMultiplier * GOOD;
      const tauBonus = settings.bonusTauMultiplier * GOOD;
      const accTerm = settings.basePointsPerNote * Math.exp(-Math.pow(E / tauAcc, settings.scoreExponentP));
      const bonusTerm = settings.bonusWeight * Math.log(1 + Math.pow(tauBonus / (E + settings.bonusEpsilonCents), settings.bonusExponentQ));
      console.log('[Score Debug]', {
        sampleCount: noteSamplesRef.current.length,
        E: E.toFixed(2),
        tauAcc: tauAcc.toFixed(2),
        tauBonus: tauBonus.toFixed(2),
        accuracy: accTerm.toFixed(1),
        bonus: bonusTerm.toFixed(1),
        basePts: basePts.toFixed(1),
        multiplier,
        streak: goodStreakRef.current,
        pts: pts.toFixed(1),
        signedError: signedError.toFixed(2),
      });
    }

    return handleAddNote(pts, signedError, multiplier > 1 ? multiplier : undefined, basePts);
  }, [handleAddNote, settings, GOOD_THRESHOLD, OK_THRESHOLD]);

  // Advance autoplay to the next note
  const advanceAutoplayNote = useCallback((noteError: number) => {
    if (!isAutoplayMode) return;

    const nextIndex = currentNoteIndex + 1; // next note to play
    const ended = handleAddNote(0, noteError);
    if (ended) {
      dispatch({ type: 'SET_AUTOPLAY', active: false });
      return;
    }

    // Prepare for next autoplay note
    autoplayNoteStartTimeRef.current = null;
    autoplayTimeoutRef.current = setTimeout(() => {
      latestHoldProgressRef.current = 0;
      autoplayNoteStartTimeRef.current = Date.now();
      const nextTargetFrequency = NOTE_FREQUENCIES[scale.notes[nextIndex]];
      if (nextTargetFrequency) {
        void playTone(nextTargetFrequency, HOLD_DURATION / 1000);
      }
    }, PAUSE_BETWEEN_NOTES);
  }, [isAutoplayMode, currentNoteIndex, scale, handleAddNote, HOLD_DURATION, PAUSE_BETWEEN_NOTES]);

  // Game logic callback passed to the audio hook — runs on every pitch sample (~25ms)
  const handlePitchDetected = useCallback((pitch: number | null) => {
    // Flag to prevent double-acceptance in same tick
    // (reset implicitly: each call is a new invocation)

    // Handle autoplay note completion
    if (isAutoplayMode && autoplayNoteStartTimeRef.current) {
      const autoplayElapsed = Date.now() - autoplayNoteStartTimeRef.current;
      latestHoldProgressRef.current = Math.min(autoplayElapsed / HOLD_DURATION, 1);
      if (autoplayElapsed >= HOLD_DURATION) {
        const noteError = noteSamplesRef.current.length > 0
          ? trimmedMeanAbs(noteSamplesRef.current, settings.trimTop) * (noteSamplesRef.current.reduce((sum, c) => sum + c, 0) > 0 ? 1 : -1)
          : 0;
        noteSamplesRef.current = [];
        advanceAutoplayNote(noteError);
        autoplayNoteStartTimeRef.current = null;
        latestHoldProgressRef.current = 0;
        return;
      }
    }

    // Fluency tracking: only start counting after the first in-tune sample
    if (pitch !== null && pitch > 150 && pitch < 1500) {
      const prevNoteFreq = currentNoteIndex > 0 ? NOTE_FREQUENCIES[scale.notes[currentNoteIndex - 1]] : null;
      const nextNoteFreq = targetFrequency;
      const nearPrev = prevNoteFreq ? Math.abs(getCents(pitch, prevNoteFreq)) < OK_THRESHOLD : false;
      const nearNext = nextNoteFreq ? Math.abs(getCents(pitch, nextNoteFreq)) < OK_THRESHOLD : false;
      if (nearPrev || nearNext) {
        fluencyStartedRef.current = true;
        fluencyInTuneSamplesRef.current += 1;
      }
    }
    if (fluencyStartedRef.current) {
      fluencyTotalSamplesRef.current += 1;
    }

    // Handle pause between notes (display only — fluency already tracked above)
    if (isPausedBetweenNotes && pauseStartTimeRef.current) {
      const pauseElapsed = Date.now() - pauseStartTimeRef.current;
      if (pauseElapsed >= PAUSE_BETWEEN_NOTES) {
        holdStartRef.current = null;
        noteStartTimeRef.current = null;
        accumulatedInRangeRef.current = 0;
        noteSamplesRef.current = [];
        latestHoldProgressRef.current = 0;
        dispatch({ type: 'EXIT_PAUSE' });
        pauseStartTimeRef.current = null;
      }
      return;
    }

    if (isPausedBetweenNotes) return;

    const pauseInRangeTimer = () => {
      if (noteStartTimeRef.current) {
        accumulatedInRangeRef.current += Date.now() - noteStartTimeRef.current;
        noteStartTimeRef.current = null;
      }
    };

    if (pitch !== null && pitch > 150 && pitch < 1500) {
      latestPitchRef.current = pitch;
      const cents = getCents(pitch, targetFrequency);
      latestCentsRef.current = cents;

      const withinSameNote = Math.abs(cents) < GAME_CONFIG.SAME_NOTE_THRESHOLD;

      if (withinSameNote) {
        noteSamplesRef.current.push(cents);

        if (!noteStartTimeRef.current) {
          noteStartTimeRef.current = Date.now();
        }

        if (gameMode === 'practice') {
          if (Math.abs(cents) < OK_THRESHOLD) {
            if (!holdStartRef.current) {
              holdStartRef.current = Date.now();
            }
            const holdTime = Date.now() - holdStartRef.current;
            if (!isAutoplayMode) {
              latestHoldProgressRef.current = Math.min(holdTime / HOLD_DURATION, 1);
            }
            if (holdTime >= HOLD_DURATION) {
              acceptNote();
            }
          } else {
            holdStartRef.current = null;
            latestHoldProgressRef.current = 0;
          }
        } else {
          const elapsedInRange = accumulatedInRangeRef.current + (noteStartTimeRef.current ? Date.now() - noteStartTimeRef.current : 0);
          if (!isAutoplayMode) {
            latestHoldProgressRef.current = Math.min(elapsedInRange / HOLD_DURATION, 1);
          }
          if (elapsedInRange >= HOLD_DURATION) {
            acceptNote();
          }
        }
      } else if (!isAutoplayMode) {
        pauseInRangeTimer();
        holdStartRef.current = null;
        latestHoldProgressRef.current = gameMode === 'test' ? Math.min(accumulatedInRangeRef.current / HOLD_DURATION, 1) : 0;
      }
    } else {
      latestPitchRef.current = null;
      if (!isAutoplayMode) {
        pauseInRangeTimer();
        holdStartRef.current = null;
        latestHoldProgressRef.current = gameMode === 'test' ? Math.min(accumulatedInRangeRef.current / HOLD_DURATION, 1) : 0;
      }
    }
  }, [isAutoplayMode, currentNoteIndex, scale, targetFrequency, isPausedBetweenNotes, gameMode,
      OK_THRESHOLD, HOLD_DURATION, PAUSE_BETWEEN_NOTES, settings.trimTop, advanceAutoplayNote, acceptNote]);

  // Audio engine hook: handles mic access, AudioContext, and the 25ms sampling interval
  const { error: audioError } = useAudioPitchDetection({
    enabled: isListening,
    onPitchDetected: handlePitchDetected,
  });

  // Surface mic permission errors from hook into game state
  useEffect(() => {
    if (audioError) {
      dispatch({ type: 'SET_ERROR', error: audioError });
    }
  }, [audioError]);

  // VISUAL UPDATE LOOP (rAF - may be throttled by iOS, but that's OK for visuals)
  // Reads from refs populated by the audio hook and updates React state for rendering
  useEffect(() => {
    if (!isListening) return;

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    const updateVisuals = () => {
      dispatch({ type: 'TICK', pitch: latestPitchRef.current, cents: latestCentsRef.current, holdProgress: latestHoldProgressRef.current });
      animationRef.current = requestAnimationFrame(updateVisuals);
    };

    animationRef.current = requestAnimationFrame(updateVisuals);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isListening]);

  // After game ends, calculate and save final score.
  useEffect(() => {
    if (gameState === 'collapsed' || gameState === 'success') {
      // Compute fluency fraction
      const fTotal = fluencyTotalSamplesRef.current;
      const fInTune = fluencyInTuneSamplesRef.current;
      const frac = fTotal > 0 ? fInTune / fTotal : 0;
      dispatch({ type: 'SET_FLUENCY', fraction: frac });
      const { totalScore } = getTotalScore(score, frac, settings);
      saveScore({
        datetime: new Date().toISOString(),
        scale: selectedScale,
        score: totalScore,
        result: gameState === 'collapsed' ? 'failed' : 'success',
      });
    }
  }, [gameState, score, selectedScale, settings]);


  // Version checking - periodically check for updates when on menu screen
  useEffect(() => {
    if (gameState !== 'menu') {
      return;
    }

    const currentBuildNumber = import.meta.env.VITE_BUILD_NUMBER || 'dev';
    
    const checkForUpdate = async () => {
      // Don't check in dev mode
      if (currentBuildNumber === 'dev') {
        return;
      }

      try {
        const baseUrl = import.meta.env.BASE_URL || '/';
        const versionUrl = `${baseUrl}version.json?t=${Date.now()}`; // Cache bust
        
        const response = await fetch(versionUrl, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!response.ok) {
          console.log('Version check failed - version.json not found');
          return;
        }

        const versionData = await response.json() as { buildNumber: string; buildDate: string; timestamp: number };
        const remoteBuildNumber = versionData.buildNumber;

        // Compare build numbers (they should be integers from GitHub run_number)
        const current = parseInt(currentBuildNumber, 10);
        const remote = parseInt(remoteBuildNumber, 10);

        if (!isNaN(remote) && !isNaN(current) && remote > current) {
          console.log(`Update available: ${current} -> ${remote}`);
          dispatch({ type: 'SET_UPDATE_AVAILABLE', available: true });
        } else {
          console.log(`No update available (current: ${current}, remote: ${remote})`);
        }
      } catch (error) {
        console.log('Error checking for updates:', error);
      }
    };

    // Check immediately when menu loads
    void checkForUpdate();

    // Check every 5 minutes while on menu
    const interval = setInterval(() => void checkForUpdate(), 300000);

    return () => clearInterval(interval);
  }, [gameState]);

  const getTuningIndicator = (): TuningIndicator => {
    const displayCents = isPausedBetweenNotes ? pauseAverageCents : (isAutoplayMode && !currentPitch ? 0 : currentCents);
    const absDisplayCents = Math.abs(displayCents);
    if (!currentPitch && !isPausedBetweenNotes && !isAutoplayMode) return { word: 'Play the note...', number: '', color: '#888' };
    if (isAutoplayMode && !currentPitch) return { word: 'Good!', number: '(+0¢)', color: getColorFromError(0) };
    
    const sign = displayCents >= 0 ? '+' : '';
    const centText = `(${sign}${Math.round(displayCents)}¢)`;
    
    if (absDisplayCents < GOOD_THRESHOLD) {
      return { word: 'Good!', number: centText, color: getColorFromError(0) };
    }
    if (absDisplayCents < OK_THRESHOLD) {
      return { word: 'OK...', number: centText, color: getColorFromError(displayCents) };
    }
    if (displayCents > 0) {
      return { word: 'Sharp', number: centText, color: getColorFromError(displayCents) };
    }
    return { word: 'Flat', number: centText, color: getColorFromError(displayCents) };
  };

  const tuning = getTuningIndicator();

  // Callbacks for MenuScreen
  const handleNoCollapseChange = (val: boolean) => {
    const newSettings = { ...settings, noCollapse: val };
    dispatch({ type: 'UPDATE_SETTINGS', settings: newSettings });
    saveSettings(newSettings);
  };

  const handleHideTunerChange = (val: boolean) => {
    const newSettings = { ...settings, hideTunerWhenPlaying: val };
    dispatch({ type: 'UPDATE_SETTINGS', settings: newSettings });
    saveSettings(newSettings);
  };

  const handleAutoReplayChange = (val: boolean) => {
    const newSettings = { ...settings, autoReplay: val };
    dispatch({ type: 'UPDATE_SETTINGS', settings: newSettings });
    saveSettings(newSettings);
  };

  // Callbacks for SettingsScreen
  const handleUpdateSetting = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    const newSettings = { ...settings, [key]: value };
    dispatch({ type: 'UPDATE_SETTINGS', settings: newSettings });
    saveSettings(newSettings);
    if (key === 'enabledScales') {
      const newScales = value as string[];
      if (!newScales.includes(selectedScale)) {
        dispatch({ type: 'SELECT_SCALE', scale: newScales[0] || 'G Major' });
      }
    }
  };

  const handleResetDefaults = () => {
    dispatch({ type: 'UPDATE_SETTINGS', settings: { ...DEFAULT_SETTINGS } });
    saveSettings({ ...DEFAULT_SETTINGS });
    dispatch({ type: 'SELECT_SCALE', scale: DEFAULT_SETTINGS.enabledScales[0] });
  };

  // Menu screen
  if (gameState === 'menu') {
    return (
      <MenuScreen
        settings={settings}
        selectedScale={selectedScale}
        noCollapse={noCollapse}
        hideTunerWhenPlaying={hideTunerWhenPlaying}
        error={error}
        updateAvailable={updateAvailable}
        onSelectScale={(scale) => dispatch({ type: 'SELECT_SCALE', scale })}
        onStart={(mode) => void startGame(mode)}
        onOpenSettings={() => dispatch({ type: 'SET_SCREEN', screen: 'settings' })}
        onOpenScores={() => dispatch({ type: 'SET_SCREEN', screen: 'scores' })}
        onNoCollapseChange={handleNoCollapseChange}
        onHideTunerChange={handleHideTunerChange}
        onAutoReplayChange={handleAutoReplayChange}
      />
    );
  }

   // Scores page
  if (gameState === 'scores') {
    return <ScoresScreen onBack={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })} />;
  }
  
  // Settings screen
  if (gameState === 'settings') {
    return (
      <SettingsScreen
        settings={settings}
        onUpdateSetting={handleUpdateSetting}
        onResetDefaults={handleResetDefaults}
        onDone={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })}
      />
    );
  }

  // Game screen (playing, collapsed, or success)
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      boxSizing: 'border-box',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px',
      paddingTop: 'max(16px, env(safe-area-inset-top))',
      paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
      paddingLeft: 'max(16px, env(safe-area-inset-left))',
      paddingRight: 'max(16px, env(safe-area-inset-right))',
      fontFamily: 'system-ui, sans-serif',
      gap: 8,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: 24 }}>{formatScaleName(selectedScale)}</h2>
        <div style={{ color: '#22e55f', fontSize: 20, fontWeight: 'bold', marginTop: 4 }}>
          Score: {score}
        </div>
        {/* Streak pips */}
        {gameState === 'playing' && (() => {
          const streak = goodStreakRef.current;
          const maxPips = MULTIPLIER_TIERS[0].streak; // 15
          // Build tier color map: pip index → color (tiers are highest-first, so iterate reversed)
          const sortedTiers = [...MULTIPLIER_TIERS].reverse(); // lowest-first: 5, 10, 15
          const pipColors: string[] = [];
          for (let i = 0; i < maxPips; i++) {
            const tier = sortedTiers.find(t => i < t.streak);
            pipColors.push(tier ? tier.color : sortedTiers[sortedTiers.length - 1].color);
          }
          const activeTier = MULTIPLIER_TIERS.find(t => streak >= t.streak);
          return (
            <div style={{ display: 'flex', gap: 3, justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
              <span style={{ fontSize: 11, color: '#878c94', marginRight: 2 }}>Streak:</span>
              {pipColors.map((color, i) => (
                <div key={i} style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  border: `1.5px solid ${color}`,
                  background: i < streak ? color : 'transparent',
                  opacity: i < streak ? 1 : 0.4,
                  transition: 'background 0.15s, opacity 0.15s',
                }} />
              ))}
              <span style={{
                  fontSize: 14,
                  fontWeight: 'bold',
                  color: activeTier ? activeTier.color : '#878c94',
                  marginLeft: 2,
                }}>
                  x{activeTier ? activeTier.multiplier : 1}
                </span>
            </div>
          );
        })()}
      </div>

      {/* Current note display */}
      {gameState === 'playing' && (
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: '4px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}>
          <p style={{ color: '#94a3b8', margin: '0 0 -32px 0', fontSize: 14 }}>
            Note {currentNoteIndex + 1} of {scale.notes.length}
          </p>
          {/* Top row: Note name and stave */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: 36, fontWeight: 'bold', minWidth: 80 }}>
                {currentNote ? formatNoteDisplay(currentNote) : ''}
              </div>
              <button
                onClick={() => void playTone(targetFrequency)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 30,
                  cursor: 'pointer',
                  padding: '8px',
                  marginTop: -12,
                  transition: 'transform 0.1s',
                }}
                onMouseDown={(e) => {
                  (e.target as HTMLElement).style.transform = 'scale(0.9)';
                }}
                onMouseUp={(e) => {
                  (e.target as HTMLElement).style.transform = 'scale(1)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.transform = 'scale(1)';
                }}
                title={`${Math.round(targetFrequency)} Hz`}
              >
                🔊
              </button>
            </div>
            {/* Stave display */}
            <StaveNoteDisplay note={currentNote} keySignature={getKeySignatureForScale(selectedScale)} />
          </div>

          {/* Bottom row: Tuning feedback and progress */}
          <div style={{ textAlign: 'center', marginTop: '-38px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: 150,
              color: (hideTunerWhenPlaying && !isPausedBetweenNotes && !isAutoplayMode) ? '#888' : tuning.color,
              fontSize: 18,
              fontWeight: 'bold',
            }}>
              <span>{(hideTunerWhenPlaying && !isPausedBetweenNotes && !isAutoplayMode) ? 'Play the note...' : tuning.word}</span>
              { !((hideTunerWhenPlaying && !isPausedBetweenNotes && !isAutoplayMode)) && tuning.number && <span style={{ fontFamily: 'monospace' }}>{tuning.number}</span>}
            </div>

            {/* Hold progress bar */}
            <div style={{
              width: 150,
              height: 8,
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 4,
              marginTop: 8,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${holdProgress * 100}%`,
                height: '100%',
                background: '#fff',
                transition: 'width 0.05s ease-out',
              }} />
            </div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
              {isAutoplayMode ? 'Autoplay...' : (gameMode === 'practice' ? 'Hold in tune...' : 'Playing note...')}
            </div>
          </div>
        </div>
      )}

      {/* Instability meter */}
      <div style={{
        width: '100%',
        maxWidth: 200,
        flexShrink: 0,
      }}>
        <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, textAlign: 'center' }}>
          Tower Wobble
        </div>
        <div style={{
          width: '100%',
          height: 12,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 6,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.min(100, (instability / (COLLAPSE_THRESHOLD * scale.notes.length)) * 100)}%`,
            height: '100%',
            background: getColorFromError(instability / (COLLAPSE_THRESHOLD * scale.notes.length ) * 50),
            transition: 'all 0.4s ease',
          }} />
        </div>
      </div>

      {/* Pitch indicator and Tower side by side - flex grow for spacing */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 16,
        flex: 1,
        minHeight: 100,
      }}>
        {/* Pitch indicator - always visible during gameplay */}
        {gameState === 'playing' && (
          <div style={{ opacity: (hideTunerWhenPlaying && !isPausedBetweenNotes) ? 0.3 : (isPausedBetweenNotes || currentPitch ? 1 : 0.3), flexShrink: 1}}>
            <PitchIndicator cents={(hideTunerWhenPlaying && !isPausedBetweenNotes) ? 0 : (isPausedBetweenNotes ? pauseAverageCents : (currentPitch ? currentCents : 0))} />
          </div>
        )}

        {/* Tower */}
        <div style={{
          position: 'relative',
          width: 140,
          height: 'auto',
          maxHeight: 350,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          flexShrink: 1,
        }}>
          {/* Ground */}
          <div style={{
            position: 'absolute',
            bottom: -10,
            width: 120,
            height: 20,
            background: 'linear-gradient(to top, #4a3728, #5c4333)',
            borderRadius: 4,
          }} />

          {/* Bricks */}
          {gameState === 'collapsed' ? (
            bricks.map((brick, i) => (
              <FallingBrick key={i} brick={brick} startTime={collapseTime!} />
            ))
          ) : (
            bricks.map((brick, i) => {
              const cumulativeError = bricks.slice(0, i).reduce((sum, b) => sum + b.error, 0);
              const brickHeight = 16;
              const brickY = i * (brickHeight + 2);
              const pts = brick.points;
              const displayPts = brick.basePoints ?? pts;
              const pointsFontSize = pts && pts > 0 ? Math.max(8, Math.min(20, 4 * Math.log(pts + 1))) : 0;
              return (
                <React.Fragment key={i}>
                  <Brick
                    index={brick.index}
                    angle={brick.angle}
                    color={brick.color}
                    isLatest={i === bricks.length - 1}
                    cumulativeError={cumulativeError}
                    note={brick.note}
                  />
                  {pts !== undefined && pts > 0 && (
                    <div style={{
                      position: 'absolute',
                      bottom: brickY,
                      left: '100%',
                      marginLeft: -4,
                      height: brickHeight,
                      display: 'flex',
                      alignItems: 'center',
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                    }}>
                      <span style={{
                        display: 'inline-block',
                        minWidth: 28,
                        textAlign: 'right',
                        fontSize: pointsFontSize,
                        color: brick.color,
                        fontWeight: 'bold',
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      }}>
                        {Math.round(displayPts!)}
                      </span>
                      {brick.multiplier && brick.multiplier > 1 && (
                        <span style={{
                          fontSize: pointsFontSize * 0.85,
                          color: (MULTIPLIER_TIERS.find(t => t.multiplier === brick.multiplier) || MULTIPLIER_TIERS[MULTIPLIER_TIERS.length - 1]).color,
                          fontWeight: 'bold',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                          marginLeft: 2,
                        }}>
                          x{brick.multiplier}
                        </span>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>

      {/* Game over states */}
      {gameState === 'collapsed' && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <h2 style={{ color: '#f87171', fontSize: 28 }}>Tower Collapsed!</h2>
          <ScoreSummary
            score={score}
            fluencyFraction={fluencyFraction}
            settings={settings}
            instability={instability}
            COLLAPSE_THRESHOLD={COLLAPSE_THRESHOLD}
            scale={scale}
            variant="collapsed"
            selectedScale={selectedScale}
            currentNoteIndex={currentNoteIndex}
          />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16, maxWidth: 300 }}>
            <button
              onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })}
              style={{
                flex: 1,
                width: '150px',
                padding: '12px 24px',
                fontSize: 16,
                borderRadius: 8,
                border: 'none',
                background: '#475569',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Menu
            </button>
            <button
              onClick={() => void startGame(gameMode)}
              style={{
                flex: 1,
                width: '150px',
                padding: '12px 24px',
                fontSize: 16,
                borderRadius: 8,
                border: 'none',
                background: `linear-gradient(to right, #f87171 ${replayProgress * 100}%, #475569 ${replayProgress * 100}%)`,
                color: '#fff',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {gameState === 'success' && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <h2 style={{ color: '#22e55f', fontSize: 28 }}>🎉 Completed Scale!</h2>
          <ScoreSummary
            score={score}
            fluencyFraction={fluencyFraction}
            settings={settings}
            instability={instability}
            COLLAPSE_THRESHOLD={COLLAPSE_THRESHOLD}
            scale={scale}
            variant="success"
            selectedScale={selectedScale}
            currentNoteIndex={currentNoteIndex}
          />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16, maxWidth: 300 }}>
            <button
              onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })}
              style={{
                flex: 1,
                width: '150px',
                padding: '12px 24px',
                fontSize: 16,
                borderRadius: 8,
                border: 'none',
                background: '#475569',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Menu
            </button>
            <button
              onClick={() => void startGame(gameMode)}
              style={{
                flex: 1,
                width: '150px',
                padding: '12px 24px',
                fontSize: 16,
                borderRadius: 8,
                border: 'none',
                background: `linear-gradient(to right, #22c55e ${replayProgress * 100}%, #475569 ${replayProgress * 100}%)`,
                color: '#fff',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Buttons during play */}
      {gameState === 'playing' && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16, maxWidth: 450, flexShrink: 0 }}>
          <button
            onClick={() => { stopGame(); dispatch({ type: 'SET_SCREEN', screen: 'menu' }); }}
            style={{
              flex: 1,
              width: '100px',
              padding: '12px 24px',
              fontSize: 16,
              borderRadius: 8,
              border: 'none',
              background: '#475569',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Menu
          </button>
          <button
            onClick={() => isAutoplayMode ? stopAutoplay() : void startAutoplay()}
            style={{
              flex: 1,
              width: '100px',
              padding: '12px 24px',
              fontSize: 16,
              borderRadius: 8,
              border: 'none',
              background: isAutoplayMode ? '#f59e0b' : '#10b981',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {isAutoplayMode ? 'Pause' : 'Autoplay'}
          </button>
          <button
            onClick={() => void startGame(gameMode)}
            style={{
              flex: 1,
              width: '100px',
              padding: '12px 24px',
              fontSize: 16,
              borderRadius: 8,
              border: 'none',
              background: '#3b82f6',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Restart
          </button>
        </div>
      )}
    </div>
  );
}

