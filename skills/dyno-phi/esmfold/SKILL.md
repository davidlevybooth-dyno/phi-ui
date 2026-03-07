---
name: dyno-esmfold
platform: dyno-phi
version: "1.0"
api_base: https://design.dynotx.com/api/v1
job_type: esmfold
description: >
  Fast protein structure prediction from sequence using ESMFold via the Dyno Phi
  cloud API. ~1 minute per structure. Use for high-throughput screening and initial
  validation before committing to AlphaFold2.
category: validation
tags: [structure-prediction, screening, plddt, fast]
auth:
  env_var: DYNO_API_KEY
  header: x-api-key
  setup_url: https://design.dynotx.com/dashboard/settings
---

# ESMFold — Fast Structure Prediction

Cloud-hosted ESMFold via Dyno Phi. Submit a sequence → get a PDB structure and
per-residue pLDDT confidence scores in ~1 minute.

## Authentication

Get an API key from [Settings → API keys](https://design.dynotx.com/dashboard/settings).

```bash
export DYNO_API_KEY=your_key_here
```

## Quick Start

```bash
# CLI (one-liner)
phi esmfold --fasta sequences.fasta

# Inline sequence
phi esmfold --fasta-str ">binder_001
MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPILSRVGDGTSVVQGRFEDSGV"
```

## CLI Reference

```
phi esmfold [OPTIONS]

  --fasta FILE              FASTA file (one or more sequences)
  --fasta-str FASTA         FASTA as a string (for scripting)
  --recycles N              Recycling iterations (default: 3, range: 1–10)
  --no-confidence           Skip per-residue pLDDT extraction
  --fasta-name NAME         Label for output file naming
  --run-id ID               Optional custom run label
  --no-wait                 Return immediately after submission
  --out DIR                 Download result manifest to DIR
  --json                    Print raw JSON response
```

## REST API

### Submit

```http
POST /api/v1/jobs/
x-api-key: <DYNO_API_KEY>
Content-Type: application/json

{
  "job_type": "esmfold",
  "params": {
    "fasta_str": ">binder_001\nMKTAYIAKQRQISFVKSHFSR...",
    "num_recycles": 3,
    "extract_confidence": true
  },
  "run_id": "my_screening_001"
}
```

Response `202`:
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "run_id": "my_screening_001",
  "status": "pending",
  "message": "ESMFold job queued for execution"
}
```

### Poll status

```http
GET /api/v1/jobs/{job_id}/status
x-api-key: <DYNO_API_KEY>
```

Poll every 5 seconds until `status` is `"completed"`, `"failed"`, or `"cancelled"`.

```python
import time, json, urllib.request

def wait_for_job(job_id, api_key, base="https://design.dynotx.com"):
    url = f"{base}/api/v1/jobs/{job_id}/status"
    req = urllib.request.Request(url, headers={"x-api-key": api_key})
    while True:
        with urllib.request.urlopen(req) as r:
            s = json.loads(r.read())
        if s["status"] in {"completed", "failed", "cancelled"}:
            return s
        time.sleep(5)
```

### Completed response fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"completed"` |
| `output_files` | array | List of output file objects with `filename`, `gcs_url` |
| `progress.percent_complete` | int | 100 when done |

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `fasta_str` | string | required | FASTA-formatted sequence(s) |
| `fasta_name` | string | `"sequences.fasta"` | Label for output naming |
| `num_recycles` | int | `3` | Recycling iterations (more = slower, potentially better) |
| `extract_confidence` | bool | `true` | Include per-residue pLDDT in output |

## Interpreting Results

### pLDDT thresholds

| pLDDT | Quality | Action |
|-------|---------|--------|
| > 90  | Very high confidence | Proceed to AlphaFold2 validation |
| 70–90 | Good confidence | Good for screening; check interface |
| 50–70 | Low confidence | Inspect manually; consider redesign |
| < 50  | Disordered / poor fold | Reject or redesign |

**Recommended screening filter**: mean pLDDT ≥ 70

### Typical outputs (completed job)

```
output_files:
  - binder_001.pdb           # Structure (B-factor column = pLDDT × 100)
  - binder_001_plddt.json    # Per-residue confidence array
  - metadata.json            # Run info and aggregate metrics
```

pLDDT JSON format:
```json
{
  "sequence_name": "binder_001",
  "sequence_length": 70,
  "mean_plddt": 84.2,
  "min_plddt": 51.3,
  "max_plddt": 96.8,
  "per_residue_plddt": [83.1, 88.4, 91.2, ...]
}
```

## Batch Prediction

Submit multiple sequences in one FASTA. One PDB and one pLDDT JSON are produced
per sequence. Runtime is approximately additive (~55 s per sequence after warmup).

```fasta
>design_001
MKTAYIAKQRQISFVKSHFSRQLEE...
>design_002
AKVQVKALPDAQFEVVHSLAKWKRQ...
>design_003
LGVNQYLSQVKADLAIPVEARIKSRD...
```

```bash
phi esmfold --fasta designs.fasta --run-id pdl1_screening
```

## When to Use ESMFold

| Situation | Use |
|-----------|-----|
| Screening 10–500 sequences | ✅ ESMFold |
| Single-chain binder validation (first pass) | ✅ ESMFold |
| Need result in < 2 min | ✅ ESMFold |
| Complex (binder + target) prediction | ❌ Use AlphaFold2 `--multimer` or Boltz |
| Final validation before experiment | ❌ Use AlphaFold2 |

## Costs

| Run | Time | Est. cost |
|-----|------|-----------|
| 1 sequence (cached) | ~55 s | ~$0.05 |
| First run (cold start) | ~3 min | ~$0.15 |
| Batch of 10 sequences | ~9 min | ~$0.35 |

Pricing uses Modal A100-40G spot pricing.

## Related Skills

- **[alphafold](../alphafold/SKILL.md)** — higher accuracy final validation
- **[proteinmpnn](../proteinmpnn/SKILL.md)** — design sequences first, then validate with this
- **[boltz](../boltz/SKILL.md)** — complex prediction (protein + protein/DNA/RNA)
- **[esm2](../esm2/SKILL.md)** — language model sequence scoring
