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
  "design_pipeline",
]);

export const JobProgressSchema = z.object({
  current_step: z.string(),
  percent_complete: z.number().min(0).max(100),
  eta_seconds: z.number().nullable().optional(),
});

const JobParamsSchema = z
  .object({ dataset_id: z.string().optional() })
  .catchall(z.unknown());

export const JobStatusResponseSchema = z.object({
  job_id: z.string(),
  run_id: z.string(),
  status: JobStatusEnum,
  job_type: z.string().optional(),
  progress: JobProgressSchema.nullable().optional(),
  params: JobParamsSchema.optional(),
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
  /** run_id may be absent on very old jobs or when the job hasn't started. */
  run_id: z.string().optional(),
  status: JobStatusEnum,
  job_type: z.string(),
  params: JobParamsSchema.optional(),
  /** Top-level dataset_id when backend includes it (e.g. GET /jobs?dataset_id=). */
  dataset_id: z.string().optional(),
  input_files: z.record(z.string(), z.unknown()).nullable().optional(),
  output_files: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
  asset_count: z.number().optional(),
  assets_url: z.string().nullable().optional(),
  created_at: z.string(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  progress: JobProgressSchema.nullable().optional(),
}).passthrough();

export const JobListResponseSchema = z.object({
  jobs: z.array(JobSchema),
  total_count: z.number().optional().default(0),
  total_pending: z.number().optional().default(0),
  total_running: z.number().optional().default(0),
  total_completed: z.number().optional().default(0),
  total_failed: z.number().optional().default(0),
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

/** Backend job_type → user-facing display label (section 1 of backend guide). */
export const JOB_TYPE_DISPLAY_LABELS: Record<string, string> = {
  proteinmpnn: "Inverse Folding",
  esmfold: "Structure Prediction",
  alphafold: "Complex Structure Prediction",
  rfdiffusion3: "Design (RFDiffusion3)",
  boltzgen: "Design (BoltzGen)",
  design_pipeline: "Design Pipeline",
  rfdiffusion: "RFDiffusion (v1)",
  esm2: "ESM2",
  boltz: "Boltz",
  chai1: "Chai-1",
  af2rank: "AF2Rank",
  research: "Research",
};

export function getJobTypeDisplayLabel(jobType: string): string {
  return JOB_TYPE_DISPLAY_LABELS[jobType] ?? jobType;
}

/** Backend progress.current_step → user-facing label (pipeline step names). */
export const PROGRESS_STEP_DISPLAY_LABELS: Record<string, string> = {
  run_alphafold: "Complex Structure Prediction (AlphaFold2)",
  generate_sequences: "Inverse Folding (ProteinMPNN)",
  run_esmfold: "Structure Prediction (ESMFold)",
  run_rfdiffusion: "Design (RFDiffusion)",
  run_boltzgen: "Design (BoltzGen)",
  score_esm2: "ESM2 Scoring",
  run_bindcraft: "BindCraft",
};

export function getProgressStepDisplayLabel(step: string): string {
  return PROGRESS_STEP_DISPLAY_LABELS[step] ?? step;
}

/** Extract dataset_id from job (top-level or params). Backend may send either. */
export function getDatasetIdFromJob(
  job: { params?: Record<string, unknown>; dataset_id?: string }
): string | undefined {
  const fromTop = job.dataset_id;
  if (typeof fromTop === "string") return fromTop;
  const fromParams = job.params?.dataset_id;
  return typeof fromParams === "string" ? fromParams : undefined;
}

export type JobStatus = z.infer<typeof JobStatusEnum>;
export type JobType = z.infer<typeof JobTypeEnum>;
export type JobProgress = z.infer<typeof JobProgressSchema>;
export type Job = z.infer<typeof JobSchema>;
export type JobStatusResponse = z.infer<typeof JobStatusResponseSchema>;
export type JobSubmitResponse = z.infer<typeof JobSubmitResponseSchema>;
export type JobListResponse = z.infer<typeof JobListResponseSchema>;
