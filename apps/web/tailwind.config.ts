import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import animate from "tailwindcss-animate";
import containerQueries from "@tailwindcss/container-queries";

/**
 * Aurora Ledger design tokens.
 * Colors are semantic (by role, not hue) and resolve to CSS variables defined
 * in app/globals.css for light and dark themes. Use `fg` for text, `surface-*`
 * for layers, `line` for borders, and status roles (positive/negative/warning/ai)
 * with their `-fg` variant for readable text.
 */
const role = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: role("bg"),
        surface: {
          1: role("surface-1"),
          2: role("surface-2"),
          3: role("surface-3"),
        },
        line: {
          DEFAULT: role("line"),
          strong: role("line-strong"),
        },
        fg: {
          DEFAULT: role("fg"),
          muted: role("fg-muted"),
          subtle: role("fg-subtle"),
        },
        brand: {
          DEFAULT: role("brand"),
          fg: role("brand-fg"),
          contrast: role("brand-contrast"),
        },
        ai: {
          DEFAULT: role("ai"),
          fg: role("ai-fg"),
          /** Text/icons placed on AI cyan fills (≥5.9:1). */
          ink: role("ai-ink"),
        },
        positive: {
          DEFAULT: role("positive"),
          fg: role("positive-fg"),
        },
        negative: {
          DEFAULT: role("negative"),
          fg: role("negative-fg"),
        },
        warning: {
          DEFAULT: role("warning"),
          fg: role("warning-fg"),
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        // Display numerals for balances
        display: ["clamp(2.25rem, 1.6rem + 2.8vw, 3.5rem)", { lineHeight: "1.05", letterSpacing: "-0.035em", fontWeight: "750" }],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        "elev-1": "0 1px 2px rgb(var(--shadow) / 0.06), 0 1px 1px rgb(var(--shadow) / 0.04)",
        "elev-2": "0 8px 24px -8px rgb(var(--shadow) / 0.18), 0 2px 6px -2px rgb(var(--shadow) / 0.08)",
        "elev-3": "0 24px 48px -12px rgb(var(--shadow) / 0.35), 0 8px 16px -8px rgb(var(--shadow) / 0.15)",
        "glow-brand": "0 8px 28px -6px rgb(var(--brand) / 0.55)",
        "glow-ai": "0 8px 28px -6px rgb(var(--ai) / 0.55)",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
        emphasized: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "320ms",
        slower: "500ms",
      },
      keyframes: {
        "aurora-drift": {
          "0%": { transform: "translate3d(-6%, -4%, 0) rotate(0deg) scale(1)" },
          "50%": { transform: "translate3d(4%, 6%, 0) rotate(8deg) scale(1.08)" },
          "100%": { transform: "translate3d(-6%, -4%, 0) rotate(0deg) scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "scan-beam": {
          "0%": { top: "0%", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { top: "100%", opacity: "0" },
        },
        "ai-fill": {
          "0%": { boxShadow: "0 0 0 0 rgb(var(--ai) / 0)", borderColor: "rgb(var(--ai) / 0.2)" },
          "20%": { boxShadow: "0 0 0 4px rgb(var(--ai) / 0.25)", borderColor: "rgb(var(--ai) / 0.9)" },
          "100%": { boxShadow: "0 0 0 0 rgb(var(--ai) / 0)", borderColor: "rgb(var(--ai) / 0.45)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        "aurora-drift": "aurora-drift 24s ease-in-out infinite",
        "aurora-drift-slow": "aurora-drift 36s ease-in-out infinite reverse",
        shimmer: "shimmer 1.6s infinite",
        "scan-beam": "scan-beam 2.2s cubic-bezier(0.65, 0, 0.35, 1) infinite",
        "ai-fill": "ai-fill 2.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.2, 0, 0, 1) infinite",
      },
    },
  },
  plugins: [
    animate,
    containerQueries,
    plugin(({ addVariant }) => {
      // Touch-first devices: larger hit areas, no hover-only affordances
      addVariant("coarse", "@media (pointer: coarse)");
      addVariant("fine", "@media (pointer: fine)");
      addVariant("hocus", ["&:hover", "&:focus-visible"]);
    }),
  ],
};

export default config;
