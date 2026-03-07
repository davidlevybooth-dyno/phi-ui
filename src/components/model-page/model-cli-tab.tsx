"use client";

import { Download, Terminal, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CodeHighlight } from "@/components/ui/code-highlight";
import { type ModelInfo, CLAUDE_SKILLS } from "@/lib/models-data";

const SETUP_SNIPPET = `# 1. Install the phi CLI (zero external dependencies)
pip install -e ./skills/dyno-phi/

# 2. Set your API key
export DYNO_API_KEY="your_key_here"

# 3. Verify
phi jobs`;

export function ModelCliTab({ model }: { model: ModelInfo }) {
  const masterSkill = CLAUDE_SKILLS.find((s) => s.id === "phi");

  const handleSkillDownload = () => {
    if (!masterSkill) return;
    const blob = new Blob([masterSkill.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = masterSkill.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputNoun = model.jobType === "proteinmpnn" ? "structures" : "sequences";
  const topMetric = model.metrics[0] ?? "score";

  return (
    <div className="space-y-8">
      {/* Setup */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Terminal className="size-4" />
          <h2 className="text-sm font-medium">CLI Setup</h2>
        </div>
        <CodeHighlight code={SETUP_SNIPPET} lang="bash" />
      </div>

      {/* Single-sequence quick try */}
      <div>
        <h2 className="text-sm font-medium mb-1">
          <code className="font-mono">phi {model.jobType}</code> — Quick try
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          For single {inputNoun}. Submits inline — no upload step needed.
        </p>
        <CodeHighlight code={model.cliQuickExample} lang="bash" />
      </div>

      {/* Batch workflow */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Layers className="size-3.5 text-muted-foreground" />
          <h2 className="text-sm font-medium">Batch workflow</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          For 100–50,000 files. Upload once, reference the{" "}
          <code className="font-mono bg-muted px-1 rounded">dataset_id</code> in any number of jobs.
        </p>
        <CodeHighlight code={model.cliBatchExample} lang="bash" />
      </div>

      {/* Claude Skill */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Claude Code Skill</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              The <code className="font-mono bg-muted px-1 rounded">phi</code> skill covers{" "}
              {model.name} and all other Dyno models — including batch workflows.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleSkillDownload}
            disabled={!masterSkill}
          >
            <Download className="size-3.5" />
            Download SKILL.md
          </Button>
        </div>
        <div className="border-t pt-3 space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Once installed, ask Claude:</p>
          <CodeHighlight
            code={`"Upload my ${inputNoun} folder and run ${model.name} on all ${inputNoun}. Filter by ${topMetric} and give me the top 20."`}
            lang="text"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Key metrics:</span>{" "}
          {model.metrics.join(", ")}
        </div>
      </Card>
    </div>
  );
}
