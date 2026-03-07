---
name: ensembl
description: Look up genes, transcripts, and orthologs from Ensembl genomic database
category: data-tools
tags: [database, genomics, isoforms, orthologs]
biomodals_script: null
biomodals_function: null
recommended_timeout: 10
recommended_gpu: null
tool_schema:
  type: object
  properties:
    gene_name:
      type: string
      description: Gene symbol (e.g., "EGFR") or Ensembl ID (e.g., "ENSG00000146648")
    species:
      type: string
      description: Species name ("human", "mouse", "rat") or scientific name
      default: "human"
    expand:
      type: boolean
      description: Include transcript isoforms
      default: true
  required: [gene_name]
---

# Ensembl Genomic Database Tool

## Overview

Ensembl provides comprehensive genomic annotations including gene models, transcript isoforms, and orthology relationships across species.

## Capabilities

- Look up genes by symbol or ID
- Get all transcript isoforms
- Find orthologous genes across species
- Retrieve genomic coordinates
- Get DNA/RNA/protein sequences

## API Functions

### `lookup_ensembl(gene_name, species="human", expand=True)`

Look up gene and get transcript isoforms.

**Parameters:**
- `gene_name` (str): Gene symbol or Ensembl ID
- `species` (str): "human", "mouse", "rat", etc.
- `expand` (bool): Include transcript details

**Returns:**
- Gene ID, name, description
- Genomic location (chr, start, end, strand)
- Transcript isoforms with protein IDs
- Canonical transcript

**Example:**
```python
result = await lookup_ensembl("EGFR", species="human", expand=True)
print(f"Gene: {result['gene_id']}")
print(f"Transcripts: {result['num_transcripts']}")
for transcript in result["transcripts"]:
    canonical = "✅" if transcript["is_canonical"] else ""
    print(f"  {transcript['id']}: {transcript['protein_length']} aa {canonical}")
```

### `get_orthologs(gene_id, target_species=None)`

Get orthologous genes in other species.

**Parameters:**
- `gene_id` (str): Ensembl gene ID
- `target_species` (str, optional): Filter by species

**Returns:**
- List of orthologs with gene IDs, names, % identity

**Example:**
```python
# Get mouse ortholog of human EGFR
result = await get_orthologs("ENSG00000146648", target_species="mouse")
for ortholog in result["orthologs"]:
    print(f"{ortholog['species']}: {ortholog['gene_name']} ({ortholog['perc_identity']:.1f}% identity)")
```

## Use Cases for Protein Design

### 1. Handle Multiple Isoforms
```python
# Design binder that works on all isoforms
result = await lookup_ensembl("EGFR")
print(f"Found {result['num_transcripts']} isoforms")

# Check which domains are present in all isoforms
for transcript in result["transcripts"]:
    print(f"{transcript['id']}: {transcript['protein_length']} aa")
```

### 2. Cross-Species Design
```python
# Design binder that works in mouse model
human_gene = await lookup_ensembl("EGFR", species="human")
human_id = human_gene["gene_id"]

# Get mouse ortholog
orthologs = await get_orthologs(human_id, target_species="mouse")
mouse_ortholog = orthologs["orthologs"][0]
print(f"Mouse ortholog: {mouse_ortholog['gene_name']} ({mouse_ortholog['perc_identity']}% identity)")

# Get mouse sequence
mouse_gene = await lookup_ensembl(mouse_ortholog["gene_name"], species="mouse")
```

### 3. Select Target Isoform
```python
result = await lookup_ensembl("TP53")

# Find canonical isoform
canonical = result.get("canonical_transcript")
if canonical:
    print(f"Canonical: {canonical['id']} ({canonical['protein_length']} aa)")
    
# Or target specific isoform
for transcript in result["transcripts"]:
    if transcript["biotype"] == "protein_coding":
        print(f"Protein-coding: {transcript['id']}")
```

## References

- Ensembl: https://www.ensembl.org
- REST API: https://rest.ensembl.org
