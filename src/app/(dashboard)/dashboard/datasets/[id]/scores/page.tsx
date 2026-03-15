"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X } from "lucide-react";
import { getDataset, getDatasetScores } from "@/lib/api/upload";
import { fetchScoresCsvPageFromUrl } from "@/lib/api/assets";
import { useAuth } from "@/lib/auth-context";
import {
  type ScoresCsvRow,
  DEFAULT_SCORES_PAGE_SIZE,
} from "@/lib/schemas/scores-csv";
import { cn } from "@/lib/utils";
import {
  defaultSliderValue,
  sliderToThreshold,
  thresholdToSliderValue,
  presetToSliderValues as sharedPresetToSliderValues,
  detectActivePreset,
} from "@/lib/scoring/filters";

/**
 * All sliders are oriented so that dragging RIGHT = more permissive (less strict).
 *
 * For "higher is better" metrics (pLDDT, pTM, ipTM):
 *   - inverted: true — slider value represents permissiveness, actual threshold = max - sliderValue
 *   - Left (0) = max threshold = most strict; Right (max) = 0 threshold = most permissive
 *
 * For "lower is better" metrics (iPAE, RMSD):
 *   - inverted: false — slider value IS the threshold directly
 *   - Left (0) = 0 threshold = most strict; Right (max) = max threshold = most permissive
 */
interface MetricFilter {
  key: string;
  label: string;
  direction: "min" | "max";
  inverted: boolean;
  defaultThreshold: number;
  min: number;
  max: number;
  step: number;
}

const METRIC_FILTERS: MetricFilter[] = [
  { key: "esmfold_plddt", label: "ESMFold pLDDT", direction: "min", inverted: true,  defaultThreshold: 0.8,   min: 0, max: 1,  step: 0.01 },
  { key: "af2_ptm",       label: "pTM",            direction: "min", inverted: true,  defaultThreshold: 0.55,  min: 0, max: 1,  step: 0.01 },
  { key: "af2_iptm",      label: "ipTM",           direction: "min", inverted: true,  defaultThreshold: 0.5,   min: 0, max: 1,  step: 0.01 },
  { key: "af2_ipae",      label: "iPAE (Å)",       direction: "max", inverted: false, defaultThreshold: 10.85, min: 0, max: 31, step: 0.1  },
  { key: "rmsd",          label: "RMSD (Å)",       direction: "max", inverted: false, defaultThreshold: 3.5,   min: 0, max: 20, step: 0.1  },
];

/** Threshold values for named filter presets. Keys match MetricFilter.key. */
const FILTER_PRESETS = {
  default: { esmfold_plddt: 0.80, af2_ptm: 0.55, af2_iptm: 0.50, af2_ipae: 10.85, rmsd: 3.5  },
  relaxed: { esmfold_plddt: 0.80, af2_ptm: 0.45, af2_iptm: 0.50, af2_ipae: 12.40, rmsd: 4.5  },
} as const;

/** Stable key-based lookup — avoids fragile positional array access. */
const FILTER_BY_KEY = Object.fromEntries(
  METRIC_FILTERS.map((f) => [f.key, f])
) as Record<string, MetricFilter>;

function presetToSliderValues(preset: keyof typeof FILTER_PRESETS): Record<string, number> {
  return sharedPresetToSliderValues(FILTER_PRESETS[preset], METRIC_FILTERS);
}

function detectPreset(values: Record<string, number>): keyof typeof FILTER_PRESETS | null {
  return detectActivePreset(values, FILTER_PRESETS, METRIC_FILTERS) as keyof typeof FILTER_PRESETS | null;
}

function rowPasses(row: ScoresCsvRow, f: MetricFilter, sliderValue: number): boolean {
  const val = row[f.key as keyof ScoresCsvRow];
  if (val === undefined || val === null) return true;
  const num = Number(val);
  if (Number.isNaN(num)) return true;
  const threshold = sliderToThreshold(f, sliderValue);
  return f.direction === "min" ? num >= threshold : num <= threshold;
}

function MetricFilterControl({
  filter,
  sliderValue,
  onChange,
}: {
  filter: MetricFilter;
  sliderValue: number;
  onChange: (v: number) => void;
}) {
  const threshold = sliderToThreshold(filter, sliderValue);
  const symbol = filter.direction === "min" ? "≥" : "≤";
  const decimals = filter.step < 1 ? 2 : 1;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium font-mono">{filter.label}</span>
        <span className="text-xs text-muted-foreground">
          {symbol} {threshold.toFixed(decimals)}
        </span>
      </div>
      <Slider
        min={filter.min}
        max={filter.max}
        step={filter.step}
        value={[sliderValue]}
        onValueChange={([v]) => onChange(v ?? sliderValue)}
        className="w-full"
      />
    </div>
  );
}

function MetricCell({
  value,
  filter,
  sliderValue,
}: {
  value: number | undefined;
  filter: MetricFilter;
  sliderValue: number;
}) {
  if (value === undefined) return <span className="text-muted-foreground text-xs">—</span>;
  const threshold = sliderToThreshold(filter, sliderValue);
  const passes = filter.direction === "min" ? value >= threshold : value <= threshold;
  const decimals = filter.step < 1 ? 3 : 1;
  return (
    <span
      className={cn(
        "font-mono text-xs",
        passes ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"
      )}
    >
      {value.toFixed(decimals)}
    </span>
  );
}

export default function DatasetScoresPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [filterValues, setFilterValues] = useState<Record<string, number>>(
    Object.fromEntries(METRIC_FILTERS.map((f) => [f.key, defaultSliderValue(f)]))
  );
  const [viewMode, setViewMode] = useState<"all" | "pass">("all");
  const [page, setPage] = useState(1);

  const authReady = !authLoading && !!user;

  const { data: dataset, isLoading: loadingDataset } = useQuery({
    queryKey: ["dataset", id],
    queryFn: () => getDataset(id),
    enabled: authReady && !!id,
  });

  const { data: datasetScores, isLoading: loadingScoresMeta, isError: scoresMetaError } = useQuery({
    queryKey: ["dataset-scores", id],
    queryFn: () => getDatasetScores(id),
    enabled: authReady && !!id,
    retry: (_, err) => {
      const status = err && typeof err === "object" && "status" in err ? (err as { status?: number }).status : undefined;
      return status !== 404;
    },
  });

  const { data: scoresPage, isLoading: loadingScoresRows } = useQuery({
    queryKey: ["dataset-scores-csv", id, datasetScores?.download_url ?? "", page],
    queryFn: () =>
      fetchScoresCsvPageFromUrl(
        datasetScores!.download_url,
        page,
        DEFAULT_SCORES_PAGE_SIZE
      ),
    enabled: authReady && !!id && !!datasetScores?.download_url,
  });

  const designs = scoresPage?.rows ?? [];
  const totalCount = scoresPage?.totalCount ?? 0;

  const designsWithPass = designs
    .map((row) => ({
      row,
      passesFilters: METRIC_FILTERS.every((f) => rowPasses(row, f, filterValues[f.key] ?? defaultSliderValue(f))),
    }))
    .sort((a, b) => {
      // Passing designs rank above filtered-out ones
      if (a.passesFilters !== b.passesFilters) return a.passesFilters ? -1 : 1;
      // Primary: ipTM descending (higher = better)
      const iptmDiff = (b.row.af2_iptm ?? 0) - (a.row.af2_iptm ?? 0);
      if (Math.abs(iptmDiff) > 1e-6) return iptmDiff;
      // Secondary: pLDDT descending
      return (b.row.esmfold_plddt ?? 0) - (a.row.esmfold_plddt ?? 0);
    });

  const passedCount = designsWithPass.filter((d) => d.passesFilters).length;
  const displayedDesigns = viewMode === "pass" ? designsWithPass.filter((d) => d.passesFilters) : designsWithPass;

  const totalPages = Math.max(1, Math.ceil(totalCount / DEFAULT_SCORES_PAGE_SIZE));
  const pageStart = totalCount === 0 ? 0 : (page - 1) * DEFAULT_SCORES_PAGE_SIZE + 1;
  const pageEnd = Math.min(page * DEFAULT_SCORES_PAGE_SIZE, totalCount);

  const isLoading = loadingDataset || loadingScoresMeta || loadingScoresRows;

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/datasets/${id}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="size-3" />
            Dataset
          </Link>
          <h1 className="text-xl font-semibold">Scores</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {dataset?.name ?? dataset?.dataset_id ?? id}
            {datasetScores?.completed_at && (
              <> · {new Date(datasetScores.completed_at).toLocaleString()}</>
            )}
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <Card className="p-4 space-y-4 w-56 shrink-0 self-start">
            {/* View toggle */}
            <div className="flex rounded-md overflow-hidden border border-border text-xs font-medium">
              {(["all", "pass"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "flex-1 py-1.5 capitalize transition-colors",
                    viewMode === mode
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="size-3.5" />
              <span className="text-xs font-medium">Thresholds</span>
            </div>
            <div className="flex gap-1.5 -mt-2">
              {(["default", "relaxed"] as const).map((preset) => {
                const active = detectPreset(filterValues) === preset;
                return (
                  <button
                    key={preset}
                    onClick={() => { setFilterValues(presetToSliderValues(preset)); setPage(1); }}
                    className={cn(
                      "flex-1 rounded px-2 py-1 text-xs border transition-colors",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                    )}
                  >
                    {preset.charAt(0).toUpperCase() + preset.slice(1)}
                  </button>
                );
              })}
            </div>
            <Separator />
            {METRIC_FILTERS.map((f) => (
              <MetricFilterControl
                key={f.key}
                filter={f}
                sliderValue={filterValues[f.key] ?? defaultSliderValue(f)}
                onChange={(v) => {
                  setFilterValues((prev) => ({ ...prev, [f.key]: v }));
                  setPage(1);
                }}
              />
            ))}
            <Separator />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Passing (this page)</span>
              <span className="font-semibold text-foreground">
                {passedCount} / {designs.length}
              </span>
            </div>
          </Card>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : scoresMetaError || !datasetScores ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart3 className="size-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No scores for this dataset</p>
              <p className="text-xs text-muted-foreground mt-1">
                Run a design pipeline on this dataset (e.g. <code className="font-mono bg-muted px-1 rounded">phi filter</code> or the Design Agent).
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href={`/dashboard/datasets/${id}`}>Back to dataset</Link>
              </Button>
            </Card>
          ) : totalCount === 0 && designs.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart3 className="size-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No design results in this run</p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              {totalCount > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b text-xs text-muted-foreground">
                  <span>
                    Showing {pageStart}–{pageEnd} of {totalCount}
                    {viewMode === "all" && passedCount < designs.length && (
                      <> · {designs.length - passedCount} filtered out</>
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-0"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="size-3.5" />
                      Prev
                    </Button>
                    <span className="px-2">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-0"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
              {passedCount > 0 && (
                <div className="px-4 py-2 bg-muted/50 border-b text-sm">
                  <span className="font-medium">{passedCount} designs passed</span>{" "}
                  <span className="text-muted-foreground">(this page)</span>
                </div>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-[180px]">Design name</TableHead>
                      <TableHead className="text-xs w-16">Status</TableHead>
                      <TableHead className="text-xs">pLDDT</TableHead>
                      <TableHead className="text-xs">pTM</TableHead>
                      <TableHead className="text-xs">
                        <span className="inline-flex items-center gap-1">
                          ipTM
                          <span className="text-muted-foreground/50" title="Sorted by ipTM descending">↓</span>
                        </span>
                      </TableHead>
                      <TableHead className="text-xs">iPAE (Å)</TableHead>
                      <TableHead className="text-xs">RMSD (Å)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedDesigns.map(({ row, passesFilters }, i) => (
                      <TableRow
                        key={`${row.design_name}-${page}-${i}`}
                        className={cn(!passesFilters && "opacity-40")}
                      >
                        <TableCell className="font-mono text-xs">
                          {row.design_name || "—"}
                        </TableCell>
                        <TableCell>
                          {passesFilters ? (
                            <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 font-medium text-xs">
                              <Check className="size-3.5" />
                              Pass
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                              <X className="size-3" />
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <MetricCell
                            value={row.esmfold_plddt}
                            filter={FILTER_BY_KEY["esmfold_plddt"]!}
                            sliderValue={filterValues["esmfold_plddt"] ?? defaultSliderValue(FILTER_BY_KEY["esmfold_plddt"]!)}
                          />
                        </TableCell>
                        <TableCell>
                          <MetricCell
                            value={row.af2_ptm}
                            filter={FILTER_BY_KEY["af2_ptm"]!}
                            sliderValue={filterValues["af2_ptm"] ?? defaultSliderValue(FILTER_BY_KEY["af2_ptm"]!)}
                          />
                        </TableCell>
                        <TableCell>
                          <MetricCell
                            value={row.af2_iptm}
                            filter={FILTER_BY_KEY["af2_iptm"]!}
                            sliderValue={filterValues["af2_iptm"] ?? defaultSliderValue(FILTER_BY_KEY["af2_iptm"]!)}
                          />
                        </TableCell>
                        <TableCell>
                          <MetricCell
                            value={row.af2_ipae}
                            filter={FILTER_BY_KEY["af2_ipae"]!}
                            sliderValue={filterValues["af2_ipae"] ?? defaultSliderValue(FILTER_BY_KEY["af2_ipae"]!)}
                          />
                        </TableCell>
                        <TableCell>
                          <MetricCell
                            value={row.rmsd}
                            filter={FILTER_BY_KEY["rmsd"]!}
                            sliderValue={filterValues["rmsd"] ?? defaultSliderValue(FILTER_BY_KEY["rmsd"]!)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {scoresPage?.truncated && (
                <div className="px-4 py-2 border-t text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30">
                  Large file — results may be incomplete. Contact support if you need full access.
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
