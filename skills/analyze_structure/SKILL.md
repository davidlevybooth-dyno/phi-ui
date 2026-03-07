---
name: analyze_structure
description: Analyze PDB structure to identify residues, chains, and structural features
category: data-tools
tags: [pdb, structure, analysis, sequence]
biomodals_script: null
biomodals_function: null
recommended_timeout: 5
recommended_gpu: null
tool_schema:
  type: object
  properties:
    pdb_gcs_uri:
      type: string
      description: GCS URI (gs://bucket/path) to PDB file to analyze
    chain:
      type: string
      description: Chain ID to analyze (e.g., "A"). If null, analyzes all chains
      default: null
    identify_residues:
      type: array
      items:
        type: string
      description: List of residue types to identify (e.g., ["CYS", "ASP"]). If null, returns all residues
      default: null
  required:
    - pdb_gcs_uri
---

# Structure Analysis Tool

Analyze PDB structures to identify residues, chains, and other structural features.

## Use Cases

- Identify cysteine positions for fixed_positions in ProteinMPNN
- Find specific residue types (ASP, GLU, LYS, etc.)
- Get sequence information from PDB structures
- Identify glycosylation sequons (N-X-S/T patterns)

## Examples

### Find all cysteines
```python
{
  "pdb_gcs_uri": "gs://bucket/path/1R46_A.pdb",
  "chain": "A",
  "identify_residues": ["CYS"]
}
```

Returns:
```
{
  "chain": "A",
  "sequence": "MKTAY...",
  "cysteines": ["A52", "A56", "A63", ...],
  "total_residues": 402
}
```

### Get full sequence
```python
{
  "pdb_gcs_uri": "gs://bucket/path/structure.pdb",
  "chain": "A"
}
```

## Output

Returns detailed structure information including:
- Sequence
- Residue positions for requested types
- Chain information
- Total residue count
