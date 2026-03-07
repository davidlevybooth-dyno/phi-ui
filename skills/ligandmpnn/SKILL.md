---
name: ligandmpnn
description: Design protein sequences using LigandMPNN inverse folding with ligand awareness
category: design-tools
tags: [sequence-design, inverse-folding, ligand-aware]
biomodals_script: modal_ligandmpnn.py
biomodals_function: ligandmpnn
recommended_timeout: 300
recommended_gpu: T4
tool_schema:
  type: object
  properties:
    input_pdb_str:
      type: string
      description: PDB file content as string (not a file path)
    params_str:
      type: string
      description: LigandMPNN command-line parameters as a single string
      default: '--seed 1 --checkpoint_protein_mpnn "/LigandMPNN/model_params/proteinmpnn_v_48_020.pt" --save_stats 1'
    extract_chains:
      type: string
      description: Optional chains to extract before design (e.g., "AC")
  required:
    - input_pdb_str
---

# LigandMPNN Sequence Design

Design protein sequences using LigandMPNN, an enhanced version of ProteinMPNN with ligand awareness for more accurate sequence design around small molecules and cofactors.

## Use Cases

- Design sequences for RFdiffusion backbones
- Redesign existing protein sequences for stability
- Ligand-aware sequence design around small molecules
- Design sequences for specific chains in complexes
- Optimize sequences for expression

## Examples

### Design sequences for binder backbone
```python
{
  "input_pdb_str": "ATOM  1  N   MET A   1...",
  "params_str": '--seed 1 --checkpoint_protein_mpnn "/LigandMPNN/model_params/proteinmpnn_v_48_020.pt" --chains_to_design "C" --save_stats 1 --batch_size 10 --number_of_batches 10'
}
```

### Design with chain extraction
```python
{
  "input_pdb_str": "ATOM  1  N   MET A   1...",
  "extract_chains": "AC",
  "params_str": '--seed 1 --checkpoint_protein_mpnn "/LigandMPNN/model_params/proteinmpnn_v_48_020.pt" --chains_to_design "C" --save_stats 1'
}
```

## QC Thresholds

After sequence design, validate with:
- **Design score** < -2.0 (sequence-structure compatibility)
- **Sequence recovery** > 0.4 (for redesign tasks)
- Follow up with AlphaFold for structure prediction

## References

- LigandMPNN paper: https://www.biorxiv.org/content/10.1101/2023.12.22.573103v1
- ProteinMPNN paper: https://www.science.org/doi/10.1126/science.add2187
