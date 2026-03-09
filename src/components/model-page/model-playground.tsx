"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Copy, Check, Play, Loader2, Upload, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeHighlight } from "@/components/ui/code-highlight";
import { type ModelInfo, getDesignedSequences } from "@/lib/models-data";
import { SequenceOutput } from "@/components/viewer/SequenceOutput";

// Dynamically imported with ssr:false — Molstar requires browser APIs
const StructureViewer = dynamic(
  () => import("@/components/viewer/StructureViewer").then((m) => m.StructureViewer),
  { ssr: false }
);

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
            ) : field.type === "select" && field.options ? (
              <select
                className={baseInput + " cursor-pointer"}
                value={values[field.key] as string}
                onChange={(e) => onChange(field.key, e.target.value)}
              >
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
          placeholder={
            model.singleChainOnly
              ? "Amino acid sequence: MTYKLILNGKT…"
              : "Single chain: MTYKLILNGKT…\nMulti-chain:  CHAIN_A…:CHAIN_B…"
          }
          value={sequence}
          onChange={(e) => onSequenceChange(e.target.value)}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />

        <div className="flex items-center gap-2 min-h-[1.25rem]">
          {model.singleChainOnly && sequence.includes(":") ? (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border bg-destructive/10 text-destructive border-destructive/30">
              <span className="size-1.5 rounded-full bg-destructive" />
              {model.shortName} predicts single chains only — remove the &ldquo;:&rdquo; separator
            </span>
          ) : detectedMode ? (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border bg-muted text-foreground border-border">
              <span className="size-1.5 rounded-full bg-foreground" />
              {detectedMode === "multimer" ? "Multimer detected" : "Monomer detected"}
            </span>
          ) : model.singleChainOnly ? (
            <span className="text-xs text-muted-foreground">
              Single-chain only — does not model protein–protein interactions
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

      <RunBar
        onRun={onRun}
        running={running}
        disabled={
          sequence.trim().length === 0 ||
          (!!model.singleChainOnly && sequence.includes(":"))
        }
      />
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
  // Capture before JSX so TypeScript narrows the type without a non-null assertion.
  const examplePdb = model.examplePdb;

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">Input structure</label>
          {examplePdb && (
            <button
              type="button"
              onClick={() => onFileChange(examplePdb.label + ".pdb")}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Load example: {examplePdb.label}
            </button>
          )}
        </div>
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


function SequencesPanel({
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
        <p className="text-sm text-muted-foreground">Designing sequences…</p>
      </div>
    );
  }
  if (!ran) {
    return <div className="min-h-[200px]" aria-hidden />;
  }
  return <SequenceOutput sequences={getDesignedSequences(model.mockOutput)} />;
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
    return <div className="min-h-[200px]" aria-hidden />;
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
    return <div className="min-h-[200px]" aria-hidden />;
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
// Root component
// ---------------------------------------------------------------------------

export function ModelPlayground({ model }: { model: ModelInfo }) {
  const showStructureTab = model.inputType === "sequence";
  const showSequencesTab = model.id === "proteinmpnn";
  const structureColorMode = model.outputColorMode ?? "chain";

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
      if (model.singleChainOnly && sequence.includes(":")) {
        // Block multimer input for monomer-only models (ESMFold, Boltz GB1 example, Chai1 GB1 example)
        return;
      }
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
        <Tabs defaultValue={showStructureTab ? "structure" : showSequencesTab ? "sequences" : "metrics"}>
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
              {showSequencesTab && (
                <TabsTrigger value="sequences" className="text-xs px-2 py-1 h-6">
                  Sequences
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
              <StructureViewer
                ran={ran}
                running={running}
                mockUrl={model.mockStructureUrl ?? "/mock/af2-gb1.pdb"}
                colorMode={structureColorMode}
                plddt={
                  Array.isArray((model.mockOutput.json as Record<string, unknown>).plddt)
                    ? ((model.mockOutput.json as Record<string, unknown>).plddt as number[])
                    : undefined
                }
                chainLengths={
                  Array.isArray((model.mockOutput.json as Record<string, unknown>).chain_lengths)
                    ? ((model.mockOutput.json as Record<string, unknown>).chain_lengths as number[])
                    : undefined
                }
              />
            </TabsContent>
          )}

          {showSequencesTab && (
            <TabsContent value="sequences" className="m-0">
              <SequencesPanel ran={ran} running={running} model={model} />
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
