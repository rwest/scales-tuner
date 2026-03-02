import { ReactNode } from 'react';
import type { BrickProps } from '../types';
import { formatNoteDisplay } from '../utils/formatting';

export default function Brick({ index, angle, isLatest, opacity = 1, color, cumulativeError = 0, note }: BrickProps): ReactNode {
  const width = 60;
  const height = 16;
  const y = index * (height + 2);
  const xOffset = cumulativeError * 0.3; // Scale factor for visual effect

  return (
    <div
      style={{
        position: 'absolute',
        bottom: y,
        left: `calc(50% + ${xOffset}px)`,
        width: width,
        height: height,
        backgroundColor: color,
        border: '2px solid rgba(0,0,0,0.3)',
        borderRadius: 3,
        transform: `translateX(-50%) rotate(${angle}deg)`,
        transformOrigin: 'center bottom',
        transition: isLatest ? 'none' : 'all 0.3s ease',
        boxShadow: isLatest ? '0 0 10px rgba(255,255,255,0.5)' : '1px 2px 3px rgba(0,0,0,0.2)',
        opacity,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        color: 'rgba(0, 0, 0, 0.4)',
        fontWeight: 'bold',
      }}
    >
      {note ? formatNoteDisplay(note) : ''}
    </div>
  );
}
