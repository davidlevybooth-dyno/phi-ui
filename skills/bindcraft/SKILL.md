---
name: bindcraft
description: De novo protein binder design using BindCraft pipeline
category: design
tags: [binder, design, protein-protein, de-novo]
biomodals_script: modal_bindcraft.py
biomodals_function: bindcraft
recommended_timeout: 60
recommended_gpu: A100
tool_schema:
  type: object
  properties:
    design_path:
      type: string
      description: >
        Path for design outputs within the container (e.g., "/tmp/bindcraft/designs")
    binder_name:
      type: string
      description: >
        Name for the binder design project. Used for output organization and identification.
    pdb_str:
      type: string
      description: >
        Target PDB structure as a string. The protein structure to design a binder against.
    chains:
      type: string
      description: >
        Target chain(s) in the PDB to bind to (e.g., "A" for single chain, "A,B" for multiple).
    target_hotspot_residues:
      type: string
      description: >
        Hotspot residues on the target to focus binding design on (e.g., "A10,A15,A20").
        Format: chain + residue number, comma-separated.
    lengths:
      type: array
      description: >
        Range of lengths for the designed binder (e.g., [50, 100] for binders between 50-100 residues).
        Typically specified as [min_length, max_length].
    number_of_final_designs:
      type: integer
      description: >
        Number of final binder designs to generate. Typical range: 10-100.
    design_protocol:
      type: string
      description: >
        Design protocol to use:
        - "Default": Standard 4-stage multimer design
        - "Beta-sheet": Optimized for beta-sheet binders
        - "Peptide": Optimized for peptide binders (shorter sequences)
      default: "Default"
      enum: ["Default", "Beta-sheet", "Peptide"]
    interface_protocol:
      type: string
      description: >
        Interface protocol for sequence design:
        - "AlphaFold2": Use AlphaFold2 for interface prediction
        - "MPNN": Use ProteinMPNN for sequence design
      default: "AlphaFold2"
      enum: ["AlphaFold2", "MPNN"]
    template_protocol:
      type: string
      description: >
        Template protocol:
        - "Default": Standard template usage
        - "Masked": Flexible/masked template approach
      default: "Default"
      enum: ["Default", "Masked"]
    filter_option:
      type: string
      description: >
        Filter settings to apply to designed binders:
        - "Default": Standard quality filters
        - "Peptide": Filters optimized for peptide binders
      default: "Default"
      enum: ["Default", "Peptide"]
    max_trajectories:
      type: integer
      description: >
        Maximum number of design trajectories to run. If not specified, runs until 
        number_of_final_designs is reached. Useful for controlling computation time.
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
    - design_path
    - binder_name
    - pdb_str
    - chains
    - target_hotspot_residues
    - lengths
    - number_of_final_designs
---

# BindCraft: De Novo Binder Design

## Overview

BindCraft is a comprehensive pipeline for designing protein binders against target structures. It combines AlphaFold2-based structure prediction with sequence design tools to generate novel protein binders that specifically interact with target proteins.

## Key Features

- **De novo design**: Creates entirely new protein binders from scratch
- **Hotspot-focused**: Targets specific residues for binding interactions
- **Multiple protocols**: Supports different design strategies (default, beta-sheet, peptide)
- **Flexible design**: Customizable binder lengths and design parameters
- **Quality filtering**: Built-in filters to ensure high-quality designs
- **AlphaFold2 validation**: Validates designs with structure prediction
- **A100 GPU**: Optimized for NVIDIA A100 (60-min typical runtime)
- **GCS + DB integration**: Automatic storage of outputs and metadata

## Use Cases

### 1. Therapeutic Binder Design
Design protein therapeutics that bind to disease-related targets:
- Antibody alternatives
- Protein inhibitors
- Diagnostic proteins

### 2. Biosensor Development
Create proteins that specifically recognize target molecules for detection applications.

### 3. Protein-Protein Interaction Studies
Design binders to study and modulate protein-protein interactions.

### 4. Enzyme Inhibitor Design
Generate proteins that bind to and inhibit specific enzymes.

## Parameters

### Required Parameters

**design_path** (string)
- Path for design outputs within the container
- Example: `"/tmp/bindcraft/my_design"`
- Used for organizing output files

**binder_name** (string)
- Name for the binder design project
- Example: `"anti_target_binder_v1"`
- Used in filenames and identification

**pdb_str** (string)
- Target PDB structure as a string
- The protein structure you want to design a binder against
- Can be full PDB file content or minimal coordinates

**chains** (string)
- Target chain(s) to bind to
- Examples:
  - Single chain: `"A"`
  - Multiple chains: `"A,B"`

**target_hotspot_residues** (string)
- Specific residues on target to focus binding on
- Format: chain + residue number, comma-separated
- Example: `"A10,A15,A20,A25"`
- Guides the design to interact with these specific sites

**lengths** (list[int])
- Range of binder lengths to explore
- Format: `[min_length, max_length]`
- Examples:
  - Small peptide: `[15, 30]`
  - Standard protein: `[50, 150]`
  - Large binder: `[100, 200]`

**number_of_final_designs** (integer)
- How many final binder designs to generate
- Typical ranges:
  - Quick exploration: `10-20`
  - Standard campaign: `50-100`
  - Extensive search: `100-500`

### Optional Parameters

**design_protocol** (string, default: "Default")
- Design strategy to use:
  - `"Default"`: Standard 4-stage multimer design (most versatile)
  - `"Beta-sheet"`: Optimized for beta-sheet binders (more stable)
  - `"Peptide"`: Optimized for short peptide binders (faster)

**interface_protocol** (string, default: "AlphaFold2")
- Method for interface prediction:
  - `"AlphaFold2"`: Use AlphaFold2 (slower, more accurate)
  - `"MPNN"`: Use ProteinMPNN (faster, good for sequence design)

**template_protocol** (string, default: "Default")
- Template usage strategy:
  - `"Default"`: Standard template usage
  - `"Masked"`: Flexible/masked approach (more creative designs)

**filter_option** (string, default: "Default")
- Quality filtering strategy:
  - `"Default"`: Standard filters for protein binders
  - `"Peptide"`: Optimized filters for peptide binders

**max_trajectories** (integer, optional)
- Limit on number of design attempts
- If not set, runs until `number_of_final_designs` is reached
- Useful for controlling runtime and costs

## Examples

### Example 1: Standard Binder Design

```python
{
  "design_path": "/tmp/bindcraft/target_binder",
  "binder_name": "anti_target_v1",
  "pdb_str": "<PDB_CONTENT>",
  "chains": "A",
  "target_hotspot_residues": "A50,A55,A60,A65",
  "lengths": [60, 120],
  "number_of_final_designs": 50,
  "design_protocol": "Default",
  "interface_protocol": "AlphaFold2"
}
```

**Use case**: General-purpose binder design against a single-chain target  
**Runtime**: ~60 minutes for 50 designs  
**Output**: 50 PDB structures with binding predictions

### Example 2: Peptide Binder Design (Fast)

```python
{
  "design_path": "/tmp/bindcraft/peptide_binder",
  "binder_name": "peptide_inhibitor_v1",
  "pdb_str": "<PDB_CONTENT>",
  "chains": "A",
  "target_hotspot_residues": "A100,A105,A110",
  "lengths": [15, 30],
  "number_of_final_designs": 20,
  "design_protocol": "Peptide",
  "filter_option": "Peptide",
  "max_trajectories": 100
}
```

**Use case**: Fast peptide inhibitor design  
**Runtime**: ~20-30 minutes  
**Output**: 20 short peptide designs

### Example 3: Beta-Sheet Binder (High Stability)

```python
{
  "design_path": "/tmp/bindcraft/stable_binder",
  "binder_name": "betasheet_binder_v1",
  "pdb_str": "<PDB_CONTENT>",
  "chains": "A,B",
  "target_hotspot_residues": "A45,A50,B30,B35",
  "lengths": [80, 150],
  "number_of_final_designs": 30,
  "design_protocol": "Beta-sheet",
  "interface_protocol": "AlphaFold2",
  "template_protocol": "Masked"
}
```

**Use case**: Stable binder for multi-chain target  
**Runtime**: ~45-60 minutes  
**Output**: 30 beta-sheet-rich binder designs

### Example 4: Extensive Search Campaign

```python
{
  "design_path": "/tmp/bindcraft/extensive_search",
  "binder_name": "therapeutic_candidate_search",
  "pdb_str": "<PDB_CONTENT>",
  "chains": "A",
  "target_hotspot_residues": "A75,A80,A85,A90,A95",
  "lengths": [70, 140],
  "number_of_final_designs": 100,
  "design_protocol": "Default",
  "interface_protocol": "AlphaFold2",
  "max_trajectories": 500
}
```

**Use case**: Therapeutic development with large design space  
**Runtime**: ~2-3 hours  
**Output**: 100 diverse binder candidates

## Output Format

BindCraft generates multiple files for each design:

### Primary Outputs
- **PDB files**: 3D structures of designed binders
- **FASTA files**: Sequences of designed binders
- **CSV files**: Design metrics and scores
- **JSON files**: Detailed design parameters and results

### Quality Metrics
- **pLDDT scores**: Confidence in predicted structure
- **Interface scores**: Binding interface quality
- **Clash scores**: Structural clash assessment
- **RMSD values**: Structural deviation metrics
- **Secondary structure**: Helix/sheet/coil composition

### Typical Directory Structure
```
design_path/
├── binder_name_design_001.pdb
├── binder_name_design_001.fasta
├── binder_name_design_002.pdb
├── ...
├── design_summary.csv
├── filtered_designs.csv
└── design_parameters.json
```

## Quality Interpretation

### Excellent Designs
- pLDDT > 85
- Interface score < 0.0 (negative is better)
- Clash score < 5
- Target RMSD < 2.0 Å

### Good Designs
- pLDDT > 75
- Interface score < 2.0
- Clash score < 10
- Target RMSD < 3.0 Å

### Review Needed
- pLDDT < 75
- Interface score > 2.0
- Clash score > 10
- Target RMSD > 3.0 Å

## Comparison to Other Tools

### vs. AlphaFold2 Alone
- **BindCraft**: Complete design pipeline, generates new binders
- **AlphaFold2**: Structure prediction only, no sequence design

### vs. ProteinMPNN Alone
- **BindCraft**: End-to-end pipeline with validation
- **ProteinMPNN**: Sequence design only, no structure optimization

### vs. RFDiffusion
- **BindCraft**: Focused on binder design, validated with AF2
- **RFDiffusion**: General structure design, different approach

### vs. Manual Design
- **BindCraft**: Automated, explores large design space
- **Manual**: More control, but limited throughput

## Limitations

1. **Computational Cost**: Requires A100 GPU, 60+ minute runtime
2. **Target Size**: Works best with targets < 500 residues
3. **Validation Required**: All designs need experimental validation
4. **Hotspot Dependency**: Quality depends on good hotspot selection
5. **Novel Folds**: May generate folds not seen in nature (require validation)
6. **No Ligands**: Currently focused on protein-protein interactions

## Best Practices

### 1. Hotspot Selection
- Choose residues known to be functionally important
- Use experimental data (mutagenesis, structural studies) if available
- Spread hotspots across binding surface (3-5 residues typical)

### 2. Length Selection
- Start with established size ranges for your target type
- Small targets (< 100 residues): 40-80 residue binders
- Large targets (> 200 residues): 80-150 residue binders
- Peptides: 15-30 residues for fast results

### 3. Protocol Selection
- Use "Default" for first attempts (most versatile)
- Use "Beta-sheet" for stability-critical applications
- Use "Peptide" for quick exploration or small molecules

### 4. Iteration Strategy
- Start with small campaigns (20-30 designs)
- Analyze top designs
- Adjust parameters based on results
- Run larger campaigns for validated parameters

### 5. Quality Control
- Always review pLDDT scores
- Check interface metrics carefully
- Validate structural quality before experimental testing
- Consider clustering designs for diversity

## Integration Tests

```bash
# Test BindCraft with minimal parameters
uv run modal run tests/integration/biomodals/test_bindcraft.py --disable-gcs --disable-db

# Test with GCS upload
uv run modal run tests/integration/biomodals/test_bindcraft.py --disable-db

# Full integration test (requires local PostgreSQL)
uv run modal run tests/integration/biomodals/test_bindcraft.py
```

## Performance Metrics

- **GPU**: NVIDIA A100 (40GB)
- **Typical runtime**: 45-90 minutes
- **Cost per run**: ~$2-5 (Modal pricing)
- **Designs per run**: 10-100 typical
- **Success rate**: 20-50% pass quality filters

## Workflow Patterns

### Common Workflows

1. **Target Analysis** → **Hotspot ID** → **BindCraft Design** → **Filter** → **AlphaFold Validation**
2. **BindCraft Design** → **Cluster** → **Select Diverse** → **Experimental Testing**
3. **Initial Design** → **Analyze Top Hits** → **Refined Design** → **Production**

### Typical Pipeline
```
1. Identify target structure (PDB)
2. Select binding hotspots
3. Run BindCraft (50-100 designs)
4. Filter by quality metrics
5. Validate top 10-20 with AlphaFold
6. Experimental validation of top 3-5
```

## Command-Line Examples

```bash
# Quick peptide binder design
uv run modal run modal/biomodals/modal_bindcraft.py \
  --design-path /tmp/test \
  --binder-name quick_test \
  --pdb-str "$(cat target.pdb)" \
  --chains A \
  --target-hotspot-residues "A50,A55,A60" \
  --lengths [20,40] \
  --number-of-final-designs 10 \
  --design-protocol Peptide

# Standard binder campaign
uv run modal run modal/biomodals/modal_bindcraft.py \
  --design-path /tmp/campaign \
  --binder-name anti_target_v1 \
  --pdb-str "$(cat target.pdb)" \
  --chains A,B \
  --target-hotspot-residues "A45,A50,B30,B35" \
  --lengths [60,120] \
  --number-of-final-designs 50
```

## Citation

If you use BindCraft in your research, please cite:
- BindCraft paper/repository
- AlphaFold2 (Jumper et al., 2021)
- ProteinMPNN (Dauparas et al., 2022) if using MPNN protocol

## See Also

- **ProteinMPNN**: Sequence design for existing structures
- **AlphaFold**: Structure validation
- **RFDiffusion**: Alternative de novo design approach
- **AF2Rank**: Binding affinity prediction
