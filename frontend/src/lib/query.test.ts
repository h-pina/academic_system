import { describe, expect, it } from "vitest";
import { buildQuery } from "@/lib/query";

describe("buildQuery", () => {
  it("returns an empty string without filters", () => {
    expect(buildQuery({})).toBe("");
    expect(buildQuery({ q: "", status: undefined, courseId: null })).toBe("");
  });

  it("skips empty values and keeps numbers and zero", () => {
    expect(buildQuery({ page: 1, courseId: 0, q: "  ", status: "active" })).toBe(
      "?page=1&courseId=0&status=active",
    );
  });

  it("encodes special characters", () => {
    expect(buildQuery({ q: "ana & jo" })).toBe("?q=ana+%26+jo");
  });

  it("trims whitespace", () => {
    expect(buildQuery({ q: "  maria " })).toBe("?q=maria");
  });
});
