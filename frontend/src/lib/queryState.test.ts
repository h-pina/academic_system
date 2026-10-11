import { describe, expect, it } from "vitest";
import { parsePage, parseQueryState, serializeQueryState } from "@/lib/queryState";

const DEFAULTS = { q: "", status: "", page: "1" };

describe("parseQueryState", () => {
  it("reads known keys and falls back to the defaults", () => {
    expect(parseQueryState("?q=ana&page=3", DEFAULTS)).toEqual({
      q: "ana",
      status: "",
      page: "3",
    });
    expect(parseQueryState("", DEFAULTS)).toEqual(DEFAULTS);
  });

  it("ignores keys it does not know", () => {
    expect(parseQueryState("?q=a&utm_source=x", DEFAULTS)).toEqual({
      ...DEFAULTS,
      q: "a",
    });
  });

  it("decodes encoded values", () => {
    expect(parseQueryState("?q=ana%20%26%20jo", DEFAULTS).q).toBe("ana & jo");
  });
});

describe("serializeQueryState", () => {
  it("omits defaults and empty values", () => {
    expect(serializeQueryState(DEFAULTS, DEFAULTS)).toBe("");
    expect(serializeQueryState({ q: "  ", status: "", page: "1" }, DEFAULTS)).toBe("");
  });

  it("keeps only what differs, encoded", () => {
    expect(serializeQueryState({ q: "ana & jo", status: "locked", page: "2" }, DEFAULTS)).toBe(
      "?q=ana+%26+jo&status=locked&page=2",
    );
  });

  it("round-trips", () => {
    const state = { q: "maria", status: "active", page: "4" };
    expect(parseQueryState(serializeQueryState(state, DEFAULTS), DEFAULTS)).toEqual(state);
  });
});

describe("parsePage", () => {
  it("accepts positive integers only", () => {
    expect(parsePage("3")).toBe(3);
    for (const value of [undefined, "", "0", "-2", "1.5", "abc"]) {
      expect(parsePage(value)).toBe(1);
    }
  });
});
