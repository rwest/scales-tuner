import { useState, ReactNode } from 'react';
import type { GameSettings } from '../types';
import { SCALES } from '../game/scales';
import { DEFAULT_SETTINGS, SETTINGS_RANGES } from '../game/settings';
import { formatScaleName } from '../utils/formatting';
import SettingSlider from './SettingSlider';
import { colors, gradients } from '../styles/tokens';

interface SettingsScreenProps {
  settings: GameSettings;
  onUpdateSetting: <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => void;
  onResetDefaults: () => void;
  onDone: () => void;
}

/** Fraction position of the default value within a settings range (for the marker) */
const defaultPct = (key: keyof typeof SETTINGS_RANGES): number => {
  const r = SETTINGS_RANGES[key];
  const d = DEFAULT_SETTINGS[key];
  return (Number(d) - r.min) / (r.max - r.min);
};

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
      if (current.length > 1) {
        onUpdateSetting('enabledScales', current.filter(s => s !== scaleName));
      }
    } else {
      onUpdateSetting('enabledScales', [...current, scaleName]);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      maxHeight: '100vh',
      background: gradients.background,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: 20,
      paddingBottom: 40,
      fontFamily: 'system-ui, sans-serif',
      overflowY: 'auto',
      boxSizing: 'border-box',
    }}>
      <h1 style={{ color: colors.textPrimary, fontSize: 28, marginBottom: 24 }}>⚙️ Settings</h1>

      <SettingSlider
        label="Accuracy Tolerance"
        valueDisplay={`±${settings.okThreshold}¢`}
        {...SETTINGS_RANGES.okThreshold}
        value={settings.okThreshold}
        onChange={(v) => onUpdateSetting('okThreshold', v)}
        leftLabel="Hard" leftLabelColor={colors.red}
        rightLabel="Easy" rightLabelColor={colors.green}
        defaultPercent={defaultPct('okThreshold')}
      />

      <SettingSlider
        label="Tower Stability"
        valueDisplay={`${settings.collapseThreshold} pts/note`}
        {...SETTINGS_RANGES.collapseThreshold}
        value={settings.collapseThreshold}
        onChange={(v) => onUpdateSetting('collapseThreshold', v)}
        leftLabel="Hard" leftLabelColor={colors.red}
        rightLabel="Easy" rightLabelColor={colors.green}
        defaultPercent={defaultPct('collapseThreshold')}
      />

      <SettingSlider
        label="Hold Duration"
        valueDisplay={`${settings.holdDuration}ms`}
        {...SETTINGS_RANGES.holdDuration}
        value={settings.holdDuration}
        onChange={(v) => onUpdateSetting('holdDuration', v)}
        leftLabel="Short" rightLabel="Long"
        defaultPercent={defaultPct('holdDuration')}
      />

      <SettingSlider
        label="Pause Between Notes"
        valueDisplay={`${settings.pauseBetweenNotes}ms`}
        {...SETTINGS_RANGES.pauseBetweenNotes}
        value={settings.pauseBetweenNotes}
        onChange={(v) => onUpdateSetting('pauseBetweenNotes', v)}
        leftLabel="Short" rightLabel="Long"
        defaultPercent={defaultPct('pauseBetweenNotes')}
      />

      {/* Advanced Scoring Section */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <button
          onClick={() => setShowAdvancedScoring(prev => !prev)}
          style={{
            width: '100%',
            padding: '10px 0',
            background: colors.bgOverlay,
            border: `1px solid ${colors.bgButton}`,
            borderRadius: 8,
            color: colors.textSecondary,
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
        <SettingSlider
          label="Trim worst samples"
          valueDisplay={`${Math.round(settings.trimTop * 100)}%`}
          description="Remove outlier samples from scoring (higher = more forgiving)"
          {...SETTINGS_RANGES.trimTop}
          value={settings.trimTop}
          onChange={(v) => onUpdateSetting('trimTop', v)}
          leftLabel="0%" rightLabel="40%"
          defaultPercent={defaultPct('trimTop')}
        />
        <SettingSlider
          label="Curve shape (p)"
          valueDisplay={settings.scoreExponentP.toFixed(2)}
          description="How sharply scores drop with error (higher = steeper penalty)"
          {...SETTINGS_RANGES.scoreExponentP}
          value={settings.scoreExponentP}
          onChange={(v) => onUpdateSetting('scoreExponentP', v)}
          leftLabel="Gentle" rightLabel="Sharp"
          defaultPercent={defaultPct('scoreExponentP')}
        />
        <SettingSlider
          label="Score tolerance (k×GOOD)"
          valueDisplay={`k=${settings.tauMultiplier.toFixed(1)} (τ=${(settings.tauMultiplier * settings.okThreshold * 0.5).toFixed(1)}¢)`}
          description="Cents window for good scores (higher = more forgiving)"
          {...SETTINGS_RANGES.tauMultiplier}
          value={settings.tauMultiplier}
          onChange={(v) => onUpdateSetting('tauMultiplier', v)}
          leftLabel="Strict" rightLabel="Forgiving"
          defaultPercent={defaultPct('tauMultiplier')}
        />
        <SettingSlider
          label="Base pts / note (A)"
          valueDisplay={`${settings.basePointsPerNote}`}
          description="Max accuracy points per note (bounded term)"
          {...SETTINGS_RANGES.basePointsPerNote}
          value={settings.basePointsPerNote}
          onChange={(v) => onUpdateSetting('basePointsPerNote', v)}
          leftLabel="Low" rightLabel="High"
          defaultPercent={defaultPct('basePointsPerNote')}
        />
        <SettingSlider
          label="Bonus weight (B)"
          valueDisplay={`${settings.bonusWeight}`}
          description="Extra points for precision (0 = disabled)"
          {...SETTINGS_RANGES.bonusWeight}
          value={settings.bonusWeight}
          onChange={(v) => onUpdateSetting('bonusWeight', v)}
          leftLabel="Off" rightLabel="High"
          defaultPercent={defaultPct('bonusWeight')}
        />
        <SettingSlider
          label="Bonus tau (k_b×GOOD)"
          valueDisplay={settings.bonusTauMultiplier.toFixed(1)}
          description="Scale of precision bonus (higher = more bonus at moderate error)"
          {...SETTINGS_RANGES.bonusTauMultiplier}
          value={settings.bonusTauMultiplier}
          onChange={(v) => onUpdateSetting('bonusTauMultiplier', v)}
          leftLabel="Low" rightLabel="High"
          defaultPercent={defaultPct('bonusTauMultiplier')}
        />
        <SettingSlider
          label="Bonus epsilon (ε)"
          valueDisplay={`${settings.bonusEpsilonCents.toFixed(2)}¢`}
          description="Stabiliser prevents infinite bonus at zero error"
          {...SETTINGS_RANGES.bonusEpsilonCents}
          value={settings.bonusEpsilonCents}
          onChange={(v) => onUpdateSetting('bonusEpsilonCents', v)}
          leftLabel="Tight" rightLabel="Loose"
          defaultPercent={defaultPct('bonusEpsilonCents')}
        />
        <SettingSlider
          label="Bonus exponent (q)"
          valueDisplay={settings.bonusExponentQ.toFixed(1)}
          description="Shape of precision bonus curve"
          {...SETTINGS_RANGES.bonusExponentQ}
          value={settings.bonusExponentQ}
          onChange={(v) => onUpdateSetting('bonusExponentQ', v)}
          leftLabel="Gentle" rightLabel="Sharp"
          defaultPercent={defaultPct('bonusExponentQ')}
        />
        <SettingSlider
          label="Fluency threshold (%)"
          valueDisplay={`${Math.round(settings.fluencyThreshold * 100)}%`}
          description="Minimum in-tune fraction for bonus (higher = stricter)"
          {...SETTINGS_RANGES.fluencyThreshold}
          value={settings.fluencyThreshold}
          onChange={(v) => onUpdateSetting('fluencyThreshold', v)}
          leftLabel="Easy" rightLabel="Strict"
          defaultPercent={defaultPct('fluencyThreshold')}
        />
        <SettingSlider
          label="Fluency weight (b)"
          valueDisplay={settings.fluencyWeight.toFixed(1)}
          description="Bonus for smooth note transitions (0 = disabled)"
          {...SETTINGS_RANGES.fluencyWeight}
          value={settings.fluencyWeight}
          onChange={(v) => onUpdateSetting('fluencyWeight', v)}
          leftLabel="Off" rightLabel="High"
          defaultPercent={defaultPct('fluencyWeight')}
        />
        <SettingSlider
          label="Fluency exponent (q)"
          valueDisplay={settings.fluencyExponentQ.toFixed(1)}
          description="How sharply fluency bonus drops with gaps (higher = stricter)"
          {...SETTINGS_RANGES.fluencyExponentQ}
          value={settings.fluencyExponentQ}
          onChange={(v) => onUpdateSetting('fluencyExponentQ', v)}
          leftLabel="Gentle" rightLabel="Sharp"
          defaultPercent={defaultPct('fluencyExponentQ')}
        />
      </>)}

      <SettingSlider
        label="Auto-replay Delay"
        valueDisplay={`${(settings.autoReplayDelay / 1000).toFixed(1)}s`}
        {...SETTINGS_RANGES.autoReplayDelay}
        value={settings.autoReplayDelay}
        onChange={(v) => onUpdateSetting('autoReplayDelay', v)}
        leftLabel="Short" rightLabel="Long"
        defaultPercent={defaultPct('autoReplayDelay')}
      />

      {/* Scale Selection */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
        <div style={{ color: colors.textPrimary, marginBottom: 12 }}>Enabled Scales</div>
        <div style={{
          background: colors.bgOverlay,
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
                color: colors.textSubtle,
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
        <div style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
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
            background: colors.slate,
            color: colors.textPrimary,
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
            background: gradients.greenButton,
            color: colors.textPrimary,
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>

    </div>
  );
}
