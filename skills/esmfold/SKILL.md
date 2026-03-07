---
name: esmfold
description: Fast protein structure prediction from sequence using ESMFold
category: validation
tags: [structure-prediction, folding, validation, fast, confidence-scores]
biomodals_script: modal_esmfold.py
biomodals_function: esmfold
recommended_timeout: 120
recommended_gpu: A100
tool_schema:
  type: object
  properties:
    fasta_name:
      type: string
      description: Name for the FASTA input (used for output file naming)
      default: "sequences.fasta"
    fasta_str:
      type: string
      description: FASTA formatted sequence(s). Can contain single or multiple sequences. Use this OR fasta_gcs_uri.
    fasta_gcs_uri:
      type: string
      description: GCS URI to FASTA file (e.g., gs://bucket/path/file.fa). Alternative to fasta_str for large sequences to avoid Temporal payload limits.
    num_recycles:
      type: integer
      description: Number of recycling iterations (more = potentially better quality, slower)
      default: 3
    extract_confidence:
      type: boolean
      description: Extract per-residue pLDDT confidence scores
      default: true
  required: []
---

# ESMFold Structure Prediction

Fast protein structure prediction from sequence using ESMFold from Meta AI. ESMFold is an end-to-end single sequence structure prediction model that's significantly faster than AlphaFold2 (~1 minute vs 10-20 minutes) while maintaining good accuracy.

**Key Trade-off**: Speed vs. Accuracy - ESMFold is ~10-15x faster than AlphaFold but slightly less accurate. Ideal for high-throughput screening, initial validation, or rapid prototyping.

## Use Cases

- ✅ **Rapid structure prediction**: Get structures in ~1 minute (after weight caching)
- ✅ **High-throughput screening**: Validate many sequences quickly
- ✅ **Initial validation**: Fast first-pass validation of designed sequences
- ✅ **Batch processing**: Predict multiple structures from a single FASTA file
- ✅ **ProteinMPNN validation**: Quick fold validation after sequence design
- ⚠️ **Not recommended for**: Final validation (use AlphaFold2 instead), complexes, or proteins >500 residues

## Key Features

- **Ultra-fast**: ~50-60 seconds per structure (with cached weights)
- **Batch support**: Process multiple sequences in one run
- **Confidence scores**: Per-residue pLDDT scores for quality assessment
- **No MSA required**: Single sequence input only (faster, simpler)
- **Weight caching**: Model weights (~3-4GB) cached on first run
- **GCS + DB integration**: Automatic storage of outputs and metadata

## Speed Comparison

| Tool | Runtime | Use Case |
|------|---------|----------|
| **ESMFold** | ~1 min | High-throughput screening, initial validation |
| **AlphaFold2** | ~10-20 min | Final validation, publication-quality structures |
| **RoseTTAFold** | ~15-30 min | When MSA is available |
| **Chai-1** | ~5-10 min | Complexes, ligands, modified residues |

## Examples

### Basic Structure Prediction
Predict structure for a single sequence:
```python
{
  "fasta_str": ">my_protein\nMKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPILSRVGDGT...",
  "num_recycles": 3,
  "extract_confidence": true
}
```

**Output**: 
- PDB structure file
- Per-residue pLDDT confidence scores (JSON)
- Metadata with prediction quality

**Runtime**: ~60 seconds on A100 (after weight caching)

### Batch Prediction
Predict structures for multiple sequences:
```python
{
  "fasta_str": """>protein_A
MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPILSRVGDGT...
>protein_B
AKVQVKALPDAQFEVVHSLAKWKRQTLGQHDFSAGEGLYTHMKALRPD...
>protein_C
LGVNQYLSQVKADLAIPVEARIKSRDLAEAQADVPSGLESTKSVL...""",
  "num_recycles": 3,
  "extract_confidence": true
}
```

**Output**: 3 PDB files + 3 confidence JSON files + metadata
**Runtime**: ~150 seconds for 3 sequences

### High-Quality Prediction
Use more recycling iterations for potentially better quality:
```python
{
  "fasta_str": ">important_protein\nMKTAYIAKQRQISFVKSHFSR...",
  "num_recycles": 5,  # More iterations = better quality (but slower)
  "extract_confidence": true
}
```

**Trade-off**: Each additional recycle adds ~10-15 seconds
**Recommendation**: 3 recycles is usually sufficient

### Quick Screening (Skip Confidence)
For very fast screening when you only need structures:
```python
{
  "fasta_str": ">test_protein\nMKTAYIAKQRQISFVKSHFSR...",
  "num_recycles": 3,
  "extract_confidence": false  # Slightly faster
}
```

**Runtime**: ~50 seconds (saves ~5-10 seconds)

## Typical Workflows

### Workflow 1: ProteinMPNN → ESMFold → AlphaFold
**Goal**: Validate designed sequences efficiently

1. **Design sequences** with ProteinMPNN (10-50 sequences)
2. **Screen with ESMFold** (5-10 min total for 50 sequences):
   - Filter by pLDDT > 70
   - Check topology looks reasonable
3. **Validate top candidates** with AlphaFold2:
   - Select top 5-10 by pLDDT
   - Run AlphaFold for final validation
   - Check pLDDT > 85, pTM > 0.8

**Time saved**: 80-90% reduction in compute time vs. running AlphaFold on all sequences

### Workflow 2: ESMFold-Only Screening
**Goal**: Rapid initial assessment

1. **Run ESMFold** on all candidates
2. **Filter by confidence**:
   - pLDDT > 70: Good quality
   - pLDDT 50-70: Medium quality (proceed with caution)
   - pLDDT < 50: Low confidence (likely poor fold)
3. **Select candidates** for experimental testing or further validation

### Workflow 3: Structure Comparison
**Goal**: Compare designed sequence to target

1. **Predict structure** with ESMFold
2. **Compare to target** (if available):
   - Calculate RMSD using structure analysis tools
   - Check secondary structure agreement
   - Verify functional regions align

## Confidence Score Interpretation

ESMFold provides per-residue pLDDT (Predicted Local Distance Difference Test) scores:

| pLDDT Range | Interpretation | Action |
|-------------|----------------|--------|
| **> 90** | Very high confidence | Structure is very reliable |
| **70-90** | High confidence | Structure is generally reliable |
| **50-70** | Medium confidence | Some uncertainty, validate carefully |
| **< 50** | Low confidence | High uncertainty, likely disordered or incorrect |

**Mean pLDDT**: Average across all residues, quick quality indicator
- Mean > 70: Good overall quality
- Mean 50-70: Moderate quality
- Mean < 50: Poor quality, likely won't fold well

**Per-residue scores**: Identify poorly modeled regions
- Useful for identifying disordered regions
- Highlight areas needing redesign
- Guide experimental truncation decisions

## Limitations

### Sequence Length
- **Optimal**: 50-400 residues
- **Maximum**: ~500 residues (performance degrades beyond this)
- **Very long proteins**: Consider domain splitting or use AlphaFold2

### Accuracy vs AlphaFold2
- **Single domains**: ESMFold ~85-90% as accurate as AlphaFold2
- **Complex folds**: AlphaFold2 typically more accurate
- **Novel folds**: AlphaFold2 with MSA is more reliable

### Not Suitable For
- ❌ Protein-protein complexes (use Chai-1 or AlphaFold-Multimer)
- ❌ Protein-ligand complexes (use Chai-1 or LigandMPNN)
- ❌ Modified residues or non-standard amino acids
- ❌ Membrane proteins (limited training data)

## Output Format

### PDB Structure File
Standard PDB format with atomic coordinates:
```
ATOM      1  N   MET A   1     -13.660  -9.722 -18.391  1.00 81.38           N
ATOM      2  CA  MET A   1     -13.327 -11.142 -18.324  1.00 84.48           C
...
```

### Confidence Scores (JSON)
Per-residue pLDDT scores:
```json
{
  "sequence_name": "my_protein",
  "sequence_length": 150,
  "mean_plddt": 82.4,
  "min_plddt": 45.3,
  "max_plddt": 95.1,
  "per_residue_plddt": [81.38, 84.48, 84.95, ...]
}
```

### Metadata (JSON)
Run information:
```json
{
  "fasta_name": "input.fasta",
  "num_sequences": 1,
  "num_structures_generated": 1,
  "gpu": "A100",
  "num_recycles": 3,
  "extract_confidence": true
}
```

## Command Line Examples

```bash
# Basic structure prediction
modal run modal/biomodals/modal_esmfold.py \
  --input-fasta protein.fasta

# Batch prediction
modal run modal/biomodals/modal_esmfold.py \
  --input-fasta multi_sequence.fasta

# High-quality prediction
modal run modal/biomodals/modal_esmfold.py \
  --input-fasta protein.fasta \
  --num-recycles 5

# Upload to GCS
modal run modal/biomodals/modal_esmfold.py \
  --input-fasta protein.fasta \
  --upload-to-gcs \
  --gcs-bucket dev-services \
  --run-id my_experiment_001
```

## Integration Test

```bash
# Full test with GCS + DB
uv run modal run tests/integration/biomodals/test_esmfold.py

# Quick test without GCS/DB
uv run modal run tests/integration/biomodals/test_esmfold.py --disable-gcs --disable-db
```

**Test Coverage**:
- ✅ Single sequence prediction
- ✅ Batch prediction (3 sequences)
- ✅ GCS upload integration
- ✅ Database storage and verification
- ✅ Confidence score extraction

## Performance Metrics

Based on integration tests:

| Metric | Value | Notes |
|--------|-------|-------|
| **First run** | ~180 sec | Downloads weights (one-time) |
| **Cached run** | ~55 sec | Uses cached weights |
| **Speedup** | 3.3x | After first run |
| **Weight size** | 3-4 GB | Cached in Modal Volume |
| **GPU** | A100 | 40GB VRAM |
| **Batch (3 seq)** | ~155 sec | ~50 sec per sequence |

**Cost Estimate** (Modal A100 @ ~$3.50/hr):
- Per prediction: ~$0.05 (with caching)
- First prediction: ~$0.15 (includes weight download)
- Batch of 10: ~$0.35

## Best Practices

### When to Use ESMFold

✅ **Use ESMFold for**:
- Initial screening of many sequences
- Rapid validation during iterative design
- High-throughput experiments
- Cases where speed > accuracy
- Sequences 50-400 residues

✅ **Follow with AlphaFold2 for**:
- Final validation before experiments
- Publication-quality structures
- Complex or novel folds
- When highest accuracy is needed

### Quality Control

After ESMFold prediction:

1. **Check confidence scores**:
   - Mean pLDDT > 70 is good
   - Review low-confidence regions (<50)

2. **Visual inspection**:
   - Check for reasonable fold topology
   - Look for obvious artifacts
   - Verify secondary structure makes sense

3. **Compare to expectations**:
   - Match expected domain architecture?
   - Functional regions positioned correctly?
   - Size and shape reasonable?

4. **For designed sequences**:
   - Compare to target structure (if available)
   - Calculate RMSD to input backbone
   - Check interface quality (for binders)

### Optimization Tips

**Speed up prediction**:
- Use `extract_confidence: false` if you don't need pLDDT
- Reduce `num_recycles` to 1-2 for very fast (lower quality)
- Batch multiple sequences (amortizes overhead)

**Improve quality**:
- Increase `num_recycles` to 4-5
- Truncate sequences to remove disordered regions
- Split long sequences into domains

## Troubleshooting

**Issue**: First run is very slow (~3 minutes)
**Solution**: This is normal - ESMFold downloads ~3-4GB of weights on first run. Subsequent runs use cached weights and are much faster (~1 min).

**Issue**: Low pLDDT scores (<50)
**Solution**: 
- Sequence may not fold well (consider redesign)
- Check for unusual amino acid composition
- Try increasing `num_recycles` to 5
- Consider using AlphaFold2 for comparison

**Issue**: Out of memory error
**Solution**: 
- Sequence is too long (>500 residues)
- Try splitting into domains
- Reduce sequence length

**Issue**: Structure looks unrealistic
**Solution**:
- Check confidence scores - regions with pLDDT <50 are unreliable
- ESMFold may struggle with very novel folds
- Use AlphaFold2 for final validation

## References

- **ESMFold Paper**: Lin et al., "Evolutionary-scale prediction of atomic-level protein structure with a language model" (Science, 2023)
- **ESM GitHub**: https://github.com/facebookresearch/esm
- **AlphaFold2**: For higher accuracy when speed isn't critical
- **Chai-1**: For complexes, ligands, modified residues
- **Model Weights**: Downloaded automatically from Facebook Research (~3.4GB total)

## Related Skills

- **[ProteinMPNN](../proteinmpnn/SKILL.md)**: Sequence design (use ESMFold for validation)
- **[AlphaFold](../alphafold/SKILL.md)**: Higher-accuracy structure prediction
- **[RF3](../rf3/SKILL.md)**: Alternative fast structure prediction
- **[Chai](../chai/SKILL.md)**: For protein-ligand complexes
