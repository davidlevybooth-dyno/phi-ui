---
name: proteinmpnn
description: Protein sequence design using ProteinMPNN for inverse folding and sequence optimization
category: design-tools
tags: [sequence-design, inverse-folding, mpnn, baker-lab]
biomodals_script: modal_proteinmpnn.py
biomodals_function: proteinmpnn_design
recommended_timeout: 30
recommended_gpu: A10G
tool_schema:
  type: object
  properties:
    pdb_content:
      type: string
      description: PDB file content (not a file path). Optional if pdb_gcs_uri is provided.
    pdb_gcs_uri:
      type: string
      description: GCS URI (gs://bucket/path) or signed URL for PDB file. Optional if pdb_content is provided.
    num_sequences:
      type: integer
      description: Number of sequences to design
      default: 10
    temperature:
      type: number
      description: Sampling temperature (0.0-1.0, lower = more conservative)
      default: 0.1
    fixed_positions:
      type: string
      description: |
        Positions to keep fixed as comma-separated string.
        Format: CHAINNUM,CHAINNUM,... (e.g., A52,A56,A63 for individual positions or A10-20,A45-50 for ranges).
        Extract positions from user message when they specify residues to preserve.
  required: []
---

# ProteinMPNN Sequence Design

Design protein sequences for given backbone structures using ProteinMPNN from Baker Lab.
ProteinMPNN is an inverse folding tool that generates sequences likely to fold into the provided structure.

**Note**: This is the standalone ProteinMPNN implementation. For ligand-aware design, use LigandMPNN instead.

## Use Cases

- ✅ **Inverse folding**: Design sequences for de novo generated backbones (e.g., from RFD3)
- ✅ **Sequence optimization**: Generate alternative sequences for existing structures
- ✅ **Partial redesign**: Fix specific regions while redesigning others
- ✅ **Multi-chain design**: Design sequences for protein complexes
- 🔄 **Post-RFD3 workflow**: Design sequences for RFD3-generated binders

## Key Features

- **Fast sequence design**: ~5-10 minutes for 10-50 sequences
- **Temperature control**: Adjust diversity vs. designability
- **Partial fixing**: Keep functional regions fixed while redesigning others
- **Multi-chain support**: Design sequences for protein complexes
- **GCS + DB integration**: Stores outputs and metadata automatically

## Examples

### Basic Inverse Folding
Design 10 sequences for a backbone structure:
```python
{
  "pdb_content": "<PDB_CONTENT>",
  "num_sequences": 10,
  "temperature": 0.1
}
```

**Output**: 10 FASTA files with designed sequences
**Runtime**: ~5 minutes on A10G GPU

### Design with Fixed Positions
Keep functional residues fixed while redesigning the rest:
```python
{
  "pdb_content": "<PDB_CONTENT>",
  "num_sequences": 20,
  "temperature": 0.1,
  "fixed_positions": "A10-20,A45-55"  # Keep active site fixed
}
```

**Use case**: Maintain catalytic residues or binding sites while optimizing other regions

### Multi-Chain Design
Design sequences for a protein complex:
```python
{
  "pdb_content": "<COMPLEX_PDB_CONTENT>",
  "num_sequences": 15,
  "temperature": 0.15
}
```

**Use case**: Design binder sequences after RFD3 binder generation. All chains in the PDB will be designed.

**⚠️ IMPORTANT - Chain Separator**: ProteinMPNN outputs multi-chain sequences using `/` as a chain separator:
```
>design_1
CHAINASEQUENCE/CHAINBSEQUENCE
```

**This is not compatible with most folding tools** (ESMFold, AlphaFold2, etc.) which only accept standard amino acids.

**Solutions**:
1. **Split chains**: Use `split_chains` tool to create separate FASTA entries for each chain
2. **Single chain folding**: If you only need one chain, extract it after splitting
3. **Use fixed_positions**: Design only specific chains by fixing others

### Higher Diversity Sampling
Generate more diverse sequences:
```python
{
  "pdb_content": "<PDB_CONTENT>",
  "num_sequences": 50,
  "temperature": 0.3  # Higher temperature = more diversity
}
```

**Use case**: Explore sequence space more broadly

## Typical Workflow: RFD3 → ProteinMPNN → Validation

1. **Generate backbone** with RFD3:
   - De novo generation or binder design
   - Get CIF/PDB structure file

2. **Design sequences** with ProteinMPNN:
   - Convert CIF to PDB if needed
   - Run ProteinMPNN to generate 10-50 sequences
   - Temperature 0.1 for conservative, 0.3 for diverse

3. **Validate designs**:
   - Fold with AlphaFold2 or RF3
   - Check pLDDT > 85, pTM > 0.8
   - For binders: check interface metrics

4. **Select top candidates**:
   - High confidence (pLDDT > 90)
   - Good agreement with input structure (RMSD < 2Å)
   - Favorable interface metrics (for binders)

## Temperature Guidelines

| Temperature | Behavior | Use Case |
|-------------|----------|----------|
| 0.1 | Very conservative | High confidence, low diversity |
| 0.2 | Balanced | Good designability, moderate diversity |
| 0.3 | Diverse | More exploration, lower individual confidence |
| 0.5+ | Highly diverse | Broad sampling, many may not fold well |

**Recommendation**: Start with 0.1, increase if you need more diversity

## Command Line Examples

```bash
# Basic sequence design
modal run modal_proteinmpnn.py --pdb-path backbone.pdb --num-sequences 10

# Design with fixed positions
modal run modal_proteinmpnn.py --pdb-path backbone.pdb --num-sequences 20 \
  --fixed-positions "A10-20,A45-50" --temperature 0.1

# Multi-chain design (all chains will be designed)
modal run modal_proteinmpnn.py --pdb-path complex.pdb --num-sequences 15 \
  --temperature 0.15

# Upload to GCS
modal run modal_proteinmpnn.py --pdb-path backbone.pdb --num-sequences 10 \
  --upload-to-gcs --gcs-bucket dev-services
```

## Output Format

ProteinMPNN generates:
- **FASTA files**: One per designed sequence
- **Metadata**: Sequence length, design score (if available)
- **GCS storage**: Optional upload to cloud storage

### Single-Chain Output
Each FASTA file contains:
```
>sequence_001
MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPILSRVGDGTQDNLSGAEKAVQVKVKALPDAQFEVV...
```

### Multi-Chain Output (IMPORTANT!)
For multi-chain structures, ProteinMPNN uses **`/` as a chain separator**:
```
>sequence_001
MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPILSRVGDGTQDNLSGAEKAVQVKVKALPDAQFEVV/APILSRVGDGTQDNLSGAEKAVQVKVKALPDAQFEVVHSLAKWKRQTLGQHDFSAGEGLYTHMKALRPDEDRLSPLHSVYVDQWDWERVMGDGERQFSTLKSTVEAIWAGIKATEAAVSEEFGLAPFLPDQIHFVHSQELLSRYPDLDAKGRERAIAKDLGAVFLVGIGGKLSDGHRHDVRAPDYDDWSTPSELGHAGLNGDILVWNPVLEDAFELSSMGIRVDADTLKHQLALTGDEDRLELEWHQALLRGEMPQTIGGGIGQSRLTMLLLQLPHIGQVQAGVWPAAVRESVPSLL
```

**This format is NOT compatible with most downstream tools!**

**To use these sequences**:
- Use `split_chains` tool to separate chains into individual FASTA entries
- Or manually remove `/` if you only need concatenated sequence (not recommended for folding)

## QC Metrics

After ProteinMPNN, validate with:
1. **AlphaFold2/RF3 folding**:
   - pLDDT > 85 (high confidence)
   - pTM > 0.8 (good topology)
   - RMSD to input < 2Å

2. **Sequence diversity**:
   - Check amino acid composition
   - Avoid poly-X regions
   - Look for reasonable hydrophobic core

3. **For binders**:
   - Interface pLDDT > 80
   - Buried surface area > 600 Å²
   - Shape complementarity > 0.6

## Integration Test

```bash
# Full test with GCS + DB
uv run modal run tests/integration/biomodals/test_proteinmpnn.py

# Quick test without GCS/DB
uv run modal run tests/integration/biomodals/test_proteinmpnn.py --disable-gcs --disable-db
```

## Troubleshooting

**Issue**: `EOFError: Ran out of input` when loading checkpoint
**Solution**: ProteinMPNN weights are downloaded automatically at runtime from GitHub. Check network connectivity.

**Issue**: Low pLDDT scores after AlphaFold validation
**Solution**: Try lower temperature (0.05-0.1) or use fixed positions to constrain design

**Issue**: All sequences are very similar
**Solution**: Increase temperature (0.2-0.3) for more diversity

## References

- **ProteinMPNN GitHub**: https://github.com/dauparas/ProteinMPNN
- **ProteinMPNN Paper**: Dauparas et al., "Robust deep learning-based protein sequence design using ProteinMPNN" (Science, 2022)
- **LigandMPNN**: For ligand-aware design, use the LigandMPNN biomodal instead
- **Model Weights**: Downloaded automatically from https://github.com/dauparas/ProteinMPNN (v_48_020.pt)
