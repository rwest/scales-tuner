import { useState, useEffect, ReactNode } from 'react';
import type { FallingBrickProps } from '../types';
import { formatNoteDisplay } from '../utils/formatting';

export default function FallingBrick({ brick, startTime }: FallingBrickProps): ReactNode {
  const [pos, setPos] = useState<{ x: number; y: number; rotation: number }>({ x: 0, y: 0, rotation: brick.angle });

  useEffect(() => {
    const startY = brick.index * 18;
    const direction = brick.angle > 0 ? 1 : -1;
    const pauseDuration = 0.4; // seconds to pause before falling
    const easeInDuration = 0.3; // seconds to ease into the fall
    let frame: number;

    const animate = () => {
      const totalElapsed = (Date.now() - startTime) / 1000;
      
      // Pause at the beginning
      if (totalElapsed < pauseDuration) {
        setPos({ x: 0, y: startY, rotation: brick.angle });
        frame = requestAnimationFrame(animate);
        return;
      }

      const elapsed = totalElapsed - pauseDuration;
      
      // Apply ease-in curve for the first part of the animation
      let easeFactor = 1;
      if (elapsed < easeInDuration) {
        // Cubic ease-in: starts slow, speeds up
        const t = elapsed / easeInDuration;
        easeFactor = t * t * t;
      }

      const gravity = 400 * easeFactor;
      const horizontalSpeed = direction * 50 * Math.abs(brick.angle) / 10 * easeFactor;

      setPos({
        x: horizontalSpeed * elapsed,
        y: startY - (gravity * elapsed * elapsed),
        rotation: brick.angle + direction * elapsed * 180,
      });

      if (totalElapsed < 2.5) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [brick, startTime]);

  if (pos.y < -200) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: pos.y,
        left: `calc(50% + ${pos.x}px)`,
        width: 60,
        height: 16,
        backgroundColor: brick.color,
        border: '2px solid rgba(0,0,0,0.3)',
        borderRadius: 3,
        transform: `translateX(-50%) rotate(${pos.rotation}deg)`,
        opacity: 0.8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        color: 'rgba(0, 0, 0, 0.4)',
        fontWeight: 'bold',
      }}
    >
      {brick.note ? formatNoteDisplay(brick.note) : ''}
    </div>
  );
}
