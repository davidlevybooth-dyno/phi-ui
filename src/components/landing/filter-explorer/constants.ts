import {
  defaultSliderValue,
  sliderToThreshold,
  thresholdToSliderValue,
  presetToSliderValues as sharedPresetToSliderValues,
  detectActivePreset,
  type MetricFilterBase,
} from "@/lib/scoring/filters";

// Re-export shared utilities so sub-components don't need to know the source.
export { defaultSliderValue, sliderToThreshold };

// ── Domain types ──────────────────────────────────────────────────────────────

export type DesignRow = {
  t: string;            // target id
  m: string;            // model id
  d: string;            // design_id
  bl: string;           // binder_length
  name?: string;        // human-readable design name (from parquet)
  seq?: string;         // binder amino acid sequence (from parquet)
  plddt?: number;
  ptm?: number;
  iptm?: number;
  ipae_ang?: number;
  ipsae?: number;
  binder_rmsd?: number;
  mpnn_score?: number;
  esm_plddt?: number;
  esm_ptm?: number;
};

export interface MetricFilterDef extends MetricFilterBase {
  label: string;
  step: number;
  unit: string;
  rfdOnly?: boolean;
}

// ── Filter definitions ────────────────────────────────────────────────────────

export const FILTER_DEFS: MetricFilterDef[] = [
  { key: "iptm",        label: "ipTM",        direction: "min", inverted: true,  defaultThreshold: 0.50,  min: 0, max: 1,  step: 0.01, unit: "" },
  { key: "plddt",       label: "AF2 pLDDT",   direction: "min", inverted: true,  defaultThreshold: 0.80,  min: 0, max: 1,  step: 0.01, unit: "" },
  { key: "ptm",         label: "pTM",          direction: "min", inverted: true,  defaultThreshold: 0.55,  min: 0, max: 1,  step: 0.01, unit: "" },
  { key: "ipsae",       label: "ipSAE",         direction: "min", inverted: true,  defaultThreshold: 0.35,  min: 0, max: 1,  step: 0.01, unit: "" },
  { key: "ipae_ang",    label: "iPAE",          direction: "max", inverted: false, defaultThreshold: 10.85, min: 0, max: 31, step: 0.1,  unit: "Å" },
  { key: "binder_rmsd", label: "Binder RMSD",   direction: "max", inverted: false, defaultThreshold: 3.5,   min: 0, max: 20, step: 0.1,  unit: "Å" },
];

/** Key-based lookup — avoids fragile positional array access. */
export const FILTER_DEF_BY_KEY = Object.fromEntries(
  FILTER_DEFS.map((f) => [f.key, f])
) as Record<string, MetricFilterDef>;

export const FILTER_PRESETS = {
  default: { iptm: 0.50, plddt: 0.80, ptm: 0.55, ipae_ang: 10.85, ipsae: 0.35, binder_rmsd: 3.5 },
  relaxed: { iptm: 0.50, plddt: 0.80, ptm: 0.45, ipae_ang: 12.40, ipsae: 0.30, binder_rmsd: 4.5 },
} as const;

// ── Histogram metric list ─────────────────────────────────────────────────────

export const HIST_METRICS: { key: keyof DesignRow; label: string; unit: string; direction: "min" | "max" }[] = [
  { key: "iptm",        label: "ipTM",       unit: "",  direction: "min" },
  { key: "plddt",       label: "AF2 pLDDT",  unit: "",  direction: "min" },
  { key: "ptm",         label: "pTM",         unit: "",  direction: "min" },
  { key: "ipae_ang",    label: "iPAE",         unit: "Å", direction: "max" },
  { key: "ipsae",       label: "ipSAE",        unit: "",  direction: "min" },
  { key: "binder_rmsd", label: "Binder RMSD",  unit: "Å", direction: "max" },
];

// ── Display metadata ──────────────────────────────────────────────────────────

export const MODEL_COLORS: Record<string, string> = {
  rfdiffusion1: "#4f6ef7",
  rfdiffusion3: "#38bdf8",
  boltzgen:     "#f97316",
};

export const MODEL_LABELS: Record<string, string> = {
  rfdiffusion1: "RFDiffusion 1",
  rfdiffusion3: "RFDiffusion 3",
  boltzgen:     "BoltzGen",
};

export const MODEL_IDS = ["rfdiffusion1", "rfdiffusion3", "boltzgen"] as const;

/**
 * Display scale factors: each design row represents this many real designs.
 * Derived from 60,010 target per model divided by actual row counts in designs.json.
 * rfdiffusion1: 60010/1795, rfdiffusion3: 60010/1480, boltzgen: 60010/1538
 */
export const MODEL_SCALE: Record<string, number> = {
  rfdiffusion1: 60010 / 1795,
  rfdiffusion3: 60010 / 1480,
  boltzgen:     60010 / 1538,
};

/** Scaled count: sum of each design's model scale factor. */
export function scaledCount(rows: { m: string }[]): number {
  return Math.round(rows.reduce((sum, d) => sum + (MODEL_SCALE[d.m] ?? 1), 0));
}

export const TARGET_ORDER = ["il7ra", "pdl1", "1www", "4zxb", "6m0j"] as const;

export const TARGET_LABELS: Record<string, string> = {
  il7ra: "IL-7RA",
  pdl1:  "PD-L1",
  "1www": "TrkA",
  "4zxb": "InsulinR",
  "6m0j": "SC2RBD",
};

// ── Filter logic ──────────────────────────────────────────────────────────────

export function designPasses(row: DesignRow, sliderValues: Record<string, number>): boolean {
  return FILTER_DEFS.every((f) => {
    const val = row[f.key as keyof DesignRow];
    if (val === undefined || val === null) return true;
    const num = typeof val === "string" ? parseFloat(val) : (val as number);
    const threshold = sliderToThreshold(f, sliderValues[f.key] ?? defaultSliderValue(f));
    return f.direction === "min" ? num >= threshold : num <= threshold;
  });
}

export function presetToSliderValues(preset: keyof typeof FILTER_PRESETS): Record<string, number> {
  return sharedPresetToSliderValues(FILTER_PRESETS[preset], FILTER_DEFS);
}

export function detectPreset(values: Record<string, number>): keyof typeof FILTER_PRESETS | null {
  return detectActivePreset(values, FILTER_PRESETS, FILTER_DEFS) as keyof typeof FILTER_PRESETS | null;
}

/** Stable string fingerprint of slider values for use in useMemo dependency arrays. */
export function sliderFingerprint(sliderValues: Record<string, number>): string {
  return FILTER_DEFS.map((f) => sliderValues[f.key] ?? defaultSliderValue(f)).join(",");
}
