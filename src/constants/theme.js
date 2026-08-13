export const Spacing = {
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 28,
  eight: 32,
  nine: 36,
  ten: 40,
};

export const BottomTabInset = 16;
export const MaxContentWidth = 1024;

export const Fonts = {
  family: "poppins",
  mono: "monospace",
};

// Global color tokens (brand, primary, accent, etc.)
export const Tokens = {
  // Brand
  brand: "#657EEA",
  brandDark: "#4A63D6",
  brandDeep: "#3451C7",
  brandLight: "#EEF1FD",
  brandMid: "#8FA3F0",
  brandRed: "#D42B2B",
  brandRedLight: "#FEE2E2",
  dark: "#0f172a",

  // Primary – brand blue
  primary: "#657EEA",
  primaryDark: "#4A63D6",
  primaryMid: "#8FA3F0",
  primaryLight: "#EEF1FD",

  // Accent – amber/solar
  accent: "#f59e0b",
  accentLight: "#fef3c7",

  // Info blue
  secondary: "#0369a1",
  secondaryLight: "#e0f2fe",

  // Surface
  bg: "#f5f7f6",
  card: "#ffffff",
  text: "#0f172a",
  textMuted: "#64748b",
  border: "rgba(0,0,0,0.08)",
};

// Keep existing light/dark theme shapes for compatibility with current code
export const Colors = {
  light: {
    background: Tokens.bg,
    backgroundElement: "#f2f2f2",
    text: Tokens.text,
    textSecondary: Tokens.textMuted,
  },
  dark: {
    background: Tokens.brandDark,
    backgroundElement: "#111",
    text: "#fff",
    textSecondary: "#999",
  },
};

export const ThemeColor = null;
