/**
 * Tests for scores CSV parsing. Run with: npx vitest run src/lib/schemas/scores-csv.test.ts
 * (Add vitest to devDependencies and "test": "vitest run" to package.json if not already present.)
 */
import { describe, it, expect } from "vitest";
import {
  parseCsvLine,
  recordToScoresCsvRow,
  parseScoresCsv,
  DEFAULT_SCORES_PAGE_SIZE,
  MAX_SCORES_CSV_BYTES,
  MAX_SCORES_PAGE_SIZE,
} from "./scores-csv";

describe("parseCsvLine", () => {
  it("splits simple comma-separated values", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("handles quoted field with comma", () => {
    expect(parseCsvLine('a,"b,c",d')).toEqual(["a", "b,c", "d"]);
  });

  it("trims whitespace", () => {
    expect(parseCsvLine("  a  ,  b  ")).toEqual(["a", "b"]);
  });
});

describe("recordToScoresCsvRow", () => {
  it("maps header and values to typed row with passed boolean", () => {
    const header = ["design_name", "esmfold_plddt", "passed", "fail_reasons"];
    const values = ["design_1", "0.85", "true", ""];
    const row = recordToScoresCsvRow(header, values);
    expect(row.design_name).toBe("design_1");
    expect(row.esmfold_plddt).toBe(0.85);
    expect(row.passed).toBe(true);
    expect(row.fail_reasons).toBe("");
  });

  it("coerces passed false and string numbers", () => {
    const header = ["design_name", "passed", "rmsd"];
    const values = ["d2", "0", "2.5"];
    const row = recordToScoresCsvRow(header, values);
    expect(row.passed).toBe(false);
    expect(row.rmsd).toBe(2.5);
  });
});

describe("parseScoresCsv", () => {
  it("returns empty array for empty or single-line input", () => {
    expect(parseScoresCsv("")).toEqual([]);
    expect(parseScoresCsv("header_only")).toEqual([]);
  });

  it("parses header and one data row", () => {
    const csv = "design_name,esmfold_plddt,passed\nfoo,0.9,true";
    const rows = parseScoresCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.design_name).toBe("foo");
    expect(rows[0]!.esmfold_plddt).toBe(0.9);
    expect(rows[0]!.passed).toBe(true);
  });

  it("normalizes header to lowercase with underscores", () => {
    const csv = "Design Name,ESMFold pLDDT\nx,0.8";
    const rows = parseScoresCsv(csv);
    expect(rows[0]!.design_name).toBe("x");
    expect(rows[0]!.esmfold_plddt).toBe(0.8);
  });
});

describe("constants", () => {
  it("exports pagination and size limits", () => {
    expect(DEFAULT_SCORES_PAGE_SIZE).toBe(50);
    expect(MAX_SCORES_PAGE_SIZE).toBe(500);
    expect(MAX_SCORES_CSV_BYTES).toBe(10 * 1024 * 1024);
  });
});
