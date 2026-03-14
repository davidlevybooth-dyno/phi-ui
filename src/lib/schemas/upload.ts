import { z } from "zod";

// ---------------------------------------------------------------------------
// Single-file upload (POST /v1/phi/files/upload-url)
// ---------------------------------------------------------------------------

export const UploadUrlRequestSchema = z.object({
  filename: z.string(),
  content_type: z.string(),
  size_bytes: z.number().int().positive(),
});

export const UploadUrlResponseSchema = z.object({
  upload_url: z.string().url(),
  gcs_uri: z.string(),
  expires_in: z.number().int(),
});

// ---------------------------------------------------------------------------
// Ingest sessions (batch upload workflow)
// ---------------------------------------------------------------------------

export const IngestSessionStatusEnum = z.enum([
  "created",
  "uploading",
  "finalizing",
  "ready",
  "failed",
  // Backend returns uppercase variants
  "CREATED",
  "READY",
  "FAILED",
]);

export const CreateIngestSessionRequestSchema = z.object({
  expected_files: z.number().int().positive(),
  file_type: z.enum(["pdb", "fasta", "csv"]).optional(),
  run_id: z.string().optional(),
});

export const IngestSessionSchema = z.object({
  session_id: z.string(),
  upload_prefix: z.string().optional(),
  status: IngestSessionStatusEnum,
  expected_files: z.number().int().optional(),
  uploaded_files: z.number().int().optional(),
  dataset_id: z.string().nullable().optional(),
  artifact_count: z.number().int().optional(),
  error: z.string().nullable().optional(),
});

export const SignedUploadUrlEntrySchema = z.object({
  file: z.string(),
  url: z.string().url(),
});

export const SignedUploadUrlsResponseSchema = z.object({
  urls: z.array(SignedUploadUrlEntrySchema),
});

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

export const DatasetStatusEnum = z.enum(["READY", "PROCESSING", "FAILED"]);

export const DatasetFileSchema = z.object({
  filename: z.string(),
  /** Removed from backend response as of 2026-03-13 — internal bucket path, never a valid download URL. */
  gcs_uri: z.string().optional(),
  size_bytes: z.number().int().optional(),
  checksum: z.string().optional(),
});

export const DatasetSchema = z.object({
  dataset_id: z.string(),
  name: z.string().optional(),
  file_type: z.string().optional(),
  artifact_count: z.number().int().optional(),
  status: DatasetStatusEnum,
  created_at: z.string(),
  files: z.array(DatasetFileSchema).optional(),
  sample_files: z.array(DatasetFileSchema).optional(),
});

export const DatasetListResponseSchema = z.object({
  datasets: z.array(DatasetSchema),
  total: z.number().int().optional(),
  total_count: z.number().int().optional(),
  page: z.number().int().optional(),
  page_size: z.number().int().optional(),
});

export const DatasetResearchNotesResponseSchema = z.object({
  content: z.string().optional(),
  notes: z.string().optional(),
}).transform((d) => ({ content: d.content ?? d.notes ?? "" }));

// ---------------------------------------------------------------------------
// Dataset jobs & scores (GET /v1/phi/datasets/{id}/jobs, .../scores)
// ---------------------------------------------------------------------------

const HTTPS_URL_SCHEMA = z
  .string()
  .min(1)
  .refine(
    (u) => {
      try {
        const url = new URL(u);
        return url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Download URL must be HTTPS" }
  );

/** One job in GET /v1/phi/datasets/{dataset_id}/jobs response. */
export const DatasetJobEntrySchema = z.object({
  job_id: z.string(),
  job_type: z.string(),
  status: z.string(),
  created_at: z.string(),
  completed_at: z.string().nullable().optional(),
  scores_url: z.string().optional(),
});

export const DatasetJobsResponseSchema = z.object({
  dataset_id: z.string(),
  jobs: z.array(DatasetJobEntrySchema),
  total_count: z.number().int(),
  page: z.number().int().optional(),
  page_size: z.number().int().optional(),
});

/** GET /v1/phi/datasets/{dataset_id}/scores — latest completed scores for dataset. */
export const DatasetScoresResponseSchema = z.object({
  dataset_id: z.string(),
  job_id: z.string(),
  download_url: HTTPS_URL_SCHEMA,
  filename: z.string(),
  expires_in: z.number().int().default(3600),
  completed_at: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Job scores (GET /v1/phi/jobs/{job_id}/scores)
// ---------------------------------------------------------------------------

export const JobScoresResponseSchema = z.object({
  job_id: z.string(),
  artifact_id: z.string().optional(),
  download_url: HTTPS_URL_SCHEMA,
  filename: z.string(),
  expires_in: z.number().int().default(3600),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadUrlRequest = z.infer<typeof UploadUrlRequestSchema>;
export type UploadUrlResponse = z.infer<typeof UploadUrlResponseSchema>;
export type IngestSession = z.infer<typeof IngestSessionSchema>;
export type Dataset = z.infer<typeof DatasetSchema>;
export type DatasetListResponse = z.infer<typeof DatasetListResponseSchema>;
export type DatasetResearchNotesResponse = z.infer<typeof DatasetResearchNotesResponseSchema>;
export type DatasetJobEntry = z.infer<typeof DatasetJobEntrySchema>;
export type DatasetJobsResponse = z.infer<typeof DatasetJobsResponseSchema>;
export type DatasetScoresResponse = z.infer<typeof DatasetScoresResponseSchema>;
export type JobScoresResponse = z.infer<typeof JobScoresResponseSchema>;
