---
name: boltz
description: AlphaFold3-like structure prediction for proteins, DNA, RNA, and small molecules using Boltz-1
category: validation
tags:
  - structure-prediction
  - complexes
  - ligands
  - alphafold3-alternative
  - multimer
biomodals_script: modal_boltz.py
biomodals_function: boltz
recommended_timeout: 600
recommended_gpu: L40S
tool_schema:
  type: object
  properties:
    input_str:
      type: string
      description: >
        Input content as a string, can be in FASTA or Boltz YAML format.
        YAML format supports proteins, DNA, RNA, SMILES strings, and CCD identifiers.
        FASTA format is automatically converted to YAML for simple protein predictions.
    params_str:
      type: string
      description: >
        Additional parameters for the boltz predict command.
        Common options: --recycling_steps, --step_scale, --diffusion_samples
      default: "--use_msa_server --seed 42"
    model:
      type: string
      description: >
        Boltz model version to use.
        "boltz-2" (default, recommended) - Latest model with improved accuracy.
        "boltz-1" - Original model, maintained for comparison.
      default: "boltz-2"
      enum: ["boltz-1", "boltz-2"]
    upload_to_gcs:
      type: boolean
      description: Upload results to Google Cloud Storage
      default: true
    gcs_bucket:
      type: string
      description: GCS bucket name for uploads
    run_id:
      type: string
      description: Unique identifier for this run
  required:
    - input_str
---

# Boltz Structure Prediction

AlphaFold3-like structure prediction for proteins, DNA, RNA, ligands, and complexes using Boltz-1. Boltz provides open-source access to AlphaFold3-class capabilities for biomolecular structure prediction.

**Key Trade-off**: Boltz offers similar capabilities to AlphaFold3 for complex prediction but is open-source and can be run on your own infrastructure.

## Use Cases

- ✅ **Protein-protein complexes**: Predict multi-chain protein structures
- ✅ **Protein-ligand complexes**: Model protein-small molecule interactions
- ✅ **Protein-DNA/RNA**: Model nucleic acid binding
- ✅ **Multi-component systems**: Combine proteins, nucleic acids, and ligands
- ✅ **AlphaFold3 alternative**: Open-source access to AF3-like capabilities
- ⚠️ **Not recommended for**: Simple single-chain proteins (use ESMFold or AlphaFold2 instead)

## Key Features

- **Boltz-2 by default**: Uses latest Boltz-2 model (better accuracy than Boltz-1)
- **Multi-modal**: Proteins, DNA, RNA, and small molecules in one prediction
- **YAML-based input**: Flexible specification of complex systems
- **MSA support**: Optional MSA server for improved accuracy
- **Open source**: Full control and transparency
- **L40S GPU**: Optimized for NVIDIA L40S (can also run on A100/H100)
- **GCS + DB integration**: Automatic storage of outputs and metadata
- **Backwards compatible**: Can still use Boltz-1 if needed (`model: "boltz-1"`)

## Input Formats

### FASTA Format (Simple Proteins)

For simple protein structure prediction, provide FASTA:

```python
{
  "input_str": ">my_protein\nMKVLWAASLAVALALGAAVSAQA",
  "params_str": "--use_msa_server --seed 42"
}
```

FASTA is automatically converted to Boltz YAML format internally.

### YAML Format (Complexes & Advanced)

For complexes, ligands, or multi-chain systems, use YAML:

```python
{
  "input_str": """
sequences:
  - protein:
      id: A
      sequence: MKVLWAASLAVALALGAAVSAQA
  - protein:
      id: B  
      sequence: GKVFWAASLAVALALGAAVSAQAK
  - smiles:
      id: LIG
      smiles: CC(=O)Oc1ccccc1C(=O)O
""",
  "params_str": "--use_msa_server --seed 42 --recycling_steps 10"
}
```

## Examples

### Example 1: Simple Protein Prediction (Boltz-2, Recommended)

```python
{
  "input_str": ">test_protein\nMKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPILSRVGDGT",
  "params_str": "--use_msa_server --seed 42",
  "model": "boltz-2"  # Default, recommended for best accuracy
}
```

**Output**: 
- CIF structure file (Boltz-2 format)
- Confidence scores (pLDDT, pTM)
- Metadata JSON

**Runtime**: ~5-8 minutes on L40S

**Note**: Boltz-2 is the default and provides better accuracy than Boltz-1. The `model` parameter can be omitted (defaults to `"boltz-2"`).

### Example 2: Protein-Protein Complex

```python
{
  "input_str": """
sequences:
  - protein:
      id: A
      sequence: MKVLWAASLAVALALGAAVSAQA
  - protein:
      id: B
      sequence: GKVFWAASLAVALALGAAVSAQAK
""",
  "params_str": "--use_msa_server --seed 42 --recycling_steps 10"
}
```

**Output**: Complex structure with binding interface scores
**Runtime**: ~8-12 minutes on L40S

### Example 3: Protein-Ligand Complex

```python
{
  "input_str": """
sequences:
  - protein:
      id: A
      sequence: MKVLWAASLAVALALGAAVSAQA
  - smiles:
      id: LIG
      smiles: CC(=O)Oc1ccccc1C(=O)O
""",
  "params_str": "--use_msa_server --seed 42 --diffusion_samples 10"
}
```

**Output**: Protein-ligand complex with binding pose
**Runtime**: ~10-15 minutes on L40S

### Example 4: Protein-DNA Complex

```python
{
  "input_str": """
sequences:
  - protein:
      id: A
      sequence: MKVLWAASLAVALALGAAVSAQA
  - dna:
      id: DNA
      sequence: ATCGATCG
""",
  "params_str": "--use_msa_server --seed 42"
}
```

**Output**: Protein-DNA complex structure
**Runtime**: ~8-12 minutes on L40S

### Example 5: High-Quality Prediction (Boltz-2)

For best quality, increase sampling and recycling:

```python
{
  "input_str": ">important_protein\nMKVLWAASLAVALALGAAVSAQA",
  "params_str": "--use_msa_server --seed 42 --recycling_steps 10 --step_scale 1.0 --diffusion_samples 10",
  "model": "boltz-2"  # Explicitly use Boltz-2 for highest quality
}
```

**Trade-off**: 2-3x slower but higher quality

### Example 6: Using Boltz-1 (Fallback)

To use Boltz-1 for comparison or debugging:

```python
{
  "input_str": ">test_protein\nMKVLWAASLAVALALGAAVSAQA",
  "params_str": "--use_msa_server --seed 42",
  "model": "boltz-1"  # Explicitly use Boltz-1
}
```

**Note**: Boltz-1 is maintained for backward compatibility and debugging, but Boltz-2 is recommended for production use.

## Typical Workflows

### Workflow 1: Binder-Target Complex Prediction

**Goal**: Validate designed binder binds to target

1. **Design binder** with ProteinMPNN or RFdiffusion
2. **Predict complex** with Boltz:
   - Binder sequence + Target sequence as YAML
   - Check interface pLDDT and iPAE
3. **Validate binding** quality:
   - ipTM > 0.6: Good binding confidence
   - Interface pLDDT > 70: Well-structured interface

### Workflow 2: Ligand Docking Validation

**Goal**: Predict protein-ligand binding pose

1. **Get protein structure** (PDB or prediction)
2. **Get ligand SMILES** string
3. **Predict complex** with Boltz using YAML input
4. **Analyze binding pose**:
   - Check ligand positioning
   - Verify key interactions
   - Compare to expected binding site

### Workflow 3: Multi-Chain Complex Assembly

**Goal**: Predict how multiple proteins assemble

1. **List all components** (proteins, nucleic acids, ligands)
2. **Create YAML specification** with all sequences
3. **Run Boltz prediction**
4. **Analyze assembly**:
   - Check overall pLDDT
   - Verify interface quality
   - Identify key contacts

## Parameters

### Basic Parameters

- `input_str`: FASTA or YAML input (required)
- `params_str`: Boltz command-line parameters (optional)
- `model`: Boltz model version (default: `"boltz-2"`, recommended)
  - `"boltz-2"`: Latest model with improved accuracy (default)
  - `"boltz-1"`: Original model, maintained for comparison

### Boltz Command-Line Options

Common options for `params_str`:

- `--use_msa_server`: Use MSA server for improved accuracy (recommended)
- `--seed 42`: Random seed for reproducibility
- `--recycling_steps N`: Number of structure recycling iterations (default: 3, recommended: 10 for quality)
- `--step_scale X`: Diffusion step scale (default: 0.5, recommended: 1.0 for quality)
- `--diffusion_samples N`: Number of diffusion samples (default: 1, recommended: 10 for diversity)

## Confidence Score Interpretation

Boltz provides similar confidence metrics to AlphaFold:

| Metric | Range | Interpretation |
|--------|-------|----------------|
| **pLDDT** | 0-100 | Per-residue confidence (>70 is good) |
| **pTM** | 0-1 | Predicted TM-score (>0.8 is high confidence) |
| **ipTM** | 0-1 | Interface confidence for complexes (>0.6 is good) |
| **iPAE** | Angstroms | Interface PAE (<10Å is good) |

**Quality Thresholds**:
- High quality: mean pLDDT > 80, pTM > 0.8
- Medium quality: mean pLDDT 60-80, pTM 0.6-0.8
- Low quality: mean pLDDT < 60, pTM < 0.6

## Comparison to Other Tools

| Tool | Use Case | Speed | Accuracy | Complexity |
|------|----------|-------|----------|------------|
| **Boltz** | Complexes, ligands, nucleic acids | Medium | High | High |
| **AlphaFold2** | Single proteins | Slow | Very High | Low |
| **ESMFold** | Screening many proteins | Very Fast | Good | Low |
| **Chai-1** | Similar to Boltz | Medium | High | High |
| **AlphaFold3** | Same as Boltz (closed-source) | Medium | Very High | High |

**When to use Boltz**:
- Need protein-ligand predictions
- Multi-component systems (protein + DNA/RNA)
- Want open-source AlphaFold3 alternative
- Need full control over prediction pipeline

**When to use alternatives**:
- Simple proteins → ESMFold (faster) or AlphaFold2 (more accurate)
- Only proteins, no ligands → AlphaFold2 or ESMFold
- Need fastest possible → ESMFold
- Access to AlphaFold3 → Use AF3 (slightly better accuracy)

## Limitations

### Input Constraints
- **Sequence length**: Best for proteins < 1000 residues
- **Number of chains**: Tested up to ~10 chains
- **Ligand complexity**: Works best with drug-like molecules

### Computational Requirements
- **GPU memory**: Requires 40GB+ for large complexes
- **Runtime**: 5-20 minutes depending on complexity
- **Disk space**: Models are ~10GB

### Known Issues
- FASTA input limited to simple cases (use YAML for complex systems)
- MSA server may be slow during peak usage
- Some ligands may not be well-parameterized

## Output Format

### PDB Structure File
Standard PDB with all chains and ligands:
```
ATOM      1  N   MET A   1     -13.660  -9.722 -18.391  1.00 81.38           N
...
HETATM 1234  C   LIG B   1      10.234  15.678 -5.432  1.00 75.20           C
```

### Confidence Scores (JSON)
```json
{
  "mean_plddt": 85.3,
  "ptm": 0.87,
  "iptm": 0.76,
  "per_residue_plddt": [81.3, 84.5, ...],
  "pae": [[...], [...], ...]
}
```

### Metadata (JSON)
```json
{
  "num_chains": 2,
  "chain_lengths": {"A": 150, "B": 145},
  "has_ligand": true,
  "gpu": "L40S",
  "runtime_seconds": 485
}
```

## Command Line Examples

```bash
# Simple protein
modal run modal/biomodals/modal_boltz.py --input-str ">test\nMKVLWAAS"

# With YAML file
modal run modal/biomodals/modal_boltz.py --input-yaml complex.yaml

# High-quality prediction
modal run modal/biomodals/modal_boltz.py \
  --input-yaml complex.yaml \
  --params-str "--use_msa_server --seed 42 --recycling_steps 10 --diffusion_samples 10"

# Upload to GCS
modal run modal/biomodals/modal_boltz.py \
  --input-yaml complex.yaml \
  --upload-to-gcs \
  --gcs-bucket dev-services \
  --run-id my_experiment_001
```

## Integration Test

```bash
# Full test with GCS + DB
uv run modal run tests/integration/biomodals/test_boltz.py

# Quick test without GCS/DB
uv run modal run tests/integration/biomodals/test_boltz.py --disable-gcs --disable-db
```

## Performance Metrics

Based on integration tests:

| Metric | Value | Notes |
|--------|-------|-------|
| **Single protein** | ~5-8 min | 150 residues |
| **Protein complex** | ~8-12 min | 2 chains, 300 total residues |
| **Protein-ligand** | ~10-15 min | Includes ligand sampling |
| **GPU** | L40S | 40GB VRAM |
| **Model size** | ~10 GB | Cached in Modal Volume |

**Cost Estimate** (Modal L40S @ ~$1.50/hr):
- Per prediction: ~$0.10-0.30
- Batch of 10: ~$1.50-2.50

## Best Practices

### Input Preparation

✅ **Use YAML for complexes**:
- More control over chain IDs
- Explicit specification of molecule types
- Better for reproducibility

✅ **Provide chain IDs**:
- Makes results easier to interpret
- Essential for multi-chain analysis

✅ **Validate SMILES strings**:
- Test SMILES are valid before prediction
- Use canonical SMILES when possible

### Quality Control

After Boltz prediction:

1. **Check confidence scores**:
   - Overall pLDDT > 70
   - pTM > 0.6 for complexes
   - ipTM > 0.6 for binding interfaces

2. **Visual inspection**:
   - Verify binding interfaces make sense
   - Check for clashes
   - Validate expected interactions

3. **Compare to experimental data**:
   - If available, compare to known structures
   - Validate key interactions are captured

### Optimization Tips

**Speed up prediction**:
- Skip MSA server for fast screening (`--no-use_msa_server`)
- Reduce recycling steps to 3
- Use single diffusion sample

**Improve quality**:
- Increase recycling steps to 10+
- Use multiple diffusion samples (10)
- Enable MSA server
- Increase step_scale to 1.0

## Troubleshooting

**Issue**: Prediction takes very long (>30 minutes)
**Solution**: 
- Complex is too large - consider splitting
- Try faster GPU (H100)
- Reduce --diffusion_samples

**Issue**: Low confidence scores (pLDDT < 50)
**Solution**:
- Input may not fold well
- Try enabling MSA server
- Increase recycling steps
- Check input sequence validity

**Issue**: Ligand not binding correctly
**Solution**:
- Verify SMILES string is correct
- Try multiple seeds for diversity
- Increase diffusion_samples for better sampling

**Issue**: Out of GPU memory
**Solution**:
- Complex is too large (>1000 residues total)
- Try reducing --diffusion_samples
- Use H100 with more memory

## References

- **Boltz Paper**: Wohlwend et al., "Boltz-1: Democratizing Biomolecular Interaction Modeling" (2024)
- **GitHub**: https://github.com/jwohlwend/boltz
- **AlphaFold3 Comparison**: Similar accuracy for most cases
- **Model Weights**: Downloaded automatically on first run (~10GB)

## Related Skills

- **[AlphaFold](../alphafold/SKILL.md)**: For single-chain high-accuracy prediction
- **[Chai-1](../chai/SKILL.md)**: Alternative for complexes and ligands
- **[ESMFold](../esmfold/SKILL.md)**: For fast screening
- **[ProteinMPNN](../proteinmpnn/SKILL.md)**: For sequence design before validation
