import { describe, expect, it } from "vitest";
import {
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  nextPreference,
  parseThemePreference,
  resolveTheme,
} from "@/lib/theme";

describe("parseThemePreference", () => {
  it("keeps the explicit choices", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
  });

  it.each([null, undefined, "", "system", "DARK", "blue"])(
    "falls back to system for %j",
    (value) => {
      expect(parseThemePreference(value as string | null | undefined)).toBe("system");
    },
  );
});

describe("resolveTheme", () => {
  it("follows the OS only for the system preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("lets an explicit choice win over the OS", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("nextPreference", () => {
  it("cycles light, dark, system", () => {
    expect(nextPreference("light")).toBe("dark");
    expect(nextPreference("dark")).toBe("system");
    expect(nextPreference("system")).toBe("light");
  });
});

describe("THEME_INIT_SCRIPT", () => {
  function run(stored: string | null | "throw") {
    const attributes: Record<string, string> = {};
    const fakeWindow = {
      localStorage: {
        getItem: (key: string) => {
          if (stored === "throw") throw new Error("blocked");
          return key === THEME_STORAGE_KEY ? stored : null;
        },
      },
      document: {
        documentElement: {
          setAttribute: (name: string, value: string) => {
            attributes[name] = value;
          },
        },
      },
    };
    new Function("localStorage", "document", THEME_INIT_SCRIPT)(
      fakeWindow.localStorage,
      fakeWindow.document,
    );
    return attributes;
  }

  it("applies a saved explicit theme before first paint", () => {
    expect(run("dark")).toEqual({ "data-theme": "dark" });
    expect(run("light")).toEqual({ "data-theme": "light" });
  });

  it("sets nothing for system, unknown or unreadable storage", () => {
    expect(run(null)).toEqual({});
    expect(run("system")).toEqual({});
    expect(run("purple")).toEqual({});
    expect(run("throw")).toEqual({});
  });
});
