"use client";

import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MODELS, type ModelInfo } from "@/lib/models-data";
import { cn } from "@/lib/utils";

function ModelCard({ model }: { model: ModelInfo }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(model.curlExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between p-5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-mono font-semibold">
            {model.shortName}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{model.name}</span>
              <Badge variant="secondary" className="text-xs font-normal">
                {model.license}
              </Badge>
              {model.costPerSample && (
                <span className="text-xs text-muted-foreground">
                  {model.costPerSample} / sample
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground pr-4">{model.description}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="mt-1 size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t px-5 pb-5 pt-4 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Citation</p>
            <p className="text-sm">{model.citation}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Metrics generated</p>
            <div className="flex flex-wrap gap-1.5">
              {model.metrics.map((m) => (
                <Badge key={m} variant="outline" className="font-mono text-xs">
                  {m}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-muted-foreground">Example request</p>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 text-xs"
                onClick={copy}
              >
                {copied ? (
                  <Check className="size-3" />
                ) : (
                  <Copy className="size-3" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
              <code>{model.curlExample}</code>
            </pre>
          </div>
        </div>
      )}
    </Card>
  );
}

export function ApiTab() {
  return (
    <div className="space-y-3">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-1">API Reference</h2>
        <p className="text-sm text-muted-foreground">
          Base URL:{" "}
          <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
            https://design.dynotx.com/api/v1
          </code>
          . All requests require an{" "}
          <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
            x-api-key
          </code>{" "}
          header.
        </p>
      </div>
      {MODELS.map((model) => (
        <ModelCard key={model.id} model={model} />
      ))}
    </div>
  );
}
