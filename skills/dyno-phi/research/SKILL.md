---
name: dyno-research
platform: dyno-phi
version: "1.0"
api_base: https://design.dynotx.com/api/v1
job_type: research
description: >
  Biological research agent — answers a research question by querying PubMed,
  UniProt, PDB, and STRING, then returns a structured report with citations.
  Use to gather target biology, known binding hotspots, or literature context
  before running a design campaign.
category: research
tags: [research, pubmed, uniprot, pdb, citations, literature]
auth:
  env_var: DYNO_API_KEY
  header: x-api-key
  setup_url: https://design.dynotx.com/dashboard/settings
---

# Phi Research — Biological Research Agent

Cloud-hosted research agent that queries biological databases and returns a
structured Markdown report with citations. Designed to give you target biology
context before starting a protein design campaign.

## Authentication

```bash
export DYNO_API_KEY=your_key_here
```

Get a key at [Settings → API keys](https://design.dynotx.com/dashboard/settings).

## Quick Start

```bash
# Ask a general question
phi research --question "What are the key residues mediating PD-1/PD-L1 interaction?"

# Focus on a specific target with structure data
phi research \
  --question "What small molecules or peptides are known to inhibit KRAS G12D?" \
  --target KRAS \
  --structures \
  --out ./research

# Retrieve more papers from a broader set of databases
phi research \
  --question "What is the mechanism of IL-6 trans-signalling?" \
  --databases pubmed,uniprot,pdb,string \
  --max-papers 40 \
  --out ./il6_research
```

## CLI Reference

```
phi research [OPTIONS]

  --question QUESTION   Research question (required)
  --target TARGET       Protein/gene to focus the search (e.g. PD-L1, KRAS, EGFR)
  --databases LIST      Comma-separated databases: pubmed, uniprot, pdb, string
                        (default: pubmed,uniprot,pdb)
  --max-papers N        Max PubMed papers to retrieve (default: 20)
  --structures          Include related PDB structures in report
  --context TEXT        Additional context for the query
  --run-id ID           Optional run label
  --no-wait             Return after submission without polling
  --out DIR             Write report to DIR/research_report.md on completion
  --json                Print raw JSON response
```

## REST API

### Submit

```http
POST /api/v1/jobs/
x-api-key: <DYNO_API_KEY>
Content-Type: application/json

{
  "job_type": "research",
  "params": {
    "question": "What are known binding hotspots for PD-L1?",
    "target": "PD-L1",
    "databases": ["pubmed", "uniprot", "pdb"],
    "max_papers": 20,
    "include_structures": true
  },
  "run_id": "pdl1_literature_review"
}
```

Response `202`:
```json
{
  "job_id": "7c2a1f9b-3e4d-5a6b-8c9d-0e1f2a3b4c5d",
  "status": "pending",
  "message": "Research job queued"
}
```

### Completed response

```json
{
  "status": "completed",
  "outputs": {
    "report_md": "# PD-L1 Binding Hotspots\n\n## Summary\n...",
    "citations": [
      {
        "pmid": "26581497",
        "title": "Structural basis of PD-L1 inhibition by an antibody",
        "authors": "Chen et al.",
        "journal": "Nature",
        "year": 2016,
        "doi": "10.1038/nature20611"
      }
    ],
    "uniprot_entries": [
      { "accession": "Q9NZQ7", "gene": "CD274", "organism": "Homo sapiens" }
    ],
    "pdb_structures": [
      { "pdb_id": "5J89", "title": "Crystal structure of PD-L1 in complex with...", "resolution": 1.7 }
    ]
  }
}
```

## Report Format

The report is returned as structured Markdown with:

- **Summary** — direct answer to the question (3–5 sentences)
- **Key findings** — bullet points with evidence
- **Binding hotspots / functional residues** (when applicable)
- **Known structures** — PDB IDs with resolution and experimental method
- **Related proteins** — from UniProt and STRING interactions
- **Citations** — numbered references with PMID, DOI, journal, year

## Supported Databases

| Database | What it provides |
|----------|-----------------|
| PubMed | Peer-reviewed literature (up to `--max-papers` results) |
| UniProt | Protein function, domains, PTMs, disease associations |
| PDB | Experimental structures, resolution, ligands |
| STRING | Protein–protein interaction networks |

## Typical Use Cases

### Before a design campaign
```bash
# Understand your target before designing
phi research \
  --question "What regions of PD-L1 are important for PD-1 binding?" \
  --target PD-L1 --structures --out ./pdl1_background
```

### Hotspot identification
```bash
phi research \
  --question "Which residues in EGFR are mutated in drug-resistant cancers?" \
  --target EGFR --databases pubmed,uniprot
```

### Competitive landscape
```bash
phi research \
  --question "What protein binders or nanobodies have been developed against IL-17A?" \
  --target IL17A --max-papers 30 --out ./il17a_landscape
```

### Mechanism of action
```bash
phi research \
  --question "How does TNF-alpha signalling activate NF-kB?" \
  --databases pubmed,string --max-papers 25
```

## Standard Workflow

```
phi research   →   review hotspots and known structures
(literature)        ↓
                phi alphafold --fasta target.fasta
                (predict/validate target structure)
                    ↓
                phi proteinmpnn --pdb target.pdb
                (design binder sequences)
                    ↓
                phi esmfold --fasta designs.fasta
                (fast structure screen)
                    ↓
                phi alphafold --fasta top_candidates.fasta
                (final complex validation)
```

## Related Skills

- **[alphafold](../alphafold/SKILL.md)** — validate complex structure after identifying binding site
- **[proteinmpnn](../proteinmpnn/SKILL.md)** — design sequences targeting known hotspots
- **[esmfold](../esmfold/SKILL.md)** — fast screening of designed sequences
