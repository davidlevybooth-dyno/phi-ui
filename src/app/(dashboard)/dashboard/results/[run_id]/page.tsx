"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  SlidersHorizontal,
  BarChart3,
  FileDown,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getRunResults,
  getDownloadUrl,
  fetchScoresCsvPage,
  type RunResultsResponse,
} from "@/lib/api/assets";
import {
  type ScoresCsvRow,
  DEFAULT_SCORES_PAGE_SIZE,
} from "@/lib/schemas/scores-csv";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FilterDirection = "min" | "max";

interface MetricFilter {
  key: keyof ScoresCsvRow | string;
  label: string;
  direction: FilterDirection;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
}

const METRIC_FILTERS: MetricFilter[] = [
  {
    key: "esmfold_plddt",
    label: "ESMFold pLDDT",
    direction: "min",
    defaultValue: 0.8,
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    key: "af2_ptm",
    label: "pTM",
    direction: "min",
    defaultValue: 0.55,
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    key: "af2_iptm",
    label: "ipTM",
    direction: "min",
    defaultValue: 0.5,
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    key: "af2_ipae",
    label: "iPAE (Å)",
    direction: "max",
    defaultValue: 10.85,
    min: 0,
    max: 31,
    step: 0.1,
  },
  {
    key: "rmsd",
    label: "RMSD (Å)",
    direction: "max",
    defaultValue: 3.5,
    min: 0,
    max: 20,
    step: 0.1,
  },
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
          {filter.direction === "min" ? "≥" : "≤"}{" "}
          {value.toFixed(filter.step < 1 ? 2 : 1)}
        </span>
      </div>
      <Slider
        min={filter.min}
        max={filter.max}
        step={filter.step}
        value={[value]}
        onValueChange={([v]) => onChange(v ?? filter.defaultValue)}
        className="w-full"
      />
    </div>
  );
}

function MetricCell({
  value,
  direction,
  threshold,
  step,
}: {
  value: number | undefined;
  direction: FilterDirection;
  threshold: number;
  step: number;
}) {
  if (value === undefined) return <span className="text-muted-foreground text-xs">—</span>;
  const passes = direction === "min" ? value >= threshold : value <= threshold;
  return (
    <span
      className={cn(
        "font-mono text-xs",
        passes ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"
      )}
    >
      {value.toFixed(step < 1 ? 3 : 1)}
    </span>
  );
}

const PASSED_ARTIFACT_TYPES = ["passed_designs", "pdb"] as const;

export default function ResultsPage({
  params,
}: {
  params: Promise<{ run_id: string }>;
}) {
  const { run_id } = use(params);

  const [filterValues, setFilterValues] = useState<Record<string, number>>(
    Object.fromEntries(METRIC_FILTERS.map((f) => [f.key, f.defaultValue]))
  );
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [page, setPage] = useState(1);

  const {
    data: runResults,
    isLoading: loadingResults,
    isError: runResultsError,
    error: runResultsErr,
  } = useQuery({
    queryKey: ["run-results", run_id],
    queryFn: () => getRunResults(run_id, true),
  });

  const {
    data: scoresPage,
    isLoading: loadingScores,
    isError: scoresError,
    error: scoresErr,
  } = useQuery({
    queryKey: ["scores-csv", run_id, page],
    queryFn: () => fetchScoresCsvPage(run_id, page, DEFAULT_SCORES_PAGE_SIZE),
    enabled: !!run_id,
  });

  const designs = useMemo(() => scoresPage?.rows ?? [], [scoresPage?.rows]);
  const totalCount = scoresPage?.totalCount ?? 0;
  const runArtifactFiles = (runResults as RunResultsResponse | undefined)?.artifact_files ?? [];
  const workflowArtifacts = (runResults as RunResultsResponse | undefined)?.workflow_artifacts;
  const passedCount = workflowArtifacts?.designs_passed ?? designs.filter((r) => r.passed).length;

  const filtered = useMemo(() => {
    return designs.filter((row) => {
      return METRIC_FILTERS.every((f) => {
        const val = row[f.key as keyof ScoresCsvRow];
        if (val === undefined || val === null) return true;
        const num = Number(val);
        if (Number.isNaN(num)) return true;
        return f.direction === "min" ? num >= filterValues[f.key] : num <= filterValues[f.key];
      });
    });
  }, [designs, filterValues]);

  const totalPages = Math.max(1, Math.ceil(totalCount / DEFAULT_SCORES_PAGE_SIZE));
  const pageStart = totalCount === 0 ? 0 : (page - 1) * DEFAULT_SCORES_PAGE_SIZE + 1;
  const pageEnd = Math.min(page * DEFAULT_SCORES_PAGE_SIZE, totalCount);

  const downloadPassedDesigns = async () => {
    const passedArtifacts = runArtifactFiles.filter((f) =>
      PASSED_ARTIFACT_TYPES.includes(f.artifact_type as (typeof PASSED_ARTIFACT_TYPES)[number])
    );
    if (passedArtifacts.length === 0) {
      toast.info("No passed-design artifacts to download");
      return;
    }
    let count = 0;
    for (const a of passedArtifacts) {
      try {
        const { download_url, filename } = await getDownloadUrl(a.artifact_id);
        const link = document.createElement("a");
        link.href = download_url;
        link.download = a.filename ?? filename ?? a.artifact_id;
        link.click();
        await new Promise((r) => globalThis.setTimeout(r, 300));
        count++;
      } catch {
        toast.error(`Failed to download ${a.filename ?? a.artifact_id}`);
      }
    }
    if (count > 0) toast.success(`Downloaded ${count} file(s)`);
  };

  const downloadAllFiles = async () => {
    if (runArtifactFiles.length === 0) return;
    for (const a of runArtifactFiles) {
      try {
        const { download_url, filename } = await getDownloadUrl(a.artifact_id);
        const link = document.createElement("a");
        link.href = download_url;
        link.download = a.filename ?? filename ?? a.artifact_id;
        link.click();
        await new Promise((r) => globalThis.setTimeout(r, 300));
      } catch {
        toast.error(`Failed: ${a.filename ?? a.artifact_id}`);
      }
    }
    toast.success("Downloads started");
  };

  const isLoading = loadingResults || loadingScores;
  const hasError = runResultsError || scoresError;
  const errorMessage =
    runResultsErr instanceof Error
      ? runResultsErr.message
      : scoresErr instanceof Error
        ? scoresErr.message
        : "Something went wrong loading results.";

  return (
    <div className="space-y-4 max-w-6xl">
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
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFiltersVisible((v) => !v)}
            className="gap-1.5"
          >
            <SlidersHorizontal className="size-3.5" />
            Filters
          </Button>
          {passedCount > 0 && (
            <Button size="sm" onClick={downloadPassedDesigns} className="gap-1.5">
              <Download className="size-3.5" />
              Download passed designs ({passedCount})
            </Button>
          )}
          {runArtifactFiles.length > 0 && (
            <Button size="sm" variant="outline" onClick={downloadAllFiles} className="gap-1.5">
              <FileDown className="size-3.5" />
              All files ({runArtifactFiles.length})
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-4">
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
                value={filterValues[f.key] ?? f.defaultValue}
                onChange={(v) => setFilterValues((prev) => ({ ...prev, [f.key]: v }))}
              />
            ))}
            <Separator />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Passing (this page)</span>
              <span className="font-semibold text-foreground">
                {filtered.length} / {designs.length}
              </span>
            </div>
            {totalCount > 0 && (
              <>
                <Separator />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Passed (run)</span>
                  <span className="font-semibold text-foreground">{passedCount} designs passed</span>
                </div>
              </>
            )}
          </Card>
        )}

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : hasError ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-destructive font-medium">Failed to load results</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">{errorMessage}</p>
            </Card>
          ) : totalCount === 0 && designs.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart3 className="size-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No design results yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Scores will appear here when the run has finished and a scores file is available.
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              {totalCount > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b text-xs text-muted-foreground">
                  <span>
                    Showing {pageStart}–{pageEnd} of {totalCount}
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
                  <span className="font-medium">{passedCount} designs passed</span>
                  {runArtifactFiles.some((f) =>
                    PASSED_ARTIFACT_TYPES.includes(f.artifact_type as (typeof PASSED_ARTIFACT_TYPES)[number])
                  ) && (
                    <Button
                      variant="link"
                      size="sm"
                      className="ml-2 h-auto p-0 text-primary"
                      onClick={downloadPassedDesigns}
                    >
                      Download passed designs
                    </Button>
                  )}
                </div>
              )}
              <div className="overflow-x-auto">
                <TooltipProvider>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-[180px]">Design name</TableHead>
                        <TableHead className="text-xs w-20">Status</TableHead>
                        <TableHead className="text-xs">pLDDT (ESMFold)</TableHead>
                        <TableHead className="text-xs">pTM</TableHead>
                        <TableHead className="text-xs">ipTM</TableHead>
                        <TableHead className="text-xs">iPAE (Å)</TableHead>
                        <TableHead className="text-xs">RMSD (Å)</TableHead>
                        <TableHead className="text-xs">Fail reasons</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((row, i) => {
                        const thresh = (k: string) => filterValues[k] ?? METRIC_FILTERS.find((f) => f.key === k)?.defaultValue ?? 0;
                        return (
                          <TableRow key={`${row.design_name}-${page}-${i}`}>
                            <TableCell className="font-mono text-xs">
                              {row.design_name || "—"}
                            </TableCell>
                            <TableCell>
                              {row.passed ? (
                                <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                                  <Check className="size-3.5" />
                                  Passed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                                  <X className="size-3.5" />
                                  Failed
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <MetricCell
                                value={row.esmfold_plddt}
                                direction="min"
                                threshold={thresh("esmfold_plddt")}
                                step={0.01}
                              />
                            </TableCell>
                            <TableCell>
                              <MetricCell
                                value={row.af2_ptm}
                                direction="min"
                                threshold={thresh("af2_ptm")}
                                step={0.01}
                              />
                            </TableCell>
                            <TableCell>
                              <MetricCell
                                value={row.af2_iptm}
                                direction="min"
                                threshold={thresh("af2_iptm")}
                                step={0.01}
                              />
                            </TableCell>
                            <TableCell>
                              <MetricCell
                                value={row.af2_ipae}
                                direction="max"
                                threshold={thresh("af2_ipae")}
                                step={0.1}
                              />
                            </TableCell>
                            <TableCell>
                              <MetricCell
                                value={row.rmsd}
                                direction="max"
                                threshold={thresh("rmsd")}
                                step={0.1}
                              />
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              {row.fail_reasons ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-xs text-muted-foreground truncate block cursor-default">
                                      {row.fail_reasons}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-sm">
                                    {row.fail_reasons}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TooltipProvider>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
