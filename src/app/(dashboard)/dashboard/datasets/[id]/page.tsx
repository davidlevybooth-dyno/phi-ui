"use client";

import { use, useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Check, ChevronLeft, ChevronRight, BarChart3, Copy, Download, FileText, Loader2, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  getDataset,
  getDatasetArtifacts,
  getDatasetJobs,
  getDatasetScores,
  getDatasetResearchNotes,
  postDatasetResearchNotes,
  updateDataset,
} from "@/lib/api/upload";
import { getDownloadUrl } from "@/lib/api/assets";
import { listJobs, getJobStatus } from "@/lib/api/jobs";
import {
  getJobTypeDisplayLabel,
  getProgressStepDisplayLabel,
  getDatasetIdFromJob,
} from "@/lib/schemas/job";
import type { Job } from "@/lib/schemas/job";
import { cn } from "@/lib/utils";
import type { Dataset, DatasetFile, DatasetJobEntry } from "@/lib/schemas/upload";
import { useAuth } from "@/lib/auth-context";
import { safeFormat } from "@/lib/utils/date";
import { toast } from "sonner";

/** Derive a human-readable summary of file types from the dataset's file list. */
function summarizeFileTypes(files: DatasetFile[]): string {
  if (files.length === 0) return "";
  const counts: Record<string, number> = {};
  for (const f of files) {
    const ext = f.filename.split(".").pop()?.toUpperCase() ?? "OTHER";
    counts[ext] = (counts[ext] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([ext, n]) => `${n} ${ext}`)
    .join(", ");
}

/** Compact copyable ID badge with icon feedback. */
function CopyIdButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={handleCopy}
      className="group inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground rounded hover:text-foreground transition-colors"
      title="Copy dataset ID"
    >
      <span>{id}</span>
      {copied
        ? <Check className="size-3 text-green-600 shrink-0" />
        : <Copy className="size-3 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />}
    </button>
  );
}

/** Inline editable name — shows as text, becomes an Input on click. */
function EditableName({
  value,
  placeholder,
  onSave,
  saving,
}: {
  value: string;
  placeholder: string;
  onSave: (name: string) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  // Keep draft in sync when the external value changes (e.g. after save)
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== value) onSave(trimmed);
  }, [draft, value, onSave]);

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          className="text-xl font-semibold h-9 max-w-sm"
          disabled={saving}
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-2 text-left"
      title="Click to rename"
    >
      <h1 className="text-xl font-semibold">
        {value || <span className="text-muted-foreground italic font-normal">{placeholder}</span>}
      </h1>
      <Pencil className="size-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
    </button>
  );
}

/** Parse a raw output_files entry into a typed download record. Returns null if unusable. */
function parseOutputFile(
  raw: Record<string, unknown>
): { filename: string; url: string } | null {
  const filename = typeof raw.filename === "string" ? raw.filename : null;
  const url = typeof raw.download_url === "string" ? raw.download_url : null;
  if (!filename || !url) return null;
  try {
    new URL(url);
  } catch {
    return null;
  }
  return { filename, url };
}

/** Download button for a single dataset artifact. Fetches a fresh signed URL on click. */
function DownloadFileButton({ artifactId, filename }: { artifactId: string; filename: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const { download_url } = await getDownloadUrl(artifactId);
      const a = document.createElement("a");
      a.href = download_url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      const { toast } = await import("sonner");
      toast.error(`Failed to download ${filename}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={`Download ${filename}`}
      className="ml-1.5 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
    >
      {loading
        ? <Loader2 className="size-3 animate-spin" />
        : <Download className="size-3" />}
    </button>
  );
}

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-muted text-muted-foreground",
  submitted: "bg-muted text-muted-foreground",
  running:   "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  failed:    "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_STYLES[status] ?? "bg-muted text-muted-foreground")}>
      {status === "running" && <Loader2 className="size-2.5 animate-spin" />}
      {status}
    </span>
  );
}

/**
 * Renders a single job card and self-polls the single-job status endpoint every 10s
 * for non-terminal jobs. Per backend docs, this also triggers output_files backfill
 * for newly-completed jobs.
 */
function JobCard({
  job,
  datasetId,
}: {
  job: { job_id: string; job_type: string; status: string; created_at: string; completed_at?: string | null };
  datasetId: string;
}) {
  const queryClient = useQueryClient();
  const wasTerminal = useRef(TERMINAL_STATUSES.has(job.status));

  const { data: liveStatus } = useQuery({
    queryKey: ["job-status", job.job_id],
    // include_assets=true triggers output_files backfill on the backend (integration guide §3).
    queryFn: () => getJobStatus(job.job_id, { includeAssets: true }),
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status ?? job.status;
      return TERMINAL_STATUSES.has(status) ? false : 10_000;
    },
  });

  // When job transitions into a terminal state, refresh the scores + job list queries.
  useEffect(() => {
    const status = liveStatus?.status;
    if (status && TERMINAL_STATUSES.has(status) && !wasTerminal.current) {
      wasTerminal.current = true;
      queryClient.invalidateQueries({ queryKey: ["dataset-scores", datasetId] });
      queryClient.invalidateQueries({ queryKey: ["dataset-jobs", datasetId] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "dataset", datasetId] });
    }
  }, [liveStatus?.status, datasetId, queryClient]);

  const effectiveStatus = liveStatus?.status ?? job.status;
  const progress = liveStatus?.progress;
  const error = liveStatus?.error;
  const completedAt = liveStatus?.completed_at ?? job.completed_at;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{getJobTypeDisplayLabel(job.job_type)}</p>
            <StatusBadge status={effectiveStatus} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {job.job_id.slice(0, 12)}… · {safeFormat(job.created_at, "MMM d, HH:mm")}
            {completedAt && ` → ${safeFormat(completedAt, "HH:mm")}`}
          </p>

          {/* Running progress */}
          {effectiveStatus === "running" && progress && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {getProgressStepDisplayLabel(progress.current_step.split(":")[0])}
                  {progress.current_step.includes(":") && (
                    <span className="ml-1 text-muted-foreground/60">
                      ({progress.current_step.split(":")[1].trim()})
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">{progress.percent_complete}%</p>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${progress.percent_complete}%` }}
                />
              </div>
            </div>
          )}

          {/* Pending — no progress yet */}
          {effectiveStatus === "pending" && (
            <p className="text-xs text-muted-foreground mt-1">Waiting for worker to pick up job…</p>
          )}

          {/* Error detail */}
          {effectiveStatus === "failed" && error && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
              <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
              <span className="break-all">{error}</span>
            </div>
          )}

          {/* Output file downloads */}
          {effectiveStatus === "completed" && liveStatus?.output_files && liveStatus.output_files.length > 0 && (
            <div className="mt-2 space-y-1">
              {liveStatus.output_files.map((raw, i) => {
                const file = parseOutputFile(raw as Record<string, unknown>);
                if (!file) return null;
                return (
                  <a
                    key={i}
                    href={file.url}
                    download={file.filename}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <Download className="size-3 shrink-0" />
                    {file.filename}
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {effectiveStatus === "completed" && (
          <Link
            href={`/dashboard/datasets/${datasetId}/scores`}
            className="text-xs text-primary hover:underline shrink-0"
          >
            View scores
          </Link>
        )}
      </div>
    </Card>
  );
}

export default function DatasetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading: authLoading, ready: authReady } = useAuth();
  const queryClient = useQueryClient();
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [filesPage, setFilesPage] = useState(1);
  const FILES_PAGE_SIZE = 10;

  const {
    data: dataset,
    isLoading: loadingDataset,
    isError: datasetError,
    error: datasetErr,
  } = useQuery({
    queryKey: ["dataset", id],
    queryFn: () => getDataset(id),
    enabled: authReady && !!id,
  });

  const files = dataset?.files ?? dataset?.sample_files ?? [];
  useEffect(() => {
    setFilesPage(1);
  }, [id, files.length]);

  const { data: notes, isLoading: loadingNotes } = useQuery({
    queryKey: ["dataset-notes", id],
    queryFn: () => getDatasetResearchNotes(id),
    enabled: authReady && !!id,
  });

  const {
    data: datasetJobsResponse,
    isLoading: loadingDatasetJobs,
  } = useQuery({
    queryKey: ["dataset-jobs", id],
    queryFn: () => getDatasetJobs(id),
    enabled: authReady && !!id,
  });

  // Fallback scan when the dedicated endpoint returns 0 jobs.
  const primaryJobsSettled = !loadingDatasetJobs;
  const primaryJobsEmpty = (datasetJobsResponse?.jobs ?? []).length === 0;
  const { data: fallbackJobsResponse, isLoading: loadingFallbackJobs } = useQuery({
    queryKey: ["jobs", "dataset", id],
    queryFn: () => listJobs({ page: 1, page_size: 200, dataset_id: id }),
    enabled: authReady && !!id && primaryJobsSettled && primaryJobsEmpty,
  });

  const datasetJobs = datasetJobsResponse?.jobs ?? [];
  const fallbackJobs = (fallbackJobsResponse?.jobs ?? []) as Job[];
  const jobsFromList = fallbackJobs.filter((j) => getDatasetIdFromJob(j) === id);
  const jobsForDataset: Array<DatasetJobEntry & { run_id?: string }> =
    datasetJobs.length > 0
      ? datasetJobs.map((j) => ({ ...j }))
      : jobsFromList.map((j) => ({
          job_id: j.job_id,
          job_type: j.job_type,
          status: j.status,
          created_at: j.created_at,
          completed_at: j.completed_at ?? null,
          scores_url: undefined,
          run_id: j.run_id,
        }));

  const loadingJobs = loadingDatasetJobs || (datasetJobs.length === 0 && loadingFallbackJobs);

  const { data: artifactsResponse } = useQuery({
    queryKey: ["dataset-artifacts", id],
    queryFn: () => getDatasetArtifacts(id),
    enabled: authReady && !!id,
    // Artifacts don't change — no need to refetch frequently.
    staleTime: 5 * 60_000,
  });

  // Build filename → artifact_id lookup for download buttons.
  const artifactByFilename = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of artifactsResponse?.artifacts ?? []) {
      map.set(a.filename, a.artifact_id);
    }
    return map;
  }, [artifactsResponse]);

  const { data: datasetScores, isLoading: loadingScores } = useQuery({
    queryKey: ["dataset-scores", id],
    queryFn: () => getDatasetScores(id),
    enabled: authReady && !!id,
    retry: (_, err) => {
      const status = err && typeof err === "object" && "status" in err ? (err as { status?: number }).status : undefined;
      return status !== 404;
    },
  });

  const saveNotesMutation = useMutation({
    mutationFn: (content: string) => postDatasetResearchNotes(id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dataset-notes", id] });
      setNotesDraft(null);
      toast.success("Research notes saved");
    },
    onError: () => toast.error("Failed to save notes"),
  });

  const renameDatasetMutation = useMutation({
    mutationFn: (name: string) => updateDataset(id, { name }),
    onSuccess: (updated: Dataset) => {
      queryClient.setQueryData(["dataset", id], updated);
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      toast.success("Dataset renamed");
    },
    onError: () => toast.error("Failed to rename dataset — the API may not support this yet"),
  });

  const displayNotes = notesDraft !== null ? notesDraft : notes?.content ?? "";
  const filesTotal = files.length;
  const filesTotalPages = Math.max(1, Math.ceil(filesTotal / FILES_PAGE_SIZE));
  const filesStart = filesTotal === 0 ? 0 : (filesPage - 1) * FILES_PAGE_SIZE + 1;
  const filesEnd = Math.min(filesPage * FILES_PAGE_SIZE, filesTotal);
  const filesPageItems = files.slice(filesStart - 1, filesEnd);

  const fileTypeSummary = summarizeFileTypes(files);
  const datasetErrorMessage =
    datasetErr instanceof Error ? datasetErr.message : "Failed to load dataset.";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/dashboard/datasets"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="size-3" />
          Datasets
        </Link>
        {loadingDataset ? (
          <Skeleton className="h-7 w-48" />
        ) : datasetError ? (
          <Card className="py-8 text-center">
            <p className="text-sm text-destructive font-medium">Failed to load dataset</p>
            <p className="text-xs text-muted-foreground mt-1">{datasetErrorMessage}</p>
          </Card>
        ) : dataset ? (
          <>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">Name</p>
            <EditableName
              value={dataset.name ?? ""}
              placeholder={dataset.dataset_id ?? id}
              onSave={(name) => renameDatasetMutation.mutate(name)}
              saving={renameDatasetMutation.isPending}
            />
          </>
        ) : null}
        {dataset && !datasetError && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">ID</span>
            <CopyIdButton id={dataset.dataset_id} />
            {fileTypeSummary && (
              <span className="text-xs text-muted-foreground">· {fileTypeSummary}</span>
            )}
          </div>
        )}
      </div>

      {dataset && (
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-medium">Details</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd>{dataset.status}</dd>
            <dt className="text-muted-foreground">Created</dt>
            <dd>{safeFormat(dataset.created_at, "PPp")}</dd>
            {dataset.artifact_count != null && (
              <>
                <dt className="text-muted-foreground">Files</dt>
                <dd>{dataset.artifact_count}</dd>
              </>
            )}
          </dl>
        </Card>
      )}

      {dataset && files.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium">Sample files</h2>
            {filesTotal > FILES_PAGE_SIZE && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>
                  {filesStart}–{filesEnd} of {filesTotal}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => setFilesPage((p) => Math.max(1, p - 1))}
                  disabled={filesPage <= 1}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <span className="min-w-[4rem] text-center">
                  Page {filesPage} of {filesTotalPages}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => setFilesPage((p) => Math.min(filesTotalPages, p + 1))}
                  disabled={filesPage >= filesTotalPages}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
          <ul className="text-xs font-mono space-y-1">
            {filesPageItems.map((f, i) => {
              const artifactId = f.filename ? artifactByFilename.get(f.filename) : undefined;
              return (
                <li key={filesStart + i} className="flex items-center">
                  <span>{f.filename ?? "—"}</span>
                  {artifactId && (
                    <DownloadFileButton artifactId={artifactId} filename={f.filename!} />
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {dataset && (
        <Card className="p-4">
          <h2 className="text-sm font-medium mb-3 flex items-center gap-1.5">
            <BarChart3 className="size-3.5" />
            Scores
          </h2>
          {loadingScores ? (
            <Skeleton className="h-14 w-full" />
          ) : datasetScores ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                {dataset.artifact_count != null && (
                  <div className="text-center">
                    <p className="text-lg font-semibold leading-none">{dataset.artifact_count}</p>
                    <p className="text-xs text-muted-foreground mt-1">files</p>
                  </div>
                )}
                {!loadingJobs && (
                  <div className="text-center">
                    <p className="text-lg font-semibold leading-none">{jobsForDataset.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">pipeline runs</p>
                  </div>
                )}
                {datasetScores.completed_at && (
                  <div className="text-center">
                    <p className="text-xs font-medium leading-none">
                      {safeFormat(datasetScores.completed_at, "MMM d, HH:mm")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">last scored</p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="default">
                  <Link href={`/dashboard/datasets/${id}/scores`}>
                    View scores table
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <a href={datasetScores.download_url} download={datasetScores.filename ?? "scores.csv"}>
                    <Download className="size-3.5" />
                    Download CSV
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {(dataset.artifact_count != null || (!loadingJobs && jobsForDataset.length > 0)) && (
                <div className="flex flex-wrap gap-3 mb-2">
                  {dataset.artifact_count != null && (
                    <div className="text-center">
                      <p className="text-lg font-semibold leading-none">{dataset.artifact_count}</p>
                      <p className="text-xs text-muted-foreground mt-1">files</p>
                    </div>
                  )}
                  {!loadingJobs && (
                    <div className="text-center">
                      <p className="text-lg font-semibold leading-none">{jobsForDataset.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">pipeline runs</p>
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                No scores yet. Run a design pipeline on this dataset (e.g. via the CLI{" "}
                <code className="font-mono bg-muted px-1 rounded">phi filter</code> or the Design
                Agent).
              </p>
            </div>
          )}
        </Card>
      )}

      <Card className="p-4">
        <h2 className="text-sm font-medium mb-1 flex items-center gap-1.5">
          <FileText className="size-3.5" />
          Research notes
        </h2>
        <p className="text-xs text-muted-foreground mb-2">
          Notes are saved here. The Design Agent may add summaries here automatically when runs
          are linked to this dataset.
        </p>
        {loadingNotes ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <Textarea
              className="min-h-[120px] text-sm"
              placeholder="Add notes about this dataset…"
              value={displayNotes}
              onChange={(e) => setNotesDraft(e.target.value)}
            />
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                onClick={() => saveNotesMutation.mutate(displayNotes)}
                disabled={saveNotesMutation.isPending}
                className="gap-1.5"
              >
                <Save className="size-3.5" />
                Save
              </Button>
            </div>
          </>
        )}
      </Card>

      <div>
        <h2 className="text-sm font-medium mb-3">Jobs for this dataset</h2>
        {loadingJobs ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : jobsForDataset.length === 0 ? (
          <Card className="py-10 text-center text-sm text-muted-foreground">
            No jobs linked to this dataset yet.
          </Card>
        ) : (
          <div className="space-y-2">
            {jobsForDataset.map((job) => (
              <JobCard key={job.job_id} job={job} datasetId={id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
