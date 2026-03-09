import { z } from "zod";

export const JobStatusEnum = z.enum([
  "pending",
  "submitted",  // kept for backward compat with jobs created before 2026-03-07 backend fix
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const JobTypeEnum = z.enum([
  "esmfold",
  "proteinmpnn",
  "alphafold",
  "rfdiffusion",
  "ligandmpnn",
  "chai1",
  "boltz",
  "align_structures",
  "tm_score",
  "af2rank",
  "rso",
  "bindcraft",
  "rf3",
  "rfdiffusion3",
  "boltzgen",
  "esm2",
  "research",
]);

export const JobProgressSchema = z.object({
  current_step: z.string(),
  percent_complete: z.number().min(0).max(100),
  eta_seconds: z.number().nullable().optional(),
});

export const JobStatusResponseSchema = z.object({
  job_id: z.string(),
  run_id: z.string(),
  status: JobStatusEnum,
  progress: JobProgressSchema.nullable().optional(),
  output_files: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
  assets_url: z.string().nullable().optional(),
  asset_count: z.number().default(0),
  asset_group: z.record(z.string(), z.unknown()).nullable().optional(),
  assets: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
  error: z.string().nullable().optional(),
  created_at: z.string(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
});

export const JobSubmitResponseSchema = z.object({
  job_id: z.string(),
  run_id: z.string(),
  status: z.string(),
  estimated_duration: z.number().nullable().optional(),
  message: z.string(),
});

/** Shape of each individual job object returned inside `JobListResponse.jobs`. */
export const JobSchema = z.object({
  job_id: z.string(),
  run_id: z.string(),
  status: JobStatusEnum,
  job_type: z.string(),
  created_at: z.string(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  progress: JobProgressSchema.nullable().optional(),
});

export const JobListResponseSchema = z.object({
  jobs: z.array(JobSchema),
  total_count: z.number(),
  total_pending: z.number(),
  total_running: z.number(),
  total_completed: z.number(),
  total_failed: z.number(),
  message: z.string().nullable().optional(),
});

export const JobCancelResponseSchema = z.object({
  job_id: z.string(),
  status: z.string(),
  message: z.string(),
});

export const BatchJobSubmitResponseSchema = z.object({
  job_ids: z.array(z.string()),
  total_count: z.number(),
});

export type JobStatus = z.infer<typeof JobStatusEnum>;
export type JobType = z.infer<typeof JobTypeEnum>;
export type JobProgress = z.infer<typeof JobProgressSchema>;
export type Job = z.infer<typeof JobSchema>;
export type JobStatusResponse = z.infer<typeof JobStatusResponseSchema>;
export type JobSubmitResponse = z.infer<typeof JobSubmitResponseSchema>;
export type JobListResponse = z.infer<typeof JobListResponseSchema>;
