export const TOKENS = {
  // Colors (locked — do not change)
  color: {
    bg:         '#0b0e0d',   // slightly lighter than #091413 for Railway feel
    surface:    '#0d1a14',   // card/panel surface
    surfaceHover: '#0f1e17', // hover state
    border:     '#1a2e25',   // primary border
    borderMid:  '#285a48',   // mid border / secondary
    primary:    '#408a71',   // brand green
    primaryHover:'#4fa07f',  // hover
    light:      '#b0e4cc',   // heading text
    muted:      '#408a71',   // muted/body text
    dim:        '#285a48',   // very muted
    glow:       '#00d1ff',   // accent cyan
    glowDim:    'rgba(0,209,255,0.15)',
  },
  // Typography (Railway uses Inter)
  font: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    size: {
      xs:   '10px',
      sm:   '11px',
      base: '12px',
      md:   '13px',
      lg:   '15px',
      xl:   '18px',
      xxl:  '24px',
    },
  },
  // Spacing (tight, dense — Railway style)
  spacing: {
    xs:  '4px',
    sm:  '8px',
    md:  '12px',
    lg:  '16px',
    xl:  '20px',
    xxl: '24px',
  },
  // Border radius (minimal)
  radius: {
    sm:  '4px',
    md:  '5px',
    lg:  '6px',
    pill:'20px',
  },
  // Shadows
  shadow: {
    glow:   '0 0 12px rgba(0,209,255,0.2)',
    glowSm: '0 0 6px rgba(64,138,113,0.3)',
    card:   '0 1px 3px rgba(0,0,0,0.4)',
  },
  // Nav heights
  layout: {
    navHeight:     '48px',
    sidebarWidth:  '200px',
    statusBarHeight: '36px',
  },
} as const;

export const BRAND = {
  bg:      '#0b0e0d',
  primary: '#408a71',
  sec:     '#285a48',
  light:   '#b0e4cc',
  glow:    '#00d1ff',
} as const;

// Legacy export for backwards compatibility
export const satelinkTokens = {
  colors: {
    bg: TOKENS.color.bg,
    surface: TOKENS.color.surface,
    surfaceElevated: TOKENS.color.surfaceHover,
    border: TOKENS.color.border,
    primary: TOKENS.color.primary,
    secondary: TOKENS.color.borderMid,
    contrast: TOKENS.color.light,
    accent: TOKENS.color.glow,
    success: '#6ee7b7',
    warning: '#fcd34d',
    danger: '#fda4af',
  },
  spacing: TOKENS.spacing,
  radius: TOKENS.radius,
  shadow: TOKENS.shadow,
  motion: { fast: 0.18, base: 0.3, slow: 0.5 },
  z: { shell: 20, runtimeBar: 25, command: 50 },
} as const;
