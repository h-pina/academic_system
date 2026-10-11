import { describe, expect, it } from "vitest";
import {
  STUDENT_STATUS_LABELS,
  TEACHER_TITLE_LABELS,
  statusTone,
  toOptions,
} from "@/lib/labels";

describe("labels", () => {
  it("has a Portuguese label for every student status and teacher title", () => {
    expect(Object.keys(STUDENT_STATUS_LABELS).sort()).toEqual([
      "active",
      "dropped",
      "graduated",
      "locked",
    ]);
    expect(TEACHER_TITLE_LABELS.doctor).toBe("Doutor");
  });

  it("maps statuses to tones and falls back to neutral", () => {
    expect(statusTone("active")).toBe("success");
    expect(statusTone("locked")).toBe("warning");
    expect(statusTone("dropped")).toBe("danger");
    expect(statusTone("something-else")).toBe("neutral");
  });

  it("builds select options in label order", () => {
    expect(toOptions({ a: "A", b: "B" })).toEqual([
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ]);
  });
});
