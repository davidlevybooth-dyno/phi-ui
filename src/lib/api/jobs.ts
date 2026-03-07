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

export type { Job, JobListResponse, JobStatusResponse, JobSubmitResponse, JobType };

export interface JobSubmitRequest {
  job_type: JobType;
  params: Record<string, unknown>;
  input_files?: Record<string, string>;
  run_id?: string;
  priority?: number;
  context?: Record<string, unknown>;
}

export async function submitJob(request: JobSubmitRequest): Promise<JobSubmitResponse> {
  const data = await apiPost<unknown>("/api/v1/jobs/", request);
  return JobSubmitResponseSchema.parse(data);
}

export async function listJobs(opts?: {
  page?: number;
  page_size?: number;
  status?: string;
  job_type?: string;
}): Promise<JobListResponse> {
  const data = await apiGet<unknown>("/api/v1/jobs/", opts as Record<string, string | number | boolean | undefined>);
  return JobListResponseSchema.parse(data);
}

export async function getJobStatus(
  jobId: string,
  opts?: { includeAssets?: boolean }
): Promise<JobStatusResponse> {
  const data = await apiGet<unknown>(`/api/v1/jobs/${jobId}/status`, {
    include_assets: opts?.includeAssets,
  });
  return JobStatusResponseSchema.parse(data);
}

export async function cancelJob(jobId: string) {
  const data = await apiDelete<unknown>(`/api/v1/jobs/${jobId}`);
  return JobCancelResponseSchema.parse(data);
}

export async function batchSubmitJobs(requests: JobSubmitRequest[]) {
  const data = await apiPost<unknown>("/api/v1/jobs/batch", requests);
  return BatchJobSubmitResponseSchema.parse(data);
}

export function getJobLogStreamUrl(jobId: string): string {
  return buildStreamUrl(`/api/v1/jobs/${jobId}/logs/stream`);
}
