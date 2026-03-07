---
name: tm_score
description: "Structure comparison using TM-score to measure topological similarity between predicted and reference protein structures"
category: validation
tags: [structure-comparison, validation, metrics, alignment]
biomodals_script: modal_tm_score.py
biomodals_function: calculate_tm_scores
recommended_timeout: 15
recommended_gpu: None
tool_schema:
  type: object
  properties:
    reference_pdb_gcs_uri:
      type: string
      description: "GCS URI to reference PDB file (e.g., gs://bucket/path/reference.pdb). Preferred method."
    predicted_structures_gcs_uris:
      type: array
      items:
        type: string
      description: "List of GCS URIs to predicted structure files to compare against reference"
    pdb1_str:
      type: string
      description: "Reference PDB content as string (DEPRECATED - use reference_pdb_gcs_uri)"
    pdb2_str:
      type: string
      description: "Predicted PDB content as string (DEPRECATED - use predicted_structures_gcs_uris)"
    upload_to_gcs:
      type: boolean
      description: "Upload TM-score results to GCS"
      default: true
    gcs_bucket:
      type: string
      description: "GCS bucket name for uploads"
    run_id:
      type: string
      description: "Unique identifier for this run"
  required: []
---

# TM-score - Structure Comparison

## Overview

TM-score (Template Modeling score) is a metric for measuring structural similarity between two protein structures. It's more sensitive to global fold topology than RMSD, making it ideal for validating predicted structures against references.

**Integration Status:** ✅ **PRODUCTION READY**

## Key Features

- **Topology-Based**: Measures global fold similarity, not just atomic distances
- **Scale-Independent**: Normalized to 0-1 range, independent of protein size
- **Batch Processing**: Compare multiple predicted structures against a single reference
- **Statistical Summary**: Mean, min, max, median TM-scores across all structures
- **GCS Integration**: Automatic upload of comparison results

## What TM-score Tells You

- **TM-score > 0.5**: Same fold (high confidence match)
- **TM-score 0.3-0.5**: Borderline, may share structural features
- **TM-score < 0.3**: Different fold (low similarity)

A TM-score of 1.0 indicates perfect structural match.

## Use Cases

1. **Design Validation**: Compare designed sequence predictions to native structure
2. **Model Quality Assessment**: Evaluate prediction accuracy for folding models
3. **Structure Clustering**: Group similar predictions together
4. **Pipeline QC**: Filter designs by structural similarity to target

## Input Requirements

**✅ RECOMMENDED: GCS URI Method**

Upload your PDB files to GCS:

```bash
# Upload reference and predicted structures
gsutil cp reference.pdb gs://dev-services/tm-score-inputs/
gsutil cp predicted_*.pdb gs://dev-services/tm-score-inputs/

# Submit job
{
  "job_type": "tm_score",
  "params": {
    "reference_pdb_gcs_uri": "gs://dev-services/tm-score-inputs/reference.pdb",
    "predicted_structures_gcs_uris": [
      "gs://dev-services/tm-score-inputs/predicted_1.pdb",
      "gs://dev-services/tm-score-inputs/predicted_2.pdb",
      "gs://dev-services/tm-score-inputs/predicted_3.pdb"
    ]
  }
}
```

**Key benefits:**
- ✅ No JSON escaping issues
- ✅ Handles large PDB files
- ✅ Batch processing of multiple structures

## Examples

### Single structure comparison

```bash
# Upload structures
gsutil cp native.pdb gs://dev-services/tm-score-inputs/
gsutil cp predicted.pdb gs://dev-services/tm-score-inputs/

# Compare
curl -X POST http://localhost:8000/api/v1/jobs/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_SECRET_KEY" \
  -d '{
    "job_type": "tm_score",
    "params": {
      "reference_pdb_gcs_uri": "gs://dev-services/tm-score-inputs/native.pdb",
      "predicted_structures_gcs_uris": [
        "gs://dev-services/tm-score-inputs/predicted.pdb"
      ]
    }
  }'
```

### Batch comparison (validating multiple designs)

```bash
# Upload native structure
gsutil cp native.pdb gs://dev-services/tm-score-inputs/

# Upload 50 predicted structures from ESMFold
gsutil -m cp predicted_*.pdb gs://dev-services/tm-score-inputs/

# Create array of GCS URIs
PRED_URIS=$(gsutil ls gs://dev-services/tm-score-inputs/predicted_* | \
  jq -R -s 'split("\n")[:-1]')

# Compare all at once
curl -X POST http://localhost:8000/api/v1/jobs/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_SECRET_KEY" \
  -d "{
    \"job_type\": \"tm_score\",
    \"params\": {
      \"reference_pdb_gcs_uri\": \"gs://dev-services/tm-score-inputs/native.pdb\",
      \"predicted_structures_gcs_uris\": $PRED_URIS
    }
  }"
```

## Output Format

TM-score returns a JSON file with results for each structure:

```json
{
  "tm_scores": [
    {
      "structure_uri": "gs://bucket/predicted_1.pdb",
      "sequence_id": "predicted_1",
      "tm_score": 0.87,
      "rmsd": 2.3,
      "gdt_ts": 0.92
    }
  ],
  "summary": {
    "num_structures": 50,
    "num_successful": 48,
    "num_failed": 2,
    "tm_score_mean": 0.76,
    "tm_score_min": 0.45,
    "tm_score_max": 0.95,
    "tm_score_median": 0.78
  }
}
```

## Typical Workflow

### Design Validation Pipeline

```
1. ProteinMPNN (Sequence Design)
   ↓
   Generate 100 sequences for target backbone

2. ESMFold or RF3 (Structure Prediction)
   ↓
   Fold all 100 sequences
   Output: predicted_001.pdb, ..., predicted_100.pdb

3. TM-score (Structure Comparison) ← YOU ARE HERE
   ↓
   Compare all predictions to native structure
   Output: TM-scores for each, statistical summary

4. Filter & Select
   ↓
   Keep only designs with TM-score > 0.7
   Output: Top 20 designs for experimental validation
```

## Best Practices

1. **Use as QC filter**: Filter out designs with low TM-score before expensive validation
2. **Batch comparisons**: Process 50-100 structures at once for efficiency
3. **Set thresholds**: TM-score > 0.7 for high-confidence designs
4. **Combine with other metrics**: Use alongside pLDDT, pAE, interface metrics

## Alternative Metrics

- **RMSD**: Atomic distance-based (sensitive to local differences)
- **GDT-TS**: Global Distance Test (also provided in output)
- **pLDDT**: Confidence metric from AlphaFold (per-residue)
- **pTM**: Predicted TM-score from AlphaFold (estimated)
