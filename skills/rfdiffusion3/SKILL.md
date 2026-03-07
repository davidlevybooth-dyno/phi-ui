---
name: rfdiffusion3
description: "All-atom generative protein design using RFDiffusion3 for de novo generation, binder design, and motif scaffolding"
category: design-tools
tags: [structure-generation, binder-design, motif-scaffolding, diffusion]
biomodals_script: modal_rfdiffusion3.py
biomodals_function: rfdiffusion3_generate
recommended_timeout: 10800
recommended_gpu: H100
capabilities:
  all_atom: true         # Generates all atoms, not just backbone
  hotspots: true         # Can specify hotspot residues
  motif_scaffolding: true
  binder_design: true    # Optimized for binder design
  symmetric: false       # No symmetry support yet
  speed: medium          # ~2-5 min per backbone
  max_residues: 1200     # H100 limit
  gpu_required: true
  gpu_memory_gb: 80      # Defaults to H100
artifacts:
  primary: structures    # Returns multiple structures per call
semantic_mappings:
  structure_input: target_pdb_gcs_uri
  binder_length: length
tool_schema:
  type: object
  properties:
    length:
      type: integer
      description: "Backbone length for de novo generation"
    target_pdb_gcs_uri:
      type: string
      description: "GCS URI to target PDB file for binder design (e.g., gs://bucket/path/target.pdb). Preferred method."
    target_pdb:
      type: string
      description: "Target PDB content for binder design (DEPRECATED - use target_pdb_gcs_uri)"
    target_chain:
      type: string
      description: "Target chain ID for binder design (e.g., A)"
    hotspots:
      type: array
      items:
        type: string
      description: "List of hotspot residues for binder design (e.g., ['A45', 'A67', 'A89'])"
    motif_pdb_gcs_uri:
      type: string
      description: "GCS URI to motif PDB file for scaffolding (e.g., gs://bucket/path/motif.pdb). Preferred method."
    motif_pdb:
      type: string
      description: "Motif PDB content for scaffolding (DEPRECATED - use motif_pdb_gcs_uri)"
    motif_residues:
      type: array
      items:
        type: string
      description: "List of motif residue ranges (e.g., ['10-20', '45-55'])"
    num_designs:
      type: integer
      description: "Number of designs to generate"
      default: 10
    inference_steps:
      type: integer
      description: "Number of diffusion inference steps (higher = better quality but slower)"
      default: 50
    contigs:
      type: string
      description: "Contig specification string for advanced control"
    symmetry:
      type: string
      description: "Symmetry specification (e.g., C3, D2, C5)"
    upload_to_gcs:
      type: boolean
      description: "Upload generated structures to GCS"
      default: true
    gcs_bucket:
      type: string
      description: "GCS bucket name for uploads"
    run_id:
      type: string
      description: "Unique identifier for this run"
  required: []
---

# RFDiffusion3 - All-Atom Generative Protein Design

## Overview

RFDiffusion3 (RFD3) is an all-atom generative model for protein structure design. It can generate backbones under complex constraints including de novo generation, binder design with hotspot specification, motif scaffolding, and symmetric oligomers.

**Integration Status:** ✅ **PRODUCTION READY**

## Key Features

- **De Novo Generation**: Generate protein backbones of specified length
- **Binder Design**: Design binders targeting specific hotspots on a target protein
- **Motif Scaffolding**: Scaffold functional motifs into larger protein structures
- **Symmetry**: Design symmetric oligomers (C3, D2, etc.)
- **All-Atom**: Generates complete atomic structures (not just backbone)
- **GCS Integration**: Automatic upload of designed structures

## Design Modes

### 1. De Novo Generation

Generate protein backbones from scratch.

**Required parameters:**
- `length`: Backbone length (e.g., 80-150 residues)

**Optional parameters:**
- `symmetry`: Symmetry specification (e.g., "C3", "D2")
- `contigs`: Advanced contig specification

**Example:**

```bash
curl -X POST http://localhost:8000/api/v1/jobs/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_SECRET_KEY" \
  -d '{
    "job_type": "rfdiffusion3",
    "params": {
      "length": 100,
      "num_designs": 10
    }
  }'
```

### 2. Binder Design

Design binders targeting specific hotspots on a target protein.

**Required parameters:**
- `target_pdb_gcs_uri`: GCS URI to target PDB file (preferred)
- `target_chain`: Target chain ID
- `hotspots`: List of hotspot residues (e.g., ["A45", "A67", "A89"])

**Example:**

```bash
# Upload target structure
gsutil cp target.pdb gs://dev-services/rfd3-inputs/

# Submit binder design
curl -X POST http://localhost:8000/api/v1/jobs/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_SECRET_KEY" \
  -d '{
    "job_type": "rfdiffusion3",
    "params": {
      "target_pdb_gcs_uri": "gs://dev-services/rfd3-inputs/target.pdb",
      "target_chain": "A",
      "hotspots": ["A45", "A67", "A89"],
      "length": 70,
      "num_designs": 50
    }
  }'
```

### 3. Motif Scaffolding

Scaffold functional motifs into larger protein structures.

**Required parameters:**
- `motif_pdb_gcs_uri`: GCS URI to motif PDB file (preferred)
- `motif_residues`: List of motif residue ranges (e.g., ["10-20", "45-55"])
- `length`: Total scaffold length

**Example:**

```bash
# Upload motif structure
gsutil cp motif.pdb gs://dev-services/rfd3-inputs/

# Submit motif scaffolding
curl -X POST http://localhost:8000/api/v1/jobs/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_SECRET_KEY" \
  -d '{
    "job_type": "rfdiffusion3",
    "params": {
      "motif_pdb_gcs_uri": "gs://dev-services/rfd3-inputs/motif.pdb",
      "motif_residues": ["10-20", "45-55"],
      "length": 150,
      "num_designs": 25
    }
  }'
```

## Input Requirements

**✅ RECOMMENDED: GCS URI Method**

For binder design and motif scaffolding, upload your PDB files to GCS:

```bash
# Upload target/motif PDB
gsutil cp target.pdb gs://dev-services/rfd3-inputs/

# Submit job
{
  "job_type": "rfdiffusion3",
  "params": {
    "target_pdb_gcs_uri": "gs://dev-services/rfd3-inputs/target.pdb",
    "target_chain": "A",
    "hotspots": ["A45", "A67"],
    "length": 70
  }
}
```

**Key benefits:**
- ✅ No JSON escaping issues
- ✅ Handles large PDB files
- ✅ Consistent with other models

## Output Files

RFDiffusion3 generates CIF (Crystallographic Information File) structures:
- `design_001.cif`, `design_002.cif`, etc. - Individual designed structures
- `design_001_metadata.json` - Confidence metrics and design parameters

Each CIF file contains:
- Full all-atom structure
- Per-residue confidence scores (pLDDT)
- Design metadata

## Typical Workflow

### Binder Design Pipeline

```
1. RFDiffusion3 (Backbone Generation) ← YOU ARE HERE
   ↓
   Generate 50 binder backbones targeting hotspots
   Output: design_001.cif, design_002.cif, ..., design_050.cif

2. ProteinMPNN (Sequence Design)
   ↓
   Design sequences for each backbone (temp=0.2)
   Output: 500 sequences (10 per backbone)

3. ESMFold or RF3 (Structure Validation)
   ↓
   Fold all sequences to validate designs
   Output: predicted structures + confidence metrics

4. Boltz or AlphaFold (Complex Prediction)
   ↓
   Predict binder-target complex
   Output: complex structures + interface metrics
```

## Quality Metrics

**Confidence Thresholds:**
- pLDDT > 85: High confidence backbone
- pAE < 10 Å: Good domain arrangement
- Follow with ProteinMPNN for sequence design

## Best Practices

1. **Start with more designs**: Generate 50+ binders, filter down to top 10
2. **Use hotspot constraints**: Specify key interface residues
3. **Validate with ProteinMPNN + folding**: Always validate designs
4. **Check interface metrics**: Use Boltz/AlphaFold to predict complex

## Examples

### De novo with symmetry

```bash
curl -X POST http://localhost:8000/api/v1/jobs/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_SECRET_KEY" \
  -d '{
    "job_type": "rfdiffusion3",
    "params": {
      "length": 80,
      "symmetry": "C3",
      "num_designs": 20
    }
  }'
```

### Complex binder with multiple hotspots

```bash
gsutil cp complex_target.pdb gs://dev-services/rfd3-inputs/

curl -X POST http://localhost:8000/api/v1/jobs/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_SECRET_KEY" \
  -d '{
    "job_type": "rfdiffusion3",
    "params": {
      "target_pdb_gcs_uri": "gs://dev-services/rfd3-inputs/complex_target.pdb",
      "target_chain": "A",
      "hotspots": ["A23", "A45", "A67", "A89", "A102"],
      "length": 100,
      "num_designs": 100,
      "inference_steps": 100
    }
  }'
```
