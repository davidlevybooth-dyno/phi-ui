---
name: download_fasta
description: Download FASTA sequences from GCS for use in structure prediction and design workflows
category: data-tools
tags: [fasta, gcs, sequences, download]
biomodals_script: null
biomodals_function: null
recommended_timeout: 2
recommended_gpu: null
tool_schema:
  type: object
  properties:
    fasta_gcs_uri:
      type: string
      description: GCS URI to FASTA file (e.g., "gs://bucket/sequences.fasta")
      examples:
        - "gs://dev-services/runs/test_001/sequences.fasta"
        - "gs://protein-data/designed_sequences.fasta"
  required:
    - fasta_gcs_uri
---

# FASTA Download Tool

Download protein sequences from Google Cloud Storage for use in structure prediction and design workflows.

## Use Cases

- Download designed sequences from previous ProteinMPNN runs
- Retrieve stored sequence libraries for structure prediction
- Access sequences from GCS for ESMFold predictions
- Load batch sequences for high-throughput workflows

## How It Works

1. Accepts a GCS URI (gs://bucket/path/file.fasta)
2. Downloads the FASTA file from Google Cloud Storage
3. Parses and validates FASTA format
4. Returns sequences as text for use with other tools

## Examples

### Download sequences for structure prediction

```python
{
  "fasta_gcs_uri": "gs://dev-services/runs/run_12345/sequences.fasta"
}
```

### Download from different bucket

```python
{
  "fasta_gcs_uri": "gs://protein-data/batch_001/designed_binders.fasta"
}
```

## Output

Returns:
- **fasta_content**: Full FASTA file content as string
- **num_sequences**: Count of sequences in the file
- **size_bytes**: File size in bytes
- **gcs_uri**: Original GCS URI (for reference)

## Typical Workflow

```
User Request: "Fold sequences from gs://bucket/sequences.fasta"
    ↓
1. download_fasta(fasta_gcs_uri="gs://bucket/sequences.fasta")
    ↓ Returns: {fasta_content: ">seq1\\nMKTAYI..."}
2. esmfold(fasta_str=fasta_content, num_recycles=3)
    ↓
3. Report structures with confidence scores
```

## Error Handling

Common errors:
- **Invalid URI format**: URI must start with "gs://"
- **File not found**: Check bucket name and path are correct
- **Permission denied**: Ensure GCS credentials have read access to bucket
- **Invalid FASTA**: File content must be valid FASTA format

## Notes

- Requires GCS credentials (cloudsql-credentials secret)
- Works with any FASTA file stored in GCS
- Automatically validates FASTA format and counts sequences
- Supports both single and multi-sequence FASTA files
