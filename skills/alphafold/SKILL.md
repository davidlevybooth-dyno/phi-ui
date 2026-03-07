---
name: alphafold
description: Predict protein structures and validate designs using AlphaFold2
category: design-tools
tags: [structure-prediction, validation, confidence]
biomodals_script: modal_alphafold.py
biomodals_function: alphafold
recommended_timeout: 1800
recommended_gpu: A100-40GB
tool_schema:
  type: object
  properties:
    fasta_str:
      type: string
      description: FASTA file content as string with protein sequences
    num_recycles:
      type: integer
      description: Number of recycling iterations for structure prediction
      default: 3
    models:
      type: string
      description: Comma-separated list of model numbers to use (e.g., "1,2,3")
      default: "1,2,3,4,5"
    use_multimer:
      type: boolean
      description: Use AlphaFold-Multimer for complex prediction
      default: false
    num_relax:
      type: integer
      description: Number of Amber relaxation steps (0 to skip)
      default: 0
    use_templates:
      type: boolean
      description: Use PDB templates for prediction
      default: false
    use_precomputed_msas:
      type: boolean
      description: Use precomputed MSAs if available
      default: false
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
  required: [fasta_str]
---

# AlphaFold Database Tool

## Overview

Access AlphaFold Database, containing 200M+ predicted protein structures from DeepMind/EMBL-EBI. AlphaFold predictions are available for most proteins that lack experimental structures.

## Capabilities

### 1. Fetch Predicted Structure
Download AlphaFold structure prediction for any UniProt ID:
- Predicted 3D structure (PDB format)
- Per-residue confidence scores (pLDDT)
- Predicted aligned error (PAE) data
- Model version information

### 2. Confidence Assessment
Evaluate prediction quality:
- **pLDDT scores** (0-100 per residue):
  - \> 90: Very high confidence (comparable to experimental structures)
  - 70-90: Good confidence (generally reliable)
  - 50-70: Low confidence (cautious interpretation)
  - < 50: Very low confidence (likely disordered, should not be interpreted)

## API Functions

### `fetch_alphafold(uniprot_id, version=None)`

Fetches AlphaFold structure prediction.

**Parameters:**
- `uniprot_id` (str): UniProt accession (e.g., "P00533")
- `version` (int, optional): Specific AlphaFold DB version

**Returns:**
Dictionary with:
- `alphafold_id`: AlphaFold entry ID
- `model_version`: AlphaFold model version (v3, v4, etc.)
- `pdb_url`: Direct download URL
- `pae_url`: Predicted aligned error image URL
- `confidence_scores`: pLDDT statistics
  - `mean_plddt`: Average confidence across structure
  - `high_confidence_residues`: Count with pLDDT > 90
  - `low_confidence_residues`: Count with pLDDT < 50
- `gcs_uri`: GCS location of uploaded PDB
- `pdb_content`: Full PDB file for analysis

**Example:**
```python
result = await fetch_alphafold("P00533")  # EGFR
if result["success"]:
    print(f"Mean confidence: {result['confidence_scores']['mean_plddt']:.1f}")
    print(f"High confidence residues: {result['confidence_scores']['high_confidence_residues']}")
    # PDB file uploaded to GCS
    print(f"Structure: {result['gcs_uri']}")
```

### `search_alphafold(query, organism=None, limit=10)`

Search for proteins with AlphaFold predictions.

**Parameters:**
- `query` (str): Gene/protein name
- `organism` (str, optional): Organism filter
- `limit` (int): Maximum results

**Returns:**
Dictionary with list of proteins and whether predictions exist.

**Example:**
```python
results = await search_alphafold("kinase", organism="human", limit=5)
for protein in results["results"]:
    if protein["has_prediction"]:
        print(f"{protein['gene']}: AlphaFold ID {protein['alphafold_id']}")
```

## Confidence Interpretation

### pLDDT Score Guidelines

| pLDDT Range | Confidence | Interpretation |
|-------------|-----------|----------------|
| 90-100 | Very High | Backbone prediction highly accurate |
| 70-90 | Confident | Generally reliable |
| 50-70 | Low | Treat with caution |
| 0-50 | Very Low | Often disordered regions |

### Using Confidence Scores

**For Binder Design:**
```python
result = await fetch_alphafold("P00533")
scores = result["confidence_scores"]

if scores["mean_plddt"] > 70:
    print("✅ Good overall confidence - suitable for binder design")
    
    if scores["high_confidence_residues"] > 100:
        print(f"✅ {scores['high_confidence_residues']} high-confidence residues")
        print("   Can confidently target these regions")
    
    if scores["low_confidence_residues"] > 50:
        print(f"⚠️  {scores['low_confidence_residues']} low-confidence residues")
        print("   Avoid targeting these regions (likely disordered)")
else:
    print("❌ Low overall confidence - use experimental structure if available")
```

## Common Use Cases

### 1. Get Structure When No PDB Available
```python
# Check PDB first
from src.tools.uniprot_fetch import fetch_uniprot
uniprot_data = await fetch_uniprot("Q9Y6K9")
pdb_structures = uniprot_data["cross_refs"]["PDB"]

if not pdb_structures:
    # No experimental structure - use AlphaFold
    af_result = await fetch_alphafold("Q9Y6K9")
    print(f"Using AlphaFold prediction (confidence: {af_result['confidence_scores']['mean_plddt']:.1f})")
```

### 2. Identify High-Confidence Regions
```python
result = await fetch_alphafold("P00533")
pdb_content = result["pdb_content"]

# Parse PDB to find high-confidence regions
high_conf_regions = []
current_region = []

for line in pdb_content.split("\n"):
    if line.startswith("ATOM"):
        plddt = float(line[60:66].strip())
        resnum = int(line[22:26].strip())
        
        if plddt > 90:
            current_region.append(resnum)
        elif current_region:
            high_conf_regions.append((min(current_region), max(current_region)))
            current_region = []

print("High-confidence regions for targeting:")
for start, end in high_conf_regions:
    print(f"  Residues {start}-{end}")
```

### 3. Compare Multiple Predictions
```python
# Get predictions for orthologs
human_result = await fetch_alphafold("P00533")  # Human EGFR
mouse_result = await fetch_alphafold("Q01279")  # Mouse EGFR

print(f"Human EGFR confidence: {human_result['confidence_scores']['mean_plddt']:.1f}")
print(f"Mouse EGFR confidence: {mouse_result['confidence_scores']['mean_plddt']:.1f}")
```

## Integration with Other Tools

### Workflow: UniProt → AlphaFold → Structure Analysis

```python
# 1. Get protein info from UniProt
uniprot_data = await fetch_uniprot("P00533")
print(f"Protein: {uniprot_data['gene_name']}")

# 2. Check if experimental structure exists
pdb_ids = uniprot_data["cross_refs"]["PDB"]
if pdb_ids:
    print(f"Using experimental structure: {pdb_ids[0]}")
    # Use PDB structure
else:
    print("No experimental structure - using AlphaFold")
    # Use AlphaFold prediction
    af_result = await fetch_alphafold("P00533")
    
    # 3. Check confidence before proceeding
    if af_result["confidence_scores"]["mean_plddt"] > 70:
        print("✅ Prediction suitable for analysis")
        # Proceed with structure-based design
    else:
        print("⚠️ Low confidence - be cautious")
```

## Data Sources

- **AlphaFold Database**: https://alphafold.ebi.ac.uk
- **Coverage**: 200M+ proteins from UniProt, model organisms, metagenomics
- **Updates**: Regular updates as AlphaFold models improve

## Model Versions

- **v1**: Original 2021 release
- **v2**: Improved training (2021)
- **v3**: Better multimer predictions (2022)
- **v4**: Current version (2023+) - improved accuracy

Most proteins use the latest model version automatically.

## Limitations

1. **Multimeric Structures**: Single-chain predictions may not show quaternary structure
2. **Disordered Regions**: Low confidence scores indicate disorder, not poor prediction
3. **Ligands**: Predictions don't include bound ligands or cofactors
4. **Conformational Changes**: Shows one conformation, not dynamics
5. **Coverage**: Not all proteins are in the database (mainly focuses on UniProt)

## Notes for Protein Design

**When to use AlphaFold:**
- ✅ No experimental structure available
- ✅ Want to target conserved domains (usually high confidence)
- ✅ Need structure for homology modeling
- ✅ Predicting mutations/variants

**When to prefer experimental structures (PDB):**
- ✅ Complex with binding partners
- ✅ Protein-ligand interactions
- ✅ Multiple conformational states available
- ✅ Very high resolution needed (< 2Å)

**Best practice:**
1. Always check PDB first
2. If no PDB, use AlphaFold
3. Check confidence scores
4. Focus on high-confidence regions (pLDDT > 90)
5. Validate with experimental data when possible

## References

- AlphaFold Database: https://alphafold.ebi.ac.uk
- Paper: Jumper et al. (2021) Nature, DOI: 10.1038/s41586-021-03819-2
- API docs: https://alphafold.ebi.ac.uk/api-docs
