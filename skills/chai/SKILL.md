---
name: chai1
description: "Predict protein structure and validate designs using Chai-1 foundation model"
category: validation
tags: [structure-prediction, validation, alphafold]
biomodals_script: modal_chai1.py
biomodals_function: chai1
recommended_timeout: 300
recommended_gpu: T4
tool_schema:
  type: object
  properties:
    fasta_gcs_uri:
      type: string
      description: "GCS URI to FASTA file (e.g., gs://bucket/path/input.faa). Preferred method."
    input_faa_str:
      type: string
      description: "Content of FASTA file as string (DEPRECATED - use fasta_gcs_uri instead)"
    input_faa_name:
      type: string
      description: "Name of FASTA file (DEPRECATED - only needed with input_faa_str)"
    num_trunk_recycles:
      type: integer
      description: "Number of trunk recycles for the model"
      default: 3
    num_diffn_timesteps:
      type: integer
      description: "Number of diffusion timesteps"
      default: 200
    seed:
      type: integer
      description: "Random seed for reproducibility"
      default: 42
    use_esm_embeddings:
      type: boolean
      description: "Whether to use ESM embeddings"
      default: true
    chai1_kwargs:
      type: object
      description: "Additional keyword arguments to pass to run_inference"
      default: {}
    upload_to_gcs:
      type: boolean
      description: "Upload results to Google Cloud Storage"
      default: true
    gcs_bucket:
      type: string
      description: "GCS bucket name for uploads"
    run_id:
      type: string
      description: "Unique identifier for this run"
  required: []
---

# Chai Structure Prediction

Predict protein structure using Chai-1, a fast foundation model for molecular structure prediction.

## Use Cases

- Validate ProteinMPNN-designed sequences
- Predict binder-target complexes
- Fast structure prediction (alternative to AlphaFold2)
- Multi-chain complex prediction
- Protein-ligand co-folding

## Input Requirements

**✅ RECOMMENDED: GCS URI Method**

Upload your FASTA file to GCS:

```bash
# Upload FASTA
gsutil cp input.faa gs://dev-services/chai-inputs/

# Submit job
{
  "job_type": "chai1",
  "params": {
    "fasta_gcs_uri": "gs://dev-services/chai-inputs/input.faa",
    "num_trunk_recycles": 3,
    "num_diffn_timesteps": 200
  }
}
```

**Key benefits:**
- ✅ No JSON escaping issues
- ✅ Handles large FASTA files
- ✅ Consistent with other models

## Examples

### Single chain prediction (GCS URI)

```bash
# Create FASTA
cat > protein.faa << 'EOF'
>protein|name=design1
MKLLVAALLAALLAALGSSGSSGSSGSS
EOF

# Upload to GCS
gsutil cp protein.faa gs://dev-services/chai-inputs/

# Submit job
curl -X POST http://localhost:8000/api/v1/jobs/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_SECRET_KEY" \
  -d '{
    "job_type": "chai1",
    "params": {
      "fasta_gcs_uri": "gs://dev-services/chai-inputs/protein.faa"
    }
  }'
```

### Complex prediction (GCS URI)

```bash
# Create multi-chain FASTA
cat > complex.faa << 'EOF'
>protein|name=binder
MKLLVAALLAALLAAL
>protein|name=target
GSSGSSGSSGSSGSS
EOF

# Upload and submit
gsutil cp complex.faa gs://dev-services/chai-inputs/
curl -X POST http://localhost:8000/api/v1/jobs/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_SECRET_KEY" \
  -d '{
    "job_type": "chai1",
    "params": {
      "fasta_gcs_uri": "gs://dev-services/chai-inputs/complex.faa",
      "num_trunk_recycles": 5
    }
  }'
```

### Protein-ligand prediction

```bash
# Chai supports ligands via SMILES
cat > protein_ligand.faa << 'EOF'
>protein|name=insulin
MAWTPLLLLLLSHCTGSLSQPVLTQPTSL
>ligand|name=caffeine
CN1C=NC2=C1C(=O)N(C)C(=O)N2C
EOF

gsutil cp protein_ligand.faa gs://dev-services/chai-inputs/
```

## QC Thresholds

Evaluate predictions with:
- **pLDDT** > 85 (overall confidence)
- **pTM** > 0.5 (predicted TM-score)
- **ipTM** > 0.4 (for complexes, interface confidence)
- **PAE** < 10 Å (predicted aligned error)

For binders, also check ipSAE score using ipsae skill.
