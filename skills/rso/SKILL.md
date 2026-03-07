---
name: rso
description: "Rapid Structure Optimization - Binder design using ColabDesign and AlphaFold2 for iterative hallucination and optimization"
category: design-tools
tags: [binder-design, sequence-design, alphafold, hallucination]
biomodals_script: modal_rso.py
biomodals_function: rso
recommended_timeout: 180
recommended_gpu: A100
tool_schema:
  type: object
  properties:
    pdb_gcs_uri:
      type: string
      description: "GCS URI to target PDB file (e.g., gs://bucket/path/target.pdb). Preferred method."
    pdb_str:
      type: string
      description: "Target PDB content as string (DEPRECATED - use pdb_gcs_uri)"
    pdb_name:
      type: string
      description: "Name of PDB file (only needed with pdb_str)"
      default: "input.pdb"
    traj_iters:
      type: integer
      description: "Number of trajectory iterations for hallucination"
    binder_len:
      type: integer
      description: "Length of the binder to design"
    chain:
      type: string
      description: "Target chain for binder design (e.g., A)"
    hotspot:
      type: string
      description: "Optional hotspot residues for targeted binding"
    thresholds:
      type: object
      description: "Optional thresholds for filtering (rmsd, plddt, pae)"
    upload_to_gcs:
      type: boolean
      description: "Upload designed binders to GCS"
      default: true
    gcs_bucket:
      type: string
      description: "GCS bucket name for uploads"
    run_id:
      type: string
      description: "Unique identifier for this run"
  required: []
---

# RSO - Rapid Structure Optimization

## Overview

RSO (Rapid Structure Optimization) is a binder design tool that uses ColabDesign and AlphaFold2 for iterative hallucination and optimization. Unlike RFDiffusion3 + ProteinMPNN (which separates backbone and sequence design), RSO jointly optimizes both structure and sequence.

**Integration Status:** ✅ **PRODUCTION READY**

## Key Features

- **Joint Optimization**: Simultaneously designs backbone and sequence
- **AlphaFold2-based**: Uses AlphaFold2's confidence metrics to guide design
- **Hotspot Targeting**: Can specify key interface residues
- **Iterative Refinement**: Hallucination followed by optimization
- **Fast**: Typically faster than RFDiffusion3 + ProteinMPNN pipeline

## Use Cases

1. **Binder Design**: Design proteins that bind to specific targets
2. **Hotspot Targeting**: Focus binding on functional epitopes
3. **Rapid Prototyping**: Quick design iterations for validation
4. **Alternative Pipeline**: When RFDiffusion3 pipeline is too slow

## RSO vs RFDiffusion3 Pipeline

| Feature | RSO | RFDiffusion3 + ProteinMPNN |
|---------|-----|----------------------------|
| **Speed** | Faster (joint optimization) | Slower (two-step) |
| **Diversity** | Lower (single trajectory) | Higher (many backbones) |
| **Control** | Less explicit backbone control | Full backbone control |
| **Hotspots** | Native support | Specified in RFD3 |
| **Best for** | Rapid iterations | High-quality designs |

## Input Requirements

**✅ RECOMMENDED: GCS URI Method**

Upload your target PDB to GCS:

```bash
# Upload target structure
gsutil cp target.pdb gs://dev-services/rso-inputs/

# Submit job
{
  "job_type": "rso",
  "params": {
    "pdb_gcs_uri": "gs://dev-services/rso-inputs/target.pdb",
    "traj_iters": 100,
    "binder_len": 80,
    "chain": "A"
  }
}
```

**Key benefits:**
- ✅ No JSON escaping issues
- ✅ Handles large PDB files
- ✅ Consistent with other models

## Examples

### Basic binder design

```bash
# Upload target
gsutil cp 1ABC.pdb gs://dev-services/rso-inputs/

# Design 80-residue binder
curl -X POST http://localhost:8000/api/v1/jobs/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_SECRET_KEY" \
  -d '{
    "job_type": "rso",
    "params": {
      "pdb_gcs_uri": "gs://dev-services/rso-inputs/1ABC.pdb",
      "traj_iters": 100,
      "binder_len": 80,
      "chain": "A"
    }
  }'
```

### Binder with hotspot targeting

```bash
# Target specific epitope residues
curl -X POST http://localhost:8000/api/v1/jobs/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_SECRET_KEY" \
  -d '{
    "job_type": "rso",
    "params": {
      "pdb_gcs_uri": "gs://dev-services/rso-inputs/target.pdb",
      "traj_iters": 150,
      "binder_len": 70,
      "chain": "A",
      "hotspot": "45,67,89"
    }
  }'
```

### High-quality design with strict thresholds

```bash
# Use strict filtering thresholds
curl -X POST http://localhost:8000/api/v1/jobs/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_SECRET_KEY" \
  -d '{
    "job_type": "rso",
    "params": {
      "pdb_gcs_uri": "gs://dev-services/rso-inputs/target.pdb",
      "traj_iters": 200,
      "binder_len": 90,
      "chain": "A",
      "thresholds": {
        "rmsd": 2.0,
        "plddt": 0.85,
        "pae": 0.4
      }
    }
  }'
```

## Output Files

RSO generates:
- `binder_design.pdb` - Final optimized binder structure
- `trajectory.pdb` - Optimization trajectory (if saved)
- `results.csv` - Metrics for design (pLDDT, pAE, RMSD)

Each design includes:
- Binder sequence
- Predicted structure
- AlphaFold2 confidence metrics
- Interface quality scores

## Parameters Guide

### Required Parameters

- **pdb_gcs_uri** or **pdb_str**: Target structure to bind
- **traj_iters**: Number of optimization iterations (50-200)
  - 50-100: Fast, lower quality
  - 100-150: Standard quality
  - 150-200: High quality, slower
- **binder_len**: Binder length in residues (50-150)
  - 50-70: Small, tight binders
  - 70-100: Standard size
  - 100-150: Large, multi-domain
- **chain**: Target chain to bind (e.g., "A", "B")

### Optional Parameters

- **hotspot**: Comma-separated residue numbers (e.g., "45,67,89")
  - Focuses binding on specific epitope
  - Increases interface contact at these residues
  
- **thresholds**: Quality filters
  - `rmsd`: Max RMSD (Å) from initial structure
  - `plddt`: Min pLDDT confidence score
  - `pae`: Max predicted aligned error

## Typical Workflow

### Binder Design Pipeline

```
1. Target Selection
   ↓
   Identify target protein and binding site

2. RSO Binder Design ← YOU ARE HERE
   ↓
   Design binder sequence + structure jointly
   Output: binder_design.pdb, results.csv

3. Validation (AlphaFold or Boltz)
   ↓
   Predict binder-target complex
   Output: complex structure, interface metrics

4. Sequence Optimization (optional)
   ↓
   Use ProteinMPNN to diversify sequences
   Output: sequence variants

5. Experimental Validation
   ↓
   Express, purify, test binding
```

## Quality Metrics

**AlphaFold2 Confidence:**
- **pLDDT > 85**: High confidence structure
- **pAE < 5 Å**: Well-defined interface
- **i_pLDDT > 80**: Good interface confidence

**Thresholds (recommended):**
```json
{
  "rmsd": 2.0,
  "plddt": 0.85,
  "pae": 0.4
}
```

## Best Practices

1. **Start with more iterations**: 150+ for high-quality designs
2. **Use hotspots**: Specify known functional residues
3. **Validate with complexes**: Always predict binder-target complex
4. **Generate variants**: Run multiple times with different seeds
5. **Set strict thresholds**: Filter for high-confidence designs

## When to Use RSO

**Use RSO when:**
- ✅ You need rapid design iterations
- ✅ Target has clear binding site/hotspots
- ✅ Speed is more important than diversity
- ✅ You want joint structure + sequence optimization

**Use RFDiffusion3 when:**
- ✅ You need many diverse backbone scaffolds
- ✅ You want explicit backbone control
- ✅ Quality/diversity > speed
- ✅ You have complex symmetry constraints

## Comparison to Other Tools

| Tool | Purpose | Speed | Diversity | Control |
|------|---------|-------|-----------|---------|
| **RSO** | Binder design | Fast | Low | Medium |
| **RFDiffusion3** | Backbone generation | Medium | High | High |
| **ProteinMPNN** | Sequence design | Fast | High | Low |
| **AlphaFold** | Structure prediction | Medium | N/A | N/A |
| **Boltz** | Complex prediction | Fast | N/A | N/A |
