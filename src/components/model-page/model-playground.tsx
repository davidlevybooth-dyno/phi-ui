"use client";

import { useState } from "react";
import { Copy, Check, Play, Loader2, Upload, FileDown, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeHighlight } from "@/components/ui/code-highlight";
import { type ModelInfo } from "@/lib/models-data";

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className={`size-7 shrink-0 ${className ?? ""}`} onClick={copy}>
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Parameters panel — always visible
// ---------------------------------------------------------------------------

function ParamsPanel({
  fields,
  values,
  onChange,
}: {
  fields: ModelInfo["formFields"];
  values: Record<string, string | number | boolean>;
  onChange: (key: string, val: string | number | boolean) => void;
}) {
  if (fields.length === 0) return null;

  const baseInput =
    "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Parameters</p>
      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.key} className="space-y-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <label className="text-xs font-medium font-mono">{field.key}</label>
              {field.description && (
                <span className="text-xs text-muted-foreground">{field.description}</span>
              )}
            </div>
            {field.type === "boolean" ? (
              <button
                type="button"
                onClick={() => onChange(field.key, !values[field.key])}
                className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  values[field.key]
                    ? "bg-muted text-foreground border-border font-medium"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                <span
                  className={`size-2 rounded-full ${
                    values[field.key] ? "bg-foreground" : "bg-muted-foreground/40"
                  }`}
                />
                {values[field.key] ? "Enabled" : "Disabled"}
              </button>
            ) : (
              <input
                type={field.type === "number" ? "number" : "text"}
                className={baseInput}
                placeholder={field.placeholder}
                value={values[field.key] as string | number}
                min={field.min}
                max={field.max}
                onChange={(e) =>
                  onChange(
                    field.key,
                    field.type === "number" ? Number(e.target.value) : e.target.value
                  )
                }
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Input panels — one per inputType
// ---------------------------------------------------------------------------

function SequenceInput({
  model,
  sequence,
  onSequenceChange,
  detectedMode,
  values,
  onParamChange,
  onRun,
  running,
}: {
  model: ModelInfo;
  sequence: string;
  onSequenceChange: (s: string) => void;
  detectedMode: "monomer" | "multimer" | null;
  values: Record<string, string | number | boolean>;
  onParamChange: (key: string, val: string | number | boolean) => void;
  onRun: () => void;
  running: boolean;
}) {
  const example = model.exampleSequence;

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">Amino acid sequence</label>
          {example && (
            <button
              type="button"
              onClick={() => onSequenceChange(example.sequence)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Load example: {example.label}
            </button>
          )}
        </div>
        <textarea
          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          rows={6}
          placeholder="Single chain: MTYKLILNGKT…&#10;Multi-chain:  CHAIN_A…:CHAIN_B…"
          value={sequence}
          onChange={(e) => onSequenceChange(e.target.value)}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />

        <div className="flex items-center gap-2 min-h-[1.25rem]">
          {detectedMode ? (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border bg-muted text-foreground border-border">
              <span className="size-1.5 rounded-full bg-foreground" />
              {detectedMode === "multimer" ? "Multimer detected" : "Monomer detected"}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Separate chains with{" "}
              <code className="font-mono bg-muted px-1 rounded">:</code>{" "}
              for multimer prediction
            </span>
          )}
        </div>

        {example && sequence === example.sequence && example.description && (
          <p className="text-xs text-muted-foreground italic">{example.description}</p>
        )}
      </div>

      <ParamsPanel fields={model.formFields} values={values} onChange={onParamChange} />

      <RunBar onRun={onRun} running={running} disabled={sequence.trim().length === 0} />
    </div>
  );
}

function PdbUploadInput({
  model,
  fileName,
  onFileChange,
  values,
  onParamChange,
  onRun,
  running,
}: {
  model: ModelInfo;
  fileName: string | null;
  onFileChange: (name: string) => void;
  values: Record<string, string | number | boolean>;
  onParamChange: (key: string, val: string | number | boolean) => void;
  onRun: () => void;
  running: boolean;
}) {
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Target structure</label>
        <label className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/20 px-6 py-8 text-center cursor-pointer hover:bg-muted/40 transition-colors">
          <Upload className="size-5 text-muted-foreground/50" />
          <span className="text-sm text-muted-foreground">
            {fileName ? (
              <span className="font-medium text-foreground">{fileName}</span>
            ) : (
              <>
                Upload PDB file
                <span className="block text-xs mt-0.5">or drag and drop — mock, no data is sent</span>
              </>
            )}
          </span>
          <input
            type="file"
            accept=".pdb"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFileChange(f.name);
            }}
          />
        </label>
      </div>

      <ParamsPanel fields={model.formFields} values={values} onChange={onParamChange} />

      <RunBar onRun={onRun} running={running} disabled={!fileName} />
    </div>
  );
}

function SequencesListInput({
  sequences,
  onSequencesChange,
  onRun,
  running,
}: {
  sequences: string;
  onSequencesChange: (s: string) => void;
  onRun: () => void;
  running: boolean;
}) {
  const count = sequences.split("\n").filter((l) => l.trim().length > 0).length;

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">Sequences</label>
          <button
            type="button"
            onClick={() =>
              onSequencesChange(
                "MTYKLILNGKTLKGETTTEAVDAATAEKVFKQYANDNGVDGEWTYDDATKTFTVTE\nLSDEDFKAVFGMTRSAFANLPLWKQQNLKKEKGLF\nKLPPGWEKRMSRSSGRVYYFNHITNASQWERP"
              )
            }
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Load examples
          </button>
        </div>
        <textarea
          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          rows={8}
          placeholder={"MKTAYIAKQRQISFVK\nLSDEDFKAVFGMTRS\nMTYKLILNGKTLKGE"}
          value={sequences}
          onChange={(e) => onSequencesChange(e.target.value)}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
        <p className="text-xs text-muted-foreground">
          {count > 0
            ? `${count} sequence${count !== 1 ? "s" : ""}`
            : "One sequence per line — no FASTA headers needed"}
        </p>
      </div>
      <RunBar onRun={onRun} running={running} disabled={count === 0} />
    </div>
  );
}

function RunBar({
  onRun,
  running,
  disabled = false,
}: {
  onRun: () => void;
  running: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="pt-1 border-t flex items-center gap-3">
      <Button
        onClick={onRun}
        disabled={running || disabled}
        variant="secondary"
        className="gap-2"
      >
        {running ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Running…
          </>
        ) : (
          <>
            <Play className="size-3.5" />
            Run
          </>
        )}
      </Button>
      {running && (
        <span className="text-xs text-muted-foreground">Submitting to GPU…</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Code tab — highlighted code block with copy
// ---------------------------------------------------------------------------

function CodeTab({ code, lang }: { code: string; lang: "bash" | "python" | "json" }) {
  return (
    <div className="p-4 relative group">
      <CodeHighlight code={code} lang={lang} />
      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code} className="bg-background/80 backdrop-blur-sm shadow-sm" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Output panels
// ---------------------------------------------------------------------------

function StructurePlaceholder({ ran, running }: { ran: boolean; running: boolean }) {
  if (running) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <Loader2 className="size-8 text-muted-foreground/40 mb-3 animate-spin" />
        <p className="text-sm text-muted-foreground">Predicting structure…</p>
      </div>
    );
  }
  if (!ran) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="size-16 rounded-lg bg-muted flex items-center justify-center mb-4">
          <ProteinIcon className="size-8 text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground">Run the model to see the predicted structure.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">3D viewer integration coming soon</p>
      </div>
    );
  }
  return (
    <div className="p-4 space-y-4">
      <div className="rounded-md bg-muted/30 border border-dashed flex flex-col items-center justify-center py-10 text-center gap-3">
        <div className="size-14 rounded-lg bg-muted flex items-center justify-center">
          <ProteinIcon className="size-7 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-sm font-medium">Structure predicted</p>
          <p className="text-xs text-muted-foreground mt-0.5">3D viewer integration coming soon</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 mt-1">
          <FileDown className="size-3.5" />
          Download PDB
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Mock result — structure viewer will render here in a future update.
      </p>
    </div>
  );
}

function MetricsPanel({
  ran,
  running,
  model,
}: {
  ran: boolean;
  running: boolean;
  model: ModelInfo;
}) {
  if (running) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <Loader2 className="size-8 text-muted-foreground/40 mb-3 animate-spin" />
        <p className="text-sm text-muted-foreground">Waiting for results…</p>
      </div>
    );
  }
  if (!ran) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <Play className="size-8 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">Run the model to see scoring metrics.</p>
      </div>
    );
  }
  return (
    <div className="p-4">
      <p className="text-xs text-muted-foreground mb-3">
        Mock results — representative output for a typical run.
      </p>
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                Metric
              </th>
              <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {Object.entries(model.mockOutput.metrics).map(([key, val]) => (
              <tr key={key}>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{key}</td>
                <td className="px-3 py-2 text-right font-mono text-xs font-medium">
                  {String(val)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JsonPanel({
  ran,
  running,
  model,
}: {
  ran: boolean;
  running: boolean;
  model: ModelInfo;
}) {
  if (!ran && !running) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <p className="text-sm text-muted-foreground">Run the model to see the JSON response.</p>
      </div>
    );
  }
  if (running) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <Loader2 className="size-8 text-muted-foreground/40 mb-3 animate-spin" />
        <p className="text-sm text-muted-foreground">Waiting…</p>
      </div>
    );
  }
  const json = JSON.stringify(model.mockOutput.json, null, 2);
  return (
    <div className="p-4 relative group">
      <p className="text-xs text-muted-foreground mb-3">Mock JSON response.</p>
      <CodeHighlight code={json} lang="json" />
      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={json} className="bg-background/80 backdrop-blur-sm shadow-sm" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Protein icon SVG
// ---------------------------------------------------------------------------

function ProteinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <ellipse cx="24" cy="24" rx="18" ry="8" stroke="currentColor" strokeWidth="2" />
      <ellipse cx="24" cy="24" rx="8" ry="18" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="24" r="3" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export function ModelPlayground({ model }: { model: ModelInfo }) {
  const showStructureTab = model.inputType === "sequence";

  const initialParams = Object.fromEntries(
    model.formFields.map((f) => [f.key, f.defaultValue ?? ""])
  );
  const [params, setParams] = useState<Record<string, string | number | boolean>>(initialParams);
  const [sequence, setSequence] = useState("");
  const [sequences, setSequences] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [ran, setRan] = useState(false);
  const [running, setRunning] = useState(false);
  const [detectedMode, setDetectedMode] = useState<"monomer" | "multimer" | null>(null);

  const handleRun = async () => {
    if (model.inputType === "sequence" && sequence.trim()) {
      setDetectedMode(sequence.includes(":") ? "multimer" : "monomer");
    }
    setRunning(true);
    setRan(false);
    await new Promise((r) => setTimeout(r, 1800));
    setRunning(false);
    setRan(true);
  };

  const handleParamChange = (key: string, val: string | number | boolean) =>
    setParams((p) => ({ ...p, [key]: val }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border rounded-lg overflow-hidden">
      {/* ── Left — Input ── */}
      <div className="border-r">
        <Tabs defaultValue="try">
          <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/10">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Input
            </span>
            <TabsList className="h-7 p-0.5">
              <TabsTrigger value="try" className="text-xs px-2 py-1 h-6">
                Try
              </TabsTrigger>
              <TabsTrigger value="shell" className="text-xs px-2 py-1 h-6">
                Shell
              </TabsTrigger>
              <TabsTrigger value="python" className="text-xs px-2 py-1 h-6">
                Python
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="try" className="m-0">
            {model.inputType === "sequence" && (
              <SequenceInput
                model={model}
                sequence={sequence}
                onSequenceChange={setSequence}
                detectedMode={detectedMode}
                values={params}
                onParamChange={handleParamChange}
                onRun={handleRun}
                running={running}
              />
            )}
            {model.inputType === "pdb-upload" && (
              <PdbUploadInput
                model={model}
                fileName={fileName}
                onFileChange={setFileName}
                values={params}
                onParamChange={handleParamChange}
                onRun={handleRun}
                running={running}
              />
            )}
            {model.inputType === "sequences-list" && (
              <SequencesListInput
                sequences={sequences}
                onSequencesChange={setSequences}
                onRun={handleRun}
                running={running}
              />
            )}
          </TabsContent>

          <TabsContent value="shell" className="m-0">
            <CodeTab code={model.curlExample} lang="bash" />
          </TabsContent>

          <TabsContent value="python" className="m-0">
            <CodeTab code={model.pythonExample} lang="python" />
          </TabsContent>
        </Tabs>

        {/* Batch workflow callout */}
        <div className="border-t px-4 py-3 bg-muted/10 flex items-start gap-2.5">
          <Layers className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Running a batch job?</span>{" "}
            Upload 100–50,000 files with{" "}
            <code className="font-mono bg-muted px-1 rounded">
              phi upload --dir ./designs/
            </code>{" "}
            to get a{" "}
            <code className="font-mono bg-muted px-1 rounded">dataset_id</code>
            , then run{" "}
            <code className="font-mono bg-muted px-1 rounded">
              phi {model.jobType} --dataset-id &lt;id&gt;
            </code>
            . See the CLI &amp; Skills tab for the full workflow.
          </p>
        </div>
      </div>

      {/* ── Right — Output ── */}
      <div>
        <Tabs defaultValue={showStructureTab ? "structure" : "metrics"}>
          <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/10">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Output
            </span>
            <TabsList className="h-7 p-0.5">
              {showStructureTab && (
                <TabsTrigger value="structure" className="text-xs px-2 py-1 h-6">
                  Structure
                </TabsTrigger>
              )}
              <TabsTrigger value="metrics" className="text-xs px-2 py-1 h-6">
                Metrics
              </TabsTrigger>
              <TabsTrigger value="json" className="text-xs px-2 py-1 h-6">
                JSON
              </TabsTrigger>
            </TabsList>
          </div>

          {showStructureTab && (
            <TabsContent value="structure" className="m-0">
              <StructurePlaceholder ran={ran} running={running} />
            </TabsContent>
          )}

          <TabsContent value="metrics" className="m-0">
            <MetricsPanel ran={ran} running={running} model={model} />
          </TabsContent>

          <TabsContent value="json" className="m-0">
            <JsonPanel ran={ran} running={running} model={model} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
