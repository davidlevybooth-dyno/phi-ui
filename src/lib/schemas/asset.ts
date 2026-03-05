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

export const DownloadURLResponseSchema = z.object({
  artifact_id: z.string(),
  filename: z.string(),
  download_url: z.string(),
  expires_in: z.number().default(3600),
});

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

export type ArtifactResponse = z.infer<typeof ArtifactResponseSchema>;
export type ArtifactListResponse = z.infer<typeof ArtifactListResponseSchema>;
export type DownloadURLResponse = z.infer<typeof DownloadURLResponseSchema>;
export type Asset = z.infer<typeof AssetSchema>;
