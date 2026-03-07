---
name: uniprot
description: Retrieve protein information from UniProt database including sequences, domains, and functional annotations
category: data-tools
tags: [database, protein, sequence, annotation]
biomodals_script: null
biomodals_function: null
recommended_timeout: 10
recommended_gpu: null
tool_schema:
  type: object
  properties:
    protein_id:
      type: string
      description: UniProt accession (e.g., "P00533") or entry name (e.g., "EGFR_HUMAN")
    fields:
      type: array
      description: Specific fields to retrieve (sequence, function, domains, go, interaction, variant)
      items:
        type: string
  required: [protein_id]
---

# UniProt Protein Database Tool

## Overview

This tool provides access to the UniProt Knowledgebase (UniProtKB), the world's leading resource for protein sequence and functional information.

## Capabilities

### 1. Fetch Protein Information
Retrieve comprehensive protein data by UniProt ID or entry name:
- Protein sequence (amino acids)
- Functional annotations
- Domain architecture
- Binding sites and active sites
- Post-translational modifications
- Gene Ontology terms
- Known protein interactions
- Disease-associated variants
- Cross-references to other databases (PDB, AlphaFold, STRING, etc.)

### 2. Search UniProt Database
Search for proteins by:
- Gene name (e.g., "EGFR", "TP53")
- Protein name (e.g., "lysozyme")
- Keywords (e.g., "kinase", "receptor")
- Organism filter (e.g., "human", "mouse")

## API Functions

### `fetch_uniprot(protein_id, fields=None)`

Fetches detailed protein information.

**Parameters:**
- `protein_id` (str): UniProt accession (e.g., "P00533") or entry name (e.g., "EGFR_HUMAN")
- `fields` (list, optional): Specific fields to retrieve. Options:
  - `"sequence"`: Amino acid sequence and length
  - `"function"`: Protein function and subcellular location
  - `"domains"`: Domain boundaries, binding sites, active sites
  - `"go"`: Gene Ontology terms
  - `"interaction"`: Known protein-protein interactions
  - `"variant"`: Disease-associated variants

**Returns:**
Dictionary with protein data including:
- Basic info: accession, gene name, organism
- Sequence: amino acid sequence, length, molecular weight
- Function: description, subcellular location
- Structural features: domains, binding sites, active sites
- Annotations: GO terms, pathways
- Interactions: binding partners
- Variants: mutations and clinical significance
- Cross-references: PDB IDs, AlphaFold IDs, etc.

**Example:**
```python
result = await fetch_uniprot("P00533")  # EGFR
print(result["gene_name"])  # "EGFR"
print(result["sequence"][:50])  # First 50 amino acids
print(result["domains"])  # List of domains with positions
```

### `search_uniprot(query, organism=None, limit=10)`

Searches UniProt database.

**Parameters:**
- `query` (str): Search term (gene name, protein name, keyword)
- `organism` (str, optional): Organism filter ("human", "mouse", "rat", etc.)
- `limit` (int): Maximum results to return (default: 10)

**Returns:**
Dictionary with:
- `results`: List of matching proteins
- `count`: Number of results

**Example:**
```python
results = await search_uniprot("kinase", organism="human", limit=5)
for protein in results["results"]:
    print(f"{protein['gene']}: {protein['protein_name']}")
```

## Common Use Cases

### 1. Get Protein Sequence
```python
data = await fetch_uniprot("P00533", fields=["sequence"])
sequence = data["sequence"]
length = data["length"]
```

### 2. Find Binding Sites
```python
data = await fetch_uniprot("P00533", fields=["domains"])
for site in data["binding_sites"]:
    print(f"Binding site at position {site['position']}: {site['description']}")
```

### 3. Check for Known Variants
```python
data = await fetch_uniprot("P00533", fields=["variant"])
for variant in data["variants"]:
    if variant["clinical_significance"] == "pathogenic":
        print(f"{variant['original']}{variant['position']}{variant['alternative']}: {variant['description']}")
```

### 4. Get Cross-References
```python
data = await fetch_uniprot("P00533")
pdb_ids = data["cross_refs"]["PDB"]  # List of PDB structure IDs
alphafold_id = data["cross_refs"]["AlphaFoldDB"][0]  # AlphaFold prediction ID
```

### 5. Search for Proteins
```python
results = await search_uniprot("epidermal growth factor receptor", organism="human")
if results["success"]:
    egfr = results["results"][0]
    print(f"Found: {egfr['accession']} - {egfr['gene']}")
```

## Data Sources

UniProt integrates data from:
- Swiss-Prot (manually curated entries)
- TrEMBL (automatically annotated entries)
- Over 150 biological databases

## Rate Limits

UniProt REST API is free and does not require authentication. Please be respectful:
- Maximum ~1 request per second
- Batch requests when possible
- Cache results to avoid repeated queries

## Notes for Protein Design

When designing binders or engineering proteins:
1. **Start with UniProt** - Get the full sequence and annotations
2. **Check domains** - Identify stable, well-folded regions to target
3. **Find binding sites** - Natural binding sites are good starting points
4. **Review variants** - Known pathogenic variants show critical residues
5. **Get structure IDs** - Use PDB/AlphaFold cross-refs for structure analysis
6. **Check interactions** - STRING/IntAct IDs show natural binding partners

## Error Handling

Common errors:
- `404 Not Found`: Invalid UniProt ID
- `Timeout`: UniProt API is slow, increase timeout
- `Empty results`: Try searching instead of direct fetch

## References

- UniProt website: https://www.uniprot.org
- REST API docs: https://www.uniprot.org/help/api
- Programmatic access: https://www.uniprot.org/help/programmatic_access
