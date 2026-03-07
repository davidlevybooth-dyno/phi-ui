---
name: esm2
description: Predict masked amino acid residues using ESM-2 language model for protein sequence analysis
category: sequence-analysis
tags: [language-model, masked-prediction, sequence-analysis, meta]
biomodals_script: modal_esm2_predict_masked.py
biomodals_function: esm2
recommended_timeout: 5
recommended_gpu: L40S
tool_schema:
  type: object
  properties:
    fasta_str:
      type: string
      description: FASTA format string with one or more sequences containing <mask> tokens to predict
    fasta_name:
      type: string
      description: Name for the FASTA file (used in output filenames)
      default: "input.fasta"
    make_figures:
      type: boolean
      description: Generate contact map visualizations
      default: false
  required: [fasta_str]
---

# ESM2 Masked Prediction

Predict masked amino acid residues using Meta's ESM-2 (Evolutionary Scale Modeling) language model. ESM-2 is a large protein language model trained on millions of protein sequences that can predict masked residues based on evolutionary context.

## Use Cases

- ✅ **Masked residue prediction**: Predict missing or unknown amino acids in sequences
- ✅ **Sequence validation**: Verify designed sequences match evolutionary patterns
- ✅ **Sequence optimization**: Identify alternative residues with high probability
- ✅ **Evolutionary analysis**: Understand sequence conservation patterns
- ✅ **Mutant analysis**: Predict likely amino acids at specific positions

## Key Features

- **Fast predictions**: < 1 minute for most sequences
- **Contextual predictions**: Uses full sequence context for predictions
- **Probabilistic output**: Returns probabilities for all 20 amino acids
- **Contact maps**: Optional visualization of residue contacts
- **Multiple masks**: Can predict multiple masked positions in a single run

## Examples

### Basic Masked Prediction

Predict a single masked residue:

```python
{
  "fasta_str": ">test_sequence\nMKLLVAALLAAL<mask>GSSGSS",
  "make_figures": false
}
```

**Output**: 
- Predictions for all 20 amino acids at the masked position
- Top 5 most likely residues with probabilities
- TSV file with complete results

**Runtime**: ~30 seconds on L40S GPU

### Multiple Masked Positions

Predict multiple masked residues:

```python
{
  "fasta_str": ">protein1\nMKLLV<mask>ALLAAL<mask>GSSGSS",
  "make_figures": true
}
```

**Output**:
- Predictions for each masked position
- Contact map visualization (if make_figures=true)
- Complete probability distribution

### Sequence Validation

Validate a designed sequence:

```python
{
  "fasta_str": ">designed_binder\nMKQVSLN<mask>WQRLHSDRKTVNKLLGSVQAPLIPVYLEAKGFQNRHLHFTLKS",
  "fasta_name": "binder_validation"
}
```

**Use case**: After ProteinMPNN design, mask key positions to verify they match evolutionary expectations

## Input Format

**FASTA with <mask> tokens:**
```
>sequence_name
MKLLVAALLAALLAA<mask>GSSGSS
```

**Multiple sequences:**
```
>seq1
MKLLV<mask>ALLAAL
>seq2
GSSGSS<mask>VLLAA
```

**Requirements:**
- Must be valid FASTA format (start with `>`)
- Must contain at least one `<mask>` token
- Standard 20 amino acids only (no non-standard residues)
- Recommended length: < 1000 residues

## Output Format

### Understanding the Results

**Raw Output (in logs):**
```python
[(0, 'test', 1, 12, 'A', 0.4063), (0, 'test', 1, 12, 'L', 0.1624), ...]
```

**Format:** `(sequence_index, sequence_label, mask_number, token_position, amino_acid, probability)`

**Example breakdown:**
- `(0, 'test', 1, 12, 'A', 0.4063)` → For sequence #0 named 'test', mask #1 at token position 12, amino acid 'A' has 40.63% probability
- `(0, 'test', 1, 12, 'L', 0.1624)` → At the same position, Leucine has 16.24% probability
- `(0, 'test', 2, 13, 'G', 0.2834)` → Mask #2 at token position 13, Glycine has 28.34% probability

**How to interpret:**
1. **High confidence (>30%)**: This amino acid is strongly predicted
   - Example: `A` at 40.63% → Alanine is the best choice
2. **Moderate confidence (10-30%)**: Alternative amino acids that could work
   - Example: `L` at 16.24%, `V` at 12.97% → Leucine or Valine are viable alternatives
3. **Low confidence (<10%)**: These amino acids are unlikely at this position

**⚠️ Important: Independent Predictions**

ESM2 predicts each masked position **independently**, meaning:

```
Input: MKLLVAALLAAL<mask><mask><mask>GSSGSS
```

For each mask, ESM2 computes:
- Mask #1: P(residue at position 12 | sequence with masks still at 13, 14)
- Mask #2: P(residue at position 13 | sequence with masks still at 12, 14)
- Mask #3: P(residue at position 14 | sequence with masks still at 12, 13)

This is **not** a joint prediction like "the best 3-residue completion is AGT".

**If you want joint predictions (e.g., "AGT" as a unit):**

1. **Greedy iterative fill** (recommended for simplicity):
   ```bash
   # Run 1: MKLLVAALLAAL<mask><mask><mask>GSSGSS → best at pos 12 is A
   # Run 2: MKLVAALLAALA<mask><mask>GSSGSS → best at pos 13 is G
   # Run 3: MKLLVAALLALAG<mask>GSSGSS → best at pos 14 is T
   # Final: MKLLVAALLAALAGT GSSGSS
   ```

2. **Beam search** (more expensive, explores combinations):
   - Keep top-K options at each step
   - Explore combinations like AGT, AGS, AVT, etc.

**Practical use:**
```
Original sequence: MKLLVAALLAAL<mask><mask><mask>GSSGSS

ESM2 output (simplified):
Mask #1 (pos 12): A (40%), L (16%), V (13%)
Mask #2 (pos 13): G (28%), S (22%), A (18%)
Mask #3 (pos 14): T (35%), S (25%), G (20%)

Decision:
- Single best per position: A, G, T → "AGT"
- Alternative designs: "AST", "LGS", "VGT"
- Don't use low-prob combos like "YKD"
```

### TSV Results File

The full results are saved to a TSV file uploaded to GCS:

```tsv
seq_n	label	mask_num	mask_pos	aa	prob
0	test	1	12	A	0.4063
0	test	1	12	L	0.1624
0	test	1	12	V	0.1297
0	test	1	12	S	0.0640
0	test	2	13	G	0.2834
0	test	2	13	S	0.2201
0	test	2	13	A	0.1834
0	test	3	14	T	0.3512
0	test	3	14	S	0.2543
...
```

**Columns:**
- `seq_n`: Sequence index (0-based, useful if you process multiple sequences in one FASTA)
- `label`: Sequence name from FASTA header
- `mask_num`: Mask number (1-based: 1st mask, 2nd mask, 3rd mask, etc.)
- `mask_pos`: Token position in the sequence (0-based including special tokens)
- `aa`: Predicted amino acid (only standard 20 amino acids, special tokens filtered out)
- `prob`: Probability (0.0 to 1.0, all probabilities for one mask position sum to ~1.0)

**Download and use:**
```bash
# Download from GCS
gsutil cp gs://dev-services/runs/job-esm2-xxx/esm2/input.faa.results.tsv ./

# Load in Python
import pandas as pd
df = pd.read_csv('input.faa.results.tsv', sep='\t')

# Get top 5 predictions for mask #1 in sequence 'test'
mask1 = df[(df['label'] == 'test') & (df['mask_num'] == 1)]
top5 = mask1.nlargest(5, 'prob')
print(top5[['mask_pos', 'aa', 'prob']])
# Output:
#    mask_pos  aa    prob
# 0        12   A  0.4063
# 1        12   L  0.1624
# 2        12   V  0.1297
# 3        12   S  0.0640
# 4        12   G  0.0621

# Get best prediction for each mask
best_per_mask = df[df['label'] == 'test'].loc[df.groupby('mask_num')['prob'].idxmax()]
print(best_per_mask[['mask_num', 'mask_pos', 'aa', 'prob']])
# Output:
#    mask_num  mask_pos  aa    prob
# 0         1        12   A  0.4063
# 1         2        13   G  0.2834
# 2         3        14   T  0.3512
# => Best joint prediction: "AGT"
```

### Contact Map (if make_figures=true)

- PNG visualization of predicted residue contacts
- Shows which residues are likely to be in proximity
- Useful for understanding structural context

## Integration with Workflows

### After ProteinMPNN Design

```python
# Workflow: Design → Validate
{
  "nodes": [
    {
      "id": "design",
      "op": "proteinmpnn",
      "params": {"pdb_gcs_uri": "gs://...", "num_sequences": 10}
    },
    {
      "id": "validate",
      "op": "esm2",
      "params": {
        "fasta_str": "$artifacts.sequences",  # Reference ProteinMPNN output
        "make_figures": false
      }
    }
  ]
}
```

### Sequence Optimization Loop

Use ESM-2 to identify positions for mutagenesis:

1. Mask each position in a sequence
2. Run ESM-2 to get probability distribution
3. Identify high-probability alternatives
4. Test variants with structure prediction

## Model Details

**ESM-2 t33 650M UR50D:**
- 33 transformer layers
- 650M parameters
- Trained on UniRef50 database
- Contact prediction capabilities
- State-of-the-art masked language modeling

## Command Line Examples

```bash
# Basic prediction
modal run modal_esm2_predict_masked.py --fasta-name test --fasta-str ">seq1\nMKLLV<mask>ALLAAL"

# With contact maps
modal run modal_esm2_predict_masked.py --fasta-name test \
  --fasta-str ">seq1\nMKLLV<mask>ALLAAL" --make-figures

# Upload to GCS
modal run modal_esm2_predict_masked.py --fasta-name test \
  --fasta-str ">seq1\nMKLLV<mask>ALLAAL" \
  --upload-to-gcs --gcs-bucket dev-services --run-id test-esm2-001
```

## Best Practices

1. **Mask strategically**: Focus on positions you're uncertain about
2. **Check probabilities**: Look at full distribution, not just top prediction
3. **Use multiple sequences**: Compare predictions across similar sequences
4. **Validate with structure**: Follow up with AlphaFold to verify folding
5. **Consider context**: Predictions depend heavily on surrounding residues

## Limitations

- **Prediction accuracy**: ~40-60% for single positions (varies by context)
- **No 3D structure**: Predictions based on sequence only, not structure
- **Training bias**: Reflects patterns in UniRef50 database
- **Computational limits**: Very long sequences (> 1000 residues) may be slow

## Troubleshooting

**Issue**: "not a fasta file" error
**Solution**: Ensure FASTA string starts with `>`

**Issue**: "mask token not found"
**Solution**: Include at least one `<mask>` token in sequence

**Issue**: Low confidence predictions
**Solution**: Try providing more sequence context or use multiple masks

## Integration Test

```bash
# Full test with GCS + DB
uv run pytest tests/integration/biomodals/test_esm2.py -v

# Quick test without GCS/DB
uv run pytest tests/integration/biomodals/test_esm2.py -v --no-gcs
```

## References

- **ESM-2 Paper**: Lin et al., "Evolutionary-scale prediction of atomic-level protein structure with a language model" (Science, 2023)
- **ESM GitHub**: https://github.com/facebookresearch/esm
- **Model Card**: https://huggingface.co/facebook/esm2_t33_650M_UR50D
