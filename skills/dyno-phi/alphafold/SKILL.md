---
name: dyno-alphafold2
platform: dyno-phi
version: "1.0"
api_base: https://design.dynotx.com/api/v1
job_type: alphafold
description: >
  High-accuracy protein structure prediction (monomer and multimer) via the
  Dyno Phi cloud API. Separate chains with ':' for multi-chain prediction.
  8–15 min per job. Primary source of ipTM, pLDDT, and ipSAE metrics.
category: validation
tags: [structure-prediction, complex-validation, iptm, ipsae, multimer, alphafold2]
auth:
  env_var: DYNO_API_KEY
  header: x-api-key
  setup_url: https://design.dynotx.com/dashboard/settings
---

# AlphaFold2 — Structure Prediction

Cloud-hosted AlphaFold2 monomer and multimer via Dyno Phi. Submit a sequence
(or colon-separated multi-chain sequences) → get predicted structure with
ipTM, pLDDT, and ipSAE confidence metrics.

## Authentication

```bash
export DYNO_API_KEY=your_key_here
```

Get a key at [Settings → API keys](https://design.dynotx.com/dashboard/settings).

## Quick Start

```bash
# Single-chain prediction
phi alphafold --fasta protein.fasta

# Multi-chain complex — separate chains with ':'
# Input format: CHAIN_A:CHAIN_B or >header\nSEQ_A:SEQ_B
phi alphafold --fasta complex.fasta     # multimer auto-detected

# High-accuracy: more recycles, all 5 models
phi alphafold --fasta complex.fasta --recycles 6 --models 1,2,3,4,5
```

### Multi-chain FASTA format

Separate chains using a colon `:` in the sequence:

```fasta
>complex
MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPILSRVGDGTSVVQ:FQTLKSECCHGDLLECADDRADLAKYICD
```

Or as separate FASTA entries (the CLI concatenates them with `:`):

```fasta
>chain_A
MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPILSRVGDGTSVVQ
>chain_B
FQTLKSECCHGDLLECADDRADLAKYICDNQDTISSKLKECCDKPVEH
```

## CLI Reference

```
phi alphafold [OPTIONS]

  --fasta FILE         FASTA file — single chain or ':'-separated chains for multimer
  --fasta-str FASTA    Inline FASTA string
  --models 1,2,3       Model numbers to run (default: 1,2,3)
  --recycles N         Recycling iterations (default: 3; use 6 for final validation)
  --relax N            Amber relaxation passes (default: 0)
  --templates          Use PDB templates
  --run-id ID          Optional run label
  --no-wait            Return after submission without polling
  --out DIR            Write result manifest to DIR on completion
  --json               Print raw JSON
```

## REST API

### Submit

```http
POST /api/v1/jobs/
x-api-key: <DYNO_API_KEY>
Content-Type: application/json

{
  "job_type": "alphafold",
  "params": {
    "fasta_str": ">complex\nMKTAYIAKQR...:FQTLKSECCH...",
    "models": [1, 2, 3],
    "num_recycles": 6,
    "use_multimer": true
  },
  "run_id": "my_af2_run"
}
```

### Completed response

```json
{
  "status": "completed",
  "output_files": [
    {
      "filename": "complex_rank_001.pdb",
      "gcs_url": "gs://dev-services/runs/.../alphafold/complex_rank_001.pdb",
      "artifact_type": "pdb"
    }
  ]
}
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `fasta_str` | string | required | FASTA with one or more chains (`:` separates chains) |
| `models` | array[int] | `[1,2,3]` | Model numbers 1–5 |
| `num_recycles` | int | `3` | Use `6` for final validation |
| `use_multimer` | bool | auto | Auto-detected from `:` in sequence |
| `num_relax` | int | `0` | Amber relaxation passes |
| `use_templates` | bool | `false` | Use PDB structural templates |

## Interpreting Results

### Key metrics (multi-chain / complex)

| Metric | Good threshold | Interpretation |
|--------|---------------|----------------|
| `complex_iptm` | ≥ 0.70 | Interface predicted TM-score; primary ranking metric |
| `complex_plddt` | ≥ 80 | Mean confidence across the full complex |
| `complex_i_pae` | ≤ 6.0 Å | Mean interface predicted aligned error |
| `complex_i_psae_mean` | ≤ 6.0 Å | ipSAE — best single metric for interface quality |

### Recommended filter

```json
{
  "complex_iptm":        { "min": 0.70 },
  "complex_plddt":       { "min": 80.0 },
  "complex_i_psae_mean": { "max": 6.0  }
}
```

### ipTM guide

| ipTM | Interpretation |
|------|---------------|
| ≥ 0.80 | High confidence |
| 0.70–0.80 | Good — worth testing |
| 0.60–0.70 | Moderate — high uncertainty |
| < 0.60 | Low confidence |

## Standard Workflow

```
ProteinMPNN   →   ESMFold (screen pLDDT > 70)   →   AlphaFold2 (complex)
(design seqs)     (fast filter, top 10–20%)          (final validation)
```

## Related Skills

- **[esmfold](../esmfold/SKILL.md)** — fast pre-screening before AlphaFold2
- **[proteinmpnn](../proteinmpnn/SKILL.md)** — design sequences for AlphaFold2 validation
- **[boltz](../boltz/SKILL.md)** — open-source alternative for complex prediction
