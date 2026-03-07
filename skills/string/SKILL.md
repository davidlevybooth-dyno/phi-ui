---
name: string
description: Query protein-protein interaction networks from STRING-DB
category: data-tools
tags: [database, interactions, network, ppi]
biomodals_script: null
biomodals_function: null
recommended_timeout: 10
recommended_gpu: null
tool_schema:
  type: object
  properties:
    protein_id:
      type: string
      description: Protein identifier (UniProt ID, gene name, or STRING ID)
    species:
      type: integer
      description: NCBI taxonomy ID (9606=human, 10090=mouse, 10116=rat)
      default: 9606
    required_score:
      type: integer
      description: Minimum interaction score (0-1000), 150=low, 400=medium, 700=high, 900=highest
      default: 400
    limit:
      type: integer
      description: Maximum number of interactions to return
      default: 10
  required: [protein_id]
---

# STRING-DB Protein Interaction Tool

## Overview

STRING (Search Tool for the Retrieval of Interacting Genes/Proteins) provides comprehensive protein-protein interaction data from multiple evidence sources.

## Capabilities

- Find direct interaction partners
- Get interaction confidence scores
- View evidence types (experimental, database, text mining, etc.)
- Network visualization
- Functional enrichment analysis

## API Functions

### `query_string(protein_id, species=9606, required_score=400, limit=10)`

Get protein interaction partners.

**Parameters:**
- `protein_id` (str): Protein identifier (UniProt ID or gene name)
- `species` (int): Taxonomy ID (9606=human, 10090=mouse)
- `required_score` (int): Min confidence (0-1000):
  - 150: low
  - 400: medium (default)
  - 700: high
  - 900: highest
- `limit` (int): Max interactions to return

**Returns:**
- `interactions`: List of interacting proteins with scores
- `network_stats`: Summary statistics

**Example:**
```python
result = await query_string("EGFR", species=9606, required_score=700)
for interaction in result["interactions"]:
    print(f"{interaction['preferredName_B']}: score {interaction['score']}")
```

## Use Cases for Binder Design

### 1. Find Binding Partners
```python
# What does EGFR bind to?
result = await query_string("EGFR")
partners = [i["preferredName_B"] for i in result["interactions"][:10]]
print(f"EGFR interacts with: {', '.join(partners)}")
```

### 2. Design Competitive Binders
```python
# Design binder to compete with GRB2
result = await query_string("EGFR", required_score=700)
grb2_interaction = [i for i in result["interactions"] if i["preferredName_B"] == "GRB2"]
if grb2_interaction:
    score = grb2_interaction[0]["score"]
    print(f"EGFR-GRB2 interaction score: {score}/1000")
    print("Design binder to this interface")
```

### 3. Check Evidence Types
```python
result = await query_string("TP53")
for interaction in result["interactions"][:5]:
    exp = interaction["escore"]  # Experimental
    db = interaction["dscore"]   # Database
    txt = interaction["tscore"]  # Text mining
    print(f"{interaction['preferredName_B']}: exp={exp} db={db} txt={txt}")
```

## Confidence Scores

**Combined Score (0-1000):**
- **900-1000**: Highest confidence
- **700-900**: High confidence
- **400-700**: Medium confidence
- **150-400**: Low confidence

**Evidence channels:**
- `nscore`: Gene neighborhood
- `fscore`: Gene fusion
- `pscore`: Phylogenetic co-occurrence
- `ascore`: Co-expression
- `escore`: **Experimental** (most reliable)
- `dscore`: Database annotated
- `tscore`: Text mining

## Common Organisms

- `9606`: Homo sapiens (human)
- `10090`: Mus musculus (mouse)
- `10116`: Rattus norvegicus (rat)
- `7227`: Drosophila melanogaster
- `6239`: Caenorhabditis elegans
- `559292`: Saccharomyces cerevisiae

## Notes

- STRING integrates data from 15+ sources
- Scores combine multiple evidence types
- High `escore` indicates experimental validation
- Use for binder design target selection

## References

- STRING: https://string-db.org
- Paper: Szklarczyk et al. (2023) Nucleic Acids Res
- API docs: https://string-db.org/cgi/help?subpage=api
