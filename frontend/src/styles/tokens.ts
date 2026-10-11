import tailwindColors from "tailwindcss/colors";

/**
 * Single source of truth for the visual identity ("Campus"). Tailwind reads
 * these values (see tailwind.config.ts) and emits them as CSS variables, so
 * a token changed here changes the whole interface in both themes.
 */

export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
export type ScaleStep = (typeof SCALE_STEPS)[number];
export type Scale = Record<ScaleStep, string>;

export interface ThemeTokens {
  /** Colour scales, used as `bg-brand-600`, `text-slate-500`, ... */
  scales: { brand: Scale; slate: Scale; red: Scale; amber: Scale; emerald: Scale };
  /** Single colours. */
  colors: {
    canvas: string;
    surface: string;
    coral: string;
    sun: string;
    mint: string;
    tileBlue: string;
    tileCoral: string;
    tileSun: string;
    tileMint: string;
  };
  /** RGB triplet of the shadow colour. */
  shadow: string;
}

const pick = (palette: Record<string | number, string>, steps: Record<ScaleStep, string | number>): Scale =>
  Object.fromEntries(
    SCALE_STEPS.map((step) => [step, palette[steps[step]] ?? String(steps[step])]),
  ) as Scale;

/** Tailwind's default palettes for the semantic state colours. */
const stateLight = (name: "red" | "amber" | "emerald"): Scale =>
  pick(tailwindColors[name] as unknown as Record<string, string>, {
    50: 50, 100: 100, 200: 200, 300: 300, 400: 400, 500: 500, 600: 600, 700: 700, 800: 800, 900: 900,
  });

/**
 * In the dark theme the light tints become deep tints and the dark text
 * steps become light, while the solid steps (500-700) stay put so solid
 * buttons keep their contrast with white text.
 */
const stateDark = (name: "red" | "amber" | "emerald"): Scale =>
  pick(tailwindColors[name] as unknown as Record<string, string>, {
    50: 950, 100: 900, 200: 800, 300: 700, 400: 500, 500: 500, 600: 600, 700: 700, 800: 300, 900: 200,
  });

export const light: ThemeTokens = {
  scales: {
    brand: {
      50: "#eaf0ff", 100: "#dbe5ff", 200: "#bccdff", 300: "#93aeff", 400: "#6683f5",
      500: "#3f5fe6", 600: "#2447d6", 700: "#1c38ad", 800: "#1a3189", 900: "#172a6b",
    },
    slate: {
      50: "#f4f7fb", 100: "#e9eef6", 200: "#d9e1ed", 300: "#bfcadb", 400: "#7d8aa3",
      500: "#5f6c87", 600: "#4a5772", 700: "#3a4560", 800: "#232d45", 900: "#0f1a2e",
    },
    red: stateLight("red"),
    amber: stateLight("amber"),
    emerald: stateLight("emerald"),
  },
  colors: {
    canvas: "#edf2f8",
    surface: "#ffffff",
    coral: "#ff6a4d",
    sun: "#ffc94a",
    mint: "#26b585",
    tileBlue: "#e3e9ff",
    tileCoral: "#ffe4dd",
    tileSun: "#fff1c9",
    tileMint: "#d7f4e8",
  },
  shadow: "15 26 46",
};

export const dark: ThemeTokens = {
  scales: {
    brand: {
      50: "#151f45", 100: "#1a2757", 200: "#223470", 300: "#2f469c", 400: "#4560dc",
      500: "#5873ec", 600: "#3f5be0", 700: "#9db3ff", 800: "#b9c8ff", 900: "#d6e0ff",
    },
    slate: {
      50: "#121a2d", 100: "#18223a", 200: "#26324e", 300: "#3a4868", 400: "#7686a8",
      500: "#97a5c4", 600: "#aebad6", 700: "#c4cee4", 800: "#dde4f3", 900: "#eaf0ff",
    },
    red: stateDark("red"),
    amber: stateDark("amber"),
    emerald: stateDark("emerald"),
  },
  colors: {
    canvas: "#0b1120",
    surface: "#131b2f",
    coral: "#ff8a73",
    sun: "#ffd36b",
    mint: "#4fd1a5",
    tileBlue: "#1b2850",
    tileCoral: "#3a2220",
    tileSun: "#3a3016",
    tileMint: "#12332a",
  },
  shadow: "0 0 0",
};

/** Shape tokens, shared by both themes. */
export const radii = {
  control: "12px",
  surface: "16px",
  overlay: "22px",
} as const;

/** `#2447d6` -> `36 71 214`, the form Tailwind needs for alpha support. */
export function hexToRgbTriplet(hex: string): string {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  const number = Number.parseInt(full, 16);
  return `${(number >> 16) & 255} ${(number >> 8) & 255} ${number & 255}`;
}

const kebab = (name: string): string => name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

/** CSS custom properties (name -> value) for one theme. */
export function toCssVariables(theme: ThemeTokens): Record<string, string> {
  const variables: Record<string, string> = {};

  for (const [scaleName, scale] of Object.entries(theme.scales)) {
    for (const step of SCALE_STEPS) {
      variables[`--c-${scaleName}-${step}`] = hexToRgbTriplet(scale[step]);
    }
  }
  for (const [name, value] of Object.entries(theme.colors)) {
    variables[`--c-${kebab(name)}`] = hexToRgbTriplet(value);
  }
  variables["--shadow"] = theme.shadow;
  return variables;
}

/** Tailwind colour entries that read the variables above. */
export function tailwindColorEntries(): Record<string, string | Record<string, string>> {
  const ref = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;
  const entries: Record<string, string | Record<string, string>> = {};

  for (const scaleName of Object.keys(light.scales)) {
    entries[scaleName] = Object.fromEntries(
      SCALE_STEPS.map((step) => [String(step), ref(`${scaleName}-${step}`)]),
    );
  }
  for (const name of Object.keys(light.colors)) {
    entries[name] = ref(kebab(name));
  }
  return entries;
}

export const themes = { light, dark } as const;
