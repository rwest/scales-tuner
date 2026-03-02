/** Shared design tokens for Scale Tower */

export const colors = {
  // Backgrounds
  bgPrimary: '#1a1a2e',
  bgSecondary: '#16213e',
  bgCard: 'rgba(255,255,255,0.1)',
  bgOverlay: 'rgba(255,255,255,0.05)',
  bgSlider: '#475569',
  bgButton: '#334155',

  // Text
  textPrimary: '#fff',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textSubtle: '#cbd5e1',

  // Accents
  green: '#22e55f',
  greenDark: '#16c75c',
  blue: '#3b82f6',
  blueDark: '#2563eb',
  red: '#f87171',
  redDark: '#ef4444',
  yellow: '#facc15',
  amber: '#f59e0b',
  teal: '#10b981',
  slate: '#475569',
  defaultMarker: '#64748b',

  // Game
  inTune: '#22e55f',
  sharp: '#ef4444',
  flat: '#2a7afbff',
} as const;

export const gradients = {
  background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
  greenButton: `linear-gradient(135deg, ${colors.green} 0%, ${colors.greenDark} 100%)`,
  blueButton: `linear-gradient(135deg, ${colors.blue} 0%, ${colors.blueDark} 100%)`,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
