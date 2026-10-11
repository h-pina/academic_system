import { describe, expect, it } from "vitest";
import { pageRange } from "@/lib/pagination";

describe("pageRange", () => {
  it("handles an empty list", () => {
    expect(pageRange(1, 20, 0)).toEqual({ from: 0, to: 0, totalPages: 1 });
  });

  it("computes the first, middle and last page", () => {
    expect(pageRange(1, 20, 45)).toEqual({ from: 1, to: 20, totalPages: 3 });
    expect(pageRange(2, 20, 45)).toEqual({ from: 21, to: 40, totalPages: 3 });
    expect(pageRange(3, 20, 45)).toEqual({ from: 41, to: 45, totalPages: 3 });
  });

  it("fits exactly one page", () => {
    expect(pageRange(1, 20, 20)).toEqual({ from: 1, to: 20, totalPages: 1 });
  });
});
