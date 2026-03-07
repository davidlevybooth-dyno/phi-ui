---
name: dyno-boltz
platform: dyno-phi
version: "1.0"
api_base: https://design.dynotx.com/api/v1
job_type: boltz
description: >
  Biomolecular complex structure prediction using Boltz-1/Boltz-2 via the Dyno Phi
  cloud API. Supports protein–protein, protein–DNA, protein–RNA, and protein–small
  molecule complexes. 6–10 min per complex.
category: validation
tags: [structure-prediction, complex, multimer, dna, rna, ligand, boltz, open-source]
auth:
  env_var: DYNO_API_KEY
  header: x-api-key
  setup_url: https://design.dynotx.com/dashboard/settings
---

# Boltz-1/2 — Biomolecular Complex Prediction

Cloud-hosted Boltz via Dyno Phi. MIT-licensed open-source alternative to
AlphaFold3. Predicts structures for protein–protein, protein–DNA/RNA, and
protein–small molecule complexes with full-atom accuracy.

## Authentication

```bash
export DYNO_API_KEY=your_key_here
```

## Quick Start

```bash
# Protein–protein complex
phi boltz --fasta complex.fasta

# Single chain (monomer)
phi boltz --fasta binder.fasta

# Higher accuracy (more recycles)
phi boltz --fasta complex.fasta --recycles 6

# Fast screen (no MSA)
phi boltz --fasta complex.fasta --no-msa
```

## CLI Reference

```
phi boltz [OPTIONS]

  --fasta FILE              FASTA file (one or more chains)
  --fasta-str FASTA         Inline FASTA string
  --recycles N              Recycling iterations (default: 3; use 6 for final)
  --no-msa                  Disable MSA lookup (faster, lower accuracy)
  --run-id ID               Optional run label
  --no-wait                 Submit and return immediately
  --out DIR                 Write result manifest to DIR
  --json                    Print raw JSON
```

## FASTA Format for Multi-Chain Inputs

Each chain is a separate FASTA entry. Boltz supports chain type annotation:

```fasta
>binder|protein
MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPILSRVGDGT...
>target|protein
FQTLKSECCHGDLLECADDRADLAKYICDNQDTISSKLKECCD...
```

```fasta
>antibody_heavy|protein
EVQLVESGGGLVQPGGSLRLSCAAS...
>antibody_light|protein
DIQMTQSPSSLSASVGDRVTITCRA...
>antigen|protein
FQTLKSECCHGDLLECADD...
```

For DNA/RNA or small molecules, follow the Boltz FASTA specification at
https://boltz-biology.github.io.

## REST API

### Submit

```http
POST /api/v1/jobs/
x-api-key: <DYNO_API_KEY>
Content-Type: application/json

{
  "job_type": "boltz",
  "params": {
    "fasta_str": ">binder|protein\nMKTAYIAKQR...\n>target|protein\nFQTLKSECCH...",
    "num_recycles": 3,
    "use_msa": true
  },
  "run_id": "pdl1_boltz_validation"
}
```

### Completed response

```json
{
  "status": "completed",
  "output_files": [
    { "filename": "complex_model_0.pdb", "gcs_url": "gs://..." },
    { "filename": "confidence_scores.json", "gcs_url": "gs://..." }
  ]
}
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `fasta_str` | string | required | FASTA with one or more chains |
| `num_recycles` | int | `3` | Recycling iterations (3 = fast, 6 = final) |
| `use_msa` | bool | `true` | Use MSA for improved accuracy |

## Interpreting Results

### Confidence metrics

| Metric | Threshold | Interpretation |
|--------|-----------|----------------|
| `plddt` | ≥ 70 | Per-residue structure confidence |
| `ptm` | ≥ 0.70 | Global fold predicted TM-score |
| `iptm` | ≥ 0.70 | Interface predicted TM-score |
| `i_pae_mean` | ≤ 6.0 Å | Mean interface predicted aligned error |
| `i_psae_mean` | ≤ 6.0 Å | ipSAE — best single binding metric |

These match the AlphaFold2 metric thresholds — use the same filters.

### Comparison: Boltz vs AlphaFold2

| Aspect | Boltz | AlphaFold2 |
|--------|-------|-----------|
| License | MIT (open source) | Apache 2.0 (code) |
| Complex types | Protein, DNA, RNA, small molecules | Protein only |
| Accuracy | Similar to AF2 Multimer | High accuracy |
| Speed | 6–10 min | 8–15 min |
| MSA requirement | Optional | Recommended |

**Use Boltz when:**
- Predicting complexes with DNA, RNA, or small molecules
- You want an open-source, independently trained validation
- Cross-checking AlphaFold2 results

**Use AlphaFold2 when:**
- Pure protein-protein complexes (better-benchmarked for binders)
- Highest confidence needed before experimental testing
- Running final campaign validation

## Costs

| Run | Time | Est. cost |
|-----|------|-----------|
| Monomer, no MSA | ~3 min | ~$0.17 |
| Complex, no MSA | ~6 min | ~$0.33 |
| Complex, with MSA | ~10 min | ~$0.56 |

Pricing uses Modal A100-40G spot pricing.

## Related Skills

- **[alphafold](../alphafold/SKILL.md)** — AlphaFold2 for protein-only complexes
- **[esmfold](../esmfold/SKILL.md)** — fast single-chain screening
- **[proteinmpnn](../proteinmpnn/SKILL.md)** — design sequences to validate with Boltz
