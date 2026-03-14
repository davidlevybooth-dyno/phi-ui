import { apiGet, apiPost, apiDelete, buildStreamUrl } from "./client";
import {
  JobListResponseSchema,
  JobStatusResponseSchema,
  JobSubmitResponseSchema,
  JobCancelResponseSchema,
  BatchJobSubmitResponseSchema,
  type Job,
  type JobListResponse,
  type JobStatusResponse,
  type JobSubmitResponse,
  type JobType,
} from "@/lib/schemas/job";
import {
  JobScoresResponseSchema,
  type JobScoresResponse,
} from "@/lib/schemas/upload";

export type { Job, JobListResponse, JobStatusResponse, JobSubmitResponse, JobType, JobScoresResponse };

/**
 * Signed download URL for the scores.csv produced by a design_pipeline job.
 * 404 if job not found or pipeline hasn't produced a scores file yet.
 */
export async function getJobScores(
  jobId: string,
  opts?: { expires_in?: number }
): Promise<JobScoresResponse> {
  const data = await apiGet<unknown>(
    `/v1/phi/jobs/${encodeURIComponent(jobId)}/scores`,
    opts as Record<string, number | undefined>
  );
  return JobScoresResponseSchema.parse(data);
}

export interface JobSubmitRequest {
  job_type: JobType;
  params: Record<string, unknown>;
  input_files?: Record<string, string>;
  priority?: number;
  context?: Record<string, unknown>;
  dataset_id?: string;
}

export async function submitJob(request: JobSubmitRequest): Promise<JobSubmitResponse> {
  const data = await apiPost<unknown>("/v1/phi/jobs/", request);
  return JobSubmitResponseSchema.parse(data);
}

export async function listJobs(opts?: {
  page?: number;
  page_size?: number;
  status?: string;
  job_type?: string;
  /** Filter jobs that used this dataset (backend may support this for dataset-scoped listing). */
  dataset_id?: string;
}): Promise<JobListResponse> {
  const data = await apiGet<unknown>("/v1/phi/jobs/", opts as Record<string, string | number | boolean | undefined>);
  return JobListResponseSchema.parse(data);
}

export async function getJobStatus(
  jobId: string,
  opts?: { includeAssets?: boolean }
): Promise<JobStatusResponse> {
  const data = await apiGet<unknown>(`/v1/phi/jobs/${jobId}/status`, {
    include_assets: opts?.includeAssets,
  });
  return JobStatusResponseSchema.parse(data);
}

export async function cancelJob(jobId: string) {
  const data = await apiDelete<unknown>(`/v1/phi/jobs/${jobId}`);
  return JobCancelResponseSchema.parse(data);
}

export async function batchSubmitJobs(requests: JobSubmitRequest[]) {
  if (requests.length > 50) {
    throw new Error(
      `Batch size ${requests.length} exceeds the maximum of 50 jobs per request.`
    );
  }
  const data = await apiPost<unknown>("/v1/phi/jobs/batch", requests);
  return BatchJobSubmitResponseSchema.parse(data);
}

export function getJobLogStreamUrl(jobId: string): string {
  return buildStreamUrl(`/v1/phi/jobs/${jobId}/logs/stream`);
}
