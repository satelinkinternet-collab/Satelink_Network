export const satelinkTokens = {
  colors: {
    bg: "#091413",
    surface: "#0b1716",
    surfaceElevated: "#10201d",
    border: "rgba(176,228,204,0.18)",
    primary: "#408A71",
    secondary: "#285A48",
    contrast: "#B0E4CC",
    accent: "#00D1FF",
    success: "#6ee7b7",
    warning: "#fcd34d",
    danger: "#fda4af",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  },
  radius: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.5rem",
  },
  shadow: {
    card: "0 6px 24px rgba(0,0,0,0.24)",
    glow: "0 0 0 1px rgba(64,138,113,0.35), 0 0 24px rgba(0,209,255,0.08)",
  },
  motion: {
    fast: 0.18,
    base: 0.3,
    slow: 0.5,
  },
  z: {
    shell: 20,
    runtimeBar: 25,
    command: 50,
  },
} as const;
