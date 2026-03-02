import { ReactNode } from 'react';
import { colors } from '../styles/tokens';

interface SettingSliderProps {
  /** Displayed label on the left of the header row */
  label: string;
  /** Displayed current value on the right of the header row */
  valueDisplay: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  /** Left-side range label (e.g. "Hard", "Short") */
  leftLabel?: string;
  /** Right-side range label (e.g. "Easy", "Long") */
  rightLabel?: string;
  /** Optional color for left label; defaults to textSecondary */
  leftLabelColor?: string;
  /** Optional color for right label; defaults to textSecondary */
  rightLabelColor?: string;
  /** Default value position (0–1) to show a marker; omit to hide */
  defaultPercent?: number;
  /** Optional description text shown below the label */
  description?: string;
}

/** Reusable labeled range slider with optional default-value marker */
export default function SettingSlider({
  label,
  valueDisplay,
  min,
  max,
  step,
  value,
  onChange,
  leftLabel,
  rightLabel,
  leftLabelColor = colors.textSecondary,
  rightLabelColor = colors.textSecondary,
  defaultPercent,
  description,
}: SettingSliderProps): ReactNode {
  return (
    <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
      <div style={{ color: colors.textPrimary, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span style={{ color: colors.textSecondary }}>{valueDisplay}</span>
      </div>
      {description && (
        <div style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8 }}>
          {description}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {leftLabel && (
          <span style={{ color: leftLabelColor, fontSize: 12 }}>{leftLabel}</span>
        )}
        <div style={{ flex: 1, position: 'relative', height: 24 }}>
          <input
            className="settings-slider"
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{ width: '100%', cursor: 'pointer' }}
          />
          {defaultPercent !== undefined && (
            <div style={{
              position: 'absolute',
              left: `${defaultPercent * 100}%`,
              top: -4,
              width: 2,
              height: 8,
              background: colors.defaultMarker,
              pointerEvents: 'none',
            }} />
          )}
        </div>
        {rightLabel && (
          <span style={{ color: rightLabelColor, fontSize: 12 }}>{rightLabel}</span>
        )}
      </div>
    </div>
  );
}
