/**
 * Satelink Brand Theme Constants
 * Use these values for consistent brand styling across the application.
 */

export const brand = {
  dark: "#272829",
  mid: "#61677A",
  light: "#D8D9DA",
  cream: "#FFF6E0",
} as const;

export const colors = {
  background: brand.dark,
  foreground: brand.light,
  surface: "#1E1F20",
  card: "#2F3031",
  cardForeground: brand.light,
  primary: brand.cream,
  primaryForeground: brand.dark,
  secondary: "#1E1F20",
  secondaryForeground: brand.light,
  muted: brand.mid,
  mutedForeground: "#1E1F20",
  accent: brand.cream,
  accentForeground: brand.dark,
  border: brand.mid,
  input: brand.mid,
  ring: brand.cream,
  success: "#22C55E",
  warning: "#F59E0B",
  destructive: "#EF4444",
} as const;

export const tailwindBrand = {
  "brand-dark": brand.dark,
  "brand-mid": brand.mid,
  "brand-light": brand.light,
  "brand-cream": brand.cream,
} as const;

export type BrandColor = keyof typeof brand;
export type ThemeColor = keyof typeof colors;
