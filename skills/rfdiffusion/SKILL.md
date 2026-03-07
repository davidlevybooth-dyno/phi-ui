---
name: rfdiffusion3
description: All-atom generative protein design using RFDiffusion3 (Foundry) for binder design, de novo generation, motif scaffolding, and symmetric oligomers
category: design-tools
tags: [structure-design, diffusion, backbone, binder, all-atom, foundry]
biomodals_script: modal_rfdiffusion3.py
biomodals_function: rfdiffusion3_generate
recommended_timeout: 180
recommended_gpu: A100
tool_schema:
  type: object
  properties:
    length:
      type: integer
      description: Backbone length for de novo generation
    target_pdb:
      type: string
      description: Target PDB content for binder design (not a file path)
    target_chain:
      type: string
      description: Target chain ID for binder design (e.g., "A")
    hotspots:
      type: array
      items:
        type: string
      description: List of hotspot residues (e.g., ["A45", "A67", "A89"])
    motif_pdb:
      type: string
      description: Motif PDB content for scaffolding
    motif_residues:
      type: array
      items:
        type: string
      description: List of motif residue ranges (e.g., ["10-20", "45-55"])
    num_designs:
      type: integer
      description: Number of designs to generate
      default: 10
    inference_steps:
      type: integer
      description: Number of diffusion inference steps
      default: 50
    symmetry:
      type: string
      description: Symmetry specification (e.g., "C3", "D2")
    contigs:
      type: string
      description: Contig specification for advanced constraints
---

# RFDiffusion3 All-Atom Protein Design

Generate protein structures using RFDiffusion3 from Baker Lab's Foundry package.
RFD3 is an all-atom generative model capable of designing proteins under complex constraints.

**Note**: This is the new Foundry-based RFDiffusion3, replacing the older RFDiffusion v1 
which had dependency issues. RFD3 offers cleaner installation and more features.

## Use Cases

- ✅ **De novo backbone generation**: Create novel protein structures from scratch (TESTED & WORKING)
- ✅ **Binder design**: Design proteins that bind to specific targets with hotspot constraints (TESTED & WORKING)
- ⚠️ **Motif scaffolding**: Embed functional motifs into designed scaffolds (IMPLEMENTED - needs testing)
- 🔜 **Symmetric oligomers**: Generate proteins with rotational or dihedral symmetry (API ready)
- 🔜 **Complex constraints**: Use contig specifications for advanced design requirements (API ready)

### Detailed Use Case Patterns

#### Pattern 1: De Novo Foldable Protein
**Goal**: Generate a novel, foldable protein backbone  
**Input**: Just a target length  
**Output**: Compact, foldable structure

```python
{"length": 100, "num_designs": 10}
```

**When to use**: Initial exploration, creating novel protein families

#### Pattern 2: Target-Specific Binder
**Goal**: Design a protein that binds a specific target region  
**Input**: Target PDB + target chain + binder length  
**Output**: Binder positioned near target

```python
{
  "target_pdb": "<PDB_CONTENT>",
  "target_chain": "A",
  "length": 70,
  "num_designs": 50
}
```

**When to use**: Therapeutic antibodies, biosensors, protein inhibitors

#### Pattern 3: Hotspot-Constrained Binder
**Goal**: Design binder targeting specific residues on target  
**Input**: Target PDB + hotspots + binder length  
**Output**: Binder making contacts with hotspots

```python
{
  "target_pdb": "<PDB_CONTENT>",
  "target_chain": "A",
  "hotspots": ["A45", "A50", "A67"],
  "length": 70,
  "num_designs": 50
}
```

**When to use**: Known binding sites, competitive inhibition, allosteric modulation

#### Pattern 4: Functional Motif Scaffolding
**Goal**: Display a functional motif in a stable context  
**Input**: Motif PDB + residue ranges + scaffold length  
**Output**: Stable protein presenting the motif

```python
{
  "motif_pdb": "<MOTIF_PDB>",
  "motif_residues": ["10-20", "45-50"],
  "length": 120,
  "num_designs": 30
}
```

**When to use**: Vaccine design (epitope presentation), enzyme engineering (active site transplantation)

#### Pattern 5: Symmetric Oligomer
**Goal**: Generate symmetric protein complex  
**Input**: Length + symmetry type  
**Output**: Symmetric assembly

```python
{
  "length": 80,
  "symmetry": "C3",  # 3-fold rotational
  "num_designs": 20
}
```

**When to use**: Protein cages, nanoparticles, oligomeric enzymes

**Symmetry types:**
- `C2`, `C3`, `C4`, ... : Cyclic (rotational)
- `D2`, `D3`, `D4`, ... : Dihedral (rotation + reflection)
- Custom symmetries: Advanced Rosetta notation

## Key Features

- **All-atom design**: Models all heavy atoms, not just backbone
- **GPU-accelerated**: Requires A100 GPU, ~15-20 minutes for 2-10 designs
- **Optimized for binder design**: Uses step_scale=3.0, gamma_0=0.2 for high designability
- **Handles gaps**: Automatically detects missing residues in target structures
- **GCS + DB integration**: Stores outputs and metadata automatically

## Examples

### De Novo Backbone Generation (TESTED ✅)
Generate a 50-residue de novo protein backbone:
```python
{
  "length": 50,
  "num_designs": 2,
  "inference_steps": 50
}
```

**Output**: 2 CIF structure files (~340 atoms each)
**Runtime**: ~20 minutes on A100 GPU
**Contig used internally**: Simple length specification

### Binder Design with Hotspots (TESTED ✅)
Design a 70-residue binder for 1ALU chain A targeting specific hotspots:
```python
{
  "target_pdb": "<PDB_CONTENT>",
  "target_chain": "A",
  "hotspots": ["A45", "A50"],
  "length": 70,
  "num_designs": 2,
  "inference_steps": 50
}
```

**Output**: 2 CIF structure files (~1650-1700 atoms each, includes target + binder)
**Runtime**: ~15 minutes on A100 GPU
**Contig used internally**: `"70,/0,A19-51,A61-184"` (auto-handles gaps in residue numbering)
**Settings**: Automatically uses optimized binder settings (step_scale=3.0, gamma_0=0.2, infer_ori_strategy="hotspots", is_non_loopy=True)

### Motif Scaffolding

Embed functional motifs (binding sites, active sites, epitopes) into designed scaffolds.

**Simple motif (single continuous region):**
```python
{
  "motif_pdb": "<MOTIF_PDB_CONTENT>",
  "motif_residues": ["10-20"],  # 11 residues to preserve
  "length": 150,                # Total scaffold size
  "num_designs": 25,
  "inference_steps": 50
}
```

**Discontinuous motif (two functional loops):**
```python
{
  "motif_pdb": "<MOTIF_PDB_CONTENT>",
  "motif_residues": ["10-20", "45-55"],  # Preserve 2 regions
  "length": 150,
  "num_designs": 25,
  "inference_steps": 50
}
```

**Output**: Designed proteins with motif preserved, rest of structure generated

**Typical motif types:**
- **Binding loops**: CDR-like regions for antigen binding (8-15 residues)
- **Active sites**: Enzyme catalytic residues (3-8 residues, often discontinuous)
- **Epitopes**: Surface-exposed motifs for vaccine design (6-12 residues)
- **Protein-protein interfaces**: Key interaction residues (10-20 residues)

**QC for motif scaffolding:**
- RMSD of motif < 1.5 Å (well-preserved geometry)
- pLDDT of motif > 90 (high confidence)
- pLDDT of scaffold > 85 (stable overall structure)
- No clashes between motif and scaffold

**Validation workflow:**
```
rfdiffusion3 (motif scaffolding)
    ↓
proteinmpnn (fix motif, design rest)
    ↓
alphafold (validate)
    ↓
Check motif RMSD + pLDDT
```

### Symmetric Oligomer
```python
{
  "length": 80,
  "symmetry": "C3",  # 3-fold rotational symmetry
  "num_designs": 20,
  "inference_steps": 50
}
```

## Command Line Examples

```bash
# De novo generation
modal run modal_rfdiffusion3.py --length 100 --num-designs 10

# Binder design
modal run modal_rfdiffusion3.py --target-pdb target.pdb --target-chain A \
  --hotspots A45,A67,A89 --length 70 --num-designs 50

# Symmetric oligomer
modal run modal_rfdiffusion3.py --length 80 --symmetry C3 --num-designs 20
```

## Important Implementation Notes

### Contig Format for Binder Design
RFD3 uses a specific contig format for binder design:
```
"<binder_length>,/0,<chain><residues>"
```

Example: `"70,/0,A19-51,A61-184"` means:
- Design a 70-residue binder
- `/0` = chain break between binder and target
- `A19-51,A61-184` = target residues to include (handles gaps automatically)

### Hotspot Specification
Hotspots can be specified as:
- Simple: `["A45", "A50"]` - selects all atoms in these residues
- Detailed: `["A45:CD2,CZ", "A50:CG,SD"]` - selects specific atoms (advanced)

### Automatic Gap Handling
The biomodal automatically:
- Filters to protein-only residues (excludes water, ligands)
- Detects gaps in residue numbering
- Builds correct contig strings with continuous ranges
- Example: residues 52-60 missing → contig becomes `"A19-51,A61-184"`

### Binder Design Optimization
For binder design, these settings are automatically applied:
- `step_scale=3.0` (default: 1.5) - improves designability
- `gamma_0=0.2` (default: 0.6) - lower temperature, more structured
- `infer_ori_strategy="hotspots"` - places binder near hotspots
- `is_non_loopy=True` - generates more structured designs

## QC Thresholds

After generation, validate with:
- **pLDDT** > 85 (backbone confidence from RFD3 output)
- **Structure quality**: Check for clashes, unusual geometries
- **Interface metrics** (for binders): Contact area, buried surface area
- Follow up with ProteinMPNN for sequence design
- Validate with AlphaFold2 or RF3 for structure prediction

## Troubleshooting

### Common Errors

**Issue**: `ValueError: Binder design requires --length parameter`  
**Solution**: Always provide `length` parameter for binder size

**Issue**: `Residue AXX not found in atom array`  
**Solution**: Check that hotspots reference existing residues (biomodal auto-handles gaps in target structure)

**Issue**: `Input provided but unused in composition specification`  
**Solution**: Internal error - make sure specification is passed as dict, not pre-validated object (already handled in biomodal)

**Issue**: `CUDA out of memory`  
**Solution**: 
- Use fewer `num_designs` per run
- Reduce `inference_steps` (minimum 25, default 50)
- Request larger GPU (A100-80GB instead of A100-40GB)

**Issue**: Low-quality designs (clashes, unnatural geometry)  
**Solution**:
- Increase `inference_steps` (try 75-100 for critical applications)
- For binders: default settings already optimized
- Validate with AlphaFold2 (high pLDDT indicates good designs)

### Motif Scaffolding Issues

**Issue**: Motif not preserved in output structure  
**Diagnosis**: Check RMSD between input motif and output motif region  
**Solution**:
- Ensure motif_residues ranges are correct (1-indexed, inclusive)
- Use smaller scaffolds (motif should be 10-30% of total length)
- Increase inference_steps for better optimization

**Issue**: Scaffold folds incorrectly around motif  
**Diagnosis**: pLDDT of scaffold regions < 70  
**Solution**:
- Generate more designs (50-100+) and filter by scaffold pLDDT
- Check if motif is too large relative to scaffold
- Consider using smaller or split motifs

**Issue**: Clashes between motif and scaffold  
**Diagnosis**: Rosetta or PyMOL clash detection shows overlaps  
**Solution**:
- This is normal for some outputs - filter aggressively
- Expect 30-50% success rate for challenging motifs
- Follow up with sequence design (ProteinMPNN) and validation

### Binder Design Issues

**Issue**: Binder not contacting hotspots  
**Diagnosis**: Interface analysis shows no contacts with specified residues  
**Solution**:
- Verify hotspot residues are surface-exposed
- Try different `infer_ori_strategy` settings (auto-handled for hotspots)
- Generate more designs; not all will make desired contacts

**Issue**: Binder too far from target  
**Diagnosis**: Large gap (>10 Å) between binder and target  
**Solution**:
- This is rare with hotspot constraints
- Check if target structure has missing residues/gaps
- Ensure target_chain is correctly specified

**Issue**: Weak binding predicted by AF2Rank  
**Diagnosis**: Interface pAE > 10, low interface pLDDT  
**Solution**:
- This is a scoring issue, not RFD3 issue
- RFD3 generates geometry; binding is refined with:
  - ProteinMPNN (sequence optimization)
  - AF2/ESMFold (structure validation)
  - Experimental validation (critical!)

## Integration Test

Run the full integration test:
```bash
# Test de novo generation
uv run modal run tests/integration/biomodals/test_rfdiffusion3.py --test-mode de_novo

# Test binder design
uv run modal run tests/integration/biomodals/test_rfdiffusion3.py --test-mode binder

# Full test with GCS + DB
uv run modal run tests/integration/biomodals/test_rfdiffusion3.py
```

## References

- **Foundry GitHub**: https://github.com/RosettaCommons/foundry
- **RFD3 Docs**: https://rosettacommons.github.io/foundry/models/rfd3/
- **Paper**: Krishna et al., "Generalized biomolecular modeling and design with RoseTTAFold All-Atom" (2024)
- **Binder Design Competition**: RFD3 won major binder design competition (2024)