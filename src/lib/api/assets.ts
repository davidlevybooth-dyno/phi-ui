import { apiGet } from "./client";
import {
  ArtifactListResponseSchema,
  ArtifactResponseSchema,
  DownloadURLResponseSchema,
  type ArtifactListResponse,
  type ArtifactResponse,
  type DownloadURLResponse,
} from "@/lib/schemas/asset";

export async function getRunArtifacts(runId: string): Promise<ArtifactListResponse> {
  const data = await apiGet<unknown>(`/runs/${runId}/artifacts`);
  return ArtifactListResponseSchema.parse(data);
}

export async function getArtifact(artifactId: string): Promise<ArtifactResponse> {
  const data = await apiGet<unknown>(`/artifacts/${artifactId}`);
  return ArtifactResponseSchema.parse(data);
}

export async function getDownloadUrl(
  artifactId: string,
  expiresIn = 3600
): Promise<DownloadURLResponse> {
  const data = await apiGet<unknown>(`/artifacts/${artifactId}/download`, {
    expires_in: expiresIn,
  });
  return DownloadURLResponseSchema.parse(data);
}

export async function getRunAssets(runId: string) {
  return apiGet<Record<string, unknown>>(`/api/v1/runs/${runId}/assets`);
}

export async function listAssets(
  assetGroupId: string,
  opts?: {
    asset_type?: string;
    filter_key?: string;
    filter_op?: string;
    filter_value?: string;
    sort_by?: string;
    sort_order?: string;
  }
) {
  return apiGet<Record<string, unknown>>(
    `/api/v1/asset-groups/${assetGroupId}/assets`,
    opts as Record<string, string | undefined>
  );
}

export async function getWorkflowResults(runId: string, includeArtifacts = true) {
  const data = await apiGet<Record<string, unknown>>(`/api/v1/runs/${runId}/results`, {
    include_artifacts: includeArtifacts,
  });
  return data;
}

