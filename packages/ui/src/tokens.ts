/**
 * Design tokens mirroring `DESIGN-SYSTEM.md`: Minimal/Modern, Ocean Blue accent,
 * 4px spacing grid, rounded components, dark-first. These values are the JS/TS
 * source of truth consumed by both runtime styling and tests. CSS variables live
 * in `apps/desktop/src/styles.css`.
 */
export const tokens = {
  colors: {
    background: "#0a0f1c",
    surface: "#121a2b",
    border: "#1f2b44",
    text: "#e6edf7",
    muted: "#8295b3",
    primary: "#2f81f7",
    success: "#3fb950",
    warning: "#d29922",
    error: "#f85149",
  },
  radius: { sm: "0.25rem", md: "0.5rem", lg: "0.75rem" },
  spacing: { grid: 4 },
} as const;

/** Tailwind-style class joiner for conditional class names. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export type Tokens = typeof tokens;
