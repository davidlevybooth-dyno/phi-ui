#!/usr/bin/env python3
"""
Export benchmarking parquet files to compact JSON for the landing page filter explorer.

Sources (already downloaded to /tmp/):
  /tmp/rfd_metrics.pq   — RFDiffusion1 + RFDiffusion3, 4 MPNN seqs per design
  /tmp/boltzgen_metrics.pq — BoltzGen + RFDiffusion3 (RFD3 rows are deduped), 1 BoltzIF seq per design

Outputs:
  public/data/benchmark/designs.json   — design-level rows (~6K), best-of-N by ipTM
  public/data/benchmark/summary.json   — histogram bins per metric per target/model

Run from repo root:
  python3 scripts/export_benchmark_data.py
"""

import json
import math
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# ── paths ────────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = REPO_ROOT / "public" / "data" / "benchmark"

RFD_PQ = Path("/tmp/rfd_metrics.pq")
BG_PQ = Path("/tmp/boltzgen_metrics.pq")

# ── constants ────────────────────────────────────────────────────────────────

EXCLUDED_TARGETS = {"tfr1"}

TARGET_LABELS = {
    "1www": "TrkA",
    "4zxb": "InsulinR",
    "6m0j": "SC2RBD",
    "il7ra": "IL-7RA",
    "pdl1": "PD-L1",
}

MODEL_LABELS = {
    "rfdiffusion1": "RFDiffusion 1",
    "rfdiffusion3": "RFDiffusion 3",
    "boltzgen": "BoltzGen",
}

# Columns to rename + their output key
METRIC_MAP = {
    "af2_complex_models-0_pLDDT":    "plddt",
    "af2_complex_models-0_pTM":      "ptm",
    "af2_complex_models-0_i_pTM":    "iptm",
    "af2_complex_models-0_i_pAE":    "ipae_norm",   # normalized 0–1; we multiply ×31 for Å
    "af2_complex_models-0_i_pSAE_min": "ipsae",
    "af2_complex_models-0_Binder_RMSD": "binder_rmsd",
    # RFD-only
    "mpnn_score":           "mpnn_score",
    "esmfold_binder_pLDDT": "esm_plddt",
    "esmfold_binder_pTM":   "esm_ptm",
}

SORT_KEY = "af2_complex_models-0_i_pTM"  # best-of-N selection

HISTOGRAM_BINS = 40


# ── metric metadata for the frontend ─────────────────────────────────────────

METRIC_META = {
    "plddt":      {"label": "AF2 pLDDT",      "direction": "min", "unit": "",   "default_threshold": 0.80},
    "ptm":        {"label": "pTM",             "direction": "min", "unit": "",   "default_threshold": 0.55},
    "iptm":       {"label": "ipTM",            "direction": "min", "unit": "",   "default_threshold": 0.50},
    "ipae_ang":   {"label": "iPAE",            "direction": "max", "unit": "Å",  "default_threshold": 10.85},
    "ipsae":      {"label": "ipSAE",           "direction": "min", "unit": "",   "default_threshold": 0.35},
    "binder_rmsd":{"label": "Binder RMSD",     "direction": "max", "unit": "Å",  "default_threshold": 3.5},
    "mpnn_score": {"label": "MPNN score",      "direction": "max", "unit": "",   "default_threshold": 1.2, "rfd_only": True},
    "esm_plddt":  {"label": "ESMFold pLDDT",   "direction": "min", "unit": "",   "default_threshold": 0.80, "rfd_only": True},
    "esm_ptm":    {"label": "ESMFold pTM",     "direction": "min", "unit": "",   "default_threshold": 0.55, "rfd_only": True},
}


# ── helpers ───────────────────────────────────────────────────────────────────

def load_and_prep(path: Path, source_label: str) -> pd.DataFrame:
    print(f"  Loading {path} …")
    df = pd.read_parquet(path)
    print(f"    {len(df):,} rows, {len(df.columns)} columns")
    df = df[~df["target"].isin(EXCLUDED_TARGETS)].copy()
    print(f"    {len(df):,} rows after dropping excluded targets")
    return df


def best_of_n(df: pd.DataFrame) -> pd.DataFrame:
    """Keep the row with the highest ipTM per (target, model_info, design_id)."""
    return (
        df.sort_values(SORT_KEY, ascending=False)
        .groupby(["target", "model_info", "design_id"], as_index=False)
        .first()
    )


def to_design_record(row: pd.Series) -> dict:
    rec = {
        "t":  row["target"],          # target id (short key to save space)
        "m":  row["model_info"],       # model id
        "d":  str(row["design_id"]),   # design_id
        "bl": str(row.get("binder_length", "")),
    }
    for src_col, key in METRIC_MAP.items():
        val = row.get(src_col)
        if val is not None and not (isinstance(val, float) and math.isnan(val)):
            rec[key] = round(float(val), 3)
        else:
            rec[key] = None
    # Derive iPAE in Ångströms from normalized value; drop normalized form
    ipae_norm = rec.pop("ipae_norm", None)
    rec["ipae_ang"] = round(ipae_norm * 31.0, 2) if ipae_norm is not None else None
    return rec


def make_histogram(values: pd.Series, n_bins: int = HISTOGRAM_BINS) -> dict:
    clean = values.dropna().astype(float)
    if len(clean) == 0:
        return {"bins": [], "counts": [], "min": 0, "max": 0}
    lo, hi = float(clean.min()), float(clean.max())
    if lo == hi:
        return {"bins": [lo], "counts": [int(len(clean))], "min": lo, "max": hi}
    counts, edges = np.histogram(clean, bins=n_bins, range=(lo, hi))
    return {
        "bins":   [round(float(e), 4) for e in edges[:-1]],
        "counts": [int(c) for c in counts],
        "min":    round(lo, 4),
        "max":    round(hi, 4),
    }


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    print("=== export_benchmark_data ===\n")

    for p in [RFD_PQ, BG_PQ]:
        if not p.exists():
            print(f"ERROR: {p} not found. Run:")
            print(f"  gsutil cp gs://pandoras-bucket/dyno_psi/benchmarking/external_benchmarks/evals_rfd_like/mpnn_target_aware/initial_guess_monomer/complex_refolding_metrics_concatenated_index_file.pq /tmp/rfd_metrics.pq")
            print(f"  gsutil cp gs://pandoras-bucket/dyno_psi/benchmarking/external_benchmarks/evals_external_sequences/complex_refolding_metrics.pq /tmp/boltzgen_metrics.pq")
            sys.exit(1)

    # 1. Load
    print("Loading parquet files…")
    rfd = load_and_prep(RFD_PQ, "rfd")
    bg  = load_and_prep(BG_PQ,  "boltzgen")

    # 2. From BoltzGen file keep only boltzgen rows (rfdiffusion3 is already in RFD file)
    bg = bg[bg["model_info"] == "boltzgen"].copy()
    print(f"  BoltzGen-only rows: {len(bg):,}")

    # 3. Best-of-N per design
    print("\nAggregating best-of-N…")
    rfd_best = best_of_n(rfd)
    bg_best  = best_of_n(bg)
    print(f"  RFD best-of-N: {len(rfd_best):,} design rows")
    print(f"  BoltzGen best-of-N: {len(bg_best):,} design rows")

    combined = pd.concat([rfd_best, bg_best], ignore_index=True)
    print(f"  Combined: {len(combined):,} design rows")

    # 4. Build designs.json
    print("\nBuilding designs.json…")
    designs = [to_design_record(row) for _, row in combined.iterrows()]

    # Sanity-check
    targets_seen = sorted({d["t"] for d in designs})
    models_seen  = sorted({d["m"] for d in designs})
    print(f"  Targets: {targets_seen}")
    print(f"  Models:  {models_seen}")
    print(f"  Records: {len(designs):,}")

    # 5. Build summary.json — histograms per output metric per target+model
    print("\nBuilding summary.json…")

    # Map output key → source column name for histogram building from combined df
    output_key_to_src = {v: k for k, v in METRIC_MAP.items()}
    output_key_to_src["ipae_ang"] = "af2_complex_models-0_i_pAE"  # will be ×31 below

    histograms: dict = {}
    for key, meta in METRIC_META.items():
        src_col = output_key_to_src.get(key)
        if src_col is None:
            continue

        histograms[key] = {"meta": meta, "by_target_model": {}}

        for target in targets_seen:
            for model in models_seen:
                subset = combined[(combined["target"] == target) & (combined["model_info"] == model)]
                if len(subset) == 0:
                    continue
                if src_col not in subset.columns:
                    continue
                vals = subset[src_col].dropna().astype(float)
                if key == "ipae_ang":
                    vals = vals * 31.0
                label = f"{target}|{model}"
                histograms[key]["by_target_model"][label] = make_histogram(vals)

    # Overall histograms (all targets, all models)
    for key, meta in METRIC_META.items():
        src_col = output_key_to_src.get(key)
        if src_col is None or src_col not in combined.columns:
            continue
        vals = combined[src_col].dropna().astype(float)
        if key == "ipae_ang":
            vals = vals * 31.0
        if key in histograms:
            histograms[key]["overall"] = make_histogram(vals)

    # Pass rate lookup at default thresholds per target × model (convenience for initial render)
    pass_rates = {}
    for target in targets_seen:
        pass_rates[target] = {}
        for model in models_seen:
            subset = combined[(combined["target"] == target) & (combined["model_info"] == model)]
            if len(subset) == 0:
                continue
            passes = pd.Series([True] * len(subset), index=subset.index)
            checks = [
                ("af2_complex_models-0_i_pTM",  ">=", 0.50),
                ("af2_complex_models-0_pLDDT",  ">=", 0.80),
                ("af2_complex_models-0_pTM",    ">=", 0.55),
                ("af2_complex_models-0_i_pAE",  "<=", 10.85 / 31.0),
                ("af2_complex_models-0_Binder_RMSD", "<=", 3.5),
            ]
            for col, op, thresh in checks:
                if col not in subset.columns:
                    continue
                vals = pd.to_numeric(subset[col], errors="coerce")
                if op == ">=":
                    passes = passes & (vals >= thresh)
                else:
                    passes = passes & (vals <= thresh)
            total = len(subset)
            n_pass = int(passes.sum())
            pass_rates[target][model] = {
                "n_pass": n_pass,
                "total": total,
                "rate": round(n_pass / total, 4) if total > 0 else 0,
            }

    summary = {
        "targets": [
            {"id": t, "label": TARGET_LABELS.get(t, t)} for t in targets_seen
        ],
        "models": [
            {"id": m, "label": MODEL_LABELS.get(m, m)} for m in models_seen
        ],
        "metric_meta": METRIC_META,
        "histograms": histograms,
        "default_pass_rates": pass_rates,
    }

    # 6. Write output
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    designs_path = OUTPUT_DIR / "designs.json"
    with open(designs_path, "w") as f:
        json.dump(designs, f, separators=(",", ":"))
    size_kb = designs_path.stat().st_size / 1024
    print(f"\nWrote {designs_path}  ({size_kb:.0f} KB)")

    summary_path = OUTPUT_DIR / "summary.json"
    with open(summary_path, "w") as f:
        json.dump(summary, f, separators=(",", ":"))
    size_kb = summary_path.stat().st_size / 1024
    print(f"Wrote {summary_path}  ({size_kb:.0f} KB)")

    print("\nDone.")


if __name__ == "__main__":
    main()
