"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Terminal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CodeHighlight } from "@/components/ui/code-highlight";
import { cn } from "@/lib/utils";
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

const INSTALL_PIP = `# Requires Python ≥ 3.11
pip install dyno-phi`;

const INSTALL_UV = `# Requires Python ≥ 3.11
uv tool install dyno-phi`;

const SETUP_API_KEY = `# Get your key at design.dynotx.com/dashboard/settings
export DYNO_API_KEY="your_key_here"`;

const SKILL_PLUGIN = `# In Claude Code, run the plugin install command:
/plugin install dyno-phi`;

const SKILL_MANUAL = `# Download phi-skill.md and place it in your project's skills/ directory,
# then reference it in your agent config:
echo "Read skills/phi-skill.md for protein design." >> CLAUDE.md
# Works with Claude Code, Cursor, Codex, or any agent that reads Skills.md files.`;

const EXAMPLE_RESEARCH = `# Understand the target before committing to a design campaign
phi research --question "What are the key binding hotspots on PD-L1?"`;

const EXAMPLE_DESIGN = `# Generate binder candidates against a target structure
phi design --target target.pdb --num-designs 10000 --out ./candidates`;

const EXAMPLE_FILTER = `# Score, calibrate, and rank — apply default or relaxed thresholds
phi filter --preset default --wait`;

const OTHER_COMMANDS = [
  { cmd: "phi esmfold", desc: "fast single-sequence structure screen" },
  { cmd: "phi alphafold", desc: "high-accuracy complex validation" },
  { cmd: "phi esm2", desc: "log-likelihood and perplexity scoring" },
  { cmd: "phi upload", desc: "bulk-upload FASTA/PDB datasets" },
  { cmd: "phi scores", desc: "view per-design scoring results" },
  { cmd: "phi jobs", desc: "list, poll, and cancel running jobs" },
];

type InstallMethod = "uv" | "pip";
type SkillMethod = "plugin" | "manual";

export function SkillsTab() {
  const skill = CLAUDE_SKILLS.find((s) => s.id === "phi");
  const [installMethod, setInstallMethod] = useState<InstallMethod>("uv");
  const [skillMethod, setSkillMethod] = useState<SkillMethod>("plugin");

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
      className="space-y-3 max-w-3xl"
    >
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold mb-0.5">Phi Skills</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          One skill file gives your coding agent (e.g. Claude Code, Cursor) access to all Dyno Phi
          protein design capabilities through the{" "}
          <code className="font-mono text-xs bg-muted px-1 rounded">phi</code>{" "}
          CLI. Single commands wrap complex multi-step workflows, reducing token usage by ~90% on agentic design tasks.
        </p>
      </div>

      {/* Single skill card */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <Terminal className="size-3.5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{skill.name}</span>
                <Badge variant="secondary" className="text-xs font-normal font-mono">
                  v{skill.version}
                </Badge>
                <Badge variant="outline" className="text-xs font-normal font-mono">
                  {skill.filename}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{skill.description}</p>
              <ul className="space-y-0.5 pt-1">
                {skill.capabilities.map((cap) => {
                  const [label, detail] = cap.split(" — ");
                  return (
                    <li key={cap} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{label}</span>
                      {detail && <> — {detail}</>}
                    </li>
                  );
                })}
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

      {/* Setup — quick start */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-medium">Setup</h3>

        {/* Step 1: API key */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            1 — Get an API key
          </p>
          <CodeHighlight code={SETUP_API_KEY} lang="bash" />
        </div>

        {/* Step 2: Add skill */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              2 — Add the skill to your agent
            </p>
            <div className="flex items-center rounded-md bg-muted p-0.5 gap-0.5 text-xs">
              {([
                { id: "plugin", label: "Claude Code plugin" },
                { id: "manual", label: "Manual" },
              ] as const).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setSkillMethod(id)}
                  className={cn(
                    "px-3 py-1 rounded transition-colors",
                    skillMethod === id
                      ? "bg-background text-foreground shadow-sm dark:bg-zinc-600 dark:text-zinc-100"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <CodeHighlight
            code={skillMethod === "plugin" ? SKILL_PLUGIN : SKILL_MANUAL}
            lang="bash"
          />
          {skillMethod === "plugin" ? (
            <p className="text-xs text-muted-foreground">
              The Dyno Phi skill is listed in the{" "}
              <span className="text-foreground font-medium">Claude Code Skills Marketplace</span>.
              Run <code className="font-mono bg-muted px-1 rounded">/plugin install dyno-phi</code> in
              any Claude Code session to add it — no file management needed.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Download <code className="font-mono bg-muted px-1 rounded">phi-skill.md</code> using
              the button above, place it in your project&rsquo;s{" "}
              <code className="font-mono bg-muted px-1 rounded">skills/</code> directory, then
              reference it in your agent config. Works with Claude Code, Cursor,
              Windsurf, or any agent that reads context files.
            </p>
          )}
        </div>
      </Card>

      {/* Manual CLI install */}
      <Card className="p-4 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Install the CLI manually
          </p>
          <div className="flex items-center rounded-md bg-muted p-0.5 gap-0.5 text-xs">
            {(["uv", "pip"] as const).map((method) => (
              <button
                key={method}
                onClick={() => setInstallMethod(method)}
                className={cn(
                  "px-3 py-1 rounded font-mono transition-colors",
                  installMethod === method
                    ? "bg-background text-foreground shadow-sm dark:bg-zinc-600 dark:text-zinc-100"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {method}
              </button>
            ))}
          </div>
        </div>
        <CodeHighlight
          code={installMethod === "pip" ? INSTALL_PIP : INSTALL_UV}
          lang="bash"
        />
        {installMethod === "uv" && (
          <p className="text-xs text-muted-foreground">
            New to uv?{" "}
            <a
              href="https://docs.astral.sh/uv/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              docs.astral.sh/uv
            </a>{" "}
            — a fast Python package and project manager. Use{" "}
            <code className="font-mono bg-muted px-1 rounded">uv tool install</code> to make{" "}
            <code className="font-mono bg-muted px-1 rounded">phi</code> available globally without
            activating a virtualenv.
          </p>
        )}
      </Card>

      {/* Example */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-medium">Core workflow</h3>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Research</p>
          <CodeHighlight code={EXAMPLE_RESEARCH} lang="bash" />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Design</p>
          <CodeHighlight code={EXAMPLE_DESIGN} lang="bash" />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filter</p>
          <CodeHighlight code={EXAMPLE_FILTER} lang="bash" />
        </div>

        <div className="space-y-1.5 pt-1 border-t">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">More commands</p>
          <ul className="space-y-0.5">
            {OTHER_COMMANDS.map(({ cmd, desc }) => (
              <li key={cmd} className="text-xs text-muted-foreground">
                <code className="font-mono text-foreground bg-muted px-1 rounded">{cmd}</code>
                {" — "}{desc}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground pt-0.5">
            All compute runs on Dyno cloud GPUs — no local GPU required.{" "}
            <a
              href="/docs"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Full CLI reference →
            </a>
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
