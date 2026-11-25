import { describe, expect, it } from "vitest";
import { fileNameFrom } from "@/lib/download";

describe("fileNameFrom", () => {
  it("reads a quoted file name", () => {
    expect(fileNameFrom('attachment; filename="notas-CC101-T01.csv"')).toBe("notas-CC101-T01.csv");
  });
  it("reads an unquoted and an encoded name", () => {
    expect(fileNameFrom("attachment; filename=relatorio.pdf")).toBe("relatorio.pdf");
    expect(fileNameFrom("attachment; filename*=UTF-8''aten%C3%A7%C3%A3o.pdf")).toBe("atenção.pdf");
  });
  it("is null without a header", () => {
    expect(fileNameFrom(null)).toBeNull();
    expect(fileNameFrom("inline")).toBeNull();
  });
});
