---
name: filter_candidates
description: Filter protein design candidates based on quality thresholds (RMSD, pLDDT, TM-score, PAE)
category: analysis-tools
tags: [filtering, quality-control, thresholds, ranking]
biomodals_script: null
biomodals_function: null
recommended_timeout: 1
recommended_gpu: null
tool_schema:
  type: object
  properties:
    metrics:
      type: object
      description: Alignment metrics from align_structures (or dict/JSON string)
    thresholds:
      type: object
      description: Quality thresholds to apply
      properties:
        rmsd_max:
          type: number
          description: Maximum RMSD (Angstroms)
        rmsd_motif_max:
          type: number
          description: Maximum motif RMSD (Angstroms)
        plddt_min:
          type: number
          description: Minimum mean pLDDT
        plddt_motif_min:
          type: number
          description: Minimum motif pLDDT
        tm_min:
          type: number
          description: Minimum TM-score
        pae_max:
          type: number
          description: Maximum PAE (Angstroms)
    top_n:
      type: integer
      description: Return only top N candidates by composite score
  required: [metrics]
---

# Filter Candidates

Local tool (runs in Temporal worker) for filtering protein design candidates based on quality thresholds.

## Features

- Threshold-based filtering (RMSD, pLDDT, TM-score, PAE)
- Composite scoring with configurable weights
- Candidate ranking by quality
- Top-N selection
- Detailed pass/fail reasons

## Example Usage

```json
{
  "id": "filter",
  "op": "filter_candidates",
  "params": {
    "metrics": "$artifacts.alignment_metrics",
    "thresholds": {
      "rmsd_max": 2.0,
      "plddt_min": 70.0,
      "tm_min": 0.7
    },
    "top_n": 5
  }
}
```
