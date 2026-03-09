"use client";

import { motion } from "framer-motion";
import { Download, Terminal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CodeHighlight } from "@/components/ui/code-highlight";
import { CLAUDE_SKILLS, type ClaudeSkill } from "@/lib/models-data";

async function downloadSkill(skill: ClaudeSkill) {
  const content =
    skill.downloadUrl != null
      ? await fetch(skill.downloadUrl).then((r) => {
          if (!r.ok) throw new Error("Download failed");
          return r.text();
        })
      : skill.content ?? "";
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = skill.filename;
  a.click();
  URL.revokeObjectURL(url);
}

const SETUP_SNIPPET = `# 1. Install the phi CLI
pip install -e ./skills/dyno-phi/

# 2. Get an API key and export it
open https://design.dynotx.com/dashboard/settings
export DYNO_API_KEY="your_key_here"

# 3. Add the skill to your project
#    Place phi-skill.md in your project's skills/ directory
#    then reference it in your agent config (e.g. CLAUDE.md, .cursorrules):
echo "Read skills/phi-skill.md for protein design." >> CLAUDE.md`;

const EXAMPLE_SNIPPET = `# Ask your coding agent in natural language:
"Score these sequences with ESMFold and AlphaFold2,
 filter to ipTM > 0.70, and give me the top 10."

# Your agent uses phi commands under the hood:
phi research   --question "What are PD-L1 binding hotspots?" --target PD-L1
phi esmfold    --fasta designs.fasta --out ./screen
phi alphafold  --fasta top_candidates.fasta --out ./validation
phi esm2       --fasta final_candidates.fasta`;

export function SkillsTab() {
  const skill = CLAUDE_SKILLS.find((s) => s.id === "phi");

  if (!skill) {
    return (
      <p className="text-sm text-muted-foreground">
        Skill configuration not found. Check <code className="font-mono">CLAUDE_SKILLS</code> in{" "}
        <code className="font-mono">models-data.ts</code>.
      </p>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-8 max-w-3xl"
    >
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Phi Skills</h2>
        <p className="text-sm text-muted-foreground max-w-xl">
          One skill file gives your coding agent (e.g. Claude Code, Cursor) access
          to all Dyno Phi capabilities through the{" "}
          <code className="font-mono text-xs bg-muted px-1 rounded">phi</code>{" "}
          CLI — structure prediction, sequence design, scoring, and biological
          research.
        </p>
      </div>

      {/* Single skill card */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <Terminal className="size-4" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{skill.name}</span>
                <Badge variant="secondary" className="text-xs font-normal font-mono">
                  v{skill.version}
                </Badge>
                <Badge variant="outline" className="text-xs font-normal font-mono">
                  {skill.filename}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{skill.description}</p>
              <ul className="space-y-0.5 pt-0.5">
                {skill.capabilities.map((cap) => (
                  <li
                    key={cap}
                    className="text-xs text-muted-foreground flex items-start gap-1.5"
                  >
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/40 block" />
                    {cap}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 shrink-0"
            onClick={() => downloadSkill(skill)}
          >
            <Download className="size-3.5" />
            Download
          </Button>
        </div>
      </Card>

      {/* Setup */}
      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-medium">Setup</h3>
        <CodeHighlight code={SETUP_SNIPPET} lang="bash" />
      </Card>

      {/* Example */}
      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-medium">Example: agent conversation</h3>
        <CodeHighlight code={EXAMPLE_SNIPPET} lang="bash" />
        <p className="text-xs text-muted-foreground">
          All compute runs on Dyno cloud GPUs — no local GPU required.
        </p>
      </Card>
    </motion.div>
  );
}
