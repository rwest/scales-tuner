import { ReactNode } from 'react';
import type { PitchIndicatorProps } from '../types';

export default function PitchIndicator({ cents }: PitchIndicatorProps): ReactNode {
  const maxCents = 50; // +/- 50 cents range
  const clampedCents = Math.max(-maxCents, Math.min(maxCents, cents));
  const position = 50 - (clampedCents / maxCents) * 50; // 0-100%, inverted (0 = top = sharp)

  return (
    <div style={{
      position: 'relative',
      width: 60,
      height: 200,
      borderRadius: 30,
      overflow: 'hidden',
      boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    }}>
      {/* Gradient bar */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(to bottom, #ef4444 0%, #22e55f 50%, #2a7afbff 100%)',
      }} />

      {/* Center line */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        height: 2,
        background: 'rgba(255,255,255,0.8)',
        transform: 'translateY(-50%)',
      }} />

      {/* Moving circle indicator */}
      <div style={{
        position: 'absolute',
        top: `${position}%`,
        left: '50%',
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'white',
        border: '3px solid rgba(0,0,0,0.5)',
        transform: 'translate(-50%, -50%)',
        transition: 'top 0.05s ease-out',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}
