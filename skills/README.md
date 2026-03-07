# Protein Design Skills

This directory contains skills that the agent can use for protein design workflows. Each skill is defined in a `SKILL.md` file with YAML frontmatter.

## Skill Format

Skills must have a `SKILL.md` file with this structure:

```markdown
---
name: skill_name
description: What this skill does and when to use it
category: design-tools | validation | utilities | orchestration
tags: [tag1, tag2]
biomodals_script: modal_script.py  # or null if not using biomodals
recommended_timeout: 600  # seconds
recommended_gpu: T4 | A10G | A100  # optional
tool_schema:  # JSON schema for LLM function calling
  type: object
  properties:
    param1:
      type: string
      description: Parameter description
  required:
    - param1
---

# Skill Documentation

Detailed usage, examples, QC thresholds, etc.
```

## Available Skills

### Core Design Tools

| Skill | Description | Category |
|-------|-------------|----------|
| `rfdiffusion` | Generate protein backbones using diffusion | design-tools |
| `proteinmpnn` | Design sequences for backbones via inverse folding | design-tools |

### Validation Tools

| Skill | Description | Category |
|-------|-------------|----------|
| `esmfold` | Fast structure prediction from sequence (~1 min) | validation |
| `alphafold` | High-accuracy structure prediction (10-20 min) | validation |
| `rf3` | Structure prediction with RoseTTAFold | validation |
| `chai` | Multi-modal structure prediction (complexes, ligands) | validation |
| `ligandmpnn` | Ligand-aware sequence design | validation |

### Utilities

| Skill | Description | Category |
|-------|-------------|----------|
| `pdb_fetch` | Fetch PDB structures from RCSB | utilities |

## Adding New Skills

1. Create a directory: `skills/your-skill/`
2. Add `SKILL.md` with proper YAML frontmatter
3. Include `tool_schema` for LLM function calling
4. Optionally add reference docs in `skills/your-skill/references/`
5. Test locally: `uv run python3 -c "from backend.skills.loader import SkillLoader; SkillLoader('skills')"`
6. Deploy: `uv run modal deploy modal_apps/api.py`

## Tool Schema Guidelines

The `tool_schema` should follow JSON Schema format and will be used by GPT-4o for function calling:

```yaml
tool_schema:
  type: object
  properties:
    param_name:
      type: string | integer | number | boolean
      description: Clear description for LLM
      default: optional_default  # optional
    enum_param:
      type: string
      enum: [option1, option2]  # for limited choices
  required:
    - param_name  # list required parameters
```

## Skill Execution

Skills are executed via the `ModalSandboxExecutor`:

1. LLM parses user intent and selects appropriate skill
2. LLM generates arguments matching the `tool_schema`
3. Agent validates arguments against schema
4. Agent executes skill via biomodals script or custom implementation
5. Agent returns structured results to user

## Testing Skills

```bash
# Test skill loading
uv run python3 -c "
from backend.skills.loader import SkillLoader
from pathlib import Path
loader = SkillLoader(Path('skills'))
for name in loader.skills:
    print(name)
"

# Test via API (after deployment)
curl -X POST https://YOUR-URL/design \
  -H "Content-Type: application/json" \
  -d '{"message": "Use rfdiffusion to generate a binder"}'
```

## Categories

- **design-tools**: Backbone generation, sequence design, structure design
- **validation**: Structure prediction, QC metrics, ranking
- **utilities**: File operations, database queries, preprocessing
- **orchestration**: Workflow coordination, campaign management
