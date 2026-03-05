export interface ModelInfo {
  id: string;
  name: string;
  shortName: string;
  citation: string;
  license: string;
  description: string;
  metrics: string[];
  jobType: string;
  timePerSample?: string;
  costPerSample?: string;
  curlExample: string;
}

const BASE_URL = "https://design.dynotx.com/api/v1";

export const MODELS: ModelInfo[] = [
  {
    id: "alphafold2",
    name: "AlphaFold2",
    shortName: "AF2",
    citation: "Jumper et al., Nature, 2021",
    license: "Apache 2.0 / CC BY 4.0",
    description:
      "High-accuracy protein structure prediction and complex validation. Deployed with both multimer and monomer functionality.",
    metrics: ["plddt", "ptm", "iptm", "pae", "i_pae", "i_psae"],
    jobType: "alphafold",
    timePerSample: "8–12 min",
    costPerSample: "$0.28–$0.42",
    curlExample: `curl -X POST ${BASE_URL}/jobs/ \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_type": "alphafold",
    "params": {
      "fasta_gcs_uri": "gs://bucket/sequences.fasta",
      "models": [1, 2, 3],
      "num_recycles": 6,
      "use_multimer": true,
      "target_length": 129,
      "binder_lengths": [70]
    }
  }'`,
  },
  {
    id: "esmfold",
    name: "ESMFold",
    shortName: "ESM",
    citation: "Lin et al., Science, 2023",
    license: "MIT",
    description:
      "Fast structure prediction (10–50× faster than AF2). Used for high-throughput screening before expensive validation.",
    metrics: ["plddt", "pae", "ptm", "rmsd"],
    jobType: "esmfold",
    timePerSample: "3–9 min",
    costPerSample: "$0.10–$0.31",
    curlExample: `curl -X POST ${BASE_URL}/jobs/ \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_type": "esmfold",
    "params": {
      "fasta_str": ">binder_001\\nMKVLWAAS..."
    }
  }'`,
  },
  {
    id: "proteinmpnn",
    name: "ProteinMPNN",
    shortName: "MPNN",
    citation: "Dauparas et al., Science, 2022",
    license: "MIT",
    description:
      "Sequence design (inverse folding) and scoring. Validates sequence–structure compatibility and provides plausibility scores.",
    metrics: ["mpnn_score", "mpnn_global_score", "mpnn_seq_recovery", "perplexity"],
    jobType: "proteinmpnn",
    timePerSample: "1–2 min",
    costPerSample: "$0.03–$0.07",
    curlExample: `curl -X POST ${BASE_URL}/jobs/ \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_type": "proteinmpnn",
    "params": {
      "pdb_gcs_uri": "gs://bucket/binder.pdb",
      "num_seqs": 8,
      "sampling_temp": 0.1
    }
  }'`,
  },
  {
    id: "boltz",
    name: "Boltz-1 / Boltz-2",
    shortName: "Boltz",
    citation: "Wohlwend et al., BioRxiv 2024",
    license: "MIT",
    description:
      "AF3-like prediction for complexes including proteins, DNA, RNA, and small molecules.",
    metrics: ["plddt", "ptm", "iptm", "pae", "i_pae", "i_psae"],
    jobType: "boltz",
    timePerSample: "6–10 min",
    costPerSample: "$0.21–$0.35",
    curlExample: `curl -X POST ${BASE_URL}/jobs/ \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_type": "boltz",
    "params": {
      "fasta_gcs_uri": "gs://bucket/complex.fasta",
      "use_msa": true
    }
  }'`,
  },
  {
    id: "chai1",
    name: "Chai-1",
    shortName: "Chai",
    citation: "Chai Discovery, BioRxiv 2024",
    license: "Apache 2.0",
    description:
      "Foundation model for molecular structure; alternative to AlphaFold for protein–protein complexes.",
    metrics: ["plddt", "ptm", "iptm", "pae", "i_pae"],
    jobType: "chai1",
    curlExample: `curl -X POST ${BASE_URL}/jobs/ \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_type": "chai1",
    "params": {
      "fasta_gcs_uri": "gs://bucket/complex.fasta"
    }
  }'`,
  },
  {
    id: "af2rank",
    name: "AF2Rank",
    shortName: "AF2R",
    citation: "Stein & Kortemme, BioRxiv 2022",
    license: "MIT / Apache 2.0",
    description:
      "Ranks binder designs using AF2-derived features; predicts experimental success probability.",
    metrics: ["ptm", "i_ptm", "plddt", "pae", "tm_i", "composite_score", "rmsd_io"],
    jobType: "af2rank",
    curlExample: `curl -X POST ${BASE_URL}/jobs/ \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_type": "af2rank",
    "params": {
      "pdb_gcs_uri": "gs://bucket/binder_complex.pdb"
    }
  }'`,
  },
  {
    id: "esm2",
    name: "ESM-2",
    shortName: "ESM2",
    citation: "Lin et al., Science, 2023",
    license: "MIT",
    description:
      "Protein language model scoring. Provides evolutionary likelihood to filter implausible mutations.",
    metrics: ["sequence_perplexity", "log_likelihood", "per_position_confidence"],
    jobType: "esm2",
    timePerSample: "1–2 min",
    costPerSample: "$0.03–$0.07",
    curlExample: `curl -X POST ${BASE_URL}/jobs/ \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_type": "esm2",
    "params": {
      "sequences": ["MKTAYIAKQRQISFVK..."]
    }
  }'`,
  },
];

export const CLAUDE_SKILLS = [
  {
    id: "psi-phi-scoring",
    name: "Psi-Phi Scoring",
    description:
      "Submit protein binder sequences for multi-model scoring (ESMFold, AlphaFold2, ProteinMPNN) directly from Claude Code. Manages job submission, polling, and result retrieval.",
    version: "1.0.0",
    filename: "psi-phi-scoring.md",
    capabilities: [
      "Submit ESMFold, AlphaFold2, and ProteinMPNN scoring jobs",
      "Poll job status and stream logs",
      "Retrieve and summarize per-design metrics",
      "Download result structures as signed URLs",
    ],
  },
  {
    id: "psi-phi-filtering",
    name: "Psi-Phi Filtering",
    description:
      "Apply calibrated metric filters to scored binder pools. Uses experimentally grounded thresholds to rank and select candidates for experimental testing.",
    version: "1.0.0",
    filename: "psi-phi-filtering.md",
    capabilities: [
      "Apply pLDDT, ipTM, ipSAE, RMSD threshold filters",
      "Rank designs by composite score",
      "Select top-N candidates",
      "Export filtered sequences as FASTA",
    ],
  },
  {
    id: "psi-phi-agent",
    name: "Psi-Phi Design Agent",
    description:
      "Full agentic protein design workflow. Describe your target in natural language and the agent orchestrates the complete scoring and filtering pipeline.",
    version: "1.0.0",
    filename: "psi-phi-agent.md",
    capabilities: [
      "Natural language workflow planning",
      "Protocol recommendation based on target type",
      "End-to-end campaign execution",
      "Structured result reports with next-step recommendations",
    ],
  },
];
