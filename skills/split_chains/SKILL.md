---
name: split_chains
description: Split multi-chain protein sequences into separate FASTA entries
category: preprocessing
tags: [sequences, multi-chain, preprocessing, proteinmpnn]
biomodals_script: null
biomodals_function: null
recommended_timeout: 1
recommended_gpu: null
tool_schema:
  type: object
  properties:
    fasta_str:
      type: string
      description: Input FASTA content with multi-chain sequences
    keep_chain:
      type: string
      description: Keep only a specific chain (e.g., "A", "B"). If not provided, all chains are output.
    chain_labels:
      type: array
      description: Custom labels for chains (default ["A", "B", "C", ...]). Must match number of chains.
      items:
        type: string
  required: [fasta_str]
---

# Split Multi-Chain Sequences

Split multi-chain protein sequences (using `/` as chain separator) into individual FASTA entries for each chain. Essential when ProteinMPNN designs multi-chain complexes but you need to fold chains separately.

## Description
Splits multi-chain FASTA sequences (using `/` as chain separator) into individual FASTA entries for each chain. This is essential when ProteinMPNN designs multi-chain complexes but you need to fold chains separately with ESMFold or AlphaFold2.

ProteinMPNN outputs multi-chain sequences like:
```
>design_1
CHAINASEQUENCE/CHAINBSEQUENCE
```

This tool converts them to:
```
>design_1_chain_A
CHAINASEQUENCE
>design_1_chain_B
CHAINBSEQUENCE
```

## Parameters

### Required
- `fasta_str` (string): Input FASTA content with multi-chain sequences

### Optional
- `keep_chain` (string): Keep only a specific chain (e.g., "A", "B"). If not provided, all chains are output.
- `chain_labels` (array): Custom labels for chains (default: ["A", "B", "C", ...]). Must match number of chains.

## Example Usage

### Split all chains
```python
result = split_chains(
    fasta_str=">seq1\nCHAIN1SEQ/CHAIN2SEQ"
)
# Returns:
# >seq1_chain_A
# CHAIN1SEQ
# >seq1_chain_B
# CHAIN2SEQ
```

### Keep only first chain
```python
result = split_chains(
    fasta_str=proteinmpnn_output,
    keep_chain="A"
)
```

### Custom chain labels
```python
result = split_chains(
    fasta_str=sequences,
    chain_labels=["binder", "target"]
)
```

## Workflow Integration

### Typical Pattern: ProteinMPNN → Split → ESMFold

```python
WorkflowSpec(
    nodes=[
        NodeSpec(id="design", op="proteinmpnn", params={...}),
        NodeSpec(
            id="split",
            op="split_chains",
            params={
                "fasta_str": "$artifacts.sequences",
                "keep_chain": "A"  # Keep only designed binder
            }
        ),
        NodeSpec(
            id="fold",
            op="esmfold",
            params={
                "fasta_str": "$artifacts.split_sequences"
            }
        ),
    ],
    edges=[...],
)
```

## Output Format

Returns FASTA string with split sequences.

**Example**:
```
>design_1_chain_A
MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPILSRVGDGTQ...
>design_1_chain_B
APILSRVGDGTQDNLSGAEKAVQVKVKALPDAQFEVVHSLAKWKR...
>design_2_chain_A
LDNGLARTPTMGWLHWERFMCNLDCQEEPDSCISEKLFMEMAELM...
>design_2_chain_B
MNNGLCLTPLMGWNNYVRYLNERDCENNPENCVTEALYKKQADIM...
```

## Performance
- **Duration**: <1 second (local text processing)
- **Cost**: Free (no GPU required)

## Use Cases

1. **Binder Design**: Design binder-target complex, extract only binder chain for folding
2. **Multi-Chain Folding**: Fold each chain separately with ESMFold
3. **Chain Analysis**: Analyze individual chains from complex design
4. **Format Conversion**: Convert ProteinMPNN format to standard FASTA

## Notes

- Chains are split at `/` character
- If no `/` found, assumes single-chain (returns input unchanged)
- Chain labels default to A, B, C, ... (up to Z)
- Empty chains (e.g., `SEQ//SEQ`) are skipped

## Metadata
- **Recommended Timeout**: 1 minute
- **Category**: preprocessing
- **Tags**: #sequences #multi-chain #preprocessing #proteinmpnn
