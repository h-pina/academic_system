import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  calendarMarkers,
  calendarProblems,
  canAllocate,
  classTitle,
  enrollmentActions,
  formatGrade,
  formatIsoDate,
  formatPercent,
  formatSchedule,
  isEnrollmentWindowOpen,
  scheduleProblems,
  semesterLabel,
  statusTone,
  todayIso,
  travelTargets,
  weekdayLabel,
  withdrawalOpen,
} from "@/lib/academic";

describe("formatting", () => {
  it("shows ISO dates the Brazilian way", () => {
    expect(formatIsoDate("2026-03-02")).toBe("02/03/2026");
    expect(formatIsoDate("2026-03-02T10:00:00Z")).toBe("02/03/2026");
    expect(formatIsoDate(null)).toBe("-");
    expect(formatIsoDate("abc")).toBe("abc");
  });

  it("uses a decimal comma and a dash for missing grades", () => {
    expect(formatGrade(8.5)).toBe("8,5");
    expect(formatGrade(8.625)).toBe("8,63");
    expect(formatGrade(10)).toBe("10");
    expect(formatGrade(null)).toBe("-");
    expect(formatPercent(33.333)).toBe("33,3%");
    expect(formatPercent(25)).toBe("25%");
  });

  it("names semesters and classes", () => {
    expect(semesterLabel({ year: 2026, term: 2 })).toBe("2026/2");
    expect(classTitle({ code: "T01", subject: { code: "CC101", name: "Programação" } })).toBe(
      "CC101 T01 - Programação",
    );
  });

  it("formats a schedule sorted by day and time", () => {
    expect(
      formatSchedule([
        { weekday: 3, startTime: "08:00", endTime: "10:00" },
        { weekday: 1, startTime: "14:00", endTime: "16:00" },
        { weekday: 1, startTime: "08:00", endTime: "10:00" },
      ]),
    ).toBe("Seg 08:00-10:00 · Seg 14:00-16:00 · Qua 08:00-10:00");
    expect(formatSchedule([])).toBe("Sem horário");
    expect(weekdayLabel(2)).toBe("Terça-feira");
    expect(weekdayLabel(9)).toBe("9");
  });

  it("maps states to tones that do not rely on colour alone", () => {
    expect(statusTone("approved")).toBe("success");
    expect(statusTone("failed_attendance")).toBe("danger");
    expect(statusTone("pending")).toBe("warning");
    expect(statusTone("unknown")).toBe("neutral");
  });
});

describe("calendar windows", () => {
  const calendar = { enrollmentStart: "2026-02-02", enrollmentEnd: "2026-02-20" };
  it("is open on both boundaries and closed outside", () => {
    expect(isEnrollmentWindowOpen(calendar, "2026-02-02")).toBe(true);
    expect(isEnrollmentWindowOpen(calendar, "2026-02-20")).toBe(true);
    expect(isEnrollmentWindowOpen(calendar, "2026-02-21")).toBe(false);
    expect(isEnrollmentWindowOpen(calendar, "2026-02-01")).toBe(false);
  });
  it("allows withdrawal up to and including the deadline", () => {
    expect(withdrawalOpen("2026-04-15", "2026-04-15")).toBe(true);
    expect(withdrawalOpen("2026-04-15", "2026-04-16")).toBe(false);
  });
  it("formats the local day", () => {
    expect(todayIso(new Date(2026, 2, 5))).toBe("2026-03-05");
  });
});

describe("scheduleProblems", () => {
  it("accepts back-to-back slots", () => {
    expect(
      scheduleProblems([
        { weekday: 1, startTime: "08:00", endTime: "10:00" },
        { weekday: 1, startTime: "10:00", endTime: "12:00" },
      ]),
    ).toEqual([]);
  });
  it("flags missing, reversed and overlapping times", () => {
    expect(scheduleProblems([{ weekday: 1, startTime: "", endTime: "10:00" }])[0]).toContain("HH:MM");
    expect(scheduleProblems([{ weekday: 1, startTime: "10:00", endTime: "08:00" }])[0]).toContain("anterior");
    expect(
      scheduleProblems([
        { weekday: 2, startTime: "08:00", endTime: "10:00" },
        { weekday: 2, startTime: "09:00", endTime: "11:00" },
      ])[0],
    ).toContain("sobrepõem");
  });
  it("allows the same hours on different weekdays", () => {
    expect(
      scheduleProblems([
        { weekday: 1, startTime: "08:00", endTime: "10:00" },
        { weekday: 2, startTime: "08:00", endTime: "10:00" },
      ]),
    ).toEqual([]);
  });
});

describe("calendarProblems", () => {
  const valid = {
    description: "Calendário 2026",
    startDate: "2026-02-02",
    endDate: "2026-06-30",
    enrollmentStart: "2026-02-02",
    enrollmentEnd: "2026-02-20",
    withdrawalDeadline: "2026-04-15",
    gradesDeadline: "2026-07-10",
  };
  it("accepts a consistent calendar", () => {
    expect(calendarProblems(valid)).toEqual({});
  });
  it("asks for every field", () => {
    expect(Object.keys(calendarProblems({ ...valid, description: "", gradesDeadline: "" }))).toEqual([
      "description",
      "gradesDeadline",
    ]);
  });
  it("explains inconsistent dates on the right field", () => {
    expect(calendarProblems({ ...valid, endDate: "2026-01-01" }).endDate).toBeDefined();
    expect(calendarProblems({ ...valid, enrollmentStart: "2026-01-10" }).enrollmentStart).toBeDefined();
    expect(calendarProblems({ ...valid, withdrawalDeadline: "2026-08-01" }).withdrawalDeadline).toBeDefined();
    expect(calendarProblems({ ...valid, gradesDeadline: "2026-01-01" }).gradesDeadline).toBeDefined();
  });
});

describe("enrollmentActions", () => {
  it("lets a request be withdrawn at any time, but never locked", () => {
    expect(enrollmentActions("requested", "2026-04-15", "2026-12-01")).toEqual({ cancel: true, lock: false });
    expect(enrollmentActions("requested", undefined, "2026-12-01")).toEqual({ cancel: true, lock: false });
  });
  it("lets a confirmed enrollment be cancelled or locked until the deadline", () => {
    expect(enrollmentActions("confirmed", "2026-04-15", "2026-04-15")).toEqual({ cancel: true, lock: true });
    expect(enrollmentActions("confirmed", "2026-04-15", "2026-04-16")).toEqual({ cancel: false, lock: false });
    expect(enrollmentActions("confirmed", undefined, "2026-04-01")).toEqual({ cancel: false, lock: false });
  });
  it("offers nothing for decided or finished enrollments", () => {
    for (const status of ["not_allocated", "approved", "failed_grade", "failed_attendance", "cancelled", "locked"] as const) {
      expect(enrollmentActions(status, "2026-04-15", "2026-02-01")).toEqual({ cancel: false, lock: false });
    }
  });
});

describe("canAllocate", () => {
  it("opens the day after the enrollment period ends", () => {
    expect(canAllocate("2026-02-20", "2026-02-20")).toBe(false);
    expect(canAllocate("2026-02-20", "2026-02-21")).toBe(true);
  });
});

describe("time travel helpers", () => {
  it("moves dates across month and year boundaries", () => {
    expect(addDaysIso("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysIso("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("targets the day after each deadline", () => {
    expect(
      travelTargets({ enrollmentEnd: "2026-02-20", withdrawalDeadline: "2026-04-15", gradesDeadline: "2026-07-10" }),
    ).toEqual([
      { label: "Fim das inscrições", date: "2026-02-21" },
      { label: "Depois do prazo de cancelamento", date: "2026-04-16" },
      { label: "Depois do prazo de notas", date: "2026-07-11" },
    ]);
  });
});

describe("calendarMarkers", () => {
  const calendar = {
    startDate: "2026-02-02", endDate: "2026-06-30", enrollmentStart: "2026-02-02",
    enrollmentEnd: "2026-02-20", withdrawalDeadline: "2026-04-15", gradesDeadline: "2026-07-10",
  };
  it("marks each deadline on its day", () => {
    const markers = calendarMarkers(calendar);
    expect(markers["2026-02-20"]).toEqual([{ label: "Último dia das inscrições" }]);
    expect(markers["2026-07-10"]).toEqual([{ label: "Prazo de lançamento de notas" }]);
  });
  it("keeps every label when deadlines fall on the same day", () => {
    expect(calendarMarkers(calendar)["2026-02-02"].map((m) => m.label)).toEqual([
      "Início do período letivo",
      "Início das inscrições",
    ]);
  });
});
