import { describe, expect, it } from "vitest";
import { normalizeLoginIdentifier } from "@/lib/identifier";

describe("normalizeLoginIdentifier", () => {
  it("accepts a valid CPF, with or without punctuation", () => {
    expect(normalizeLoginIdentifier("12345678909")).toEqual({
      ok: true,
      value: "12345678909",
      kind: "cpf",
    });
    expect(normalizeLoginIdentifier("123.456.789-09")).toEqual({
      ok: true,
      value: "12345678909",
      kind: "cpf",
    });
  });

  it("rejects an 11-digit value with wrong check digits", () => {
    expect(normalizeLoginIdentifier("12345678900").ok).toBe(false);
  });

  it("accepts a 10-digit registration number", () => {
    expect(normalizeLoginIdentifier("2026000123")).toEqual({
      ok: true,
      value: "2026000123",
      kind: "registration",
    });
  });

  it.each(["", "123", "202600012", "202600012345", "abc"])(
    "rejects %j",
    (value) => {
      expect(normalizeLoginIdentifier(value).ok).toBe(false);
    },
  );
});
