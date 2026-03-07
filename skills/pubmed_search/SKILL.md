---
name: pubmed
description: Search PubMed for scientific literature using NCBI E-utilities API
category: data-tools
tags: [database, literature, pubmed, ncbi]
biomodals_script: null
biomodals_function: null
recommended_timeout: 10
recommended_gpu: null
tool_schema:
  type: object
  properties:
    query:
      type: string
      description: PubMed query string (e.g., "alpha galactosidase fabry disease")
    max_results:
      type: integer
      description: Maximum number of results to return
      default: 20
    api_key:
      type: string
      description: NCBI API key for higher rate limits (optional, reads from NCBI_API_KEY env var)
  required: [query]
---

# PubMed Literature Search

Search PubMed for scientific literature using NCBI E-utilities API.

## Description

This tool searches the PubMed database for scientific articles and returns structured metadata including titles, abstracts, authors, and publication details.

## Use Cases

- Finding research articles about specific proteins or diseases
- Literature review for protein design projects
- Identifying relevant publications for target validation
- Gathering background information on biological mechanisms

## Function Signature

```yaml
name: pubmed_search
parameters:
  query:
    type: string
    description: PubMed query string (e.g., "alpha galactosidase fabry disease", "protein design machine learning")
    required: true
  max_results:
    type: integer
    description: Maximum number of results to return
    default: 20
    minimum: 1
    maximum: 100
returns:
  type: array
  description: List of article metadata
  items:
    pmid:
      type: string
      description: PubMed ID
    title:
      type: string
      description: Article title
    abstract:
      type: string
      description: Abstract text (may be null if not available)
    authors:
      type: array
      description: List of author names
      items:
        type: string
    journal:
      type: string
      description: Journal name
    year:
      type: integer
      description: Publication year
    doi:
      type: string
      description: Digital Object Identifier (may be null)
    url:
      type: string
      description: PubMed URL for the article
```

## Example Usage

```python
from src.tools.pubmed_search import pubmed_search

# Search for articles about alpha-galactosidase
results = await pubmed_search(
    query="alpha galactosidase fabry disease",
    max_results=10
)

for article in results:
    print(f"Title: {article['title']}")
    print(f"PMID: {article['pmid']}")
    print(f"Year: {article['year']}")
    print(f"URL: {article['url']}")
```

## Search Query Syntax

PubMed supports advanced search operators:

- `AND`, `OR`, `NOT`: Boolean operators
- `"exact phrase"`: Phrase search
- `[MeSH Terms]`: Medical Subject Headings
- `[Author]`: Author name search
- `[Title/Abstract]`: Search in title or abstract only

Examples:
- `"protein design" AND "machine learning"` - Both terms
- `GLA[Gene Name] AND fabry disease[MeSH Terms]` - Gene and disease
- `Smith J[Author] AND 2023[Publication Date]` - Specific author and year

## Implementation Details

- **API**: NCBI E-utilities (https://eutils.ncbi.nlm.nih.gov/entrez/eutils/)
- **Rate Limits**: 
  - Without API key: 3 requests/second
  - With API key: 10 requests/second (set NCBI_API_KEY env var)
- **Automatic Retry**: Up to 3 attempts with exponential backoff on rate limits
- **Timeout**: 30 seconds per request
- **No Authentication Required**: Public API (API key optional for higher rate limits)

## Limitations

- Maximum 100 results per query (PubMed API limit)
- Rate limits may cause delays for multiple sequential queries
- Some articles may not have abstracts available
- Full-text articles are not returned (only metadata)

## Error Handling

The tool raises `httpx.HTTPError` if:
- Network connection fails
- PubMed API is unavailable
- Invalid query syntax

Returns empty list if no results found.

## Related Tools

- `pdb_fetch`: Fetch protein structures from PDB
- `uniprot_fetch`: Fetch protein sequences from UniProt

## biomodals_function

This tool runs locally (not on Modal) as it's a lightweight API call.

Set to `null` or omit.

## Output Schema

```yaml
success:
  type: boolean
  description: Whether the search succeeded
articles:
  type: array
  description: List of article metadata (structure described above)
query:
  type: string
  description: Original search query
count:
  type: integer
  description: Number of articles returned
```
