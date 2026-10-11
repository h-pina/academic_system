import { describe, expect, it } from "vitest";
import { AVATAR_TONES, avatarToneFor, initialsOf } from "@/lib/initials";

describe("initialsOf", () => {
  it("uses the first and last word", () => {
    expect(initialsOf("Erin Student")).toBe("ES");
    expect(initialsOf("Maria da Silva Souza")).toBe("MS");
  });

  it("handles one word, extra spaces and accents", () => {
    expect(initialsOf("Madonna")).toBe("M");
    expect(initialsOf("  ana   lúcia ")).toBe("AL");
    expect(initialsOf("álvaro")).toBe("Á");
  });

  it("falls back for an empty name", () => {
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("   ")).toBe("?");
  });
});

describe("avatarToneFor", () => {
  it("is stable and case/space insensitive", () => {
    expect(avatarToneFor("Erin Student")).toBe(avatarToneFor("  erin student "));
  });

  it("always returns a known tone", () => {
    for (const name of ["Alice", "Bob", "Carol", "Dave", "Zelda Playwright", ""]) {
      expect(AVATAR_TONES).toContain(avatarToneFor(name));
    }
  });

  it("spreads different names across tones", () => {
    const tones = new Set(
      ["Alice", "Bob", "Carol", "Dave", "Erin", "Frank", "Grace", "Heidi"].map(avatarToneFor),
    );
    expect(tones.size).toBeGreaterThan(1);
  });
});
