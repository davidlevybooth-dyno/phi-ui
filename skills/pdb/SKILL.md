---
name: fetch_pdb
description: Download PDB structure from RCSB and upload to GCS for use in design tools
category: data-tools
tags: [pdb, rcsb, structure, fetch]
biomodals_script: null
biomodals_function: null
recommended_timeout: 5
recommended_gpu: null
tool_schema:
  type: object
  properties:
    pdb_id:
      type: string
      description: RCSB PDB ID (e.g., "1R46", "5NN8")
    chain:
      type: string
      description: Chain ID to extract (e.g., "A", "B"). If null, keeps all chains
      default: null
  required:
    - pdb_id
---

# PDB Fetch Tool

Download protein structures from RCSB PDB database and prepare them for design workflows.

## Use Cases

- Fetch PDB structures for ProteinMPNN sequence design
- Download and extract specific chains from multi-chain complexes
- Prepare structures for structure prediction validation

## Examples

### Fetch full structure
```python
{
  "pdb_id": "1R46"
}
```

### Fetch specific chain
```python
{
  "pdb_id": "1R46",
  "chain": "A"
}
```

## Output

Returns a GCS URI (gs://bucket/path) that can be used directly with other tools like ProteinMPNN.
