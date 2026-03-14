import { z } from "zod";

export const ArtifactResponseSchema = z.object({
  artifact_id: z.string(),
  run_id: z.string(),
  artifact_type: z.string(),
  filename: z.string(),
  storage_path: z.string(),
  size_bytes: z.number().nullable(),
  mime_type: z.string().nullable(),
  created_at: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

export const ArtifactListResponseSchema = z.object({
  run_id: z.string(),
  artifacts: z.array(ArtifactResponseSchema),
  total_count: z.number(),
  total_size_bytes: z.number(),
});

/** Only allow HTTPS to prevent script injection via javascript: or data: URLs. */
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

export const DownloadURLResponseSchema = z.object({
  artifact_id: z.string().optional(),
  filename: z.string(),
  download_url: HTTPS_URL_SCHEMA,
  expires_in: z.number().default(3600),
});

/** Run results: workflow_artifacts and artifact_files from GET /v1/phi/runs/{id}/results */
export const WorkflowArtifactsSchema = z.object({
  designs_passed: z.number().optional(),
  designs_failed: z.number().optional(),
  scores_csv_gcs_uri: z.string().optional(),
  /** Pre-signed download URL for the scores CSV when not listed in artifact_files. */
  scores_download_url: z.string().url().optional(),
  passed_designs: z.array(z.string()).optional(),
}).passthrough();

export const ArtifactFileSchema = z.object({
  artifact_id: z.string(),
  artifact_type: z.string(),
  filename: z.string().optional(),
}).passthrough();

export const RunResultsResponseSchema = z.object({
  status: z.string().optional(),
  workflow_artifacts: WorkflowArtifactsSchema.optional(),
  artifact_files: z.array(ArtifactFileSchema).optional(),
}).passthrough();

export const AssetSchema = z.object({
  id: z.string().optional(),
  asset_id: z.string().optional(),
  asset_type: z.string().optional(),
  filename: z.string().optional(),
  storage_path: z.string().optional(),
  size_bytes: z.number().nullable().optional(),
  created_at: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const RunAssetsResponseSchema = z.object({
  run_id: z.string().optional(),
  assets: z.array(AssetSchema).optional(),
  total_count: z.number().int().optional(),
}).passthrough();

export const AssetListResponseSchema = z.object({
  assets: z.array(AssetSchema).optional(),
  total_count: z.number().int().optional(),
  page: z.number().int().optional(),
  page_size: z.number().int().optional(),
}).passthrough();

export type ArtifactResponse = z.infer<typeof ArtifactResponseSchema>;
export type ArtifactListResponse = z.infer<typeof ArtifactListResponseSchema>;
export type DownloadURLResponse = z.infer<typeof DownloadURLResponseSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type WorkflowArtifacts = z.infer<typeof WorkflowArtifactsSchema>;
export type ArtifactFile = z.infer<typeof ArtifactFileSchema>;
export type RunResultsResponse = z.infer<typeof RunResultsResponseSchema>;
export type RunAssetsResponse = z.infer<typeof RunAssetsResponseSchema>;
export type AssetListResponse = z.infer<typeof AssetListResponseSchema>;
