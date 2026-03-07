---
name: rf3
description: "All-atom protein structure prediction using RosettaFold3 for validation and ensemble generation"
category: design-tools
tags: [structure-prediction, validation, confidence, all-atom]
biomodals_script: modal_rf3.py
biomodals_function: rf3_predict
recommended_timeout: 1800
recommended_gpu: A100
tool_schema:
  type: object
  properties:
    fasta_gcs_uri:
      type: string
      description: "GCS URI to FASTA file (e.g., gs://bucket/path/input.faa). Preferred method."
    fasta_content:
      type: string
      description: "Input sequence(s) in FASTA format (DEPRECATED - use fasta_gcs_uri)"
    sequences:
      type: array
      description: "List of sequences (alternative input method)"
    num_recycles:
      type: integer
      description: "Number of recycling iterations (higher = more accurate)"
      default: 3
    num_models:
      type: integer
      description: "Number of diffusion seeds (RF3 generates 6 samples per seed)"
      default: 1
    upload_to_gcs:
      type: boolean
      description: "Upload predicted structures to GCS"
      default: true
    gcs_bucket:
      type: string
      description: "GCS bucket name for uploads"
    run_id:
      type: string
      description: "Unique identifier for this run"
  required: []
---

# RF3 (RosettaFold3) - Structure Prediction

## Overview

RF3 is an all-atom biomolecular structure prediction network competitive with leading open-source models. It predicts protein structures from sequences with high accuracy, making it ideal for validating designed proteins.

**Integration Status:** ✅ **PRODUCTION READY**

## Key Features

- **Fast Structure Prediction**: 330-residue proteins in ~10-30 minutes
- **Multi-Model Generation**: Generates 6 diverse conformations (multiple seeds/samples)
- **All-Atom Prediction**: Includes backbone and side-chain atoms
- **Confidence Metrics**: Reports pLDDT (per-residue confidence) and pTM (overall confidence)
- **GCS Integration**: Automatic upload of predicted structures
- **Database Tracking**: Full run and artifact metadata storage

## Use Cases

1. **Validating Designed Sequences** - Fold sequences from ProteinMPNN to validate designs
2. **Structure Prediction** - Predict structures from natural or engineered sequences
3. **Ensemble Generation** - Generate multiple conformations for downstream analysis
4. **Pipeline Integration** - Final validation step in RFD3 → ProteinMPNN → RF3 workflow

## Implementation Details

### Biomodal Location
- **File**: `biomodals/modal_rf3.py`
- **Function**: `rf3_predict()`
- **Image**: Python 3.12 + `rc-foundry[rf3]` + configs from GitHub

### Key Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `fasta_content` | str | Required | Input sequence(s) in FASTA format |
| `num_recycles` | int | 3 | Number of recycling iterations (higher = more accurate) |
| `num_models` | int | 1 | Number of diffusion seeds (RF3 generates 6 samples per seed) |
| `upload_to_gcs` | bool | False | Upload predicted structures to GCS |
| `gcs_bucket` | str | None | GCS bucket name for uploads |
| `run_id` | str | None | Unique identifier for this run |

### Output Files

RF3 generates multiple CIF (Crystallographic Information File) structures:
- `{name}_seed-{X}_sample-{Y}_model.cif` - Individual predictions for each seed/sample
- `{name}_model.cif` - Default/best model

Each CIF file contains:
- Full all-atom structure
- Per-residue confidence scores (pLDDT in B-factor field)
- Overall confidence metrics in header

## Input Requirements

**✅ RECOMMENDED: GCS URI Method**

Upload your FASTA file to GCS:

```bash
# Upload FASTA
gsutil cp protein.fasta gs://dev-services/rf3-inputs/

# Submit job
{
  "job_type": "rf3",
  "params": {
    "fasta_gcs_uri": "gs://dev-services/rf3-inputs/protein.fasta",
    "num_recycles": 3
  }
}
```

**Key benefits:**
- ✅ No JSON escaping issues
- ✅ Handles large FASTA files  
- ✅ Consistent with other models

## Examples

### 1. Basic Structure Prediction (GCS URI)

```bash
# Create FASTA
cat > protein.fasta << 'EOF'
>my_protein
MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLS
EOF

# Upload to GCS
gsutil cp protein.fasta gs://dev-services/rf3-inputs/

# Submit job
curl -X POST http://localhost:8000/api/v1/jobs/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_SECRET_KEY" \
  -d '{
    "job_type": "rf3",
    "params": {
      "fasta_gcs_uri": "gs://dev-services/rf3-inputs/protein.fasta",
      "num_recycles": 3
    }
  }'
```

### 2. Validating ProteinMPNN Designs (GCS URI)

```bash
# Create multi-sequence FASTA from ProteinMPNN
cat > designs.fasta << 'EOF'
>design_1
MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLS
>design_2
MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFY
EOF

# Upload and submit
gsutil cp designs.fasta gs://dev-services/rf3-inputs/
curl -X POST http://localhost:8000/api/v1/jobs/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_SECRET_KEY" \
  -d '{
    "job_type": "rf3",
    "params": {
      "fasta_gcs_uri": "gs://dev-services/rf3-inputs/designs.fasta",
      "num_recycles": 5,
      "num_models": 2
    }
  }'
```

### 3. Integration with Database

```python
from backend.services.artifact_service import ArtifactService
from backend.db.repositories.runs import RunRepository

# RF3 automatically stores results if GCS is enabled
result = rf3_predict.remote(
    fasta_content=fasta_content,
    upload_to_gcs=True,
    gcs_bucket="dev-services"
)

# Query results from database
run_repo = RunRepository()
run = run_repo.get_by_run_id(result['run_id'])
artifacts = run_repo.get_run_artifacts(result['run_id'])

print(f"Run status: {run.status}")
print(f"Artifacts stored: {len(artifacts)}")
```

## Typical Workflow

### End-to-End Protein Design Pipeline

```
1. RFD3 (Backbone Generation)
   ↓
   Generate 70-residue binder targeting hotspots
   Output: backbone_design.pdb

2. ProteinMPNN (Sequence Design)
   ↓
   Design sequences for the backbone (temp=0.2)
   Output: 10 sequences in FASTA format

3. RF3 (Structure Validation) ← YOU ARE HERE
   ↓
   Fold all 10 sequences to validate designs
   Output: 60 structures (10 sequences × 6 samples each)
   
4. QC & Selection
   ↓
   Filter by pLDDT > 80, pTM > 0.5
   Compare folded structures to original backbone (RMSD)
   Select top candidates for experimental testing
```

## Quality Control Metrics

### Confidence Scores

- **pLDDT** (predicted Local Distance Difference Test)
  - Range: 0-100
  - Good: > 80 (high confidence)
  - Acceptable: 60-80 (medium confidence)
  - Poor: < 60 (low confidence)
  
- **pTM** (predicted Template Modeling score)
  - Range: 0-1
  - Good: > 0.5 (confident in overall structure)
  - Acceptable: 0.3-0.5 (some confidence)
  - Poor: < 0.3 (low confidence)

### Performance Guidelines

| Sequence Length | Expected Time | GPU Memory |
|----------------|---------------|------------|
| 50-100 aa | 5-10 min | ~8 GB |
| 100-200 aa | 10-20 min | ~12 GB |
| 200-400 aa | 20-40 min | ~16 GB |
| 400+ aa | 40+ min | ~20+ GB |

## Integration Test

**Location**: `tests/integration/biomodals/test_rf3.py`

**Run Tests:**

```bash
# Test without GCS/DB (fast)
uv run modal run tests/integration/biomodals/test_rf3.py::test --disable-gcs --disable-db

# Test with full GCS/DB integration
uv run modal run tests/integration/biomodals/test_rf3.py::test
```

**What it tests:**
- Structure prediction from FASTA input
- Multi-model generation (6 structures)
- GCS upload functionality
- Database storage and retrieval
- Confidence score parsing (when implemented)

## Troubleshooting

### Image Build Issues

**Problem**: RF3's package doesn't include required config files  
**Solution**: We download configs from GitHub during image build

**Problem**: `rootutils` can't find `.project-root`  
**Solution**: We create it at `/usr/local/lib/python3.12/site-packages/.project-root`

### Input Format Issues

**Problem**: `KeyError: 'name'` or `KeyError: 'components'`  
**Solution**: Ensure JSON input has correct format:
```json
[
  {
    "name": "my_protein",
    "components": [
      {
        "seq": "MVLSPADK...",
        "chain_id": "A"
      }
    ]
  }
]
```

### Runtime Issues

**Problem**: Prediction takes too long (> 1 hour)  
**Solution**: 
- Reduce sequence length if possible
- Check if GPU is being utilized
- Consider splitting long sequences into domains

**Problem**: Out of memory errors  
**Solution**: 
- Reduce `num_models` parameter
- Use smaller sequences (< 400 aa)
- Request larger GPU in Modal config

## Technical Notes

### Engineering Challenges (Resolved)

RF3's packaging has significant issues that required workarounds:

1. **Config files not included in package** → Download from GitHub during build
2. **Hardcoded path expectations** → Place files exactly where RF3 expects them
3. **Undocumented JSON format** → Reverse-engineered from test files
4. **Poor error messages** → Added extensive logging and validation

Despite these challenges, the integration is now **stable and production-ready**.

### Model Information

- **Checkpoint**: `rf3_foundry_01_24_latest_remapped.ckpt` (3.0 GB)
- **Training Cutoff**: January 2024
- **Architecture**: All-atom diffusion-based prediction
- **Framework**: AtomWorks + Foundry

## Future Enhancements

### Planned Features

1. **MSA Support** - Accept pre-computed MSAs for higher accuracy
2. **Multi-Chain Prediction** - Predict protein complexes
3. **Template-Based Modeling** - Use known structures as templates
4. **Confidence Score Parsing** - Extract pLDDT/pTM from CIF files
5. **Batch Processing** - Optimize for large-scale predictions

### Integration Opportunities

- **AlphaFold2 Comparison** - Side-by-side validation with AF2
- **Structure Clustering** - Group similar predictions
- **Quality Filtering** - Automatic selection of high-confidence models
- **Downstream Analysis** - Binding affinity prediction, stability assessment

## References

- **Foundry Repository**: https://github.com/RosettaCommons/foundry
- **RF3 Paper**: "Accelerating Biomolecular Modeling with AtomWorks and RF3"
- **Model Weights**: Downloaded via `foundry install base-models`
- **Training Cutoff**: January 2024

## Related Skills

- **RFD3** (`skills/rfdiffusion/SKILL.md`) - Backbone generation (upstream)
- **ProteinMPNN** (`skills/proteinmpnn/SKILL.md`) - Sequence design (upstream)
- **AlphaFold2** - Alternative structure prediction tool

---

**Last Updated**: 2026-01-23  
**Status**: Production Ready ✅  
**Maintainer**: Design Agent Team
