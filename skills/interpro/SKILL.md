---
name: interpro
description: Identify protein domains and functional sites using InterPro database
category: data-tools
tags: [database, domains, pfam, functional-sites]
biomodals_script: null
biomodals_function: null
recommended_timeout: 10
recommended_gpu: null
tool_schema:
  type: object
  properties:
    protein_id:
      type: string
      description: UniProt accession (e.g., "P00533") - retrieves pre-computed results
    sequence:
      type: string
      description: Amino acid sequence - requires live scanning (slower)
  required: []
---

# InterPro Domain Scanning Tool

## Overview

InterPro integrates data from 13 member databases (Pfam, SMART, PROSITE, etc.) to provide comprehensive protein domain and functional site annotations.

## Capabilities

- Identify protein domains and their boundaries
- Find conserved functional sites (active sites, binding sites)
- Detect protein families and superfamilies
- Discover repeats and low-complexity regions
- Get associated Gene Ontology terms
- Link to biological pathways

## API Functions

### `scan_interpro(protein_id=None, sequence=None)`

Scan a protein for domains and sites.

**Parameters:**
- `protein_id` (str): UniProt accession - retrieves cached results (FAST)
- `sequence` (str): Amino acid sequence - live scanning (SLOW, not yet implemented)

**Returns:**
- `entries`: All InterPro entries
- `domains`: Domain annotations with positions
- `families`: Protein family classifications
- `sites`: Functional sites (active, binding, conserved)
- `repeats`: Repeat regions
- `go_terms`: Associated GO terms
- `pathways`: Biological pathways

**Example:**
```python
result = await scan_interpro(protein_id="P00533")  # EGFR
for domain in result["domains"]:
    print(f"{domain['name']}: {domain['locations']}")
```

### `get_interpro_entry(entry_id)`

Get detailed information about a specific InterPro entry.

**Example:**
```python
entry = await get_interpro_entry("IPR000719")  # Protein kinase domain
print(entry["description"])
```

## Common Use Cases

### 1. Identify Targetable Domains
```python
result = await scan_interpro(protein_id="P00533")

print("Domains for binder design:")
for domain in result["domains"]:
    for loc in domain["locations"]:
        print(f"  {domain['name']}: residues {loc['start']}-{loc['end']}")
```

### 2. Find Functional Sites
```python
result = await scan_interpro(protein_id="P00533")

if result["sites"]:
    print("Functional sites to avoid or target:")
    for site in result["sites"]:
        print(f"  {site['type']}: {site['name']}")
```

### 3. Check Domain Architecture
```python
from src.tools.uniprot_fetch import fetch_uniprot
from src.tools.interpro_scan import scan_interpro

# Get protein length
uniprot_data = await fetch_uniprot("P00533")
length = uniprot_data["length"]

# Get domains
interpro_data = await scan_interpro(protein_id="P00533")

# Visualize domain architecture
print(f"Protein length: {length} aa")
for domain in interpro_data["domains"]:
    for loc in domain["locations"]:
        coverage = (loc["end"] - loc["start"]) / length * 100
        print(f"  {domain['short_name']}: {loc['start']}-{loc['end']} ({coverage:.1f}% coverage)")
```

## Member Databases

InterPro integrates:
- **Pfam**: Protein families
- **SMART**: Domain architecture
- **PROSITE**: Functional sites and patterns
- **PRINTS**: Protein fingerprints
- **ProDom**: Protein domain families
- **PANTHER**: Protein families and subfamilies
- **PIRSF**: Protein families
- **SUPERFAMILY**: Structural assignments
- **TIGRFAMs**: Protein families
- **Gene3D**: Protein family annotations
- **HAMAP**: Microbial protein families
- **CDD**: Conserved domains
- **SFLD**: Structure-function linkage

## Notes for Protein Design

**Domain boundaries are critical:**
- ✅ Target stable, well-folded domains
- ❌ Avoid domain linkers (flexible, disordered)
- ✅ Consider domain interfaces for binding
- ❌ Avoid disrupting functional sites

**Use domains to:**
1. Identify structured regions for binder design
2. Find conserved motifs (likely functional)
3. Understand domain-domain interactions
4. Check if your target region is a known domain

## References

- InterPro: https://www.ebi.ac.uk/interpro/
- API docs: https://www.ebi.ac.uk/interpro/api/
