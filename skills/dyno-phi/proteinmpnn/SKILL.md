---
name: dyno-proteinmpnn
platform: dyno-phi
version: "1.0"
api_base: https://design.dynotx.com/api/v1
job_type: proteinmpnn
description: >
  Inverse folding: design protein sequences for a given backbone structure using
  ProteinMPNN via the Dyno Phi cloud API. 1–2 min for 10–50 sequences.
  Use after RFdiffusion backbone generation or when redesigning existing proteins.
category: design
tags: [sequence-design, inverse-folding, mpnn, baker-lab, recovery]
auth:
  env_var: DYNO_API_KEY
  header: x-api-key
  setup_url: https://design.dynotx.com/dashboard/settings
---

# ProteinMPNN — Sequence Design via Inverse Folding

Cloud-hosted ProteinMPNN via Dyno Phi. Provide a backbone PDB → get sequences
likely to fold into that structure. Output includes MPNN score and sequence
recovery, used as pre-filters before structure prediction.

## Authentication

```bash
export DYNO_API_KEY=your_key_here
```

## Quick Start

```bash
# Design 10 sequences for a backbone
phi proteinmpnn --pdb design.pdb

# Design 50 sequences with fixed interface residues
phi proteinmpnn --pdb design.pdb \
  --num-sequences 50 \
  --fixed A52,A56,A63 \
  --temperature 0.1

# From GCS (if backbone is already uploaded)
phi proteinmpnn --pdb-gcs gs://dev-services/runs/rfdiff/design_001.pdb \
  --num-sequences 20
```

## CLI Reference

```
phi proteinmpnn [OPTIONS]

  --pdb FILE                PDB structure file (local)
  --pdb-gcs GCS_URI         GCS URI to PDB (gs://…)  — alternative to --pdb
  --num-sequences N         Number of sequences to design (default: 10)
  --temperature T           Sampling temperature 0.0–1.0 (default: 0.1)
                              lower = more conservative / higher recovery
                              higher = more diversity / lower recovery
  --fixed A52,A56           Residue positions to fix (keep from input structure)
                              format: CHAINRESNUM e.g. A52,A56 or A10-20,B5-15
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
  "job_type": "proteinmpnn",
  "params": {
    "pdb_content": "ATOM      1  N   MET A   1 ...",
    "num_sequences": 20,
    "temperature": 0.1,
    "fixed_positions": "A52,A56,A63"
  },
  "run_id": "pdl1_mpnn_design"
}
```

Use `pdb_gcs_uri` instead of `pdb_content` for large structures:

```json
{
  "job_type": "proteinmpnn",
  "params": {
    "pdb_gcs_uri": "gs://dev-services/runs/rfdiff_001/backbone.pdb",
    "num_sequences": 50,
    "temperature": 0.1
  }
}
```

### Completed response

```json
{
  "status": "completed",
  "output_files": [
    { "filename": "designed_sequences.fasta", "gcs_url": "gs://..." },
    { "filename": "scores.csv",               "gcs_url": "gs://..." }
  ]
}
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `pdb_content` | string | one of these required | PDB file as text string |
| `pdb_gcs_uri` | string | one of these required | GCS URI to PDB file |
| `num_sequences` | int | `10` | Sequences to generate (max ~200 practical) |
| `temperature` | float | `0.1` | 0.0 = deterministic; 1.0 = maximum diversity |
| `fixed_positions` | string | — | Residues to keep fixed (comma-separated) |

## Interpreting Results

### MPNN score metrics

| Metric | Threshold | Interpretation |
|--------|-----------|----------------|
| `mpnn_score` | ≥ 0.40 | Per-residue log-probability; higher = more designable |
| `mpnn_global_score` | ≥ 0.40 | Global average score |
| `seq_recovery` | ≥ 0.30 | Fraction of residues matching input sequence |
| `perplexity` | ≤ 8.0 | Lower = sequence fits structure better |

### Temperature guide

| Temperature | Recovery | Diversity | Use Case |
|------------|---------|-----------|---------|
| 0.0 | Highest | Lowest | Single best sequence |
| 0.1 | High | Low | Default — exploit structure |
| 0.2 | Moderate | Moderate | Balanced design |
| 0.5 | Low | High | Explore sequence space |
| 1.0 | Lowest | Highest | Maximum diversity |

**Recommendation**: Start with 0.1, increase to 0.2–0.3 if designs are too similar.

### Fixing interface residues

When a binder scaffold has known or predicted contact residues with the target,
fix those positions to preserve the designed interface:

```bash
# Fix hotspot-engaging residues identified from PAE analysis
phi proteinmpnn --pdb scaffold.pdb \
  --fixed A52,A56,A63,A71 \
  --num-sequences 50 \
  --temperature 0.15
```

## Standard Workflow: RFdiffusion → ProteinMPNN → ESMFold

```
1. RFdiffusion  — generate 100–500 backbone scaffolds
2. ProteinMPNN  — design 10–50 sequences per scaffold
3. ESMFold      — fast screen: filter mean pLDDT ≥ 70
4. AlphaFold2   — final validation of top 5–10% (ipTM ≥ 0.70)
```

```bash
# Step 2: design sequences
phi proteinmpnn --pdb-gcs gs://dev-services/runs/rfdiff/design_001.pdb \
  --num-sequences 50 --temperature 0.1 --run-id step2_mpnn

# Step 3: fast screen
phi esmfold --fasta-str "$(cat designed_sequences.fasta)" --run-id step3_esm

# Step 4: final validation
phi alphafold --fasta top_candidates.fasta --multimer \
  --target-length 129 --recycles 6 --run-id step4_af2
```

## Costs

| Run | Time | Est. cost |
|-----|------|-----------|
| 10 sequences | ~1 min | ~$0.03 |
| 50 sequences | ~2 min | ~$0.07 |
| 200 sequences | ~5 min | ~$0.25 |

Pricing uses Modal A100-40G spot pricing.

## Related Skills

- **[esmfold](../esmfold/SKILL.md)** — validate designed sequences quickly
- **[alphafold](../alphafold/SKILL.md)** — final complex validation
- **[esm2](../esm2/SKILL.md)** — language-model plausibility check on sequences
