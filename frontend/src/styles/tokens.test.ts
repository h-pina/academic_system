import { describe, expect, it } from "vitest";
import {
  SCALE_STEPS,
  dark,
  hexToRgbTriplet,
  light,
  tailwindColorEntries,
  toCssVariables,
  type ThemeTokens,
} from "@/styles/tokens";

function luminance(hex: string): number {
  const [r, g, b] = hexToRgbTriplet(hex)
    .split(" ")
    .map((part) => {
      const channel = Number(part) / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours. */
function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("hexToRgbTriplet", () => {
  it("converts long and short hex values", () => {
    expect(hexToRgbTriplet("#2447d6")).toBe("36 71 214");
    expect(hexToRgbTriplet("#fff")).toBe("255 255 255");
    expect(hexToRgbTriplet("0f1a2e")).toBe("15 26 46");
  });
});

describe("token sets", () => {
  it("define the same variables in both themes", () => {
    expect(Object.keys(toCssVariables(dark)).sort()).toEqual(
      Object.keys(toCssVariables(light)).sort(),
    );
  });

  it("have every scale step as a valid hex colour", () => {
    for (const theme of [light, dark]) {
      for (const scale of Object.values(theme.scales)) {
        for (const step of SCALE_STEPS) {
          expect(scale[step]).toMatch(/^#[0-9a-f]{6}$/i);
        }
      }
    }
  });

  it("expose every scale and colour to Tailwind through variables", () => {
    const entries = tailwindColorEntries();
    expect(entries.brand).toMatchObject({ "600": "rgb(var(--c-brand-600) / <alpha-value>)" });
    expect(entries.canvas).toBe("rgb(var(--c-canvas) / <alpha-value>)");
    expect(entries["tile-mint"]).toBe("rgb(var(--c-tile-mint) / <alpha-value>)");
    expect(entries.tileMint).toBeUndefined();
  });
});

describe.each([
  ["light", light],
  ["dark", dark],
] as [string, ThemeTokens][])("contrast in the %s theme", (_name, theme) => {
  const { scales, colors } = theme;

  it("keeps body text readable on surface and canvas (AA)", () => {
    for (const step of [900, 700, 600, 500] as const) {
      expect(contrast(scales.slate[step], colors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(scales.slate[step], colors.canvas)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps decorative icons and placeholders perceivable (3:1)", () => {
    expect(contrast(scales.slate[400], colors.surface)).toBeGreaterThanOrEqual(3);
  });

  it("keeps white text readable on solid brand and danger buttons (AA)", () => {
    expect(contrast("#ffffff", scales.brand[600])).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#ffffff", scales.red[600])).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the active menu item readable (brand text on brand tint)", () => {
    expect(contrast(scales.brand[700], scales.brand[50])).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps brand links readable on the surface", () => {
    const link = theme === dark ? scales.brand[700] : scales.brand[600];
    expect(contrast(link, colors.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps state text readable on its tint (AA)", () => {
    expect(contrast(scales.red[800], scales.red[50])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(scales.amber[900], scales.amber[50])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(scales.emerald[800], scales.emerald[50])).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps dashboard tiles readable (ink on tile colours)", () => {
    for (const tile of [colors.tileBlue, colors.tileCoral, colors.tileSun, colors.tileMint]) {
      expect(contrast(scales.slate[900], tile)).toBeGreaterThanOrEqual(7);
    }
  });
});
