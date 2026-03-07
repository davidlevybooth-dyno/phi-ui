# Dyno Phi Skills

Claude Code skills and a unified CLI for the
[Dyno Phi](https://design.dynotx.com) protein design platform.

These skills call the Dyno Phi REST API at `design.dynotx.com/api/v1`.
All compute runs on cloud GPUs — no local GPU or Modal account needed.

## Setup

### 1. Get an API key

Open [Settings → API keys](https://design.dynotx.com/dashboard/settings) and
create a long-lived key. Copy it.

### 2. Export your key

```bash
export DYNO_API_KEY=your_key_here

# Add to shell profile for persistence
echo 'export DYNO_API_KEY=your_key_here' >> ~/.zshrc
```

Or save to `.env` in your project root:

```
DYNO_API_KEY=your_key_here
```

### 3. Install the CLI

```bash
pip install -e ./skills/dyno-phi/
```

This installs the `phi` command. Alternatively, run directly:

```bash
python skills/dyno-phi/phi.py esmfold --fasta sequences.fasta
```

## Available Commands

| Command | Runtime | Description |
|---------|---------|-------------|
| `phi esmfold` | ~1 min | Fast structure prediction |
| `phi alphafold` | 8–15 min | Complex validation, final QC |
| `phi proteinmpnn` | 1–2 min | Inverse folding / sequence design |
| `phi esm2` | 1–2 min | Language model sequence scoring |
| `phi boltz` | 6–10 min | Open-source complex prediction |
| `phi research` | 2–5 min | Biological research with citations |

## Skills for Claude Code

| Skill | File | Covers |
|-------|------|--------|
| [Phi](phi-skill.md) | `phi-skill.md` | All scoring models via `phi` CLI |
| [Phi Research](phi-research-skill.md) | `phi-research-skill.md` | Literature & database research |

Download from [design.dynotx.com](https://design.dynotx.com) → Skills tab.

## CLI Quick Reference

```bash
# Research target biology first
phi research --question "What are PD-L1 binding hotspots?" --target PD-L1

# Design sequences
phi proteinmpnn --pdb scaffold.pdb --num-sequences 50 --fixed A52,A56

# Screen structures fast
phi esmfold --fasta designs.fasta

# Validate complexes
phi alphafold --fasta top_candidates.fasta   # multimer auto-detected from ':'

# Score evolutionary plausibility
phi esm2 --fasta top_candidates.fasta

# Job management
phi jobs
phi status JOB_ID
phi download JOB_ID --out results
phi cancel JOB_ID
```

## Recommended Pipeline

```
1. Research        →  phi research --question "..." --target TARGET
2. Sequence design →  phi proteinmpnn --pdb scaffold.pdb --num-sequences 50
3. Fast screen     →  phi esmfold --fasta sequences.fasta
                       Filter: mean pLDDT ≥ 70
4. Validation      →  phi alphafold --fasta top_candidates.fasta
                       Filter: ipTM ≥ 0.70, ipSAE ≤ 6.0
5. Scoring         →  phi esm2 --fasta top_candidates.fasta
                       Filter: perplexity ≤ 8.0
```

## Key Metrics

| Metric | Source | Pass | Description |
|--------|--------|------|-------------|
| `plddt` (mean) | ESMFold, AF2 | ≥ 70–85 | Structure confidence |
| `complex_iptm` | AlphaFold2 | ≥ 0.70 | Interface TM-score |
| `complex_i_psae_mean` | AlphaFold2 | ≤ 6.0 Å | Interface aligned error |
| `mpnn_score` | ProteinMPNN | ≥ 0.40 | Sequence–structure fit |
| `perplexity` | ESM2 | ≤ 8.0 | Evolutionary plausibility |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DYNO_API_KEY` | Yes | — | API key from Settings |
| `DYNO_API_BASE_URL` | No | `https://design.dynotx.com` | API base URL override |
| `DYNO_ORG_ID` | No | `default-org` | Organization ID header |
| `DYNO_USER_ID` | No | `default-user` | User ID header |

## Claude Code Integration

Download the `phi-skill.md` from [design.dynotx.com](https://design.dynotx.com),
place it in your project's `skills/` directory, and reference it from `CLAUDE.md`:

```markdown
# CLAUDE.md
Read skills/phi-skill.md for protein design capabilities.
```

Then ask Claude naturally:

```
"Score these sequences with ESMFold, filter to pLDDT > 70,
 then validate the top 20 with AlphaFold2."
```
