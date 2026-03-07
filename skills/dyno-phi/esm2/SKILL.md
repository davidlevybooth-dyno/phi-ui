---
name: dyno-esm2
platform: dyno-phi
version: "1.0"
api_base: https://design.dynotx.com/api/v1
job_type: esm2
description: >
  Protein language model scoring using ESM2: per-position log-likelihood,
  sequence perplexity, and zero-shot variant effect prediction via the Dyno Phi
  cloud API. 1–2 min per batch.
category: scoring
tags: [language-model, scoring, perplexity, log-likelihood, variant-effect, esm]
auth:
  env_var: DYNO_API_KEY
  header: x-api-key
  setup_url: https://design.dynotx.com/dashboard/settings
---

# ESM2 — Language Model Scoring

Cloud-hosted ESM2 (650M parameter) via Dyno Phi. Compute per-position
log-likelihood and sequence perplexity to assess evolutionary plausibility of
designed sequences — no structure needed.

## Authentication

```bash
export DYNO_API_KEY=your_key_here
```

## Quick Start

```bash
# Score a FASTA file
phi esm2 --fasta designs.fasta

# Score inline sequence
phi esm2 --fasta-str ">binder_001
MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPILSRVGDGT"

# Masked marginal scoring — position 10, 25, 50
phi esm2 --fasta designs.fasta --mask 10,25,50
```

## CLI Reference

```
phi esm2 [OPTIONS]

  --fasta FILE              FASTA file (one or more sequences)
  --fasta-str FASTA         Inline FASTA string
  --mask 5,10,15            Positions to mask for masked marginal scoring
  --run-id ID               Optional run label
  --no-wait                 Submit and return immediately
  --out DIR                 Write result manifest to DIR
  --json                    Print raw JSON
```

## REST API

### Submit

```http
POST /api/v1/jobs/
x-api-key: <DYNO_API_KEY>
Content-Type: application/json

{
  "job_type": "esm2",
  "params": {
    "fasta_str": ">binder_001\nMKTAYIAKQRQISFVKSHFSR...",
    "mask_positions": "10,25,50"
  },
  "run_id": "esm2_scoring_001"
}
```

### Completed response

```json
{
  "status": "completed",
  "output_files": [
    { "filename": "scores.json",     "gcs_url": "gs://..." },
    { "filename": "per_position.csv","gcs_url": "gs://..." }
  ]
}
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `fasta_str` | string | required | FASTA-formatted sequence(s) |
| `mask_positions` | string | — | Comma-separated 1-indexed positions to mask |

## Interpreting Results

### Key metrics

| Metric | Threshold | Interpretation |
|--------|-----------|----------------|
| `sequence_perplexity` | ≤ 8.0 | Overall evolutionary plausibility (lower = more natural) |
| `log_likelihood` | ≥ −0.5/residue | Mean per-residue log-likelihood |
| `per_position_confidence` | varies | Positions with low confidence may benefit from redesign |

### Perplexity guide

| Perplexity | Quality | Interpretation |
|-----------|---------|----------------|
| < 5 | Excellent | Highly natural-like sequence |
| 5–8 | Good | Evolutionarily plausible |
| 8–12 | Moderate | Some unusual residue combinations |
| > 12 | Poor | Low evolutionary plausibility; consider redesign |

**Important**: ESM2 scores reflect evolutionary conservation, not binding affinity.
A designed binder may legitimately score higher perplexity than natural proteins
because it contains novel combinations of residues.

### Zero-shot variant effect prediction

Use masked marginals to score specific mutations:

1. Submit wild-type sequence with `mask_positions` at the mutation site(s)
2. The per-position log-probability for each amino acid at masked positions
   gives a zero-shot ΔΔG proxy

```bash
# Score position 52 variants in a binder scaffold
phi esm2 --fasta scaffold.fasta --mask 52
```

### Output scores.json format

```json
{
  "sequence_name": "binder_001",
  "sequence_length": 70,
  "sequence_perplexity": 7.2,
  "mean_log_likelihood": -1.83,
  "per_residue_log_likelihood": [-1.2, -2.1, -1.8, ...],
  "per_residue_confidence": [0.72, 0.61, 0.68, ...]
}
```

## When to Use ESM2

| Use Case | Notes |
|----------|-------|
| Pre-filter ProteinMPNN outputs | Remove implausible sequences before costly structure prediction |
| Rank designs from the same scaffold | Relative scoring within a campaign is meaningful |
| Variant effect prediction | Zero-shot scoring of specific positions |
| Ensemble scoring | Combine with pLDDT and ipTM for composite ranking |

**ESM2 alone is not sufficient** for binder selection — always combine with
structure prediction (ESMFold/AlphaFold2) and interface metrics (ipTM, ipSAE).

## Composite Scoring Example

```python
# After collecting scores from multiple tools:
composite = (
    0.4 * normalize(iptm) +
    0.3 * normalize(binder_plddt / 100) +
    0.2 * normalize(1 - perplexity / 20) +
    0.1 * normalize(mpnn_score)
)
```

## Costs

| Run | Time | Est. cost |
|-----|------|-----------|
| 10 sequences | ~1 min | ~$0.03 |
| 100 sequences | ~4 min | ~$0.10 |

Pricing uses Modal A100-40G spot pricing.

## Related Skills

- **[esmfold](../esmfold/SKILL.md)** — structure-based confidence (pLDDT)
- **[proteinmpnn](../proteinmpnn/SKILL.md)** — design sequences to score with ESM2
- **[alphafold](../alphafold/SKILL.md)** — final validation of top-scoring sequences
