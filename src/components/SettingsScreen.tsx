import { useState, ReactNode } from 'react';
import type { GameSettings } from '../types';
import { SCALES } from '../game/scales';
import { DEFAULT_SETTINGS, SETTINGS_RANGES } from '../game/settings';
import { formatScaleName } from '../utils/formatting';

interface SettingsScreenProps {
  settings: GameSettings;
  onUpdateSetting: <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => void;
  onResetDefaults: () => void;
  onDone: () => void;
}

export default function SettingsScreen({
  settings,
  onUpdateSetting,
  onResetDefaults,
  onDone,
}: SettingsScreenProps): ReactNode {
  const [showAdvancedScoring, setShowAdvancedScoring] = useState<boolean>(false);

  const toggleScale = (scaleName: string) => {
    const current = settings.enabledScales;
    if (current.includes(scaleName)) {
      // Don't allow disabling the last scale
      if (current.length > 1) {
        onUpdateSetting('enabledScales', current.filter(s => s !== scaleName));
      }
    } else {
      onUpdateSetting('enabledScales', [...current, scaleName]);
    }
  };

  // Helper to calculate slider position (0-100) from value
  const getSliderPercent = (value: number, min: number, max: number) =>
    ((value - min) / (max - min)) * 100;

  return (
    <div style={{
      minHeight: '100vh',
      maxHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: 20,
      paddingBottom: 40,
      fontFamily: 'system-ui, sans-serif',
      overflowY: 'auto',
      boxSizing: 'border-box',
    }}>
      {/* Slider thumb styling for better touch targets on iOS */}
      <style>{`
        .settings-slider {
          -webkit-appearance: none;
          appearance: none;
          background: #475569;
          height: 8px;
          border-radius: 4px;
        }
        .settings-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .settings-slider::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .settings-slider::-moz-range-track {
          background: #475569;
          height: 8px;
          border-radius: 4px;
        }
      `}</style>
      <h1 style={{ color: '#fff', fontSize: 28, marginBottom: 24 }}>⚙️ Settings</h1>

      {/* Accuracy Slider (OK_THRESHOLD) */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>Accuracy Tolerance</span>
          <span style={{ color: '#94a3b8' }}>±{settings.okThreshold}¢</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#f87171', fontSize: 12 }}>Hard</span>
          <div style={{ flex: 1, position: 'relative', height: 24 }}>
            <input
              className="settings-slider"
              type="range"
              min={SETTINGS_RANGES.okThreshold.min}
              max={SETTINGS_RANGES.okThreshold.max}
              step={SETTINGS_RANGES.okThreshold.step}
              value={settings.okThreshold}
              onChange={(e) => onUpdateSetting('okThreshold', Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            {/* Default marker */}
            <div style={{
              position: 'absolute',
              left: `${getSliderPercent(DEFAULT_SETTINGS.okThreshold, SETTINGS_RANGES.okThreshold.min, SETTINGS_RANGES.okThreshold.max)}%`,
              top: -4,
              width: 2,
              height: 8,
              background: '#64748b',
              pointerEvents: 'none',
            }} />
          </div>
          <span style={{ color: '#22e55f', fontSize: 12 }}>Easy</span>
        </div>
      </div>

      {/* Tower Stability Slider (COLLAPSE_THRESHOLD) */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>Tower Stability</span>
          <span style={{ color: '#94a3b8' }}>{settings.collapseThreshold} pts/note</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#f87171', fontSize: 12 }}>Hard</span>
          <div style={{ flex: 1, position: 'relative', height: 24 }}>
            <input
              className="settings-slider"
              type="range"
              min={SETTINGS_RANGES.collapseThreshold.min}
              max={SETTINGS_RANGES.collapseThreshold.max}
              step={SETTINGS_RANGES.collapseThreshold.step}
              value={settings.collapseThreshold}
              onChange={(e) => onUpdateSetting('collapseThreshold', Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{
              position: 'absolute',
              left: `${getSliderPercent(DEFAULT_SETTINGS.collapseThreshold, SETTINGS_RANGES.collapseThreshold.min, SETTINGS_RANGES.collapseThreshold.max)}%`,
              top: -4,
              width: 2,
              height: 8,
              background: '#64748b',
              pointerEvents: 'none',
            }} />
          </div>
          <span style={{ color: '#22e55f', fontSize: 12 }}>Easy</span>
        </div>
      </div>

      {/* Hold Duration Slider */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>Hold Duration</span>
          <span style={{ color: '#94a3b8' }}>{settings.holdDuration}ms</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Short</span>
          <div style={{ flex: 1, position: 'relative', height: 24 }}>
            <input
              className="settings-slider"
              type="range"
              min={SETTINGS_RANGES.holdDuration.min}
              max={SETTINGS_RANGES.holdDuration.max}
              step={SETTINGS_RANGES.holdDuration.step}
              value={settings.holdDuration}
              onChange={(e) => onUpdateSetting('holdDuration', Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{
              position: 'absolute',
              left: `${getSliderPercent(DEFAULT_SETTINGS.holdDuration, SETTINGS_RANGES.holdDuration.min, SETTINGS_RANGES.holdDuration.max)}%`,
              top: -4,
              width: 2,
              height: 8,
              background: '#64748b',
              pointerEvents: 'none',
            }} />
          </div>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Long</span>
        </div>
      </div>

      {/* Pause Between Notes Slider */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>Pause Between Notes</span>
          <span style={{ color: '#94a3b8' }}>{settings.pauseBetweenNotes}ms</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Short</span>
          <div style={{ flex: 1, position: 'relative', height: 24 }}>
            <input
              className="settings-slider"
              type="range"
              min={SETTINGS_RANGES.pauseBetweenNotes.min}
              max={SETTINGS_RANGES.pauseBetweenNotes.max}
              step={SETTINGS_RANGES.pauseBetweenNotes.step}
              value={settings.pauseBetweenNotes}
              onChange={(e) => onUpdateSetting('pauseBetweenNotes', Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{
              position: 'absolute',
              left: `${getSliderPercent(DEFAULT_SETTINGS.pauseBetweenNotes, SETTINGS_RANGES.pauseBetweenNotes.min, SETTINGS_RANGES.pauseBetweenNotes.max)}%`,
              top: -4,
              width: 2,
              height: 8,
              background: '#64748b',
              pointerEvents: 'none',
            }} />
          </div>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Long</span>
        </div>
      </div>

      {/* Advanced Scoring Section */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <button
          onClick={() => setShowAdvancedScoring(prev => !prev)}
          style={{
            width: '100%',
            padding: '10px 0',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid #334155',
            borderRadius: 8,
            color: '#94a3b8',
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span style={{ transform: showAdvancedScoring ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▶</span>
          Advanced Scoring
        </button>
      </div>

      {showAdvancedScoring && (<>

      {/* Score Outlier Trim Slider */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>Trim worst samples</span>
          <span style={{ color: '#94a3b8' }}>{Math.round(settings.trimTop * 100)}%</span>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
          Remove outlier samples from scoring (higher = more forgiving)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>0%</span>
          <div style={{ flex: 1, position: 'relative', height: 24 }}>
            <input
              className="settings-slider"
              type="range"
              min={SETTINGS_RANGES.trimTop.min}
              max={SETTINGS_RANGES.trimTop.max}
              step={SETTINGS_RANGES.trimTop.step}
              value={settings.trimTop}
              onChange={(e) => onUpdateSetting('trimTop', Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{
              position: 'absolute',
              left: `${getSliderPercent(DEFAULT_SETTINGS.trimTop, SETTINGS_RANGES.trimTop.min, SETTINGS_RANGES.trimTop.max)}%`,
              top: -4,
              width: 2,
              height: 8,
              background: '#64748b',
              pointerEvents: 'none',
            }} />
          </div>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>40%</span>
        </div>
      </div>

      {/* Score Curve Sharpness Slider */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>Curve shape (p)</span>
          <span style={{ color: '#94a3b8' }}>{settings.scoreExponentP.toFixed(2)}</span>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
          How sharply scores drop with error (higher = steeper penalty)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Gentle</span>
          <div style={{ flex: 1, position: 'relative', height: 24 }}>
            <input
              className="settings-slider"
              type="range"
              min={SETTINGS_RANGES.scoreExponentP.min}
              max={SETTINGS_RANGES.scoreExponentP.max}
              step={SETTINGS_RANGES.scoreExponentP.step}
              value={settings.scoreExponentP}
              onChange={(e) => onUpdateSetting('scoreExponentP', Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{
              position: 'absolute',
              left: `${getSliderPercent(DEFAULT_SETTINGS.scoreExponentP, SETTINGS_RANGES.scoreExponentP.min, SETTINGS_RANGES.scoreExponentP.max)}%`,
              top: -4,
              width: 2,
              height: 8,
              background: '#64748b',
              pointerEvents: 'none',
            }} />
          </div>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Sharp</span>
        </div>
      </div>

      {/* Score Sensitivity Slider */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>Score tolerance (k×GOOD)</span>
          <span style={{ color: '#94a3b8' }}>
            k={settings.tauMultiplier.toFixed(1)} (τ={(settings.tauMultiplier * settings.okThreshold * 0.5).toFixed(1)}¢)
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
          Cents window for good scores (higher = more forgiving)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Strict</span>
          <div style={{ flex: 1, position: 'relative', height: 24 }}>
            <input
              className="settings-slider"
              type="range"
              min={SETTINGS_RANGES.tauMultiplier.min}
              max={SETTINGS_RANGES.tauMultiplier.max}
              step={SETTINGS_RANGES.tauMultiplier.step}
              value={settings.tauMultiplier}
              onChange={(e) => onUpdateSetting('tauMultiplier', Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{
              position: 'absolute',
              left: `${getSliderPercent(DEFAULT_SETTINGS.tauMultiplier, SETTINGS_RANGES.tauMultiplier.min, SETTINGS_RANGES.tauMultiplier.max)}%`,
              top: -4,
              width: 2,
              height: 8,
              background: '#64748b',
              pointerEvents: 'none',
            }} />
          </div>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Forgiving</span>
        </div>
      </div>

      {/* Base Points Per Note Slider */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>Base pts / note (A)</span>
          <span style={{ color: '#94a3b8' }}>{settings.basePointsPerNote}</span>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
          Max accuracy points per note (bounded term)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Low</span>
          <div style={{ flex: 1, position: 'relative', height: 24 }}>
            <input
              className="settings-slider"
              type="range"
              min={SETTINGS_RANGES.basePointsPerNote.min}
              max={SETTINGS_RANGES.basePointsPerNote.max}
              step={SETTINGS_RANGES.basePointsPerNote.step}
              value={settings.basePointsPerNote}
              onChange={(e) => onUpdateSetting('basePointsPerNote', Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{
              position: 'absolute',
              left: `${getSliderPercent(DEFAULT_SETTINGS.basePointsPerNote, SETTINGS_RANGES.basePointsPerNote.min, SETTINGS_RANGES.basePointsPerNote.max)}%`,
              top: -4,
              width: 2,
              height: 8,
              background: '#64748b',
              pointerEvents: 'none',
            }} />
          </div>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>High</span>
        </div>
      </div>

      {/* Bonus Weight Slider */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>Bonus weight (B)</span>
          <span style={{ color: '#94a3b8' }}>{settings.bonusWeight}</span>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
          Extra points for precision (0 = disabled)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Off</span>
          <div style={{ flex: 1, position: 'relative', height: 24 }}>
            <input
              className="settings-slider"
              type="range"
              min={SETTINGS_RANGES.bonusWeight.min}
              max={SETTINGS_RANGES.bonusWeight.max}
              step={SETTINGS_RANGES.bonusWeight.step}
              value={settings.bonusWeight}
              onChange={(e) => onUpdateSetting('bonusWeight', Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{
              position: 'absolute',
              left: `${getSliderPercent(DEFAULT_SETTINGS.bonusWeight, SETTINGS_RANGES.bonusWeight.min, SETTINGS_RANGES.bonusWeight.max)}%`,
              top: -4,
              width: 2,
              height: 8,
              background: '#64748b',
              pointerEvents: 'none',
            }} />
          </div>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>High</span>
        </div>
      </div>

      {/* Bonus Tau Multiplier Slider */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>Bonus tau (k_b×GOOD)</span>
          <span style={{ color: '#94a3b8' }}>{settings.bonusTauMultiplier.toFixed(1)}</span>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
          Scale of precision bonus (higher = more bonus at moderate error)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Low</span>
          <div style={{ flex: 1, position: 'relative', height: 24 }}>
            <input
              className="settings-slider"
              type="range"
              min={SETTINGS_RANGES.bonusTauMultiplier.min}
              max={SETTINGS_RANGES.bonusTauMultiplier.max}
              step={SETTINGS_RANGES.bonusTauMultiplier.step}
              value={settings.bonusTauMultiplier}
              onChange={(e) => onUpdateSetting('bonusTauMultiplier', Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{
              position: 'absolute',
              left: `${getSliderPercent(DEFAULT_SETTINGS.bonusTauMultiplier, SETTINGS_RANGES.bonusTauMultiplier.min, SETTINGS_RANGES.bonusTauMultiplier.max)}%`,
              top: -4,
              width: 2,
              height: 8,
              background: '#64748b',
              pointerEvents: 'none',
            }} />
          </div>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>High</span>
        </div>
      </div>

      {/* Bonus Epsilon Slider */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>Bonus epsilon (ε)</span>
          <span style={{ color: '#94a3b8' }}>{settings.bonusEpsilonCents.toFixed(2)}¢</span>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
          Stabiliser prevents infinite bonus at zero error
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Tight</span>
          <div style={{ flex: 1, position: 'relative', height: 24 }}>
            <input
              className="settings-slider"
              type="range"
              min={SETTINGS_RANGES.bonusEpsilonCents.min}
              max={SETTINGS_RANGES.bonusEpsilonCents.max}
              step={SETTINGS_RANGES.bonusEpsilonCents.step}
              value={settings.bonusEpsilonCents}
              onChange={(e) => onUpdateSetting('bonusEpsilonCents', Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{
              position: 'absolute',
              left: `${getSliderPercent(DEFAULT_SETTINGS.bonusEpsilonCents, SETTINGS_RANGES.bonusEpsilonCents.min, SETTINGS_RANGES.bonusEpsilonCents.max)}%`,
              top: -4,
              width: 2,
              height: 8,
              background: '#64748b',
              pointerEvents: 'none',
            }} />
          </div>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Loose</span>
        </div>
      </div>

      {/* Bonus Exponent Q Slider */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>Bonus exponent (q)</span>
          <span style={{ color: '#94a3b8' }}>{settings.bonusExponentQ.toFixed(1)}</span>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
          Shape of precision bonus curve
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Gentle</span>
          <div style={{ flex: 1, position: 'relative', height: 24 }}>
            <input
              className="settings-slider"
              type="range"
              min={SETTINGS_RANGES.bonusExponentQ.min}
              max={SETTINGS_RANGES.bonusExponentQ.max}
              step={SETTINGS_RANGES.bonusExponentQ.step}
              value={settings.bonusExponentQ}
              onChange={(e) => onUpdateSetting('bonusExponentQ', Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{
              position: 'absolute',
              left: `${getSliderPercent(DEFAULT_SETTINGS.bonusExponentQ, SETTINGS_RANGES.bonusExponentQ.min, SETTINGS_RANGES.bonusExponentQ.max)}%`,
              top: -4,
              width: 2,
              height: 8,
              background: '#64748b',
              pointerEvents: 'none',
            }} />
          </div>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Sharp</span>
        </div>
      </div>

      {/* Fluency Threshold Slider */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>Fluency threshold (%)</span>
          <span style={{ color: '#94a3b8' }}>{Math.round(settings.fluencyThreshold * 100)}%</span>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
          Minimum in-tune fraction for bonus (higher = stricter)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Easy</span>
          <div style={{ flex: 1, position: 'relative', height: 24 }}>
            <input
              className="settings-slider"
              type="range"
              min={SETTINGS_RANGES.fluencyThreshold.min}
              max={SETTINGS_RANGES.fluencyThreshold.max}
              step={SETTINGS_RANGES.fluencyThreshold.step}
              value={settings.fluencyThreshold}
              onChange={(e) => onUpdateSetting('fluencyThreshold', Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{
              position: 'absolute',
              left: `${getSliderPercent(DEFAULT_SETTINGS.fluencyThreshold, SETTINGS_RANGES.fluencyThreshold.min, SETTINGS_RANGES.fluencyThreshold.max)}%`,
              top: -4,
              width: 2,
              height: 8,
              background: '#64748b',
              pointerEvents: 'none',
            }} />
          </div>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Strict</span>
        </div>
      </div>

      {/* Fluency Weight Slider */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>Fluency weight (b)</span>
          <span style={{ color: '#94a3b8' }}>{settings.fluencyWeight.toFixed(1)}</span>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
          Bonus for smooth note transitions (0 = disabled)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Off</span>
          <div style={{ flex: 1, position: 'relative', height: 24 }}>
            <input
              className="settings-slider"
              type="range"
              min={SETTINGS_RANGES.fluencyWeight.min}
              max={SETTINGS_RANGES.fluencyWeight.max}
              step={SETTINGS_RANGES.fluencyWeight.step}
              value={settings.fluencyWeight}
              onChange={(e) => onUpdateSetting('fluencyWeight', Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{
              position: 'absolute',
              left: `${getSliderPercent(DEFAULT_SETTINGS.fluencyWeight, SETTINGS_RANGES.fluencyWeight.min, SETTINGS_RANGES.fluencyWeight.max)}%`,
              top: -4,
              width: 2,
              height: 8,
              background: '#64748b',
              pointerEvents: 'none',
            }} />
          </div>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>High</span>
        </div>
      </div>

      {/* Fluency Exponent Q Slider */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>Fluency exponent (q)</span>
          <span style={{ color: '#94a3b8' }}>{settings.fluencyExponentQ.toFixed(1)}</span>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
          How sharply fluency bonus drops with gaps (higher = stricter)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Gentle</span>
          <div style={{ flex: 1, position: 'relative', height: 24 }}>
            <input
              className="settings-slider"
              type="range"
              min={SETTINGS_RANGES.fluencyExponentQ.min}
              max={SETTINGS_RANGES.fluencyExponentQ.max}
              step={SETTINGS_RANGES.fluencyExponentQ.step}
              value={settings.fluencyExponentQ}
              onChange={(e) => onUpdateSetting('fluencyExponentQ', Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{
              position: 'absolute',
              left: `${getSliderPercent(DEFAULT_SETTINGS.fluencyExponentQ, SETTINGS_RANGES.fluencyExponentQ.min, SETTINGS_RANGES.fluencyExponentQ.max)}%`,
              top: -4,
              width: 2,
              height: 8,
              background: '#64748b',
              pointerEvents: 'none',
            }} />
          </div>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Sharp</span>
        </div>
      </div>

      </>)}

      {/* Auto-replay delay */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <div style={{ color: '#fff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>Auto-replay Delay</span>
          <span style={{ color: '#94a3b8' }}>{(settings.autoReplayDelay / 1000).toFixed(1)}s</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Short</span>
          <div style={{ flex: 1, position: 'relative', height: 24 }}>
            <input
              className="settings-slider"
              type="range"
              min={SETTINGS_RANGES.autoReplayDelay.min}
              max={SETTINGS_RANGES.autoReplayDelay.max}
              step={SETTINGS_RANGES.autoReplayDelay.step}
              value={settings.autoReplayDelay}
              onChange={(e) => onUpdateSetting('autoReplayDelay', Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{
              position: 'absolute',
              left: `${getSliderPercent(DEFAULT_SETTINGS.autoReplayDelay, SETTINGS_RANGES.autoReplayDelay.min, SETTINGS_RANGES.autoReplayDelay.max)}%`,
              top: -4,
              width: 2,
              height: 8,
              background: '#64748b',
              pointerEvents: 'none',
            }} />
          </div>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Long</span>
        </div>
      </div>

      {/* Scale Selection */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <div style={{ color: '#fff', marginBottom: 12 }}>Enabled Scales</div>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 8,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {Object.keys(SCALES).map(scaleName => (
            <label
              key={scaleName}
              style={{
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                opacity: settings.enabledScales.length === 1 && settings.enabledScales.includes(scaleName) ? 0.5 : 1,
              }}
            >
              <input
                type="checkbox"
                checked={settings.enabledScales.includes(scaleName)}
                onChange={() => toggleScale(scaleName)}
                disabled={settings.enabledScales.length === 1 && settings.enabledScales.includes(scaleName)}
                style={{ width: 18, height: 18 }}
              />
              {formatScaleName(scaleName)}
            </label>
          ))}
        </div>
        <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
          At least one scale must be enabled
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button
          onClick={onResetDefaults}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            borderRadius: 8,
            border: 'none',
            background: '#475569',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Reset to Defaults
        </button>
        <button
          onClick={onDone}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(135deg, #22e55f 0%, #16c75c 100%)',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>

    </div>
  );
}
