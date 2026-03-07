---
name: filter_plddt
description: Filter structures by pLDDT confidence score
category: analysis
tags: [quality-control, filtering, structure-analysis]
tool_schema:
  type: object
  properties:
    structures_gcs_uri:
      type: string
      description: GCS URI to structures directory or file pattern to filter
    threshold:
      type: number
      description: Minimum pLDDT score (0-100) for structures to pass
      default: 70
  required:
    - structures_gcs_uri
recommended_timeout: 5
---

# Filter pLDDT

Filter protein structures based on their pLDDT (predicted Local Distance Difference Test) confidence scores.

## Description

This tool analyzes ESMFold output structures and filters them based on mean pLDDT scores. It's useful for quality control in high-throughput folding pipelines.

## Parameters

- **structures_gcs_uri** (required): GCS URI pointing to:
  - A directory containing PDB files (e.g., `gs://bucket/structures/`)
  - A specific PDB file with metadata (e.g., `gs://bucket/structure.pdb`)
  
- **threshold** (optional, default: 70): Minimum mean pLDDT score (0-100)
  - < 50: Low confidence, likely poor fold
  - 50-70: Moderate confidence
  - 70-90: Good confidence (recommended threshold)
  - > 90: Excellent confidence

## Outputs

Returns metrics for use in conditional branches:
- `passed_count`: Number of structures that passed the threshold
- `total_count`: Total number of structures analyzed
- `passed_rate`: Fraction that passed (0.0-1.0)
- `mean_plddt`: Average pLDDT across all structures

## Example Usage

### In Workflow Context

```yaml
nodes:
  - id: fold
    op: esmfold
    params:
      fasta_str: "$artifacts.sequences"
      
  - id: filter
    op: filter_plddt
    params:
      structures_gcs_uri: "$artifacts.structures_dir"
      threshold: 75

edges:
  - src: fold
    dst: filter
  - src: filter
    dst: END
    condition: "passed_rate >= 0.8"  # Continue only if 80%+ pass
```

### Quality Gates

Common threshold values:
- **70**: Standard quality control (recommended)
- **75**: High-quality structures only
- **80**: Very high confidence required
- **85**: Exceptional quality (few structures will pass)

## Implementation Notes

This is a local tool that runs in the worker process. It:
1. Downloads structure metadata from GCS
2. Parses pLDDT scores from B-factor columns or metadata
3. Filters based on threshold
4. Returns metrics for workflow branching

## See Also

- ESMFold: Structure prediction tool
- Conditional branching: Workflow execution control
