"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, SlidersHorizontal, BarChart3, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRunAssets, getDownloadUrl, getRunArtifacts } from "@/lib/api/assets";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MetricFilter {
  key: string;
  label: string;
  direction: "min" | "max";
  defaultValue: number;
  min: number;
  max: number;
  step: number;
}

const METRIC_FILTERS: MetricFilter[] = [
  { key: "complex_iptm", label: "ipTM", direction: "min", defaultValue: 0.7, min: 0, max: 1, step: 0.01 },
  { key: "complex_plddt", label: "pLDDT (complex)", direction: "min", defaultValue: 80, min: 0, max: 100, step: 1 },
  { key: "binder_plddt", label: "pLDDT (binder)", direction: "min", defaultValue: 85, min: 0, max: 100, step: 1 },
  { key: "complex_i_psae_mean", label: "ipSAE", direction: "max", defaultValue: 6, min: 0, max: 31, step: 0.1 },
  { key: "mpnn_score", label: "MPNN score", direction: "min", defaultValue: 0.4, min: -10, max: 0, step: 0.1 },
  { key: "binder_RMSD", label: "RMSD", direction: "max", defaultValue: 2.5, min: 0, max: 20, step: 0.1 },
];

function MetricFilterControl({
  filter,
  value,
  onChange,
}: {
  filter: MetricFilter;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium font-mono">{filter.label}</span>
        <span className="text-xs text-muted-foreground">
          {filter.direction === "min" ? "≥" : "≤"} {value.toFixed(filter.step < 1 ? 2 : 0)}
        </span>
      </div>
      <Slider
        min={filter.min}
        max={filter.max}
        step={filter.step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
    </div>
  );
}

function MetricValue({ value, metricKey }: { value: number; metricKey: string }) {
  const filter = METRIC_FILTERS.find((f) => f.key === metricKey);
  if (!filter) return <span className="font-mono text-xs">{value.toFixed(3)}</span>;

  const passes =
    filter.direction === "min" ? value >= filter.defaultValue : value <= filter.defaultValue;
  return (
    <span
      className={cn(
        "font-mono text-xs",
        passes ? "text-green-700" : "text-red-600"
      )}
    >
      {value.toFixed(filter.step < 1 ? 3 : 1)}
    </span>
  );
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ run_id: string }>;
}) {
  const { run_id } = use(params);

  const [filterValues, setFilterValues] = useState<Record<string, number>>(
    Object.fromEntries(METRIC_FILTERS.map((f) => [f.key, f.defaultValue]))
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filtersVisible, setFiltersVisible] = useState(true);

  const { data: runAssets, isLoading } = useQuery({
    queryKey: ["run-assets", run_id],
    queryFn: () => getRunAssets(run_id),
  });

  const { data: artifacts } = useQuery({
    queryKey: ["run-artifacts", run_id],
    queryFn: () => getRunArtifacts(run_id),
  });

  const designs = useMemo(() => {
    const assets = (runAssets as { assets?: Record<string, unknown>[] } | undefined)?.assets ?? [];
    return assets;
  }, [runAssets]);

  const filtered = useMemo(() => {
    return designs.filter((design) => {
      const meta = (design.metadata ?? design) as Record<string, unknown>;
      return METRIC_FILTERS.every((f) => {
        const val = meta[f.key];
        if (val == null) return true;
        const num = Number(val);
        return f.direction === "min" ? num >= filterValues[f.key] : num <= filterValues[f.key];
      });
    });
  }, [designs, filterValues]);

  const allMetricKeys = useMemo(() => {
    const keys = new Set<string>();
    designs.forEach((d) => {
      const meta = (d.metadata ?? d) as Record<string, unknown>;
      Object.keys(meta).forEach((k) => {
        if (typeof meta[k] === "number") keys.add(k);
      });
    });
    return Array.from(keys).slice(0, 8);
  }, [designs]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const downloadSelected = async () => {
    if (selected.size === 0) {
      toast.info("Select designs to download");
      return;
    }
    const ids = Array.from(selected);
    let downloaded = 0;
    for (const id of ids) {
      try {
        const { download_url, filename } = await getDownloadUrl(id);
        const a = document.createElement("a");
        a.href = download_url;
        a.download = filename;
        a.click();
        await new Promise((r) => globalThis.setTimeout(r, 300));
        downloaded++;
      } catch {
        toast.error(`Failed to download ${id}`);
      }
    }
    toast.success(`Downloaded ${downloaded} file(s)`);
  };

  const downloadAllArtifacts = async () => {
    if (!artifacts?.artifacts) return;
    for (const a of artifacts.artifacts) {
      try {
        const { download_url } = await getDownloadUrl(a.artifact_id);
        const link = document.createElement("a");
        link.href = download_url;
        link.download = a.filename;
        link.click();
        await new Promise((r) => globalThis.setTimeout(r, 300));
      } catch {
        toast.error(`Failed: ${a.filename}`);
      }
    }
  };

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/jobs"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="size-3" />
            Jobs
          </Link>
          <h1 className="text-xl font-semibold">Results</h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
            run: {run_id.slice(0, 16)}…
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFiltersVisible((v) => !v)}
            className="gap-1.5"
          >
            <SlidersHorizontal className="size-3.5" />
            Filters
          </Button>
          {selected.size > 0 && (
            <Button size="sm" onClick={downloadSelected} className="gap-1.5">
              <Download className="size-3.5" />
              Download ({selected.size})
            </Button>
          )}
          {artifacts && artifacts.total_count > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={downloadAllArtifacts}
              className="gap-1.5"
            >
              <FileDown className="size-3.5" />
              All files ({artifacts.total_count})
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Filter sidebar */}
        {filtersVisible && (
          <Card className="p-4 space-y-4 w-56 shrink-0 self-start">
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="size-3.5" />
              <span className="text-xs font-medium">Thresholds</span>
            </div>
            <Separator />
            {METRIC_FILTERS.map((f) => (
              <MetricFilterControl
                key={f.key}
                filter={f}
                value={filterValues[f.key]}
                onChange={(v) => setFilterValues((prev) => ({ ...prev, [f.key]: v }))}
              />
            ))}
            <Separator />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Passing</span>
              <span className="font-semibold text-foreground">
                {filtered.length} / {designs.length}
              </span>
            </div>
          </Card>
        )}

        {/* Results table */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : designs.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart3 className="size-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No design assets found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Results will appear here once the run completes and assets are created.
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">
                        <input
                          type="checkbox"
                          className="rounded"
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? new Set(filtered.map((d) => String(d.asset_id ?? d.id ?? "")))
                                : new Set()
                            )
                          }
                        />
                      </TableHead>
                      <TableHead className="text-xs">Design</TableHead>
                      {allMetricKeys.map((k) => (
                        <TableHead key={k} className="text-xs font-mono">
                          {k}
                        </TableHead>
                      ))}
                      <TableHead className="text-xs">Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((design, i) => {
                      const id = String(design.asset_id ?? design.id ?? i);
                      const meta = (design.metadata ?? design) as Record<string, unknown>;
                      return (
                        <TableRow key={id} className={selected.has(id) ? "bg-muted/40" : ""}>
                          <TableCell>
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={selected.has(id)}
                              onChange={() => toggleSelect(id)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {String(design.filename ?? id).slice(0, 16)}
                          </TableCell>
                          {allMetricKeys.map((k) => (
                            <TableCell key={k}>
                              {meta[k] != null ? (
                                <MetricValue value={Number(meta[k])} metricKey={k} />
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                          ))}
                          <TableCell>
                            <Badge variant="secondary" className="text-xs font-normal">
                              {String(design.asset_type ?? "file")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
