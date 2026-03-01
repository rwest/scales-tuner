import { ReactNode } from 'react';
import type { GameSettings, GameMode } from '../types';
import { SCALES } from '../game/scales';
import { formatScaleName, isIPhoneNotStandalone } from '../utils/formatting';

interface MenuScreenProps {
  settings: GameSettings;
  selectedScale: string;
  noCollapse: boolean;
  hideTunerWhenPlaying: boolean;
  error: string | null;
  updateAvailable: boolean;
  onSelectScale: (scale: string) => void;
  onStart: (mode: GameMode) => void;
  onOpenSettings: () => void;
  onOpenScores: () => void;
  onNoCollapseChange: (val: boolean) => void;
  onHideTunerChange: (val: boolean) => void;
  onAutoReplayChange: (val: boolean) => void;
}

export default function MenuScreen({
  settings,
  selectedScale,
  noCollapse,
  hideTunerWhenPlaying,
  error,
  updateAvailable,
  onSelectScale,
  onStart,
  onOpenSettings,
  onOpenScores,
  onNoCollapseChange,
  onHideTunerChange,
  onAutoReplayChange,
}: MenuScreenProps): ReactNode {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: 20,
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ flex: 1 }} />
      <h1 style={{ color: '#fff', fontSize: 32, marginBottom: 8 }}>🎻 Scale Tower</h1>
      <p style={{ color: '#94a3b8', marginBottom: 32, textAlign: 'center' }}>
        Play each note in tune to stack bricks.<br />
        Sloppy notes make the tower wobbly!
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        <div>
          <label style={{ color: '#fff', display: 'block', marginBottom: 8 }}>Select Scale:</label>
          <select
            value={selectedScale}
            onChange={(e) => onSelectScale(e.target.value)}
            style={{
              padding: '12px 24px',
              fontSize: 18,
              borderRadius: 8,
              border: 'none',
              background: '#334155',
              color: '#fff',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            {Object.keys(SCALES).filter(name => settings.enabledScales.includes(name)).map(name => (
              <option key={name} value={name}>{formatScaleName(name)}</option>
            ))}
          </select>
        </div>
        <label style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={noCollapse}
            onChange={(e) => onNoCollapseChange(e.target.checked)}
            style={{ width: 24, height: 24 }}
          />
          Keep tower from collapsing
        </label>
        <label style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={hideTunerWhenPlaying}
            onChange={(e) => onHideTunerChange(e.target.checked)}
            style={{ width: 24, height: 24 }}
          />
          Hide tuner when playing
        </label>
        <label style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={settings.autoReplay}
            onChange={(e) => onAutoReplayChange(e.target.checked)}
            style={{ width: 24, height: 24 }}
          />
          Auto-replay
        </label>
        <button
          onClick={onOpenScores}
          style={{
            marginTop: 8,
            padding: '8px 16px',
            fontSize: 18,
            borderRadius: 8,
            border: 'none',
            background: '#334155',
            color: '#fff',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            display: 'flex',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 20 }}>🥇</span> Scores
        </button>
        <button
          onClick={onOpenSettings}
          style={{
            marginTop: 8,
            padding: '8px 16px',
            fontSize: 18,
            borderRadius: 8,
            border: 'none',
            background: '#334155',
            color: '#fff',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <span style={{ fontSize: 20 }}>⚙️</span> Settings
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <button
          onClick={() => onStart('practice')}
          style={{
            flex: 1,
            width: 160,
            padding: '16px 24px',
            fontSize: 20,
            fontWeight: 'bold',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #22e55f 0%, #16c75c 100%)',
            color: '#fff',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(74, 222, 128, 0.4)',
          }}
        >
          Practice
        </button>
        <button
          onClick={() => onStart('test')}
          style={{
            flex: 1,
            width: 160,
            padding: '16px 24px',
            fontSize: 20,
            fontWeight: 'bold',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#fff',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
          }}
        >
          Test
        </button>
      </div>

      {error && (
        <p style={{ color: '#f87171', marginTop: 16, textAlign: 'center' }}>{error}</p>
      )}

      <p style={{ color: '#64748b', marginTop: 32, fontSize: 14 }}>
        Requires microphone access
      </p>
      <div style={{ flex: 3 }} />

      <p style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>
        {import.meta.env.VITE_BUILD_NUMBER ? `v${import.meta.env.VITE_BUILD_NUMBER}` : 'dev'} • {__BUILD_DATE__}
      </p>

      {updateAvailable && (
        <div style={{
          marginBottom: 16,
          padding: '12px 20px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: 12,
          color: '#fff',
          textAlign: 'center',
          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
          maxWidth: 320,
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
            🎉 Update Available!
          </div>
          <div style={{ fontSize: 14, marginBottom: 12 }}>
            A new version is available
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 24px',
              fontSize: 16,
              fontWeight: 'bold',
              borderRadius: 8,
              border: 'none',
              background: '#fff',
              color: '#059669',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
          >
            Reload Now
          </button>
        </div>
      )}

      {isIPhoneNotStandalone() && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          right: 20,
          background: 'linear-gradient(135deg, #7594a2ff 0%, #416c74ff 100%)',
          padding: '12px 20px',
          borderRadius: 12,
          color: '#fff',
          fontSize: 14,
          textAlign: 'center',
          boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)',
          maxWidth: 'calc(100% - 40px)',
        }}>
          <div>Install for full-screen benefits!</div>
          <div>Tap <svg style={{ display: 'inline-block', width: '1.5em', height: '1.5em', verticalAlign: 'middle', marginLeft: 4, marginRight: 4 }} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M5.5 23c-0.4 0 -0.75 -0.15 -1.05 -0.45 -0.3 -0.3 -0.45 -0.65 -0.45 -1.05V8.775c0 -0.4 0.15 -0.75 0.45 -1.05 0.3 -0.3 0.65 -0.45 1.05 -0.45h4.225v1.5H5.5V21.5h13V8.775h-4.275v-1.5H18.5c0.4 0 0.75 0.15 1.05 0.45 0.3 0.3 0.45 0.65 0.45 1.05V21.5c0 0.4 -0.15 0.75 -0.45 1.05 -0.3 0.3 -0.65 0.45 -1.05 0.45H5.5Zm5.725 -7.675V3.9l-2.2 2.2 -1.075 -1.075L11.975 1 16 5.025l-1.075 1.075 -2.2 -2.2v11.425h-1.5Z" strokeWidth="0.5"></path>
          </svg> then "Add to Home Screen"</div>
        </div>
      )}
    </div>
  );
}
