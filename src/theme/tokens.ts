/**
 * Nom Nominate — Design Tokens
 * Mirrors design-handoff/handoff/tokens.json.
 * Source of truth: if design JSON and this file disagree, design JSON wins.
 */

// ───────────── Raw color atoms ─────────────
export const COLOR = {
  brand: {
    orange: '#FF6B1A',
    orangeD: '#E85A0E',
    blue: '#2E7BFF',
    blueD: '#1F5FE0',
    warn: '#FFC43D',
  },
  neutral: {
    ink: '#141216',
    inkSoft: '#2A2530',
    paper: '#FAF5EC',
    paperSoft: '#F2ECE0',
    cream: '#FFFDF6',
    midnight: '#0E1226',
    midSoft: '#171B36',
    midAlt: '#1F2442',
  },
  semantic: {
    success: '#2AB872',
    warn: '#FFC43D',
    destruct: '#E54B4B',
    info: '#2E7BFF',
  },
} as const;

// ───────────── Theme (resolves per mode) ─────────────
export interface ThemePalette {
  mode: 'light' | 'dark';
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSoft: string;
  textFaint: string;
  border: string;
  borderStrong: string;
  action: string;
  actionFg: string;
  splatYes: string;
  splatNo: string;
  match: string;
  destruct: string;
  warn: string;
}

export const LIGHT_THEME: ThemePalette = {
  mode: 'light',
  bg: COLOR.neutral.paper,
  surface: COLOR.neutral.cream,
  surfaceAlt: COLOR.neutral.paperSoft,
  text: COLOR.neutral.ink,
  textSoft: 'rgba(20,18,22,0.68)',
  textFaint: 'rgba(20,18,22,0.38)',
  border: 'rgba(20,18,22,0.12)',
  borderStrong: COLOR.neutral.ink,
  action: COLOR.brand.orange,
  actionFg: COLOR.neutral.ink,
  splatYes: COLOR.brand.orange,
  splatNo: COLOR.brand.blue,
  match: COLOR.semantic.success,
  destruct: COLOR.semantic.destruct,
  warn: COLOR.brand.warn,
};

export const DARK_THEME: ThemePalette = {
  mode: 'dark',
  bg: COLOR.neutral.midnight,
  surface: COLOR.neutral.midSoft,
  surfaceAlt: COLOR.neutral.midAlt,
  text: COLOR.neutral.paper,
  textSoft: 'rgba(250,245,236,0.65)',
  textFaint: 'rgba(250,245,236,0.35)',
  border: 'rgba(250,245,236,0.15)',
  borderStrong: COLOR.neutral.paper,
  action: COLOR.brand.orange,
  actionFg: COLOR.neutral.ink,
  splatYes: COLOR.brand.orange,
  splatNo: COLOR.brand.blue,
  match: COLOR.semantic.success,
  destruct: COLOR.semantic.destruct,
  warn: COLOR.brand.warn,
};

// ───────────── Spacing ─────────────
export const SPACE = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
} as const;

// ───────────── Radius ─────────────
export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
} as const;

// ───────────── Stroke widths ─────────────
export const STROKE = {
  hair: 1,
  std: 1.5,
  chunky: 2.5,
} as const;

// ───────────── Chunky shadow offsets ─────────────
// Not a real shadow — rendered as a second View offset behind the primary.
// See <ChunkyShadow> primitive.
export const SHADOW = {
  sm: { x: 2, y: 2 },
  md: { x: 3, y: 3 },
  lg: { x: 4, y: 4 },
} as const;

// ───────────── Typography ─────────────
// Font families are the Expo-loaded name (not the filename).
export const FONT = {
  marker: 'PermanentMarker',
  hand: 'PatrickHand',
  caveat: 'CaveatBold',
  mono: 'Menlo', // platform default monospace
} as const;

export interface TextStyleSpec {
  family: string;
  size: number;
  lineHeight: number;
  letterSpacing: number;
}

// letterSpacing in em * size for RN compatibility
export const TYPE = {
  displayXXL: { family: FONT.marker, size: 40, lineHeight: 40, letterSpacing: -0.8 },
  displayXL: { family: FONT.marker, size: 32, lineHeight: 34, letterSpacing: -0.32 },
  displayLg: { family: FONT.marker, size: 24, lineHeight: 26, letterSpacing: 0 },
  displayMd: { family: FONT.marker, size: 20, lineHeight: 23, letterSpacing: 0.2 },
  headingLg: { family: FONT.hand, size: 22, lineHeight: 26, letterSpacing: 0 },
  headingMd: { family: FONT.hand, size: 18, lineHeight: 23, letterSpacing: 0 },
  bodyLg: { family: FONT.hand, size: 16, lineHeight: 22, letterSpacing: 0 },
  bodyMd: { family: FONT.hand, size: 14, lineHeight: 20, letterSpacing: 0 },
  bodySm: { family: FONT.hand, size: 12, lineHeight: 17, letterSpacing: 0 },
  monoMd: { family: FONT.mono, size: 14, lineHeight: 18, letterSpacing: 0.7 },
  monoSm: { family: FONT.mono, size: 11, lineHeight: 14, letterSpacing: 1.65 },
  scriptCap: { family: FONT.caveat, size: 20, lineHeight: 24, letterSpacing: 0 },
} as const satisfies Record<string, TextStyleSpec>;

export type TextVariant = keyof typeof TYPE;

// ───────────── Motion ─────────────
export const MOTION = {
  enterPop: { duration: 220, stiffness: 180, damping: 12 },
  enterSlide: { duration: 260 },
  swipeCommit: { duration: 320 },
  reelSpin: { duration: 1200 },
  shakeCelebrate: { duration: 600 },
  pressSquish: { duration: 120 },
} as const;

// Brand 5 colors for avatars — user-picked
export const AVATAR_COLORS = [
  COLOR.brand.orange,
  COLOR.brand.blue,
  COLOR.brand.warn,
  COLOR.semantic.success,
  COLOR.semantic.destruct,
] as const;
