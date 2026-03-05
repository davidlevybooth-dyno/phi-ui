"use client";

import { Download, Terminal, Filter, Bot } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CLAUDE_SKILLS } from "@/lib/models-data";

const icons = [Terminal, Filter, Bot];

function generateSkillContent(skillId: string): string {
  return `# Psi-Phi Skill: ${skillId}

## Overview
This skill enables Claude Code to interact with the Dyno Psi-Phi protein design platform.

## Setup
Set your API key as an environment variable:
\`\`\`bash
export DYNO_PHI_API_KEY="your_api_key_here"
\`\`\`

## API Base URL
https://design.dynotx.com/api/v1

## Authentication
All requests require the \`x-api-key\` header:
\`\`\`
x-api-key: $DYNO_PHI_API_KEY
\`\`\`

## Usage
Ask Claude Code to submit jobs, check status, or filter results using natural language.
The skill will construct the appropriate API calls and interpret the results.

## Capabilities
See design.dynotx.com for full documentation.
`;
}

export function SkillsTab() {
  const download = (skill: (typeof CLAUDE_SKILLS)[0]) => {
    const content = generateSkillContent(skill.id);
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = skill.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold mb-1">Claude Code Skills</h2>
        <p className="text-sm text-muted-foreground">
          Install these skills in your Claude Code environment to access Psi-Phi
          APIs through natural language — without leaving your development environment.
        </p>
      </div>

      {/* Setup card */}
      <Card className="p-5 space-y-3 bg-muted/30">
        <h3 className="text-sm font-medium">Getting started</h3>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>
            Generate an API key from{" "}
            <a href="/dashboard/settings" className="underline underline-offset-2">
              Settings
            </a>
          </li>
          <li>
            Set it as an environment variable:{" "}
            <code className="bg-background font-mono text-xs px-1.5 py-0.5 rounded">
              export DYNO_PHI_API_KEY=&quot;sk_...&quot;
            </code>
          </li>
          <li>Download the skill file(s) below</li>
          <li>
            Place the file in your Claude Code skills directory or use the{" "}
            <code className="bg-background font-mono text-xs px-1.5 py-0.5 rounded">
              /skills add
            </code>{" "}
            command
          </li>
        </ol>
      </Card>

      {/* Skill cards */}
      <div className="space-y-3">
        {CLAUDE_SKILLS.map((skill, i) => {
          const Icon = icons[i] ?? Bot;
          return (
            <Card key={skill.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="size-4" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{skill.name}</span>
                      <Badge variant="secondary" className="text-xs font-normal">
                        v{skill.version}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{skill.description}</p>
                    <ul className="space-y-0.5">
                      {skill.capabilities.map((cap) => (
                        <li key={cap} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="mt-0.5 size-1 shrink-0 rounded-full bg-muted-foreground/50 block" />
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
                  onClick={() => download(skill)}
                >
                  <Download className="size-3.5" />
                  Download
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Example usage */}
      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-medium">Example usage in Claude Code</h3>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
          <code>{`# In your Claude Code conversation:
"Score these PD-L1 binders with ESMFold and AlphaFold2:
gs://my-bucket/pdl1_campaign/sequences.fasta

Filter to ipTM > 0.75, pLDDT > 85, and give me
the top 10 ranked by composite score."`}</code>
        </pre>
        <p className="text-xs text-muted-foreground">
          Claude Code will construct the API calls, poll for completion, and
          return a structured summary with download links.
        </p>
      </Card>
    </div>
  );
}
