---
name: boltzgen
description: Generative design of proteins and peptides using BoltzGen diffusion model
category: design
tags: [generative, design, diffusion, protein, peptide]
biomodals_script: modal_boltzgen.py
biomodals_function: boltzgen_run
recommended_timeout: 120
recommended_gpu: L40S
tool_schema:
  type: object
  properties:
    yaml_gcs_uri:
      type: string
      description: "GCS URI to YAML design specification (e.g., gs://bucket/path/design.yaml). Preferred over yaml_str for production use."
    structure_file_gcs_uri:
      type: string
      description: "GCS URI for structure file referenced in YAML. File is downloaded with its original basename. Example: gs://bucket/structures/1abc.pdb. YAML must reference file by this basename (e.g., path: 1abc.pdb)"
    yaml_str:
      type: string
      description: "YAML design specification as string (DEPRECATED - use yaml_gcs_uri instead). Avoid for production, newlines/escaping can cause issues in API calls."
    yaml_name:
      type: string
      description: "Name of the YAML file (DEPRECATED - only needed with yaml_str)"
    additional_files:
      type: object
      description: "Dictionary of relative_path to file_content (DEPRECATED - use GCS URIs)"
      default: {}
    protocol:
      type: string
      description: "Design protocol"
      default: "protein-anything"
      enum: ["protein-anything", "peptide-anything", "protein-small_molecule", "nanobody-anything"]
    num_designs:
      type: integer
      description: "Number of designs to generate"
      default: 10
    steps:
      type: string
      description: "Specific pipeline steps to run (e.g., design inverse_folding)"
    cache:
      type: string
      description: "Custom cache directory path"
    devices:
      type: integer
      description: "Number of GPUs to use"
    extra_args:
      type: string
      description: "Additional CLI arguments as string"
    upload_to_gcs:
      type: boolean
      description: "Upload results to Google Cloud Storage"
      default: true
    gcs_bucket:
      type: string
      description: "GCS bucket name for uploads"
    run_id:
      type: string
      description: "Unique identifier for this run"
  required: []
---

# BoltzGen: Generative Protein Design

## Overview

BoltzGen is a diffusion-based generative model for designing proteins, peptides, and protein-ligand complexes. It uses a YAML specification to define design constraints and generates novel structures that satisfy those constraints.

## Key Features

- **Generative design**: Creates entirely new protein structures from scratch
- **Flexible constraints**: Specify sequence lengths, fixed structures, or partial designs
- **Multiple protocols**: Protein, peptide, nanobody, protein-small molecule designs
- **Diffusion model**: State-of-the-art generative approach
- **Fast generation**: ~2-5 minutes per design on L40S GPU
- **GCS + DB integration**: Automatic storage of outputs

## Input Requirements

**✅ RECOMMENDED: GCS URI Method**

Upload your YAML file and target structure file to GCS:

```bash
# Upload YAML design
gsutil cp design.yaml gs://dev-services/boltzgen-inputs/

# Upload target structure (can be anywhere in GCS)
gsutil cp 1abc.pdb gs://dev-services/structures/

# Submit job with GCS URIs
{
  "job_type": "boltzgen",
  "params": {
    "yaml_gcs_uri": "gs://dev-services/boltzgen-inputs/design.yaml",
    "structure_file_gcs_uri": "gs://dev-services/structures/1abc.pdb"
  }
}
```

**How it works:**
1. YAML references file by its basename (e.g., `path: 1abc.pdb`)
2. `structure_file_gcs_uri` specifies GCS location of that file
3. File is downloaded with its original basename to same directory as YAML
4. BoltzGen runs with all files in the same directory

**Important:** YAML must reference file by its GCS basename, not an arbitrary name.

**Key benefits:**
- ✅ No JSON escaping issues with newlines
- ✅ Simple single URI, no complex mapping
- ✅ Handles large files efficiently
- ✅ Consistent with other models (ProteinMPNN, etc.)

**⚠️ DEPRECATED: String Method**

Passing raw YAML strings is supported for backward compatibility but not recommended:

```json
{
  "yaml_str": "target:\n  - protein:\n      id: [A]\n      length: 50",
  "yaml_name": "design.yaml"
}
```

Issues: newline escaping, size limits, error-prone.

## Use Cases

### 1. De Novo Protein Design
Generate novel proteins with specified length ranges.

### 2. Scaffold Design
Design proteins around existing structural motifs or binding sites.

### 3. Peptide Binders
Generate peptides that complement a target structure.

### 4. Protein-Small Molecule Complexes
Design proteins that interact with small molecules.

### 5. Nanobody Design
Generate novel nanobody structures.

## Parameters

### Required Parameters

**yaml_str** (string)
- YAML specification defining the design
- Specifies entities (proteins, files) and constraints
- See examples below for format

**yaml_name** (string)
- Name for the YAML file (e.g., "my_design.yaml")
- Used for file organization

### Optional Parameters

**additional_files** (dict, default: {})
- Dictionary of {path: bytes_content} for files referenced in YAML
- Example: {"template.cif": cif_file_content}
- Used when YAML references external structure files

**protocol** (string, default: "protein-anything")
- Design protocol to use:
  - `"protein-anything"`: General protein design
  - `"peptide-anything"`: Peptide design
  - `"protein-small_molecule"`: Protein with small molecule
  - `"nanobody-anything"`: Nanobody design

**num_designs** (integer, default: 10)
- Number of designs to generate
- Typical range: 10-100

**steps** (string, optional)
- Specific pipeline steps: "design", "inverse_folding", "folding"
- Example: "design inverse_folding" (skip folding validation)
- If not specified, runs full pipeline

**devices** (integer, optional)
- Number of GPUs to use (for multi-GPU setups)

## Examples

### Example 1: Simple Protein Design (GCS URI)

**Step 1: Create and upload YAML**

```yaml
# design.yaml
entities:
  - protein:
      id: A
      sequence: 80..140
```

```bash
gsutil cp design.yaml gs://dev-services/boltzgen-inputs/design.yaml
```

**Step 2: Submit job**

```json
{
  "job_type": "boltzgen",
  "params": {
    "yaml_gcs_uri": "gs://dev-services/boltzgen-inputs/design.yaml",
    "protocol": "protein-anything",
    "num_designs": 10
  }
}
```

**What this does**:
- Generates 10 protein designs
- Length between 80-140 residues (inclusive)
- Chain ID "A"

### Example 2: Binder Design with Target Structure (GCS URI)

**Step 1: Create YAML and upload files**

```yaml
# binder_design.yaml
entities:
  # Designed binder protein
  - protein:
      id: B
      sequence: 80..140
  # Target structure from file
  - file:
      path: target.cif
      include:
        - chain:
            id: A
```

```bash
# Upload YAML
gsutil cp binder_design.yaml gs://dev-services/boltzgen-inputs/

# Upload target structure (can be anywhere in GCS)
gsutil cp target.cif gs://dev-services/structures/targets/1abc.cif
```

**Step 2: Submit job**

```json
{
  "job_type": "boltzgen",
  "params": {
    "yaml_gcs_uri": "gs://dev-services/boltzgen-inputs/binder_design.yaml",
    "structure_file_gcs_uri": "gs://dev-services/structures/targets/1abc.cif",
    "protocol": "protein-anything",
    "num_designs": 20
  }
}
```

**What this does**:
- Downloads `binder_design.yaml`
- Downloads `1abc.cif` from GCS (keeps basename)
- Both files are in the same directory (required by BoltzGen)
- Generates 20 binder designs (80-140 residues, chain B)
- Designs bind to chain A of the target structure

**Note:** YAML must reference the file as `path: 1abc.cif` (the basename)

### Example 3: Legacy String Method (Deprecated)

```json
{
  "yaml_str": "entities:\n  - protein:\n      id: A\n      sequence: 50",
  "yaml_name": "design.yaml",
  "protocol": "protein-anything",
  "num_designs": 5
}
```

⚠️ **Not recommended** - use GCS URI method instead for:
      path: target.cif
      include:
        - chain:
            id: A
""",
  "yaml_name": "peptide_binder.yaml",
  "additional_files": {
    "target.cif": target_cif_bytes
  },
  "protocol": "peptide-anything",
  "num_designs": 20
}
```

**What this does**:
- Designs 20 peptides (15-30 residues)
- Designed to interact with chain A from target.cif
- Uses peptide-specific protocol

### Example 3: Constrained Protein Design

```python
{
  "yaml_str": """
entities:
  - protein:
      id: A
      sequence: MKKL..50..AAAA
""",
  "yaml_name": "constrained.yaml",
  "protocol": "protein-anything",
  "num_designs": 10
}
```

**What this does**:
- Fixed N-terminus: MKKL
- Variable middle: ~50 residues
- Fixed C-terminus: AAAA
- Generates 10 designs satisfying these constraints

### Example 4: Partial Pipeline

```python
{
  "yaml_str": """
entities:
  - protein:
      id: A
      sequence: 100..150
""",
  "yaml_name": "quick_design.yaml",
  "protocol": "protein-anything",
  "num_designs": 50,
  "steps": "design inverse_folding"
}
```

**What this does**:
- Runs only design + inverse folding steps
- Skips final folding validation (faster)
- Good for generating many candidates quickly

## YAML Specification Format

### Basic Structure
```yaml
entities:
  - protein:
      id: <chain_id>
      sequence: <sequence_specification>
  - file:
      path: <file_path>
      include:
        - chain:
            id: <chain_id>
```

### Sequence Specifications
- **Fixed length range**: `80..140` (between 80-140 residues)
- **Fixed sequence**: `MKKLLVLG` (exact sequence)
- **Mixed**: `MKKL..50..AAAA` (fixed ends, variable middle)

### File References
```yaml
- file:
    path: template.cif
    include:
      - chain:
          id: A
      - chain:
          id: B
```

## Output Format

BoltzGen generates multiple files per design:

### Primary Outputs
- **CIF files**: 3D structures of designed proteins
- **FASTA files**: Sequences of designed proteins
- **Scores CSV**: Quality metrics for each design
- **Metadata JSON**: Design parameters and settings

### Quality Metrics
- **pLDDT**: Confidence scores for designed structures
- **pTM**: Template modeling scores
- **Clash scores**: Structural quality assessment

## Protocol Selection Guide

### protein-anything (Default)
- General-purpose protein design
- Good for: Novel folds, scaffolds, domain design
- Runtime: ~2-3 min/design

### peptide-anything
- Optimized for short peptides (10-50 residues)
- Good for: Binders, cyclic peptides, epitopes
- Runtime: ~1-2 min/design
- Faster than protein protocol

### protein-small_molecule
- Design proteins around small molecules
- Good for: Enzyme design, ligand binding sites
- Requires: Small molecule definition in YAML

### nanobody-anything
- Specialized for nanobody structures
- Good for: Therapeutic nanobodies, VHH domains
- Enforces nanobody-specific constraints

## Best Practices

### 1. Start Simple
Begin with unconstrained designs to explore the design space:
```yaml
entities:
  - protein:
      id: A
      sequence: 80..120
```

### 2. Use Appropriate Protocols
- Peptides: Use `peptide-anything` (faster, better results)
- Proteins: Use `protein-anything`
- Specific cases: Use specialized protocols

### 3. Generate Multiple Designs
- Aim for 20-50 designs minimum
- Filter by quality metrics afterward
- Diversity increases success rate

### 4. Validate Designs
- Always check pLDDT scores (>70 is good)
- Validate with AlphaFold or ESMFold
- Test top candidates experimentally

### 5. Iterate
- Start with 10 designs to test parameters
- Refine constraints based on results
- Scale up to 50-100 for production

## Limitations

1. **Sequence length**: Works best for 50-300 residue proteins
2. **Complexity**: Very complex constraints may fail
3. **Validation**: Computational predictions need experimental validation
4. **Runtime**: Scales linearly with num_designs
5. **No explicit function**: Designs structures, not functions

## Comparison to Other Tools

### vs. BindCraft
- **BoltzGen**: Generates entirely new structures from scratch
- **BindCraft**: Designs binders for existing targets
- Use BoltzGen for de novo design, BindCraft for targeting

### vs. RFDiffusion
- **BoltzGen**: More flexible YAML-based constraints
- **RFDiffusion**: More mature, well-tested
- Similar capabilities, different interfaces

### vs. ProteinMPNN
- **BoltzGen**: Generates structure + sequence
- **ProteinMPNN**: Designs sequence for existing structure
- BoltzGen is generative, MPNN is sequence optimization

## Performance

- **GPU**: L40S or A100 recommended
- **Runtime**: ~2-5 minutes per design
- **Cost**: ~$0.10-0.20 per design (Modal pricing)
- **Memory**: ~16GB GPU RAM per design

## Example Workflow

```
1. Define constraints in YAML
2. Run BoltzGen (10-50 designs)
3. Filter by pLDDT scores (>70)
4. Validate top 10 with AlphaFold
5. Experimental testing of top 3-5
```

## See Also

- **BindCraft**: Targeted binder design
- **RFDiffusion**: Alternative diffusion model
- **ProteinMPNN**: Sequence design for structures
- **AlphaFold**: Structure validation
