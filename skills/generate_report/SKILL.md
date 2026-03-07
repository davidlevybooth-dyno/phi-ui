---
name: generate_report
description: Generate actionable workflow reports in JSON and Markdown formats
category: reporting-tools
tags: [reporting, visualization, summary, documentation]
biomodals_script: null
biomodals_function: null
recommended_timeout: 1
recommended_gpu: null
tool_schema:
  type: object
  properties:
    metrics:
      type: object
      description: Alignment metrics from align_structures
    filter_results:
      type: object
      description: Filter results from filter_candidates
    workflow_name:
      type: string
      description: Name of the workflow for the report
    workflow_metadata:
      type: object
      description: Optional metadata about the workflow
    upload_to_gcs:
      type: boolean
      description: Whether to upload reports to GCS
  required: [metrics, filter_results, workflow_name]
---

# Generate Report

Local tool (runs in Temporal worker) for generating comprehensive workflow reports.

## Features

- JSON reports (structured, machine-readable)
- Markdown reports (human-readable, actionable)
- Distribution statistics
- Top candidates ranking
- Actionable recommendations
- GCS upload integration

## Example Usage

```json
{
  "id": "report",
  "op": "generate_report",
  "params": {
    "metrics": "$artifacts.alignment_metrics",
    "filter_results": "$artifacts.filter_results",
    "workflow_name": "my-protein-design-workflow",
    "workflow_metadata": {
      "pdb_id": "1ALU",
      "num_sequences": 20
    }
  }
}
```
