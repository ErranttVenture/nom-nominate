// App-wide constants

export const COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  success: '#2ECC71',
  danger: '#E74C3C',
  dark: '#1a1a2e',
  darker: '#16213e',
  text: '#2d3436',
  textLight: '#636e72',
  background: '#f8f9fa',
  card: '#ffffff',
  border: '#e9ecef',
  offer: '#f0932b',
  offerLight: 'rgba(240, 147, 43, 0.12)',
} as const;

export const PARTY = {
  MIN_MEMBERS: 2,
  LARGE_GROUP_THRESHOLD: 10,
  LARGE_GROUP_VOTE_PERCENT: 0.8, // 80% for groups of 10+
  MIN_SWIPES_FOR_FALLBACK: 20,
  DEFAULT_RADIUS_MILES: 10,
  RADIUS_OPTIONS: [5, 10, 15, 25] as const,
} as const;

export const MILES_TO_METERS = 1609.34;
