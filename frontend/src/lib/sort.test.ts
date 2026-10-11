import { describe, expect, it } from "vitest";
import { NO_SORT, ariaSort, nextSort, parseSort } from "@/lib/sort";

describe("nextSort", () => {
  it("cycles ascending, descending, default for one column", () => {
    const first = nextSort(NO_SORT, "name");
    expect(first).toEqual({ field: "name", order: "asc" });

    const second = nextSort(first, "name");
    expect(second).toEqual({ field: "name", order: "desc" });

    expect(nextSort(second, "name")).toEqual(NO_SORT);
  });

  it("starts ascending when another column is chosen", () => {
    expect(nextSort({ field: "name", order: "desc" }, "entryYear")).toEqual({
      field: "entryYear",
      order: "asc",
    });
  });
});

describe("ariaSort", () => {
  it("reports the state of each column", () => {
    const state = { field: "name", order: "desc" as const };
    expect(ariaSort(state, "name")).toBe("descending");
    expect(ariaSort({ field: "name", order: "asc" }, "name")).toBe("ascending");
    expect(ariaSort(state, "course")).toBe("none");
    expect(ariaSort(NO_SORT, "name")).toBe("none");
  });
});

describe("parseSort", () => {
  const ALLOWED = ["name", "entryYear"];

  it("accepts an allowed field and an order", () => {
    expect(parseSort("entryYear", "desc", ALLOWED)).toEqual({
      field: "entryYear",
      order: "desc",
    });
    expect(parseSort("name", undefined, ALLOWED)).toEqual({ field: "name", order: "asc" });
  });

  it("falls back to the default for unknown fields", () => {
    expect(parseSort("passwordHash", "asc", ALLOWED)).toEqual(NO_SORT);
    expect(parseSort(undefined, "desc", ALLOWED)).toEqual(NO_SORT);
    expect(parseSort("", "desc", ALLOWED)).toEqual(NO_SORT);
  });

  it("treats an unknown order as ascending", () => {
    expect(parseSort("name", "sideways", ALLOWED).order).toBe("asc");
  });
});
