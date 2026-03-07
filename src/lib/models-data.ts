export type InputType = "sequence" | "pdb-upload" | "sequences-list";

export interface FormField {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "textarea";
  placeholder?: string;
  defaultValue?: string | number | boolean;
  description?: string;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
}

export interface ExampleSequence {
  label: string;
  sequence: string;
  description?: string;
}

export interface MockOutput {
  metrics: Record<string, number | string>;
  json: Record<string, unknown>;
}

export interface ModelCard {
  overview: string;
  useCases: string[];
  performanceNotes: string;
  thirdPartyNote?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  shortName: string;
  citation: string;
  license: string;
  description: string;
  tagline: string;
  metrics: string[];
  jobType: string;
  inputType: InputType;
  exampleSequence?: ExampleSequence;
  formFields: FormField[];
  mockOutput: MockOutput;
  curlExample: string;
  pythonExample: string;
  /** Single-sequence / single-file CLI quick-try example shown in the CLI & Skills tab. */
  cliQuickExample: string;
  /** Batch workflow example shown in the CLI & Skills tab. */
  cliBatchExample: string;
  requestSchema: Record<string, unknown>;
  responseSchema: Record<string, unknown>;
  modelCard: ModelCard;
}

const BASE_URL = "https://design.dynotx.com/api/v1";

// GB1 β1 domain — 56 residues, a gold-standard benchmark in computational protein design
const GB1_EXAMPLE: ExampleSequence = {
  label: "GB1 β1 domain",
  sequence: "MTYKLILNGKTLKGETTTEAVDAATAEKVFKQYANDNGVDGEWTYDDATKTFTVTE",
  description: "56-residue immunoglobulin-binding domain. A gold-standard benchmark in protein design.",
};

// Two-chain example for AF2: GB1 β1 + Trp-cage, colon-separated to trigger multimer mode
const AF2_COMPLEX_EXAMPLE: ExampleSequence = {
  label: "GB1 : Trp-cage complex",
  sequence:
    "MTYKLILNGKTLKGETTTEAVDAATAEKVFKQYANDNGVDGEWTYDDATKTFTVTE:NLYIQWLKDGGPSSGRPPPS",
  description:
    "Two chains separated by \":\" — AF2 automatically runs in multimer mode. Chain A: GB1 β1 (56 aa). Chain B: Trp-cage (20 aa).",
};

export const MODELS: ModelInfo[] = [
  {
    id: "alphafold2",
    name: "AlphaFold2",
    shortName: "AF2",
    citation: "Jumper et al., Nature, 2021",
    license: "Apache 2.0 / CC BY 4.0",
    tagline: "High-accuracy structure prediction for monomers and complexes",
    description:
      "High-accuracy structure prediction for single chains and multi-chain complexes. Separate chains with \":\" for multimer prediction — mode is inferred automatically from the input.",
    metrics: ["plddt", "ptm", "iptm", "pae", "i_pae", "i_psae"],
    jobType: "alphafold",
    inputType: "sequence",
    exampleSequence: AF2_COMPLEX_EXAMPLE,
    formFields: [
      {
        key: "num_recycles",
        label: "Recycles",
        type: "number",
        defaultValue: 6,
        min: 1,
        max: 10,
        description: "Recycling iterations — higher is more accurate but slower",
      },
      {
        key: "num_seeds",
        label: "Seeds",
        type: "number",
        defaultValue: 3,
        min: 1,
        max: 5,
        description: "Number of model seeds to run — increases confidence at the cost of speed",
      },
    ],
    mockOutput: {
      metrics: {
        mean_plddt: 87.3,
        ptm: 0.84,
        iptm: 0.82,
        i_pae: 4.2,
        i_psae: 3.9,
      },
      json: {
        job_id: "550e8400-e29b-41d4-a716-446655440000",
        status: "completed",
        mode: "multimer",
        num_chains: 2,
        metrics: {
          summary: {
            mean_plddt: 87.3,
            mean_ptm: 0.84,
            mean_iptm: 0.82,
            mean_i_pae: 4.2,
            mean_i_psae: 3.9,
          },
          per_chain: [
            { chain_id: "A", plddt: 89.1, length: 56 },
            { chain_id: "B", plddt: 85.5, length: 20 },
          ],
        },
      },
    },
    curlExample: `curl -X POST ${BASE_URL}/jobs \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_type": "alphafold",
    "params": {
      "sequence": "CHAIN_A_SEQ:CHAIN_B_SEQ",
      "num_recycles": 6,
      "num_seeds": 3
    }
  }'`,
    pythonExample: `import requests

resp = requests.post(
    "${BASE_URL}/jobs",
    headers={"x-api-key": "YOUR_API_KEY"},
    json={
        "job_type": "alphafold",
        "params": {
            # Separate chains with ":" for multimer mode
            "sequence": "CHAIN_A_SEQ:CHAIN_B_SEQ",
            "num_recycles": 6,
            "num_seeds": 3,
        },
    },
)
print(resp.json()["job_id"])`,
    cliQuickExample: `# Single-chain prediction
phi alphafold --fasta protein.fasta

# Multi-chain complex — separate chains with ':'
phi alphafold --fasta complex.fasta   # multimer auto-detected

# High-accuracy (6 recycles, 5 seeds)
phi alphafold --fasta complex.fasta --recycles 6 --seeds 1,2,3,4,5`,
    cliBatchExample: `# Step 1 — upload sequences → ingest → dataset
phi upload --dir ./sequences/ --file-type fasta --run-id validation_batch
# ✓ dataset_id: dataset_abc123

# Step 2 — run AlphaFold2 against the full dataset
phi alphafold --dataset-id dataset_abc123 --recycles 6 --out ./af2_results

# Step 3 — download metrics table + top structures
phi download JOB_ID --out ./af2_results
# → results/metrics.parquet  (pLDDT, ipTM, ipSAE per design)`,
    requestSchema: {
      job_type: { type: "string", const: "alphafold", required: true },
      params: {
        type: "object",
        required: true,
        properties: {
          sequence: {
            type: "string",
            description: "Amino acid sequence. Separate chains with \":\" for multimer prediction — mode is inferred automatically.",
            required: true,
          },
          num_recycles: { type: "integer", minimum: 1, maximum: 10, default: 6 },
          num_seeds: { type: "integer", minimum: 1, maximum: 5, default: 3 },
        },
      },
    },
    responseSchema: {
      job_id: { type: "string" },
      status: { type: "string", enum: ["pending", "running", "completed", "failed"] },
      mode: { type: "string", enum: ["monomer", "multimer"] },
      num_chains: { type: "integer" },
      metrics: {
        type: "object",
        properties: {
          mean_plddt: { type: "number", range: [0, 100] },
          ptm: { type: "number", range: [0, 1] },
          iptm: { type: "number", range: [0, 1] },
          i_pae: { type: "number", range: [0, 31] },
          i_psae: { type: "number", range: [0, 31] },
        },
      },
    },
    modelCard: {
      overview:
        "AlphaFold2 is DeepMind's landmark structure prediction system, first published in Nature in 2021. It achieves near-experimental accuracy for single chains and multi-chain complexes using a deep learning architecture that combines multiple sequence alignments with attention-based structure modules. Multimer mode is triggered automatically when chains are separated by \":\" in the input sequence.",
      useCases: [
        "Predict the structure of a single protein chain",
        "Predict multi-chain complex structure (homo- or heteromers)",
        "Assess per-residue structural confidence (pLDDT)",
        "Score interface quality for protein–protein complexes (ipTM, ipSAE)",
        "Validate that a designed sequence folds as intended",
      ],
      performanceNotes:
        "AlphaFold2 is the most accurate structure predictor in routine use for single proteins and homo/heterodimers. For complex prediction, ipTM > 0.7 and ipSAE < 6.0 Å are widely used as first-pass confidence thresholds. Increasing num_seeds from 1 to 3–5 improves ranking reliability at the cost of speed.",
      thirdPartyNote:
        "AlphaFold2 is developed by DeepMind (Google). Dyno runs it on cloud GPUs via a managed API. The model weights are released under Apache 2.0 / CC BY 4.0.",
    },
  },
  {
    id: "esmfold",
    name: "ESMFold",
    shortName: "ESM",
    citation: "Lin et al., Science, 2023",
    license: "MIT",
    tagline: "Fast structure screening — 10–50× faster than AF2",
    description:
      "Single-sequence structure prediction using the ESM-2 language model. 10–50× faster than AlphaFold2, making it practical for high-throughput pre-screening before expensive AF2 validation.",
    metrics: ["plddt", "pae", "ptm", "rmsd"],
    jobType: "esmfold",
    inputType: "sequence",
    exampleSequence: GB1_EXAMPLE,
    formFields: [],
    mockOutput: {
      metrics: {
        binder_plddt: 87.5,
        ptm: 0.82,
        pae: 8.4,
        rmsd: 1.8,
      },
      json: {
        job_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        status: "completed",
        metrics: {
          mean_binder_plddt: 87.5,
          mean_ptm: 0.82,
          mean_pae: 8.4,
          mean_rmsd: 1.8,
        },
      },
    },
    curlExample: `curl -X POST ${BASE_URL}/jobs \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_type": "esmfold",
    "params": {
      "fasta_str": ">binder_001\\nMKVLWAASLTFSLAYGH..."
    }
  }'`,
    pythonExample: `import requests

resp = requests.post(
    "${BASE_URL}/jobs",
    headers={"x-api-key": "YOUR_API_KEY"},
    json={
        "job_type": "esmfold",
        "params": {"fasta_str": ">binder_001\\nMKVLWAASLTFSLAYGH..."},
    },
)
print(resp.json()["job_id"])`,
    cliQuickExample: `# Single sequence (~1 min)
phi esmfold --fasta sequences.fasta

# Inline sequence
phi esmfold --fasta-str ">binder_001\\nMKTAYIAKQRQISFVKSHFSR..."

# Custom recycles
phi esmfold --fasta sequences.fasta --recycles 5 --out ./screen`,
    cliBatchExample: `# Step 1 — upload sequences → ingest → dataset
phi upload --dir ./sequences/ --file-type fasta --run-id pdl1_screen
# ✓ dataset_id: dataset_abc123

# Step 2 — run ESMFold against the full dataset
phi esmfold --dataset-id dataset_abc123 --out ./esmfold_results

# Step 3 — download metrics table + structures
phi download JOB_ID --out ./esmfold_results
# → results/metrics.parquet  (pLDDT per sequence)`,
    requestSchema: {
      job_type: { type: "string", const: "esmfold", required: true },
      params: {
        type: "object",
        required: true,
        properties: {
          fasta_str: { type: "string", description: "Inline FASTA (small batches)" },
          fasta_gcs_uri: { type: "string", description: "GCS URI (batches > 10 sequences)" },
        },
      },
    },
    responseSchema: {
      job_id: { type: "string" },
      status: { type: "string" },
      metrics: {
        type: "object",
        properties: {
          binder_plddt: { type: "number", range: [0, 100] },
          ptm: { type: "number", range: [0, 1] },
          pae: { type: "number" },
          rmsd: { type: "number" },
        },
      },
    },
    modelCard: {
      overview:
        "ESMFold (Lin et al., Science 2023) predicts protein structure from a single sequence using the ESM-2 protein language model — no multiple sequence alignment required. This makes it dramatically faster than AF2 while remaining useful for initial structural plausibility filtering.",
      useCases: [
        "High-throughput pre-screening of large binder design pools",
        "Quickly eliminate designs with poor binder pLDDT (< 80)",
        "Reduce pool size before slower AF2 validation",
        "Estimate structural quality when MSA data is unavailable",
      ],
      performanceNotes:
        "ESMFold is significantly faster than AF2 but less accurate for complexes. It does not model protein–protein interactions — use AF2 Multimer for interface metrics (ipTM, ipSAE). Recommended as a filter, not a final validator. pLDDT > 80 is a reasonable ESMFold pre-screen threshold.",
      thirdPartyNote:
        "ESMFold is developed by Meta AI Research. Released under the MIT license.",
    },
  },
  {
    id: "proteinmpnn",
    name: "ProteinMPNN",
    shortName: "MPNN",
    citation: "Dauparas et al., Science, 2022",
    license: "MIT",
    tagline: "Sequence design and sequence–structure scoring",
    description:
      "Inverse folding model for sequence design and scoring. Given a backbone structure, ProteinMPNN designs sequences likely to fold into that backbone and provides plausibility scores.",
    metrics: ["mpnn_score", "mpnn_global_score", "mpnn_seq_recovery", "perplexity"],
    jobType: "proteinmpnn",
    inputType: "pdb-upload",
    formFields: [
      {
        key: "num_sequences",
        label: "Sequences per backbone",
        type: "number",
        defaultValue: 8,
        min: 1,
        max: 128,
        description: "How many sequences to design for each input backbone",
      },
      {
        key: "temperature",
        label: "Sampling temperature",
        type: "number",
        defaultValue: 0.1,
        min: 0.0,
        max: 1.0,
        description: "0.1 = conservative (near native), 1.0 = diverse",
      },
      {
        key: "fixed_positions",
        label: "Fixed residues (optional)",
        type: "text",
        placeholder: "A1,A2,A5",
        description: "Residue positions to keep unchanged",
      },
    ],
    mockOutput: {
      metrics: {
        mpnn_score: 0.65,
        mpnn_global_score: 0.61,
        mpnn_seq_recovery: 0.78,
        perplexity: 4.2,
      },
      json: {
        job_id: "c56a4180-65aa-42ec-a945-5fd21dec0538",
        status: "completed",
        metrics: {
          mean_mpnn_score: 0.65,
          mean_seq_recovery: 0.78,
          mean_perplexity: 4.2,
          sequences: [
            { sequence: "MKVLWAASLT...", mpnn_score: 0.67, recovery: 0.80 },
          ],
        },
      },
    },
    curlExample: `curl -X POST ${BASE_URL}/jobs \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_type": "proteinmpnn",
    "params": {
      "pdb_gcs_uri": "gs://bucket/binder.pdb",
      "num_sequences": 8,
      "temperature": 0.1
    }
  }'`,
    pythonExample: `import requests

resp = requests.post(
    "${BASE_URL}/jobs",
    headers={"x-api-key": "YOUR_API_KEY"},
    json={
        "job_type": "proteinmpnn",
        "params": {
            "pdb_gcs_uri": "gs://bucket/binder.pdb",
            "num_sequences": 8,
            "temperature": 0.1,
        },
    },
)
print(resp.json()["job_id"])`,
    cliQuickExample: `# Design sequences from a backbone PDB
phi proteinmpnn --pdb scaffold.pdb --num-sequences 50

# Conservative redesign (lower temperature)
phi proteinmpnn --pdb scaffold.pdb --num-sequences 100 --temperature 0.05

# Fix key interface residues
phi proteinmpnn --pdb scaffold.pdb --num-sequences 50 --fixed A52,A56,A63`,
    cliBatchExample: `# Step 1 — upload PDB structures → ingest → dataset
phi upload --dir ./structures/ --file-type pdb --run-id mpnn_batch
# ✓ dataset_id: dataset_abc123

# Step 2 — run ProteinMPNN against the full dataset
phi proteinmpnn --dataset-id dataset_abc123 --num-sequences 20 --out ./mpnn_results

# Step 3 — download sequences + scores
phi download JOB_ID --out ./mpnn_results
# → results/sequences.fasta + metrics.parquet  (mpnn_score, recovery)`,
    requestSchema: {
      job_type: { type: "string", const: "proteinmpnn", required: true },
      params: {
        type: "object",
        required: true,
        properties: {
          pdb_gcs_uri: { type: "string", description: "GCS URI to input PDB", required: true },
          num_sequences: { type: "integer", default: 8 },
          temperature: { type: "number", default: 0.1, minimum: 0.0, maximum: 1.0 },
          fixed_positions: { type: "string", description: "e.g. A1,A2,A5" },
        },
      },
    },
    responseSchema: {
      job_id: { type: "string" },
      status: { type: "string" },
      metrics: {
        type: "object",
        properties: {
          mpnn_score: { type: "number" },
          mpnn_global_score: { type: "number" },
          mpnn_seq_recovery: { type: "number", range: [0, 1] },
          perplexity: { type: "number" },
        },
      },
    },
    modelCard: {
      overview:
        "ProteinMPNN (Dauparas et al., Science 2022) is a message-passing neural network trained on protein structure data to design amino acid sequences for a given backbone. It is the standard inverse folding model in de novo binder design pipelines. On Dyno Phi, it is used both to generate sequences for diffusion-based backbones and to score existing sequences for sequence–structure compatibility.",
      useCases: [
        "Design sequences for RFdiffusion or BoltzGen backbones",
        "Score existing sequences against their intended backbone",
        "Generate sequence diversity around a fixed scaffold",
        "Filter out structurally incompatible sequences early in the pipeline",
      ],
      performanceNotes:
        "MPNN score (negative log-likelihood) correlates with experimental expression and folding success. An mpnn_score > 0.4 is a commonly used threshold. Sequence recovery above 0.7 indicates the designed sequence is close to the training distribution. Temperature 0.1 is recommended for binder design; higher temperatures increase diversity at the cost of plausibility.",
      thirdPartyNote:
        "ProteinMPNN is developed by the Institute for Protein Design (IPD) at the University of Washington. Released under the MIT license.",
    },
  },
  {
    id: "boltz",
    name: "Boltz-1 / Boltz-2",
    shortName: "Boltz",
    citation: "Wohlwend et al., BioRxiv 2024",
    license: "MIT",
    tagline: "AF3-class prediction — proteins, DNA, RNA, ligands",
    description:
      "Open-weights AF3-class prediction for multi-molecular complexes including proteins, DNA, RNA, and small molecules. Boltz-2 adds improved interface accuracy.",
    metrics: ["plddt", "ptm", "iptm", "pae", "i_pae", "i_psae"],
    jobType: "boltz",
    inputType: "sequence",
    exampleSequence: GB1_EXAMPLE,
    formFields: [
      {
        key: "use_msa",
        label: "Use MSA",
        type: "boolean",
        defaultValue: true,
        description: "Multiple sequence alignment — improves accuracy, adds latency",
      },
      {
        key: "num_recycles",
        label: "Recycles",
        type: "number",
        defaultValue: 3,
        min: 1,
        max: 10,
        description: "Recycling iterations",
      },
    ],
    mockOutput: {
      metrics: {
        plddt: 85.0,
        ptm: 0.81,
        iptm: 0.78,
        i_pae: 5.1,
        i_psae: 4.8,
      },
      json: {
        job_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        status: "completed",
        metrics: {
          mean_plddt: 85.0,
          mean_ptm: 0.81,
          mean_iptm: 0.78,
          mean_i_pae: 5.1,
          mean_i_psae: 4.8,
        },
      },
    },
    curlExample: `curl -X POST ${BASE_URL}/jobs \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_type": "boltz",
    "params": {
      "fasta_gcs_uri": "gs://bucket/complex.fasta",
      "use_msa": true
    }
  }'`,
    pythonExample: `import requests

resp = requests.post(
    "${BASE_URL}/jobs",
    headers={"x-api-key": "YOUR_API_KEY"},
    json={
        "job_type": "boltz",
        "params": {
            "fasta_gcs_uri": "gs://bucket/complex.fasta",
            "use_msa": True,
        },
    },
)
print(resp.json()["job_id"])`,
    cliQuickExample: `# Biomolecular complex prediction
phi boltz --fasta complex.fasta

# Without MSA (faster, lower accuracy)
phi boltz --fasta complex.fasta --no-msa

# Custom recycles
phi boltz --fasta complex.fasta --recycles 5 --out ./boltz`,
    cliBatchExample: `# Step 1 — upload complexes → ingest → dataset
phi upload --dir ./complexes/ --file-type fasta --run-id boltz_batch
# ✓ dataset_id: dataset_abc123

# Step 2 — run Boltz against the full dataset
phi boltz --dataset-id dataset_abc123 --out ./boltz_results

# Step 3 — download metrics table + structures
phi download JOB_ID --out ./boltz_results
# → results/metrics.parquet  (pLDDT, ipTM, ipSAE per complex)`,
    requestSchema: {
      job_type: { type: "string", const: "boltz", required: true },
      params: {
        type: "object",
        required: true,
        properties: {
          fasta_gcs_uri: { type: "string", required: true },
          use_msa: { type: "boolean", default: true },
          num_recycles: { type: "integer", default: 3, minimum: 1, maximum: 10 },
        },
      },
    },
    responseSchema: {
      job_id: { type: "string" },
      status: { type: "string" },
      metrics: {
        type: "object",
        properties: {
          plddt: { type: "number", range: [0, 100] },
          ptm: { type: "number", range: [0, 1] },
          iptm: { type: "number", range: [0, 1] },
          i_psae: { type: "number" },
        },
      },
    },
    modelCard: {
      overview:
        "Boltz-1 and Boltz-2 (Wohlwend et al., 2024) are open-weight diffusion-based structure prediction models with AlphaFold3-level accuracy on protein–protein, protein–nucleic acid, and protein–ligand complexes. Boltz-2 improves interface confidence scores. Both models are MIT-licensed, making them suitable for commercial pipelines where AF3's non-commercial license is a concern.",
      useCases: [
        "Predict binder–target complex structure for molecules beyond proteins",
        "Score protein–DNA or protein–RNA interactions",
        "Commercial pipelines where AF3 license restrictions apply",
        "Validate small-molecule binding pose alongside binder design",
      ],
      performanceNotes:
        "Boltz achieves near-AF3 accuracy on CASP15 targets. Interface ipTM and ipSAE metrics are directly comparable to AlphaFold2 Multimer outputs, enabling consistent cross-model filtering thresholds.",
      thirdPartyNote:
        "Boltz is developed by Recursion / MIT. Released under the MIT license.",
    },
  },
  {
    id: "chai1",
    name: "Chai-1",
    shortName: "Chai",
    citation: "Chai Discovery, BioRxiv 2024",
    license: "Apache 2.0",
    tagline: "Foundation model for molecular structure",
    description:
      "Chai-1 is a foundation model for molecular structure prediction, providing an alternative to AlphaFold for protein–protein complexes with competitive accuracy.",
    metrics: ["plddt", "ptm", "iptm", "pae", "i_pae"],
    jobType: "chai1",
    inputType: "sequence",
    exampleSequence: GB1_EXAMPLE,
    formFields: [],
    mockOutput: {
      metrics: {
        plddt: 86.2,
        ptm: 0.84,
        iptm: 0.80,
        i_pae: 4.9,
      },
      json: {
        job_id: "a987fbc9-4bed-3078-cf07-9141ba07c9f3",
        status: "completed",
        metrics: { mean_plddt: 86.2, mean_ptm: 0.84, mean_iptm: 0.80, mean_i_pae: 4.9 },
      },
    },
    curlExample: `curl -X POST ${BASE_URL}/jobs \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_type": "chai1",
    "params": {
      "fasta_gcs_uri": "gs://bucket/complex.fasta"
    }
  }'`,
    pythonExample: `import requests

resp = requests.post(
    "${BASE_URL}/jobs",
    headers={"x-api-key": "YOUR_API_KEY"},
    json={
        "job_type": "chai1",
        "params": {"fasta_gcs_uri": "gs://bucket/complex.fasta"},
    },
)
print(resp.json()["job_id"])`,
    cliQuickExample: `# Molecular complex prediction
phi chai1 --fasta complex.fasta

# Inline sequence
phi chai1 --fasta-str ">chainA\\nSEQ_A:SEQ_B"

# Download results directly
phi chai1 --fasta complex.fasta --wait --out ./chai1_results`,
    cliBatchExample: `# Step 1 — upload complexes → ingest → dataset
phi upload --dir ./complexes/ --file-type fasta --run-id chai1_batch
# ✓ dataset_id: dataset_abc123

# Step 2 — run Chai-1 against the full dataset
phi chai1 --dataset-id dataset_abc123 --out ./chai1_results

# Step 3 — download metrics + structures
phi download JOB_ID --out ./chai1_results
# → results/metrics.parquet  (pLDDT, ipTM per complex)`,
    requestSchema: {
      job_type: { type: "string", const: "chai1", required: true },
      params: {
        type: "object",
        required: true,
        properties: {
          fasta_gcs_uri: { type: "string", required: true },
        },
      },
    },
    responseSchema: {
      job_id: { type: "string" },
      status: { type: "string" },
      metrics: {
        type: "object",
        properties: {
          plddt: { type: "number", range: [0, 100] },
          ptm: { type: "number", range: [0, 1] },
          iptm: { type: "number", range: [0, 1] },
          i_pae: { type: "number" },
        },
      },
    },
    modelCard: {
      overview:
        "Chai-1 is a foundation model for molecular structure released by Chai Discovery in 2024. It predicts protein–protein and protein–ligand complexes with accuracy competitive with AlphaFold3 on standard benchmarks, while using a transformer-based architecture trained on a diverse set of biological structures.",
      useCases: [
        "Cross-validate binder predictions from AlphaFold2",
        "Predict protein–small molecule complexes",
        "Ensemble scoring across multiple predictors for higher confidence",
      ],
      performanceNotes:
        "Chai-1 is a strong secondary predictor. Using both AF2 and Chai-1 for ensemble scoring improves confidence in top-ranked designs. ipTM and ipSAE thresholds are comparable to AF2 Multimer.",
      thirdPartyNote:
        "Chai-1 is developed by Chai Discovery. Released under the Apache 2.0 license.",
    },
  },
  {
    id: "af2rank",
    name: "AF2Rank",
    shortName: "AF2R",
    citation: "Stein & Kortemme, BioRxiv 2022",
    license: "MIT / Apache 2.0",
    tagline: "Rank binder designs by predicted success",
    description:
      "Ranks binder designs using AF2-derived structural features. Produces a composite score that correlates with experimental binding success probability.",
    metrics: ["ptm", "i_ptm", "plddt", "pae", "tm_i", "composite_score", "rmsd_io"],
    jobType: "af2rank",
    inputType: "pdb-upload",
    formFields: [],
    mockOutput: {
      metrics: {
        composite_score: 0.89,
        i_ptm: 0.84,
        tm_i: 0.87,
        rmsd_io: 1.3,
        plddt: 89.1,
      },
      json: {
        job_id: "550e8400-e29b-41d4-a716-446655440001",
        status: "completed",
        metrics: {
          composite_score: 0.89,
          i_ptm: 0.84,
          tm_i: 0.87,
          rmsd_io: 1.3,
          plddt: 89.1,
          rank: 1,
        },
      },
    },
    curlExample: `curl -X POST ${BASE_URL}/jobs \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_type": "af2rank",
    "params": {
      "pdb_gcs_uri": "gs://bucket/binder_complex.pdb"
    }
  }'`,
    pythonExample: `import requests

resp = requests.post(
    "${BASE_URL}/jobs",
    headers={"x-api-key": "YOUR_API_KEY"},
    json={
        "job_type": "af2rank",
        "params": {"pdb_gcs_uri": "gs://bucket/binder_complex.pdb"},
    },
)
print(resp.json()["job_id"])`,
    cliQuickExample: `# Rank a single complex structure
phi af2rank --pdb binder_complex.pdb

# Rank with output to a specific directory
phi af2rank --pdb binder_complex.pdb --out ./af2rank_results`,
    cliBatchExample: `# Step 1 — upload complex PDB files → ingest → dataset
phi upload --dir ./complexes/ --file-type pdb --run-id af2rank_batch
# ✓ dataset_id: dataset_abc123

# Step 2 — rank all structures against the dataset
phi af2rank --dataset-id dataset_abc123 --out ./af2rank_results

# Step 3 — download ranked results
phi download JOB_ID --out ./af2rank_results
# → results/metrics.parquet  (composite_score, i_ptm, rmsd_io per structure)`,
    requestSchema: {
      job_type: { type: "string", const: "af2rank", required: true },
      params: {
        type: "object",
        required: true,
        properties: {
          pdb_gcs_uri: { type: "string", description: "GCS URI to binder–target complex PDB", required: true },
        },
      },
    },
    responseSchema: {
      job_id: { type: "string" },
      status: { type: "string" },
      metrics: {
        type: "object",
        properties: {
          composite_score: { type: "number" },
          i_ptm: { type: "number", range: [0, 1] },
          tm_i: { type: "number" },
          rmsd_io: { type: "number" },
        },
      },
    },
    modelCard: {
      overview:
        "AF2Rank (Stein & Kortemme, 2022) reuses AlphaFold2 confidence features — in particular ptm, i_ptm, and pLDDT — to produce a composite ranking score that correlates with experimental binding affinity. It addresses the observation that individual AF2 metrics are noisy; their combination is more predictive.",
      useCases: [
        "Final ranking of binder candidates before experimental testing",
        "Combining multiple AF2 confidence signals into a single score",
        "Prioritising which designs to order for SPR or BLI validation",
      ],
      performanceNotes:
        "AF2Rank composite_score > 0.75 is a reasonable threshold for experimental follow-up. It is most useful as the final filter after ESMFold pre-screening and AF2 Multimer validation.",
      thirdPartyNote:
        "AF2Rank is developed by the Kortemme Lab at UCSF. Released under MIT / Apache 2.0.",
    },
  },
  {
    id: "esm2",
    name: "ESM-2",
    shortName: "ESM2",
    citation: "Lin et al., Science, 2023",
    license: "MIT",
    tagline: "Protein language model — sequence plausibility",
    description:
      "Protein language model scoring. Computes evolutionary likelihood scores to identify implausible or out-of-distribution sequences before structural validation.",
    metrics: ["sequence_perplexity", "log_likelihood", "per_position_confidence"],
    jobType: "esm2",
    inputType: "sequences-list",
    formFields: [],
    mockOutput: {
      metrics: {
        sequence_perplexity: 12.3,
        log_likelihood: -2.8,
        mean_per_position_confidence: 0.73,
      },
      json: {
        job_id: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
        status: "completed",
        metrics: {
          mean_sequence_perplexity: 12.3,
          mean_log_likelihood: -2.8,
          results: [
            { sequence_id: "seq_0", perplexity: 12.3, log_likelihood: -2.8 },
          ],
        },
      },
    },
    curlExample: `curl -X POST ${BASE_URL}/jobs \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_type": "esm2",
    "params": {
      "sequences": ["MKTAYIAKQRQISFVK..."]
    }
  }'`,
    pythonExample: `import requests

resp = requests.post(
    "${BASE_URL}/jobs",
    headers={"x-api-key": "YOUR_API_KEY"},
    json={
        "job_type": "esm2",
        "params": {"sequences": ["MKTAYIAKQRQISFVK..."]},
    },
)
print(resp.json()["job_id"])`,
    cliQuickExample: `# Score sequences for evolutionary plausibility
phi esm2 --fasta designs.fasta

# Score a single inline sequence
phi esm2 --fasta-str ">design_001\\nMKTAYIAKQRQISFVK..."

# Mask specific positions
phi esm2 --fasta designs.fasta --mask 5,10,15`,
    cliBatchExample: `# Step 1 — upload sequences → ingest → dataset
phi upload --dir ./sequences/ --file-type fasta --run-id esm2_screen
# ✓ dataset_id: dataset_abc123

# Step 2 — run ESM-2 scoring against the full dataset
phi esm2 --dataset-id dataset_abc123 --out ./esm2_results

# Step 3 — download per-sequence scores
phi download JOB_ID --out ./esm2_results
# → results/metrics.parquet  (perplexity, log_likelihood per sequence)`,
    requestSchema: {
      job_type: { type: "string", const: "esm2", required: true },
      params: {
        type: "object",
        required: true,
        properties: {
          sequences: { type: "array", items: { type: "string" }, description: "Amino acid sequences to score" },
          fasta_gcs_uri: { type: "string", description: "GCS URI (batches > 100)" },
        },
      },
    },
    responseSchema: {
      job_id: { type: "string" },
      status: { type: "string" },
      metrics: {
        type: "object",
        properties: {
          sequence_perplexity: { type: "number", description: "Lower = more plausible" },
          log_likelihood: { type: "number" },
          per_position_confidence: { type: "array", items: { type: "number" } },
        },
      },
    },
    modelCard: {
      overview:
        "ESM-2 (Lin et al., Science 2023) is Meta AI's largest protein language model, trained on 250 million protein sequences. It assigns evolutionary likelihood scores to amino acid sequences, measuring how consistent a given sequence is with known protein evolution. This makes it a fast, structure-free filter for removing biologically implausible de novo designs.",
      useCases: [
        "Filter out evolutionarily implausible sequences early in a pipeline",
        "Score large batches (100,000+) without GPU-intensive structure prediction",
        "Identify per-position low-confidence residues for targeted redesign",
        "Combine with ESMFold for fast sequence + structure pre-screening",
      ],
      performanceNotes:
        "ESM-2 perplexity < 15 is a reasonable filter for de novo binder sequences. Per-position log-likelihoods highlight residues where the model is uncertain — useful for guiding subsequent ProteinMPNN redesign.",
      thirdPartyNote:
        "ESM-2 is developed by Meta AI Research. Released under the MIT license.",
    },
  },
];

export interface ClaudeSkill {
  id: string;
  name: string;
  description: string;
  version: string;
  filename: string;
  capabilities: string[];
  content: string;
}

export const CLAUDE_SKILLS: ClaudeSkill[] = [
  {
    id: "phi",
    name: "Phi",
    description:
      "Single CLI tool for all Dyno Phi protein design capabilities — structure prediction, sequence design, language model scoring, and job management. One command to learn, all models accessible.",
    version: "1.0.0",
    filename: "phi-skill.md",
    capabilities: [
      "Structure prediction — ESMFold (fast screen) and AlphaFold2 (complex validation)",
      "Sequence design — ProteinMPNN inverse folding with temperature control",
      "Language model scoring — ESM-2 log-likelihood and perplexity",
      "Biomolecular complex prediction — Boltz-1/2 for proteins, DNA, RNA",
      "Biological research — PubMed, UniProt, PDB, and STRING queries with citations",
      "Job management — submit, poll, cancel, download results",
    ],
    content: `---
name: phi
platform: dyno-phi
version: "1.0"
description: >
  Single CLI for all Dyno Phi protein design capabilities.
  One tool, all models — structure prediction, sequence design,
  language model scoring, biological research, and job management.
auth:
  env_var: DYNO_API_KEY
  setup_url: https://design.dynotx.com/dashboard/settings
---

# Phi — Dyno Protein Design CLI

A single command-line tool that gives your Claude agent access to all
Dyno Phi capabilities. Install once, use for everything.

## Setup

\`\`\`bash
# 1. Install
pip install -e /path/to/skills/dyno-phi/
# or: pip install git+https://github.com/dynotx/phi

# 2. Set your API key (get one at design.dynotx.com/dashboard/settings)
export DYNO_API_KEY=your_key_here
# Add to ~/.zshrc or ~/.bashrc for persistence
\`\`\`

## All Commands

\`\`\`bash
# ── Dataset upload (batch runs) ───────────────────────────────────────────
phi upload --dir ./designs/ --file-type pdb --run-id pdl1_batch
# → dataset_id: dataset_abc  (use with --dataset-id below)

phi datasets                          # list your datasets
phi dataset dataset_abc               # show manifest + artifact count

# ── Biological research ───────────────────────────────────────────────────
phi research --question "What are PD-L1 binding hotspots?" --target PD-L1

# ── Structure prediction ──────────────────────────────────────────────────
# Quick try — single sequence
phi esmfold --fasta sequences.fasta
phi alphafold --fasta protein.fasta        # single chain
phi alphafold --fasta complex.fasta        # multimer auto-detected from ':'
phi boltz --fasta complex.fasta

# Batch — dataset reference
phi esmfold    --dataset-id dataset_abc --out ./screen
phi alphafold  --dataset-id dataset_abc --out ./validation
phi boltz      --dataset-id dataset_abc

# ── Sequence design ───────────────────────────────────────────────────────
phi proteinmpnn --pdb scaffold.pdb --num-sequences 50
phi proteinmpnn --dataset-id dataset_abc --num-sequences 50

# ── Language model scoring ────────────────────────────────────────────────
phi esm2 --fasta designs.fasta
phi esm2 --dataset-id dataset_abc

# ── Job management ────────────────────────────────────────────────────────
phi jobs                              # list recent jobs
phi status JOB_ID                     # check a specific job
phi cancel JOB_ID                     # cancel a running job
phi download JOB_ID --out ./results   # download results
\`\`\`

## phi research — Biological Research Agent

Query biological databases and get a structured Markdown report with citations.
Use this before starting a design campaign to understand target biology.

\`\`\`bash
phi research [OPTIONS]

  --question QUESTION   Research question (required)
  --target TARGET       Protein/gene to focus the search (e.g. PD-L1, KRAS, EGFR)
  --databases LIST      pubmed, uniprot, pdb, string (default: pubmed,uniprot,pdb)
  --max-papers N        Max PubMed papers to retrieve (default: 20)
  --structures          Include related PDB structures in the report
  --context TEXT        Additional context for the query
  --out DIR             Write report to DIR/research_report.md
\`\`\`

The report includes: summary, key findings, binding hotspots/functional residues,
known PDB structures, related proteins, and numbered citations with PMID/DOI.

## Key Flags (all submission commands)

| Flag | Default | Description |
|------|---------|-------------|
| \`--wait\` | on | Poll until job completes |
| \`--no-wait\` | — | Return immediately after submission |
| \`--out DIR\` | — | Write result manifest to DIR |
| \`--run-id ID\` | — | Optional label for the run |
| \`--json\` | — | Print raw JSON response |

## Batch Workflow (100–50,000 files)

All model commands accept a \`--dataset-id\` flag for batch runs. Upload your
files once and reference the dataset in as many jobs as you need.

\`\`\`bash
# Step 1: upload files → staged ingest → versioned dataset
phi upload --dir ./designs/ --file-type pdb --run-id pdl1_batch_001
# Uploads in parallel, validates, returns:
# ✓ Dataset ready
#   dataset_id     : dataset_abc123
#   artifact_count : 8421

# Step 2: run the pipeline against the dataset (no re-upload needed)
phi esmfold     --dataset-id dataset_abc123 --out ./screen
phi alphafold   --dataset-id dataset_abc123 --out ./validation
phi esm2        --dataset-id dataset_abc123

# Step 3: download the metrics table (parquet) and top candidate structures
phi download JOB_ID --out ./results

# Dataset management
phi datasets                      # list your datasets
phi dataset dataset_abc123        # show manifest + artifact count
\`\`\`

**File types supported:** PDB structures (\`.pdb\`), FASTA sequences (\`.fasta\`), metrics CSV (\`.csv\`)

**Scale:** 100 files use a single GPU task; 50,000 files are split into ~500 batches of 100

## Recommended Pipeline

\`\`\`
0. Upload files     phi upload --dir ./designs/ --file-type pdb
                    → dataset_id: dataset_abc

1. Research target  phi research --question "..." --target TARGET

2. Sequence design  phi proteinmpnn --dataset-id dataset_abc --num-sequences 50
                    (or: phi proteinmpnn --pdb scaffold.pdb for single structure)

3. Fast screen      phi esmfold --dataset-id dataset_abc --out ./screen
                    → Filter: mean pLDDT ≥ 70

4. Validate complex phi alphafold --dataset-id top_candidates_dataset --out ./af2
                    → Filter: ipTM ≥ 0.70, ipSAE ≤ 6.0

5. Sequence scoring phi esm2 --dataset-id top_candidates_dataset
                    → Filter: perplexity ≤ 8.0
\`\`\`

## Key Metrics

| Metric | Model | Pass threshold |
|--------|-------|---------------|
| \`mean_plddt\` | ESMFold, AF2 | ≥ 70 (screen), ≥ 85 (final) |
| \`complex_iptm\` | AlphaFold2 | ≥ 0.70 |
| \`complex_i_psae_mean\` | AlphaFold2 | ≤ 6.0 Å |
| \`mpnn_score\` | ProteinMPNN | ≥ 0.40 |
| \`perplexity\` | ESM-2 | ≤ 8.0 |

## Example: Full Campaign from Claude

\`\`\`
User: "Design binders to PD-L1 and validate the top candidates."

Claude agent workflow:
  phi research --question "What are PD-L1/PD-1 binding hotspots?" --target PD-L1
  phi proteinmpnn --pdb pdl1_structure.pdb --num-sequences 100 --temperature 0.1
  phi esmfold --fasta designed_sequences.fasta --out ./esmfold_screen
  # [filter sequences with pLDDT ≥ 70]
  phi alphafold --fasta top_50.fasta --out ./af2_validation
  # [filter with ipTM ≥ 0.70 and ipSAE ≤ 6.0]
  phi esm2 --fasta final_candidates.fasta
  # [report top 10 by composite score]
\`\`\`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| \`DYNO_API_KEY\` | Yes | API key from design.dynotx.com/dashboard/settings |
| \`DYNO_API_BASE_URL\` | No | Override API URL (default: https://design.dynotx.com) |
`,
  },
];
