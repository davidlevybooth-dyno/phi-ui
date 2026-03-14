"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type ModelInfo } from "@/lib/models-data";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="sm" className="gap-1.5 h-7" onClick={copy}>
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function SchemaBlock({ label, schema }: { label: string; schema: Record<string, unknown> }) {
  const json = JSON.stringify(schema, null, 2);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{label}</h3>
        <CopyButton text={json} />
      </div>
      <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs leading-relaxed font-mono">
        {json}
      </pre>
    </div>
  );
}

function FieldTable({ fields }: { fields: ModelInfo["formFields"] }) {
  return (
    <div className="border rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Parameter</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Type</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {fields.map((f) => (
            <tr key={f.key}>
              <td className="px-3 py-2.5 font-mono text-xs">{f.key}</td>
              <td className="px-3 py-2.5">
                <Badge variant="secondary" className="text-xs font-mono font-normal">
                  {f.type}
                </Badge>
              </td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">{f.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ModelSchema({ model }: { model: ModelInfo }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-sm font-medium mb-1">Endpoint</h2>
        <div className="flex items-center gap-2 mt-2">
          <Badge className="font-mono text-xs">POST</Badge>
          <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
            https://api.dyno-agents.app/v1/phi/jobs
          </code>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          All requests require an{" "}
          <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">x-api-key</code> header.
          Responses return HTTP 202 with a <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">job_id</code> for polling.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-medium mb-3">Parameters</h2>
        <FieldTable fields={model.formFields} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SchemaBlock label="Request body" schema={model.requestSchema} />
        <SchemaBlock label="Response" schema={model.responseSchema} />
      </div>
    </div>
  );
}
