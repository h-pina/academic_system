import { describe, expect, it } from "vitest";
import { addMonths, monthGrid, monthOf, monthTitle, toIso } from "@/lib/monthGrid";

describe("monthGrid", () => {
  it("starts on Sunday and pads the blanks (March 2026 starts on a Sunday)", () => {
    const weeks = monthGrid({ year: 2026, month: 2 });
    expect(weeks[0][0]).toBe("2026-03-01");
    expect(weeks).toHaveLength(5);
    expect(weeks[4][2]).toBe("2026-03-31");
    expect(weeks[4].slice(3)).toEqual([null, null, null, null]);
  });

  it("pads the beginning when the month does not start on Sunday (April 2026 starts on Wednesday)", () => {
    const weeks = monthGrid({ year: 2026, month: 3 });
    expect(weeks[0]).toEqual([null, null, null, "2026-04-01", "2026-04-02", "2026-04-03", "2026-04-04"]);
  });

  it("knows the length of February, leap or not", () => {
    const days = (year: number) => monthGrid({ year, month: 1 }).flat().filter(Boolean).length;
    expect(days(2026)).toBe(28);
    expect(days(2028)).toBe(29);
  });

  it("always has full weeks", () => {
    for (let month = 0; month < 12; month++) {
      for (const week of monthGrid({ year: 2026, month })) expect(week).toHaveLength(7);
    }
  });
});

describe("month navigation", () => {
  it("moves across year boundaries", () => {
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(addMonths({ year: 2026, month: 5 }, 14)).toEqual({ year: 2027, month: 7 });
  });

  it("reads and writes ISO dates and titles", () => {
    expect(monthOf("2026-03-09")).toEqual({ year: 2026, month: 2 });
    expect(toIso(2026, 2, 9)).toBe("2026-03-09");
    expect(monthTitle({ year: 2026, month: 2 })).toBe("março de 2026");
  });
});
