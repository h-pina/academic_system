import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import {
  dark,
  light,
  radii,
  tailwindColorEntries,
  toCssVariables,
} from "./src/styles/tokens";

/** Emits the theme variables: light by default, dark by OS preference or choice. */
const themeVariables = plugin(({ addBase }) => {
  const lightVars = { ...toCssVariables(light), "color-scheme": "light" };
  const darkVars = { ...toCssVariables(dark), "color-scheme": "dark" };

  addBase({
    ":root": {
      ...lightVars,
      "--radius-control": radii.control,
      "--radius-surface": radii.surface,
      "--radius-overlay": radii.overlay,
    },
    "@media (prefers-color-scheme: dark)": {
      ':root:not([data-theme="light"])': darkVars,
    },
    ':root[data-theme="dark"]': darkVars,
  });
});

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ...tailwindColorEntries(),
        // Semantic aliases over the neutral ramp.
        ink: "rgb(var(--c-slate-900) / <alpha-value>)",
        muted: "rgb(var(--c-slate-600) / <alpha-value>)",
        line: "rgb(var(--c-slate-200) / <alpha-value>)",
      },
      borderRadius: {
        lg: "var(--radius-control)",
        xl: "var(--radius-surface)",
        "2xl": "var(--radius-overlay)",
      },
      boxShadow: {
        card: "0 1px 2px rgb(var(--shadow) / 0.05), 0 1px 3px rgb(var(--shadow) / 0.09)",
        panel: "0 4px 12px rgb(var(--shadow) / 0.08), 0 12px 32px rgb(var(--shadow) / 0.14)",
        focus: "0 0 0 3px rgb(var(--c-brand-500) / 0.4)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "scale-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.15s ease-out",
        "scale-in": "scale-in 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slide-up 0.24s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [themeVariables],
};

export default config;
