"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, FileText, Save, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  getDataset,
  getDatasetJobs,
  getDatasetScores,
  getDatasetResearchNotes,
  postDatasetResearchNotes,
} from "@/lib/api/upload";
import { listJobs } from "@/lib/api/jobs";
import { getJobTypeDisplayLabel, getDatasetIdFromJob } from "@/lib/schemas/job";
import type { Job } from "@/lib/schemas/job";
import type { DatasetJobEntry } from "@/lib/schemas/upload";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export default function DatasetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [filesPage, setFilesPage] = useState(1);
  const FILES_PAGE_SIZE = 10;

  const authReady = !authLoading && !!user;

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
    isError: datasetJobsError,
  } = useQuery({
    queryKey: ["dataset-jobs", id],
    queryFn: () => getDatasetJobs(id),
    enabled: authReady && !!id,
  });

  // Only attempt the fallback scan when the dedicated endpoint returns 0 jobs.
  // Avoids a redundant O(all jobs) request when the new endpoint works correctly.
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

  const displayNotes = notesDraft !== null ? notesDraft : notes?.content ?? "";
  const filesTotal = files.length;
  const filesTotalPages = Math.max(1, Math.ceil(filesTotal / FILES_PAGE_SIZE));
  const filesStart = filesTotal === 0 ? 0 : (filesPage - 1) * FILES_PAGE_SIZE + 1;
  const filesEnd = Math.min(filesPage * FILES_PAGE_SIZE, filesTotal);
  const filesPageItems = files.slice(filesStart - 1, filesEnd);

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
          <h1 className="text-xl font-semibold">
            {dataset.name ?? dataset.dataset_id ?? id}
          </h1>
        ) : null}
        {dataset && !datasetError && (
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            {dataset.dataset_id}
          </p>
        )}
      </div>

      {dataset && (
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-medium">Details</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd>{dataset.status}</dd>
            <dt className="text-muted-foreground">Created</dt>
            <dd>{format(new Date(dataset.created_at), "PPp")}</dd>
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
            {filesPageItems.map((f, i) => (
              <li key={filesStart + i}>{f.filename ?? "—"}</li>
            ))}
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
                      {format(new Date(datasetScores.completed_at), "MMM d, HH:mm")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">last scored</p>
                  </div>
                )}
              </div>
              <Button asChild size="sm" variant="default">
                <Link href={`/dashboard/datasets/${id}/scores`}>
                  View scores table
                </Link>
              </Button>
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
              <Card key={job.job_id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {getJobTypeDisplayLabel(job.job_type)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {job.job_id.slice(0, 12)}… · {job.status} ·{" "}
                      {format(new Date(job.created_at), "MMM d, HH:mm")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {"run_id" in job && job.run_id && (
                      <Link
                        href={`/dashboard/results/${job.run_id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View results
                      </Link>
                    )}
                    <Link
                      href={`/dashboard/datasets/${id}/scores`}
                      className="text-xs text-primary hover:underline"
                    >
                      View scores
                    </Link>
                    <Link
                      href={`/dashboard/jobs/${job.job_id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Job detail
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
