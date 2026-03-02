import { useState, ReactNode } from 'react';
import type { ScoreEntry } from '../types';
import { loadScores, clearScores } from '../game/scores';
import { formatScaleName } from '../utils/formatting';

interface ScoresScreenProps {
  onBack: () => void;
}

export default function ScoresScreen({ onBack }: ScoresScreenProps): ReactNode {
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  // Re-render trigger after clearing scores
  const [, setRefresh] = useState<number>(0);

  // Group scores by date string (e.g., 'February 27')
  const scores = loadScores().reverse();
  const dateGroups: { [date: string]: ScoreEntry[] } = {};
  for (const entry of scores) {
    const d = new Date(entry.datetime);
    const dateStr = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
    if (!dateGroups[dateStr]) dateGroups[dateStr] = [];
    dateGroups[dateStr].push(entry);
  }
  // Sort dates descending (newest first)
  const sortedDates = Object.keys(dateGroups).sort((a, b) => {
    // Parse month/day for comparison
    const parse = (s: string) => {
      const [month, day] = s.split(' ');
      return [new Date(`${month} 1, 2000`).getMonth(), parseInt(day, 10)];
    };
    const [ma, da] = parse(a);
    const [mb, db] = parse(b);
    if (ma !== mb) return mb - ma;
    return db - da;
  });

  return (
    <div style={{
      minHeight: '100vh',
      maxHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: 20,
      fontFamily: 'system-ui, sans-serif',
      overflowY: 'auto',
      boxSizing: 'border-box',
    }}>
      <h1 style={{ color: '#fff', fontSize: 28, marginBottom: 12 }}>📈 Scores</h1>
      <div style={{ width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 0, marginBottom: 24 }}>
        {sortedDates.length === 0 && (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: 32, fontSize: 18 }}>
            No scores yet.
          </div>
        )}
        {sortedDates.map(dateStr => (
          <div key={dateStr} style={{ marginBottom: 0 }}>
            <div style={{ color: '#facc15', fontWeight: 600, fontSize: 18, padding: '18px 24px 6px 24px', borderBottom: '1px solid #334155', background: 'rgba(255,255,255,0.04)' }}>{dateStr}</div>
            {dateGroups[dateStr].map((entry, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderBottom: i === dateGroups[dateStr].length - 1 ? 'none' : '1px solid #334155', background: entry.result === 'failed' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)' }}>
                <span style={{ color: '#fff', fontWeight: 500 }}>{formatScaleName(entry.scale)}</span>
                <span style={{ color: entry.result === 'failed' ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{entry.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <button
          onClick={onBack}
          style={{
            padding: '12px 24px',
            fontSize: 18,
            borderRadius: 8,
            border: 'none',
            background: '#334155',
            color: '#fff',
            cursor: 'pointer',
            width: '100%',
            marginBottom: 8,
          }}
        >
          ← Menu
        </button>
        <button
          onClick={() => setShowClearConfirm(true)}
          style={{
            padding: '12px 24px',
            fontSize: 18,
            borderRadius: 8,
            border: 'none',
            background: '#ef4444',
            color: '#fff',
            cursor: 'pointer',
            width: '100%',
            marginBottom: 8,
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(239,68,68,0.12)',
          }}
        >
          Clear Scores
        </button>
      </div>
      {/* Confirmation pop-up */}
      {showClearConfirm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 32, boxShadow: '0 4px 32px rgba(0,0,0,0.25)', minWidth: 280, maxWidth: '90vw', textAlign: 'center' }}>
            <div style={{ color: '#fff', fontSize: 20, marginBottom: 18, fontWeight: 600 }}>Clear all scores?</div>
            <div style={{ color: '#94a3b8', fontSize: 15, marginBottom: 24 }}>This cannot be undone.</div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button
                onClick={() => { clearScores(); setShowClearConfirm(false); setRefresh(n => n + 1); }}
                style={{ padding: '10px 24px', fontSize: 16, borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Yes, clear
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{ padding: '10px 24px', fontSize: 16, borderRadius: 8, border: 'none', background: '#334155', color: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
