"use client";

import { Github } from "lucide-react";
import { motion } from "framer-motion";
import { CodeHighlight } from "@/components/ui/code-highlight";

// ---------------------------------------------------------------------------
// Shared micro-components
// ---------------------------------------------------------------------------

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-base font-semibold mt-8 mb-2 scroll-mt-20">
      {children}
    </h2>
  );
}

function H3({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="text-sm font-semibold mt-6 mb-1.5 scroll-mt-20 font-mono">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed mb-2">{children}</p>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-xs bg-muted px-1 rounded">{children}</code>
  );
}

function OptionTable({
  rows,
  cols = ["Flag", "Default", "Description"],
}: {
  rows: string[][];
  cols?: string[];
}) {
  return (
    <div className="overflow-x-auto mb-3">
      <table className="w-full text-xs border rounded-md overflow-hidden">
        <thead>
          <tr className="border-b bg-muted/50">
            {cols.map((c) => (
              <th key={c} className="px-3 py-2 text-left font-medium text-muted-foreground">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-1.5 text-muted-foreground font-mono align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Snippet({ code, lang = "bash" }: { code: string; lang?: "bash" | "python" | "json" }) {
  return (
    <div className="mb-3">
      <CodeHighlight code={code} lang={lang} />
    </div>
  );
}

function Hr() {
  return <div className="border-t my-6" />;
}

// ---------------------------------------------------------------------------
// Copyable plain-text version — for pasting into AI agents as context
// ---------------------------------------------------------------------------

export const CLI_COPY_TEXT = `# Phi CLI Reference
Version: 0.1.0 · Package: dyno-phi · Requires: Python ≥ 3.9

## Installation & authentication
\`\`\`
pip install dyno-phi
# or: uv tool install dyno-phi
export DYNO_API_KEY=ak_...
phi login
\`\`\`

## Global flags
--poll-interval S   (default 5) Seconds between status-poll requests
--version           Print version and exit
--help              Show help for any command

## State caching
phi caches the active dataset ID and job ID in .phi-state.json.
\`\`\`
phi use <dataset-id>         # set active dataset
phi filter --preset default  # uses cached dataset
phi scores                   # uses cached job
phi download --out ./results # uses cached job
\`\`\`

## Command index
phi login            Verify API key and print identity
phi fetch            Download structure from RCSB PDB or AlphaFold DB
phi upload           Upload PDB/CIF/FASTA files → create dataset
phi use              Set active dataset ID
phi datasets         List your datasets
phi dataset          Show details for a single dataset
phi ingest-session   Check status of an ingest session
phi design           Backbone generation — binder design, de novo, motif scaffolding (alias: rfdiffusion3)
phi boltzgen         All-atom generative design from a YAML spec
phi folding          Fast single-sequence structure prediction — ESMFold (alias: esmfold)
phi complex_folding  Monomer or multimer structure prediction — AlphaFold2 (alias: alphafold)
phi openfold3        Biomolecular complex prediction — proteins, DNA, RNA, ligands
phi inverse_folding  Sequence design via inverse folding — ProteinMPNN (alias: proteinmpnn)
phi esm2             Language model log-likelihood scoring and perplexity
phi boltz            Biomolecular complex prediction — proteins, DNA, RNA (Boltz-1)
phi filter           Full filter pipeline: inverse folding → folding → complex folding → score
phi status           Get job status
phi jobs             List recent jobs
phi logs             Print log stream URL for a job
phi cancel           Cancel a running job
phi scores           Display scoring metrics table for a completed filter job
phi download         Download output files for a completed job
phi research         Run a biological research query with citations
phi notes            View accumulated research notes for a dataset

## Detailed reference

### phi fetch
\`\`\`
phi fetch (--pdb ID | --uniprot ID) [--chain C] [--residues START-END]
          [--trim-low-confidence PLDDT] [--out FILE] [--upload] [--name NAME]
\`\`\`
Examples:
  phi fetch --pdb 4ZQK --chain A --residues 56-290 --out target.pdb
  phi fetch --uniprot Q9NZQ7 --trim-low-confidence 70 --upload

### phi upload
\`\`\`
phi upload [FILE ...] [--dir DIR] [--file-type TYPE] [--wait|--no-wait]
\`\`\`
  phi upload --dir ./designs/ --file-type pdb

### phi design (rfdiffusion3)
\`\`\`
phi design [--target-pdb FILE | --target-pdb-gcs URI | --length N | --motif-pdb FILE]
           [--hotspots A45,A67] [--num-designs N] [--steps N]
           [--symmetry C3] [--wait] [--out DIR]
\`\`\`
  phi design --target-pdb target.pdb --hotspots A45,A67 --num-designs 50
  phi design --length 80 --num-designs 20

### phi boltzgen
\`\`\`
phi boltzgen (--yaml FILE | --yaml-gcs URI) [--protocol PROTOCOL]
             [--num-designs N] [--budget N] [--wait] [--out DIR]
\`\`\`
  phi boltzgen --yaml design.yaml --protocol protein-anything --num-designs 10000

### phi folding (esmfold)
\`\`\`
phi folding (--fasta FILE | --fasta-str FASTA | --dataset-id ID)
            [--recycles N] [--wait] [--out DIR]
\`\`\`
  phi folding --fasta sequences.fasta --wait

### phi complex_folding (alphafold)
\`\`\`
phi complex_folding (--fasta FILE | --fasta-str FASTA | --dataset-id ID)
                    [--models 1,2,3] [--recycles N] [--amber] [--wait] [--out DIR]
\`\`\`
Separate chains with : for multimer (e.g. >binder:target)
  phi complex_folding --fasta binder_target.fasta --wait

### phi openfold3
\`\`\`
phi openfold3 (--fasta FILE | --fasta-str FASTA | --dataset-id ID)
              [--dna SEQUENCE] [--rna SEQUENCE]
              [--output-format pdb|mmcif] [--recycles N] [--wait] [--out DIR]
\`\`\`
  phi openfold3 --fasta protein.fasta --dna "AGGAACACGTGACCC" --wait --out ./of3_results/

### phi inverse_folding (proteinmpnn)
\`\`\`
phi inverse_folding (--pdb FILE | --pdb-gcs URI | --dataset-id ID)
                    [--num-sequences N] [--temperature T] [--wait] [--out DIR]
\`\`\`

### phi esm2
\`\`\`
phi esm2 (--fasta FILE | --fasta-str FASTA | --dataset-id ID) [--wait] [--out DIR]
\`\`\`

### phi boltz
\`\`\`
phi boltz (--fasta FILE | --yaml FILE | --dataset-id ID) [--wait] [--out DIR]
\`\`\`

### phi filter
\`\`\`
phi filter [--dataset-id ID] [--preset default|relaxed]
           [--plddt-threshold F] [--ptm-threshold F]
           [--iptm-threshold F] [--ipae-threshold F] [--rmsd-threshold F]
           [--wait] [--out DIR]
\`\`\`
  phi filter --preset default --wait --out ./results/

### phi scores
\`\`\`
phi scores [JOB_ID] [--top N] [--out FILE] [--json]
\`\`\`

### phi download
\`\`\`
phi download [JOB_ID] [--out DIR] [--all]
\`\`\`

### phi research
\`\`\`
phi research --question QUESTION [--target TARGET] [--databases LIST]
             [--structures] [--context-file FILE] [--dataset-id ID]
\`\`\`
  phi research --question "What are PD-L1 binding hotspots?" --target PD-L1 --structures

## Filter presets
Metric       default    relaxed    Description
pLDDT        ≥ 0.80     ≥ 0.80     ESMFold per-residue confidence (0–1)
pTM          ≥ 0.55     ≥ 0.45     Global TM-score proxy from ESMFold
ipTM         ≥ 0.50     ≥ 0.50     Interface pTM from AF2 multimer (0–1)
iPAE         ≤ 10.85 Å  ≤ 12.4 Å  AF2 interface predicted aligned error
RMSD         ≤ 3.5 Å    ≤ 4.5 Å   Backbone RMSD vs. reference design

Override any threshold alongside a preset:
  phi filter --preset default --plddt-threshold 0.75 --iptm-threshold 0.45

## Workflows

### Full binder design pipeline
\`\`\`
phi fetch --pdb 4ZQK --chain A --residues 56-290 --out target.pdb
phi design --target-pdb target.pdb --hotspots A45,A67 --num-designs 50
phi upload --dir ./rfdiffusion_outputs/ --file-type pdb
phi filter --preset default --wait --out ./results/
phi scores --top 30
\`\`\`

### BoltzGen binder design
\`\`\`
phi fetch --uniprot Q9NZQ7 --trim-low-confidence 70 --upload
phi boltzgen --yaml design.yaml --protocol protein-anything --num-designs 10000
phi download --out ./boltzgen_results/
\`\`\`

### OpenFold3 protein–DNA complex
\`\`\`
phi fetch --pdb 5GNJ --chain A --out tf.pdb
phi openfold3 --fasta tf_sequence.fasta --dna "AGGAACACGTGACCC" --wait --out ./of3_results/
\`\`\`

### Validate a batch of sequences
\`\`\`
phi upload sequences.fasta
phi folding --dataset-id <id> --wait
phi esm2 --dataset-id <id> --wait
phi download --out ./validation/
\`\`\`

### Research-guided campaign
\`\`\`
phi research --question "What are the binding hotspots of PD-L1?" \\
  --target PD-L1 --structures --dataset-id <id>
phi notes <dataset-id>
\`\`\`
`;

// ---------------------------------------------------------------------------
// CLI Reference — main component
// ---------------------------------------------------------------------------

export function CliReference() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="max-w-4xl space-y-0 text-sm"
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold mb-1">Phi CLI Reference</h1>
        <P>
          <strong>phi</strong> is the command-line interface for the Dyno protein design platform.
          Submit and monitor computational biology jobs, manage datasets, run structure prediction
          and inverse-folding pipelines, and download results — all from your terminal.
        </P>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span><strong>Version:</strong> 0.1.0</span>
          <span>·</span>
          <span><strong>Package:</strong> <Code>dyno-phi</Code></span>
          <span>·</span>
          <span><strong>Requires:</strong> Python ≥ 3.9</span>
          <span>·</span>
          <a
            href="https://github.com/dynotx/phi-cli"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Github className="size-3" />
            <span>GitHub</span>
          </a>
        </div>
      </div>

      {/* Installation */}
      <H2 id="installation">Installation &amp; authentication</H2>
      <Snippet code={`pip install dyno-phi\n# or with uv:\nuv tool install dyno-phi`} />
      <P>Set your API key (obtain from Settings → API keys in the Dyno web app):</P>
      <Snippet code={`export DYNO_API_KEY=ak_...`} />
      <P>Verify your connection:</P>
      <Snippet code={`phi login`} />

      <Hr />

      {/* Global flags */}
      <H2 id="global-flags">Global flags</H2>
      <OptionTable
        cols={["Flag", "Default", "Description"]}
        rows={[
          ["--poll-interval S", "5", "Seconds between status-poll requests"],
          ["--version", "—", "Print version and exit"],
          ["--help", "—", "Show help for any command"],
        ]}
      />

      <Hr />

      {/* State caching */}
      <H2 id="state-caching">State caching</H2>
      <P>
        <Code>phi</Code> caches the most recently used <strong>dataset ID</strong> and{" "}
        <strong>job ID</strong> in <Code>.phi-state.json</Code> in the current directory.
        You don&apos;t need to pass <Code>--dataset-id</Code> or <Code>job_id</Code> repeatedly in a session.
      </P>
      <Snippet code={`phi use d7c3a1b2-...         # set active dataset\nphi filter --preset default  # uses cached dataset\nphi scores                   # uses cached job from last filter/model run\nphi download --out ./results # uses cached job`} />
      <P>The footer line printed after every command shows the current active IDs:</P>
      <Snippet code={`Active: dataset [d7c3a1b2-...] · job [cb4553f5-...]`} />

      <Hr />

      {/* Command index */}
      <H2 id="command-index">Command index</H2>
      <OptionTable
        cols={["Command", "Aliases", "Description"]}
        rows={[
          ["phi login", "—", "Verify API key and print connection + identity"],
          ["phi fetch", "—", "Download a structure from RCSB PDB or AlphaFold DB, crop, optionally upload"],
          ["phi upload", "—", "Upload PDB/CIF/FASTA files or a directory → create a dataset"],
          ["phi use", "—", "Set the active dataset ID"],
          ["phi datasets", "—", "List your datasets"],
          ["phi dataset", "—", "Show details for a single dataset"],
          ["phi ingest-session", "—", "Check the status of an ingest session"],
          ["phi design", "rfdiffusion3", "Backbone generation — binder design, de novo, motif scaffolding"],
          ["phi boltzgen", "—", "All-atom generative design from a YAML spec"],
          ["phi folding", "esmfold", "Fast single-sequence structure prediction (ESMFold)"],
          ["phi complex_folding", "alphafold", "Monomer or multimer structure prediction (AlphaFold2)"],
          ["phi openfold3", "—", "Biomolecular complex prediction — proteins, DNA, RNA, ligands (OpenFold3)"],
          ["phi inverse_folding", "proteinmpnn", "Sequence design via inverse folding (ProteinMPNN)"],
          ["phi esm2", "—", "Language model log-likelihood scoring and perplexity"],
          ["phi boltz", "—", "Biomolecular complex prediction — proteins, DNA, RNA (Boltz-1)"],
          ["phi filter", "—", "Full filter pipeline: inverse folding → folding → complex folding → score"],
          ["phi status", "—", "Get the status of a job"],
          ["phi jobs", "—", "List recent jobs"],
          ["phi logs", "—", "Print log stream URL for a job"],
          ["phi cancel", "—", "Cancel a running job"],
          ["phi scores", "—", "Display scoring metrics table for a completed filter job"],
          ["phi download", "—", "Download output files for a completed job"],
          ["phi research", "—", "Run a biological research query with citations"],
          ["phi notes", "—", "View accumulated research notes for a dataset"],
        ]}
      />

      <Hr />

      {/* Detailed reference */}
      <H2 id="detailed-reference">Detailed reference</H2>

      {/* phi login */}
      <H3 id="phi-login">phi login</H3>
      <P>Verify your API key and print your identity and connection details.</P>
      <Snippet code={`phi login [--json]`} />
      <Snippet code={`phi login`} />

      {/* phi fetch */}
      <H3 id="phi-fetch">phi fetch</H3>
      <P>
        Download a structure from <strong>RCSB PDB</strong> or the{" "}
        <strong>AlphaFold Database</strong>, optionally crop it, save it locally, and optionally upload it to the Dyno cloud.
      </P>
      <Snippet code={`phi fetch (--pdb ID | --uniprot ID) [crop options] [output options]`} />
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Source</p>
      <OptionTable
        cols={["Flag", "Description"]}
        rows={[
          ["--pdb ID", "RCSB PDB ID (e.g. 4ZQK)"],
          ["--uniprot ID", "UniProt accession — downloads from AlphaFold DB (e.g. Q9NZQ7)"],
        ]}
      />
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Cropping</p>
      <OptionTable
        cols={["Flag", "Description"]}
        rows={[
          ["--chain CHAIN", "Extract a single chain (e.g. A)"],
          ["--residues START-END", "Keep only residues in this range (e.g. 56-290)"],
          ["--trim-low-confidence PLDDT", "Remove residues with pLDDT below this threshold. Typical value: 70"],
        ]}
      />
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Output</p>
      <OptionTable
        cols={["Flag", "Description"]}
        rows={[
          ["--out FILE", "Output PDB path (default: {ID}[_{chain}].pdb in current dir)"],
          ["--upload", "Upload to Dyno cloud after saving — creates a dataset and prints the GCS URI"],
          ["--name NAME", "Dataset name label when using --upload"],
        ]}
      />
      <Snippet code={`phi fetch --pdb 4ZQK --chain A --residues 56-290 --out target.pdb\nphi fetch --uniprot Q9NZQ7 --trim-low-confidence 70 --upload\nphi fetch --pdb 7XKJ --chain B --upload --name pd-l1-target`} />

      {/* phi upload */}
      <H3 id="phi-upload">phi upload</H3>
      <P>Upload PDB, CIF, or FASTA files (or a directory) to create a dataset for batch processing.</P>
      <Snippet code={`phi upload [FILE ...] [--dir DIR] [options]`} />
      <OptionTable
        cols={["Flag", "Description"]}
        rows={[
          ["FILE ...", "One or more files to upload (positional)"],
          ["--dir DIR", "Upload all matching files in this directory"],
          ["--file-type TYPE", "Override auto-detected file type: pdb, cif, fasta, csv"],
          ["--run-id ID", "Label for this ingest session"],
          ["--wait / --no-wait", "Poll until dataset is READY (default: wait)"],
        ]}
      />
      <Snippet code={`phi upload --dir ./designs/ --file-type pdb\nphi upload binder1.pdb binder2.pdb binder3.pdb\nphi upload --dir ./designs/ --no-wait`} />

      {/* phi use / datasets / dataset / ingest-session */}
      <H3 id="phi-use">phi use</H3>
      <P>Set the active dataset ID, saved to <Code>.phi-state.json</Code>.</P>
      <Snippet code={`phi use d7c3a1b2-4f3e-11ef-9ab7-0242ac120002`} />

      <H3 id="phi-datasets">phi datasets</H3>
      <Snippet code={`phi datasets [--limit N] [--json]`} />

      <H3 id="phi-dataset">phi dataset</H3>
      <Snippet code={`phi dataset DATASET_ID [--json]`} />

      <H3 id="phi-ingest-session">phi ingest-session</H3>
      <P>Check the status of a background ingest session (useful after <Code>phi upload --no-wait</Code>).</P>
      <Snippet code={`phi ingest-session SESSION_ID [--json]`} />

      {/* phi design */}
      <H3 id="phi-design">phi design / rfdiffusion3</H3>
      <P>Generate protein backbones using RFDiffusion3. Supports binder design, de novo generation, and motif scaffolding. Runtime: ~2–5 min per design.</P>
      <Snippet code={`phi design [mode options] [binder options] [generation options] [job options]`} />
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Design mode</p>
      <OptionTable
        cols={["Flag", "Description"]}
        rows={[
          ["--target-pdb FILE", "Target PDB for binder design"],
          ["--target-pdb-gcs URI", "Cloud storage URI to target PDB (gs://…)"],
          ["--length N", "Backbone length for de novo generation (no target)"],
          ["--motif-pdb FILE", "Motif PDB for scaffolding"],
        ]}
      />
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Binder options</p>
      <OptionTable
        cols={["Flag", "Description"]}
        rows={[
          ["--target-chain CHAIN", "Target chain ID (e.g. A)"],
          ["--hotspots A45,A67", "Comma-separated hotspot residues for interface design"],
          ["--motif-residues 10-20,45-55", "Comma-separated motif residue ranges"],
        ]}
      />
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Generation parameters</p>
      <OptionTable
        cols={["Flag", "Default", "Description"]}
        rows={[
          ["--num-designs N", "10", "Number of backbone designs to generate"],
          ["--steps N", "50", "Diffusion inference steps — higher improves quality"],
          ["--contigs STR", "—", "Contig specification string for advanced control"],
          ["--symmetry C3", "—", "Symmetry specification (e.g. C3, D2, C5)"],
        ]}
      />
      <Snippet code={`phi design --target-pdb target.pdb --hotspots A45,A67 --num-designs 50\nphi design --target-pdb-gcs gs://bucket/target.pdb --hotspots A45,A67 --num-designs 100\nphi design --length 80 --num-designs 20\nphi design --motif-pdb motif.pdb --motif-residues 10-20,45-55 --num-designs 30`} />

      {/* phi boltzgen */}
      <H3 id="phi-boltzgen">phi boltzgen</H3>
      <P>All-atom generative binder design using BoltzGen. Takes a YAML design specification. Supports proteins, peptides, antibodies, nanobodies, and small molecule binders. Runtime: ~10–20 min.</P>
      <Snippet code={`phi boltzgen (--yaml FILE | --yaml-gcs URI) [options]`} />
      <OptionTable
        cols={["Flag", "Default", "Description"]}
        rows={[
          ["--yaml FILE", "—", "Local YAML design specification file"],
          ["--yaml-gcs URI", "—", "Cloud storage URI to YAML file (gs://…)"],
          ["--protocol PROTOCOL", "protein-anything", "Design protocol: protein-anything, peptide-anything, protein-small_molecule, antibody-anything, nanobody-anything, protein-redesign"],
          ["--num-designs N", "10", "Intermediate designs to generate. Use 10,000–60,000 for production campaigns"],
          ["--budget N", "num_designs // 10", "Final diversity-optimized design count"],
          ["--only-inverse-fold", "—", "Run inverse folding on an existing structure YAML — skips backbone design"],
        ]}
      />
      <Snippet code={`phi boltzgen --yaml design.yaml --protocol protein-anything --num-designs 10\nphi boltzgen --yaml peptide.yaml --protocol peptide-anything --num-designs 50\nphi boltzgen --yaml binder.yaml --num-designs 20000 --budget 200\nphi boltzgen --yaml structures.yaml --only-inverse-fold --inverse-fold-num-sequences 4`} />

      {/* phi folding */}
      <H3 id="phi-folding">phi folding / esmfold</H3>
      <P>Fast single-sequence structure prediction using ESMFold. Runtime: ~1 min per sequence.</P>
      <Snippet code={`phi folding (--fasta FILE | --fasta-str FASTA | --dataset-id ID) [options]`} />
      <OptionTable
        cols={["Flag", "Default", "Description"]}
        rows={[
          ["--fasta FILE", "—", "FASTA file to submit"],
          ["--fasta-str FASTA", "—", "FASTA content as a string (for scripting)"],
          ["--dataset-id ID", "—", "Pre-ingested dataset ID (batch mode)"],
          ["--recycles N", "3", "Recycling iterations"],
          ["--no-confidence", "—", "Skip per-residue pLDDT extraction"],
        ]}
      />
      <Snippet code={`phi folding --fasta sequences.fasta\nphi folding --dataset-id d7c3a1b2-... --wait --out ./results/\nphi folding --fasta-str ">binder1\nMKTAYIAKQRQISFVKS..."`} />

      {/* phi complex_folding */}
      <H3 id="phi-complex-folding">phi complex_folding / alphafold</H3>
      <P>Monomer or multimer structure prediction using AlphaFold2 (ColabFold pipeline). Automatically detects multimer mode from <Code>:</Code> separators. Runtime: ~8–15 min.</P>
      <Snippet code={`phi complex_folding (--fasta FILE | --fasta-str FASTA | --dataset-id ID) [options]`} />
      <OptionTable
        cols={["Flag", "Default", "Description"]}
        rows={[
          ["--fasta FILE", "—", "FASTA file — use : as chain separator for multimer"],
          ["--dataset-id ID", "—", "Pre-ingested dataset ID (batch mode)"],
          ["--models 1,2,3", "1,2,3", "Model numbers to run"],
          ["--model-type TYPE", "auto", "auto, ptm, multimer_v1, multimer_v2, multimer_v3"],
          ["--msa-tool TOOL", "mmseqs2", "MSA algorithm: mmseqs2 or jackhmmer"],
          ["--template-mode MODE", "none", "Template lookup: none or pdb70"],
          ["--recycles N", "6", "Recycling iterations"],
          ["--num-seeds N", "3", "Number of model seeds"],
          ["--amber", "—", "Run AMBER force-field relaxation"],
        ]}
      />
      <Snippet code={`phi complex_folding --fasta binder_target.fasta\nphi complex_folding --fasta monomer.fasta --amber\nphi complex_folding --dataset-id d7c3a1b2-... --wait --out ./af2_results/`} />

      {/* phi openfold3 */}
      <H3 id="phi-openfold3">phi openfold3</H3>
      <P>
        Third-generation biomolecular complex structure prediction using <strong>OpenFold3</strong> (via NVIDIA NIM).
        Predicts 3D structures of multi-molecule complexes — proteins, DNA, RNA, and small-molecule ligands — in a single
        unified pass. Particularly strong for protein–nucleic acid complexes and transcription factor interfaces.
        Runtime: ~3–8 min.
      </P>
      <Snippet code={`phi openfold3 (--fasta FILE | --fasta-str FASTA | --dataset-id ID) [options]`} />
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Input</p>
      <OptionTable
        cols={["Flag", "Description"]}
        rows={[
          ["--fasta FILE", "FASTA file with one or more chains. Use chain-type prefixes (see below)"],
          ["--fasta-str FASTA", "FASTA content as a string"],
          ["--dataset-id ID", "Pre-ingested dataset ID (batch mode)"],
          ["--dna SEQUENCE", "Additional DNA strand to include in the complex"],
          ["--rna SEQUENCE", "Additional RNA strand to include in the complex"],
        ]}
      />
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Options</p>
      <OptionTable
        cols={["Flag", "Default", "Description"]}
        rows={[
          ["--output-format FORMAT", "pdb", "Output structure format: pdb or mmcif"],
          ["--no-msa", "—", "Disable MSA lookup for faster, lower-accuracy prediction"],
          ["--recycles N", "3", "Recycling iterations"],
          ["--wait", "on", "Poll until job completes"],
          ["--out DIR", "—", "Download results to this directory when done"],
          ["--json", "—", "Output raw JSON"],
        ]}
      />
      <P>
        OpenFold3 uses a per-molecule input format. When using <Code>--fasta</Code>, protein chains are
        identified by sequence; add <Code>--dna</Code> or <Code>--rna</Code> flags to include nucleic
        acid partners. For full multi-molecule JSON control, use the REST API directly.
      </P>
      <Snippet code={`# Predict a protein monomer
phi openfold3 --fasta protein.fasta --wait

# Protein + DNA complex (e.g. transcription factor)
phi openfold3 --fasta protein.fasta --dna "AGGAACACGTGACCC" --wait --out ./of3_results/

# Protein + RNA complex
phi openfold3 --fasta protein.fasta --rna "GCGCUAGCGC" --wait

# Batch prediction over a dataset
phi openfold3 --dataset-id d7c3a1b2-... --wait --out ./of3_batch/`} />

      {/* phi inverse_folding */}
      <H3 id="phi-inverse-folding">phi inverse_folding / proteinmpnn</H3>
      <P>Design sequences for a protein backbone using ProteinMPNN. Runtime: ~1–2 min.</P>
      <Snippet code={`phi inverse_folding (--pdb FILE | --pdb-gcs URI | --dataset-id ID) [options]`} />
      <OptionTable
        cols={["Flag", "Default", "Description"]}
        rows={[
          ["--pdb FILE", "—", "PDB structure file"],
          ["--pdb-gcs URI", "—", "Cloud storage URI to PDB (gs://…)"],
          ["--dataset-id ID", "—", "Pre-ingested dataset ID (batch mode)"],
          ["--num-sequences N", "10", "Sequences to design"],
          ["--temperature T", "0.1", "Sampling temperature 0–1. Lower = more conservative"],
          ["--fixed A52,A56", "—", "Comma-separated residue positions to fix"],
        ]}
      />
      <Snippet code={`phi inverse_folding --pdb design.pdb --num-sequences 20\nphi inverse_folding --pdb binder.pdb --num-sequences 10 --fixed A52,A56,A63\nphi inverse_folding --dataset-id d7c3a1b2-... --num-sequences 4 --wait`} />

      {/* phi esm2 */}
      <H3 id="phi-esm2">phi esm2</H3>
      <P>Language model scoring with ESM2 — pseudo-log-likelihood (PLL) scores and perplexity for sequence plausibility filtering.</P>
      <Snippet code={`phi esm2 (--fasta FILE | --fasta-str FASTA | --dataset-id ID) [options]`} />
      <Snippet code={`phi esm2 --fasta designed_sequences.fasta --wait`} />

      {/* phi boltz */}
      <H3 id="phi-boltz">phi boltz</H3>
      <P>Biomolecular complex structure prediction using Boltz-1 (open-source). Supports proteins, DNA, and RNA.</P>
      <Snippet code={`phi boltz (--fasta FILE | --fasta-str FASTA | --dataset-id ID) [options]`} />
      <OptionTable
        cols={["Flag", "Default", "Description"]}
        rows={[
          ["--recycles N", "3", "Recycling iterations"],
          ["--no-msa", "—", "Disable MSA for faster, lower-accuracy prediction"],
        ]}
      />
      <Snippet code={`phi boltz --fasta complex.fasta --wait`} />

      {/* phi filter */}
      <H3 id="phi-filter">phi filter</H3>
      <P>
        Run the full binder design validation pipeline on a dataset:
        ProteinMPNN → ESMFold → AlphaFold2 → scoring.
      </P>
      <Snippet code={`phi filter [--dataset-id ID] [--preset NAME] [threshold flags] [options]`} />
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Preset</p>
      <OptionTable
        cols={["Flag", "Description"]}
        rows={[
          ["--preset default|relaxed", "Apply a named threshold preset. Individual flags override preset values"],
        ]}
      />
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Threshold overrides</p>
      <OptionTable
        cols={["Flag", "Default", "Description"]}
        rows={[
          ["--plddt-threshold F", "0.80", "ESMFold binder pLDDT lower bound"],
          ["--ptm-threshold F", "0.55", "AlphaFold2 complex pTM lower bound"],
          ["--iptm-threshold F", "0.50", "AlphaFold2 interface pTM lower bound"],
          ["--ipae-threshold F", "10.85 Å", "AlphaFold2 interface PAE upper bound"],
          ["--rmsd-threshold F", "3.5 Å", "Binder backbone RMSD upper bound"],
        ]}
      />
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Pipeline options</p>
      <OptionTable
        cols={["Flag", "Default", "Description"]}
        rows={[
          ["--num-sequences N", "4", "ProteinMPNN sequences per design"],
          ["--num-recycles N", "3", "AlphaFold2 recycling iterations"],
          ["--msa-tool TOOL", "single_sequence", "single_sequence (recommended for de novo binders), mmseqs2, jackhmmer"],
          ["--wait", "on", "Poll until pipeline completes"],
          ["--out DIR", "—", "Download results when done"],
          ["--all", "—", "When --out is set, download all artifact types"],
        ]}
      />
      <Snippet code={`phi filter --preset default --wait\nphi filter --dataset-id d7c3a1b2-... --plddt-threshold 0.75 --iptm-threshold 0.45 --wait\nphi filter --preset relaxed --wait --out ./results/\nphi filter --preset default --wait --out ./results/ --all`} />

      {/* phi status / jobs / logs / cancel */}
      <H3 id="phi-status">phi status</H3>
      <Snippet code={`phi status JOB_ID [--json]`} />

      <H3 id="phi-jobs">phi jobs</H3>
      <OptionTable
        cols={["Flag", "Default", "Description"]}
        rows={[
          ["--limit N", "20", "Number of jobs to show"],
          ["--status STATUS", "—", "Filter: pending, running, completed, failed, cancelled"],
          ["--job-type TYPE", "—", "Filter by job type (e.g. esmfold, design_pipeline)"],
          ["--json", "—", "Print raw JSON"],
        ]}
      />
      <Snippet code={`phi jobs\nphi jobs --status running\nphi jobs --limit 50 --job-type design_pipeline`} />

      <H3 id="phi-logs">phi logs</H3>
      <Snippet code={`phi logs JOB_ID [--follow]`} />

      <H3 id="phi-cancel">phi cancel</H3>
      <Snippet code={`phi cancel JOB_ID`} />

      {/* phi scores / download */}
      <H3 id="phi-scores">phi scores</H3>
      <P>Display the scoring metrics table for a completed filter job.</P>
      <OptionTable
        cols={["Flag", "Default", "Description"]}
        rows={[
          ["JOB_ID", "cached", "Job ID (default: last cached job)"],
          ["--top N", "20", "Show top-N candidates ranked by score"],
          ["--out FILE", "—", "Save scores CSV to file"],
          ["--json", "—", "Output raw JSON"],
        ]}
      />
      <Snippet code={`phi scores\nphi scores --top 50 --out scores.csv`} />

      <H3 id="phi-download">phi download</H3>
      <P>Download all output files for a completed job — structures, scores CSV, and raw score JSONs.</P>
      <OptionTable
        cols={["Flag", "Default", "Description"]}
        rows={[
          ["JOB_ID", "cached", "Job ID (default: last cached job)"],
          ["--out DIR", "./results", "Output directory"],
          ["--all", "—", "Download all artifact types including MSA files and archives"],
        ]}
      />
      <Snippet code={`phi download --out ./results/\nphi download --out ./results/ --all\nphi download cb4553f5-... --out ./run-42/`} />

      {/* phi research / notes */}
      <H3 id="phi-research">phi research</H3>
      <P>Run a biological research query against PubMed, UniProt, and PDB. Synthesises a report with citations. Runtime: ~2–5 min.</P>
      <OptionTable
        cols={["Flag", "Default", "Description"]}
        rows={[
          ["--question QUESTION", "(required)", "Research question (e.g. \"What are binding hotspots for PD-L1?\")"],
          ["--target TARGET", "—", "Protein or gene name to focus the search (e.g. PD-L1, KRAS)"],
          ["--databases LIST", "pubmed,uniprot,pdb", "Comma-separated databases to query"],
          ["--max-papers N", "20", "Maximum PubMed papers to retrieve"],
          ["--structures", "—", "Include related PDB structures in the report"],
          ["--context-file FILE", "—", "Path to a prior research.md — prepended as context"],
          ["--dataset-id ID", "—", "Associate notes with a dataset and sync to cloud storage"],
          ["--notes-file FILE", "./research.md", "Local append-only notes file"],
          ["--no-save", "—", "Skip saving the report to the local notes file"],
        ]}
      />
      <Snippet code={`phi research --question "What are the known binding hotspots for PD-L1?"

phi research \\
  --question "What is the structure and function of EGFR domain III?" \\
  --target EGFR --structures --dataset-id d7c3a1b2-...

# Build on a prior research session
phi research \\
  --question "Which of these hotspots are most druggable?" \\
  --context-file ./research.md`} />

      <H3 id="phi-notes">phi notes</H3>
      <Snippet code={`phi notes DATASET_ID [--out PATH] [--json]`} />
      <Snippet code={`phi notes d7c3a1b2-... --out ./campaign-notes.md`} />

      <Hr />

      {/* Filter presets */}
      <H2 id="filter-presets">Filter presets</H2>
      <P>
        <Code>phi filter --preset</Code> applies a named set of quality-control thresholds across the full validation pipeline.
        Override any individual threshold alongside a preset.
      </P>
      <OptionTable
        cols={["Metric", "default", "relaxed", "Description"]}
        rows={[
          ["pLDDT", "≥ 0.80", "≥ 0.80", "ESMFold per-residue confidence (0–1)"],
          ["pTM", "≥ 0.55", "≥ 0.45", "Global TM-score proxy from ESMFold"],
          ["ipTM", "≥ 0.50", "≥ 0.50", "Interface pTM from AF2 multimer (0–1)"],
          ["iPAE", "≤ 10.85 Å", "≤ 12.4 Å", "AF2 interface predicted aligned error"],
          ["RMSD", "≤ 3.5 Å", "≤ 4.5 Å", "Backbone RMSD vs. reference design"],
        ]}
      />
      <Snippet code={`phi filter --preset default --plddt-threshold 0.75 --iptm-threshold 0.45`} />
      <P>
        The <Code>single_sequence</Code> MSA mode (default for <Code>phi filter</Code>) is recommended for de novo
        designed binders — they have no natural homologs, so MSA adds noise rather than signal.
      </P>

      <Hr />

      {/* Workflows */}
      <H2 id="workflows">Workflows</H2>

      <H3 id="workflow-binder">Full binder design pipeline</H3>
      <Snippet code={`# 1. Fetch and prepare target
phi fetch --pdb 4ZQK --chain A --residues 56-290 --out target.pdb

# 2. Generate backbones
phi design --target-pdb target.pdb --hotspots A45,A67 --num-designs 50

# 3. Upload backbones for batch validation
phi upload --dir ./rfdiffusion_outputs/ --file-type pdb

# 4. Run full filter pipeline
phi filter --preset default --wait --out ./results/

# 5. Review scores
phi scores --top 30`} />

      <H3 id="workflow-boltzgen">BoltzGen binder design</H3>
      <Snippet code={`# 1. Fetch target and upload to get GCS URI
phi fetch --uniprot Q9NZQ7 --trim-low-confidence 70 --upload

# 2. Create YAML spec referencing the GCS URI, then run
phi boltzgen --yaml design.yaml --protocol protein-anything --num-designs 10000

# 3. Download top designs
phi download --out ./boltzgen_results/`} />

      <H3 id="workflow-of3">OpenFold3 protein–DNA complex</H3>
      <Snippet code={`# Predict a transcription factor–DNA interface
phi fetch --pdb 5GNJ --chain A --out tf.pdb
phi openfold3 \\
  --fasta tf_sequence.fasta \\
  --dna "AGGAACACGTGACCC" \\
  --wait --out ./of3_results/`} />

      <H3 id="workflow-validate">Validate a batch of sequences</H3>
      <Snippet code={`# Upload FASTA sequences
phi upload sequences.fasta

# Structure prediction
phi folding --dataset-id d7c3a1b2-... --wait

# Score with ESM2
phi esm2 --dataset-id d7c3a1b2-... --wait

# Download results
phi download --out ./validation/`} />

      <H3 id="workflow-research">Research-guided campaign</H3>
      <Snippet code={`phi research \\
  --question "What are the binding hotspots of PD-L1 for therapeutic binders?" \\
  --target PD-L1 --structures --dataset-id d7c3a1b2-...

phi notes d7c3a1b2-...`} />
    </motion.div>
  );
}
