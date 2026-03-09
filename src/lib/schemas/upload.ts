import { z } from "zod";

// ---------------------------------------------------------------------------
// Single-file upload (POST /api/v1/files/upload-url)
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
  // Backend uses uppercase for some status values
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
  gcs_uri: z.string(),
  size_bytes: z.number().int().optional(),
});

export const DatasetSchema = z.object({
  dataset_id: z.string(),
  name: z.string().optional(),
  file_type: z.string().optional(),
  artifact_count: z.number().int(),
  status: DatasetStatusEnum,
  created_at: z.string(),
  files: z.array(DatasetFileSchema).optional(),
});

export const DatasetListResponseSchema = z.object({
  datasets: z.array(DatasetSchema),
  total: z.number().int(),
  page: z.number().int(),
  page_size: z.number().int(),
});

// ---------------------------------------------------------------------------
// Auth me
// ---------------------------------------------------------------------------

export const AuthMeResponseSchema = z.object({
  user_id: z.string(),
  email: z.string().optional(),
  display_name: z.string().nullable().optional(),
  org_id: z.string().nullable().optional(),
  org_name: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadUrlRequest = z.infer<typeof UploadUrlRequestSchema>;
export type UploadUrlResponse = z.infer<typeof UploadUrlResponseSchema>;
export type IngestSession = z.infer<typeof IngestSessionSchema>;
export type Dataset = z.infer<typeof DatasetSchema>;
export type DatasetListResponse = z.infer<typeof DatasetListResponseSchema>;
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;
