import type { Config } from "tailwindcss";

/**
 * Playful Geometric design tokens → Tailwind theme.
 * Dark mode via `class` (toggled by ThemeProvider, persisted, system-aware).
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--bg) / <alpha-value>)",
        foreground: "rgb(var(--fg) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        mutedfg: "rgb(var(--muted-fg) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        accentfg: "rgb(var(--accent-fg) / <alpha-value>)",
        secondary: "rgb(var(--secondary) / <alpha-value>)",
        tertiary: "rgb(var(--tertiary) / <alpha-value>)",
        quaternary: "rgb(var(--quaternary) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
      },
      fontFamily: {
        display: ['"Outfit"', "system-ui", "sans-serif"],
        body: ['"Plus Jakarta Sans"', '"Noto Sans Bengali"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "8px",
        md: "16px",
        lg: "24px",
      },
      boxShadow: {
        pop: "4px 4px 0px 0px rgb(var(--ink))",
        "pop-lg": "6px 6px 0px 0px rgb(var(--ink))",
        "pop-sm": "2px 2px 0px 0px rgb(var(--ink))",
        sticker: "8px 8px 0px 0px rgb(var(--line))",
        "sticker-pink": "8px 8px 0px 0px rgb(var(--secondary))",
      },
    },
  },
  plugins: [],
};

export default config;
