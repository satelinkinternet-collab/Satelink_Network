/**
 * Satelink Brand Theme Constants v2
 * Use these values for consistent brand styling across the application.
 */

export const BRAND = {
  bg: "#091413",
  primary: "#408A71",
  sec: "#285A48",
  light: "#B0E4CC",
  glow: "#00D1FF",
} as const;

export const colors = {
  background: BRAND.bg,
  foreground: BRAND.light,
  surface: "#0d1f1d",
  card: "#0d1f1d",
  cardForeground: BRAND.light,
  primary: BRAND.primary,
  primaryForeground: BRAND.bg,
  secondary: "#0d1f1d",
  secondaryForeground: BRAND.light,
  muted: BRAND.sec,
  mutedForeground: BRAND.bg,
  accent: BRAND.glow,
  accentForeground: BRAND.bg,
  border: BRAND.sec,
  input: BRAND.sec,
  ring: BRAND.glow,
  success: BRAND.primary,
  warning: "#F59E0B",
  destructive: "#EF4444",
} as const;

export const glowEffects = {
  glow: "0 0 20px rgba(0, 209, 255, 0.3)",
  glowSm: "0 0 10px rgba(0, 209, 255, 0.2)",
  glowLg: "0 0 30px rgba(0, 209, 255, 0.4)",
  textGlow: "0 0 20px rgba(0, 209, 255, 0.5)",
} as const;

export type BrandColor = keyof typeof BRAND;
export type ThemeColor = keyof typeof colors;
