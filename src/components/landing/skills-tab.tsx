"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Download, Github, Terminal, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CodeHighlight } from "@/components/ui/code-highlight";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

// ---------------------------------------------------------------------------
// Snippets
// ---------------------------------------------------------------------------

const INSTALL_PIP = `# Requires Python ≥ 3.9
pip install dyno-phi`;

const INSTALL_UV = `# Requires Python ≥ 3.9
uv tool install dyno-phi`;

const SETUP_API_KEY = `# Get key at design.dynotx.com → Settings
export DYNO_API_KEY="your_key_here"`;

const CLI_QUICKSTART = `# Upload binder PDB / FASTA files
phi upload ./designs/

# Run filter pipeline
phi filter --preset default --wait

# View ranked scores
phi scores`;

const SKILL_PLUGIN = `# Add from marketplace in Claude Code:
/plugin marketplace add dynotx/phi-cli

# Then install:
/plugin install dyno-phi@phi-cli`;

const SKILL_MANUAL = `# Place phi-skill.md in your skills/ dir,
# then add to your agent config:
echo "Read skills/phi-skill.md" >> CLAUDE.md
# Works with Claude Code, Cursor, Codex.`;

const EXAMPLE_TUTORIAL = `# Example files and tutorial
phi tutorial`;

const EXAMPLE_RESEARCH = `# Research the target first
phi research --question \
  "What are PD-L1 binding hotspots?"`;

const EXAMPLE_FILTER = `# Filter with default thresholds
phi filter --preset default --wait`;

// ---------------------------------------------------------------------------
// Copyable plain-text version — for pasting into AI agents as context
// ---------------------------------------------------------------------------

export const SKILLS_COPY_TEXT = `# Dyno Phi — Access Guide

## What is Phi?
Dyno Phi is a filtering and ranking platform for AI-generated protein binder candidates.
You bring the designs; Phi scores them with ESMFold, AlphaFold2, and ProteinMPNN,
applies experimentally calibrated thresholds, and returns a ranked shortlist ready for synthesis.

## 1. CLI

Setup:
1. Sign up at design.dynotx.com
2. Create an API key under Settings
3. Install: pip install dyno-phi  (Python ≥ 3.9, or: uv tool install dyno-phi)
4. Set your key: export DYNO_API_KEY="your_key_here"

Quickstart:
  phi upload ./designs/
  phi filter --preset default --wait
  phi scores

Full CLI reference: https://design.dynotx.com/#docs

## 2. Claude Code (and other coding agents)

Setup:
1. Sign up at design.dynotx.com
2. Create an API key under Settings
3. Add the skill (Claude Code plugin):
     /plugin marketplace add dynotx/phi-cli
     /plugin install dyno-phi@phi-cli
   Or manually: download phi-skill.md and place it in your project's skills/ directory
4. Set your key: export DYNO_API_KEY="your_key_here"

Example commands:
  ${EXAMPLE_TUTORIAL}
  ${EXAMPLE_RESEARCH}
  ${EXAMPLE_FILTER}

Full CLI reference: https://design.dynotx.com/#docs
`;

// ---------------------------------------------------------------------------
// Sub-section types
// ---------------------------------------------------------------------------

type AccessSection = "cli" | "claude";

// ---------------------------------------------------------------------------
// Shared sign-up steps component
// ---------------------------------------------------------------------------

function SignUpSteps({ startAt = 1 }: { startAt?: number }) {
  return (
    <>
      <li className="flex gap-3">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold mt-0.5">
          {startAt}
        </span>
        <div className="text-sm">
          <span className="font-medium">Sign up</span>
          <span className="text-muted-foreground">
            {" "}— Create an account at{" "}
            <a
              href="https://design.dynotx.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              design.dynotx.com
            </a>
            .
          </span>
        </div>
      </li>
      <li className="flex gap-3">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold mt-0.5">
          {startAt + 1}
        </span>
        <div className="text-sm">
          <span className="font-medium">Create an API key</span>
          <span className="text-muted-foreground">
            {" "}— Go to{" "}
            <Link
              href="/dashboard/settings"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Settings
            </Link>{" "}
            in the dashboard and generate a key.
          </span>
        </div>
      </li>
    </>
  );
}

// ---------------------------------------------------------------------------
// CLI section
// ---------------------------------------------------------------------------

type InstallMethod = "uv" | "pip";

function CliSection() {
  const [installMethod, setInstallMethod] = useState<InstallMethod>("uv");

  return (
    <div className="space-y-3">
      {/* Sign up + API key */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-medium">Quickstart</h3>
        <ol className="space-y-3">
          <SignUpSteps startAt={1} />

          {/* Step 3: Install */}
          <li className="flex gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold mt-0.5">
              3
            </span>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Install the CLI</span>
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
                  — use{" "}
                  <code className="font-mono bg-muted px-1 rounded">uv tool install</code> to make{" "}
                  <code className="font-mono bg-muted px-1 rounded">phi</code> available globally
                  without activating a virtualenv.
                </p>
              )}
            </div>
          </li>

          {/* Step 4: Set API key */}
          <li className="flex gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold mt-0.5">
              4
            </span>
            <div className="flex-1 space-y-1.5">
              <span className="text-sm font-medium">Set your API key</span>
              <CodeHighlight code={SETUP_API_KEY} lang="bash" />
            </div>
          </li>

          {/* Step 5: Tutorial */}
          <li className="flex gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold mt-0.5">
              5
            </span>
            <div className="flex-1 space-y-1.5">
              <span className="text-sm font-medium">Run the tutorial</span>
              <CodeHighlight code={EXAMPLE_TUTORIAL} lang="bash" />
              <p className="text-xs text-muted-foreground">
                Downloads example datasets and walks you through the full filtering pipeline with real data.
              </p>
            </div>
          </li>

          {/* Step 6: Filter */}
          <li className="flex gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold mt-0.5">
              6
            </span>
            <div className="flex-1 space-y-1.5">
              <span className="text-sm font-medium">Filter your own candidates</span>
              <CodeHighlight code={CLI_QUICKSTART} lang="bash" />
              <p className="text-xs text-muted-foreground">
                State is cached in{" "}
                <code className="font-mono bg-muted px-1 rounded">.phi-state.json</code> — after{" "}
                <code className="font-mono bg-muted px-1 rounded">phi upload</code>, subsequent
                commands pick up the active dataset automatically.{" "}
                <a
                  href="/#docs"
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  Full CLI reference →
                </a>
              </p>
            </div>
          </li>
        </ol>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Claude Code section
// ---------------------------------------------------------------------------

type SkillMethod = "plugin" | "manual";

function ClaudeSection() {
  const skill = CLAUDE_SKILLS.find((s) => s.id === "phi");
  const [skillMethod, setSkillMethod] = useState<SkillMethod>("plugin");

  if (!skill) {
    return (
      <p className="text-sm text-muted-foreground">
        Skill configuration not found. Check{" "}
        <code className="font-mono">CLAUDE_SKILLS</code> in{" "}
        <code className="font-mono">models-data.ts</code>.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Skill card */}
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
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href="https://github.com/dynotx/phi-cli"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="outline" className="size-8 p-0" title="View on GitHub">
                <Github className="size-3.5" />
              </Button>
            </a>
            <Button
              size="sm"
              variant="outline"
              className="size-8 p-0"
              onClick={() => downloadSkill(skill)}
              title="Download skill file"
            >
              <Download className="size-3.5" />
            </Button>
            <Button asChild size="sm" variant="outline" className="size-8 p-0" title="CLI reference docs">
              <Link href="/#docs">
                <BookOpen className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      {/* Setup */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-medium">Quickstart</h3>
        <ol className="space-y-3">
          <SignUpSteps startAt={1} />

          {/* Step 3: Set API key */}
          <li className="flex gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold mt-0.5">
              3
            </span>
            <div className="flex-1 space-y-1.5">
              <span className="text-sm font-medium">Set your API key</span>
              <CodeHighlight code={SETUP_API_KEY} lang="bash" />
            </div>
          </li>

          {/* Step 4: Add skill */}
          <li className="flex gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold mt-0.5">
              4
            </span>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Add the skill to your agent</span>
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
                  The Dyno Phi plugin is listed in the{" "}
                  <span className="text-foreground font-medium">Claude Code Plugin Marketplace</span>.
                  Run{" "}
                  <code className="font-mono bg-muted px-1 rounded">
                    /plugin marketplace add dynotx/phi-cli
                  </code>{" "}
                  then{" "}
                  <code className="font-mono bg-muted px-1 rounded">
                    /plugin install dyno-phi@phi-cli
                  </code>{" "}
                  in any Claude Code session — no file management needed.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Download{" "}
                  <code className="font-mono bg-muted px-1 rounded">phi-skill.md</code> using the
                  button above, place it in your project&rsquo;s{" "}
                  <code className="font-mono bg-muted px-1 rounded">skills/</code> directory, then
                  reference it in your agent config. Works with Claude Code, Cursor, Windsurf, or any
                  agent that reads context files.
                </p>
              )}
            </div>
          </li>
        </ol>
      </Card>

      {/* Core workflow */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-medium">Core workflow</h3>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Tutorial
          </p>
          <CodeHighlight code={EXAMPLE_TUTORIAL} lang="bash" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Research
          </p>
          <CodeHighlight code={EXAMPLE_RESEARCH} lang="bash" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Filter
          </p>
          <CodeHighlight code={EXAMPLE_FILTER} lang="bash" />
        </div>
        <p className="text-xs text-muted-foreground pt-1 border-t">
          All compute runs on Dyno cloud GPUs — no local GPU required.{" "}
          <a
            href="/#docs"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Full CLI reference →
          </a>
        </p>
      </Card>

      {/* FAQ */}
      <Card className="px-4">
        <Accordion type="single" collapsible>
          <AccordionItem value="agent-integration">
            <AccordionTrigger className="text-sm text-left">
              How do I integrate Dyno Phi with my coding agent?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              Download the Phi Skill from this tab and place it in your project&rsquo;s{" "}
              <code className="font-mono bg-muted px-1 rounded">skills/</code> directory. Set
              your API key as the{" "}
              <code className="font-mono bg-muted px-1 rounded">DYNO_API_KEY</code> environment
              variable. The skill instructs your coding agent (e.g. Claude Code, Cursor) how to
              call scoring, filtering, and workflow APIs.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AccessTab — top-level exported component
// ---------------------------------------------------------------------------

export function AccessTab() {
  const [section, setSection] = useState<AccessSection>("cli");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-4 max-w-3xl"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold mb-0.5">Access</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Two ways to use Dyno Phi — pick the interface that fits your workflow.
            Both submit jobs to the same filtering pipeline and share the same datasets.
          </p>
        </div>
        <CopyButton text={SKILLS_COPY_TEXT} />
      </div>

      {/* Section picker */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted w-fit">
        <button
          onClick={() => setSection("cli")}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            section === "cli"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Terminal className="size-3.5" />
          CLI
        </button>
        <button
          onClick={() => setSection("claude")}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            section === "claude"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Claude Code
        </button>
      </div>

      {/* Section content */}
      {section === "cli" && <CliSection />}
      {section === "claude" && <ClaudeSection />}
    </motion.div>
  );
}

// Keep the old name exported as an alias so any other existing imports don't break.
export { AccessTab as SkillsTab };
