/**
 * Design tokens mirroring `DESIGN-SYSTEM.md`: Minimal/Modern, Ocean Blue accent,
 * 4px spacing grid, rounded components, dark-first. These values are the JS/TS
 * source of truth consumed by both runtime styling and tests. CSS variables live
 * in `apps/desktop/src/styles.css`.
 */
export const tokens = {
  colors: {
    background: "#000000",
    surface: "#0a0a0a",
    border: "#1a1a1a",
    text: "#e0e0e0",
    muted: "#666666",
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
