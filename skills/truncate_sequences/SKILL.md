---
name: truncate_sequences
description: Truncate protein sequences to a maximum length for structure prediction
category: preprocessing
tags: [sequences, preprocessing, length-filter]
biomodals_script: null
biomodals_function: null
recommended_timeout: 1
recommended_gpu: null
tool_schema:
  type: object
  properties:
    fasta_str:
      type: string
      description: Input FASTA content with one or more sequences
    max_length:
      type: integer
      description: Maximum allowed sequence length
      default: 400
    mode:
      type: string
      description: Truncation mode - "start" (keep N-terminus), "end" (keep C-terminus), or "middle" (keep center)
      default: start
      enum: [start, end, middle]
    add_note:
      type: boolean
      description: Whether to add truncation note to sequence headers
      default: true
  required: [fasta_str]
---

# Truncate Sequences

Truncate protein sequences to a specified maximum length. Useful for preparing sequences for structure prediction tools with length limitations.

## Description
Truncates protein sequences in FASTA format to a specified maximum length. Useful for preparing sequences for structure prediction tools like ESMFold that have length limitations.

Options:
- Truncate from N-terminus (keep first N residues)
- Truncate from C-terminus (keep last N residues)
- Truncate from middle (keep central N residues)

## Parameters

### Required
- `fasta_str` (string): Input FASTA content with one or more sequences
- `max_length` (integer): Maximum allowed sequence length (default: 400)

### Optional
- `mode` (string): Truncation mode - "start" (keep N-terminus), "end" (keep C-terminus), or "middle" (keep center). Default: "start"
- `add_note` (boolean): Whether to add truncation note to sequence headers. Default: true

## Example Usage

### Truncate long sequences to 400 residues
```python
result = truncate_sequences(
    fasta_str=">seq1\nVERYLONGSEQUENCE...",
    max_length=400,
    mode="start"
)
```

### Keep C-terminal domain
```python
result = truncate_sequences(
    fasta_str=sequences,
    max_length=200,
    mode="end"
)
```

## Output Format

Returns FASTA string with truncated sequences.

Example:
```
>seq1 [truncated to 400 residues from start]
MNNGLCLTPLMGW...
>seq2 [truncated to 400 residues from start]
LDNGLARTPTMGW...
```

## Performance
- **Duration**: <1 second (local processing)
- **Cost**: Free (no GPU required)

## Metadata
- **Recommended Timeout**: 1 minute
- **Category**: preprocessing
- **Tags**: #sequences #preprocessing #length-filter
