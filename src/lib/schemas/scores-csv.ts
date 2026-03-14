import { z } from "zod";

/** Max bytes to read from a scores CSV stream (prevents OOM). */
export const MAX_SCORES_CSV_BYTES = 10 * 1024 * 1024; // 10 MB

/** Default number of score rows per page. */
export const DEFAULT_SCORES_PAGE_SIZE = 50;

/** Max rows to return in a single page. */
export const MAX_SCORES_PAGE_SIZE = 500;

/**
 * Coerce CSV string values to number when possible; empty string → undefined.
 */
function num(s: string | undefined): number | undefined {
  if (s === undefined || s === "") return undefined;
  const n = Number(s);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * One row from the design pipeline scores CSV.
 * Column names align with backend (e.g. design_name, esmfold_plddt, af2_ptm, passed).
 */
export type ScoresCsvRow = {
  design_name: string;
  esmfold_plddt: number | undefined;
  pass_plddt: number | undefined;
  af2_ptm: number | undefined;
  pass_ptm: number | undefined;
  af2_iptm: number | undefined;
  pass_iptm: number | undefined;
  af2_ipae: number | undefined;
  pass_ipae: number | undefined;
  rmsd: number | undefined;
  pass_rmsd: number | undefined;
  passed: boolean;
  fail_reasons: string;
  af2_model1_iptm?: number;
  af2_model1_ipae?: number;
  af2_model2_iptm?: number;
  af2_model2_ipae?: number;
  [k: string]: string | number | boolean | undefined;
};

const optionalNum = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "string" ? num(v) : v));

export const ScoresCsvRowSchema = z
  .object({
    design_name: z.string().default(""),
    esmfold_plddt: optionalNum,
    pass_plddt: optionalNum,
    af2_ptm: optionalNum,
    pass_ptm: optionalNum,
    af2_iptm: optionalNum,
    pass_iptm: optionalNum,
    af2_ipae: optionalNum,
    pass_ipae: optionalNum,
    rmsd: optionalNum,
    pass_rmsd: optionalNum,
    passed: z
      .union([z.string(), z.boolean()])
      .transform((v) => v === true || v === "true" || v === "1"),
    fail_reasons: z.string().default(""),
    af2_model1_iptm: optionalNum.optional(),
    af2_model1_ipae: optionalNum.optional(),
    af2_model2_iptm: optionalNum.optional(),
    af2_model2_ipae: optionalNum.optional(),
  })
  .passthrough();

/**
 * Parse CSV text into typed score rows.
 * Handles header row and normalizes column names (lowercase, trim).
 */
export function parseScoresCsv(csvText: string): ScoresCsvRow[] {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows: ScoresCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]!);
    const record: Record<string, string | number | boolean | undefined> = {};
    header.forEach((col, j) => {
      record[col] = values[j] ?? "";
    });
    const parsed = ScoresCsvRowSchema.safeParse(record);
    rows.push(parsed.success ? (parsed.data as ScoresCsvRow) : (record as unknown as ScoresCsvRow));
  }
  return rows;
}

/**
 * Split a single CSV line into field values (handles quoted commas).
 */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === "," && !inQuotes) || (c === "\n" && !inQuotes)) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

/**
 * Build one ScoresCsvRow from header column names and a line's values.
 * Single responsibility: map header + values to typed row.
 */
export function recordToScoresCsvRow(
  header: string[],
  values: string[]
): ScoresCsvRow {
  const record: Record<string, string | number | boolean | undefined> = {};
  header.forEach((col, j) => {
    record[col] = values[j] ?? "";
  });
  const parsed = ScoresCsvRowSchema.safeParse(record);
  return parsed.success
    ? (parsed.data as ScoresCsvRow)
    : (record as unknown as ScoresCsvRow);
}
