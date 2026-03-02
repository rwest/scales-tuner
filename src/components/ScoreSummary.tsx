import React, { useState, useEffect, ReactNode } from 'react';
import type { GameSettings, Scale } from '../types';
import { getTotalScore } from '../game/scoring';

export interface ScoreSummaryProps {
  score: number;
  fluencyFraction: number;
  settings: GameSettings;
  instability: number;
  COLLAPSE_THRESHOLD: number;
  scale: Scale;
  variant: 'collapsed' | 'success';
  selectedScale: string;
  currentNoteIndex: number;
}

export default function ScoreSummary({
  score,
  fluencyFraction,
  settings,
  instability,
  COLLAPSE_THRESHOLD,
  scale,
  variant,
  selectedScale,
  currentNoteIndex,
}: ScoreSummaryProps): ReactNode {
  const showStability = variant === 'success';
  const showCompleted = variant === 'success';
  const showMadeIt = variant === 'collapsed';
  const stability = Math.round((1 - instability / (COLLAPSE_THRESHOLD * scale.notes.length)) * 100);
  const { totalScore, bonusPercent } = getTotalScore(score, fluencyFraction, settings);
  // Animation state
  const [showBase, setShowBase] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [showTotal, setShowTotal] = useState(false);
  const [displayedTotal, setDisplayedTotal] = useState(score);

  useEffect(() => {
    setShowBase(false);
    setShowBonus(false);
    setShowTotal(false);
    setDisplayedTotal(score);
    const t1 = setTimeout(() => setShowBase(true), 500);
    const t2 = setTimeout(() => setShowBonus(true), 1500);
    const t3 = setTimeout(() => setShowTotal(true), 2500);
    let timerId: number | undefined;
    if (settings.fluencyWeight > 0) {
      setDisplayedTotal(score); // start at base
      setTimeout(() => {
        const duration = 1280; // ms for count up
        const steps = 64;
        const stepTime = duration / steps;
        const increment = (totalScore - score) / steps;
        let current = score;
        let count = 0;
        timerId = setInterval(() => {
          count++;
          current += increment;
          if (count >= steps) {
            setDisplayedTotal(totalScore);
            if (timerId !== undefined) clearInterval(timerId);
          } else {
            setDisplayedTotal(Math.round(current));
          }
        }, stepTime);
      }, 3000);
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (timerId !== undefined) clearInterval(timerId);
    };

  }, [score, totalScore, settings.fluencyWeight, fluencyFraction, settings.fluencyThreshold]);

  return (
    <>
      {showMadeIt && (
        <p style={{ color: '#94a3b8' }}>
          Made it to note {currentNoteIndex + 1} of {scale.notes.length}
        </p>
      )}
      {showCompleted && (
        <p style={{ color: '#94a3b8' }}>
          Completed {selectedScale}
        </p>
      )}
      <div style={{
        color: '#fff', fontSize: 24, marginTop: 8,
        opacity: showBase ? 1 : 0,
        transform: showBase ? 'translateX(0)' : 'translateX(-40px)',
        transition: 'opacity 0.3s, transform 0.4s',
      }}>
        Base Score: <span style={{ fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>{score}</span>
      </div>
      {settings.fluencyWeight > 0 && (
        <>
          <div style={{
            color: '#fa6a6a', fontSize: 18, marginTop: 4,
            opacity: showBonus ? 1 : 0,
            transform: showBonus ? 'translateX(0)' : 'translateX(-40px)',
            transition: 'opacity 0.3s, transform 0.4s',
          }}>
            Fluency Bonus: +{bonusPercent}%
          </div>
          <div style={{
            color: '#22e55f', fontSize: 36, fontWeight: 'bold', marginTop: 8,
            opacity: showTotal ? 1 : 0,
            transform: showTotal ? 'translateX(0)' : 'translateX(-40px)',
            transition: 'opacity 0.3s, transform 0.4s',
          }}>
            Total Score: <span style={{ fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>{displayedTotal}</span>
          </div>
        </>
      )}
      {showStability && (
        <p style={{ color: '#94a3b8', marginTop: 4 }}>
          Tower stability: {stability}%
        </p>
      )}
    </>
  );
}
