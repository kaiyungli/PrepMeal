/**
 * Minimal neutral theme tokens for the mobile foundation.
 *
 * Deliberately small: just enough shared spacing / colour values so the
 * placeholder screens look consistent. This is NOT a design system and should
 * be replaced/expanded in a later slice.
 */

export const colors = {
  background: '#ffffff',
  surface: '#f5f5f4',
  border: '#e7e5e4',
  text: '#1c1917',
  textMuted: '#78716c',
  primary: '#1c1917',
  danger: '#b91c1c',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
} as const;

export const typography = {
  title: 20,
  body: 15,
  caption: 13,
} as const;
