import { apiGet, apiPost } from "./client";
import {
  DatasetJobsResponseSchema,
  DatasetListResponseSchema,
  DatasetResearchNotesResponseSchema,
  DatasetSchema,
  DatasetScoresResponseSchema,
  type Dataset,
  type DatasetJobsResponse,
  type DatasetListResponse,
  type DatasetResearchNotesResponse,
  type DatasetScoresResponse,
  type IngestSession,
  type UploadUrlRequest,
  type UploadUrlResponse,
} from "@/lib/schemas/upload";

// ---------------------------------------------------------------------------
// Single-file upload
// ---------------------------------------------------------------------------

/**
 * Request a short-lived signed GCS PUT URL for a single file.
 * After receiving the URL, PUT the raw file bytes directly to it
 * (no auth header needed on the PUT — it's a pre-signed GCS URL).
 *
 * Pass `gcs_uri` from the response as `params.fasta_gcs_uri` or
 * `params.pdb_gcs_uri` when submitting a job.
 */
export function getUploadUrl(req: UploadUrlRequest): Promise<UploadUrlResponse> {
  return apiPost<UploadUrlResponse>("/v1/phi/files/upload-url", req);
}

/**
 * PUT the raw file bytes to a pre-signed GCS URL.
 * No auth headers — the signature is embedded in the URL.
 */
export async function putFileToSignedUrl(
  signedUrl: string,
  file: File
): Promise<void> {
  const res = await fetch(signedUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!res.ok) {
    throw new Error(`GCS upload failed: ${res.status} ${res.statusText}`);
  }
}

// ---------------------------------------------------------------------------
// Ingest sessions (batch workflow)
// ---------------------------------------------------------------------------

export function createIngestSession(body: {
  expected_files: number;
  file_type?: "pdb" | "fasta" | "csv";
  run_id?: string;
}): Promise<IngestSession> {
  return apiPost<IngestSession>("/v1/phi/ingest_sessions", body);
}

export function getIngestSessionUploadUrls(
  sessionId: string,
  files: string[]
): Promise<{ urls: Array<{ file: string; url: string }> }> {
  return apiPost(`/v1/phi/ingest_sessions/${sessionId}/upload_urls`, { files });
}

export function finalizeIngestSession(
  sessionId: string
): Promise<{ session_id: string; status: string }> {
  return apiPost(`/v1/phi/ingest_sessions/${sessionId}/finalize`, {});
}

export function getIngestSession(sessionId: string): Promise<IngestSession> {
  return apiGet<IngestSession>(`/v1/phi/ingest_sessions/${sessionId}`);
}

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

export function listDatasets(params?: {
  page?: number;
  page_size?: number;
}): Promise<DatasetListResponse> {
  return apiGet<unknown>("/v1/phi/datasets/", params).then((data) =>
    DatasetListResponseSchema.parse(data)
  );
}

export function getDataset(datasetId: string): Promise<Dataset> {
  return apiGet<unknown>(`/v1/phi/datasets/${encodeURIComponent(datasetId)}`).then(
    (data) => DatasetSchema.parse(data)
  );
}

export function getDatasetResearchNotes(
  datasetId: string
): Promise<DatasetResearchNotesResponse> {
  return apiGet<unknown>(
    `/v1/phi/datasets/${encodeURIComponent(datasetId)}/research-notes`
  ).then((data) => DatasetResearchNotesResponseSchema.parse(data));
}

export function postDatasetResearchNotes(
  datasetId: string,
  body: { content: string }
): Promise<DatasetResearchNotesResponse> {
  return apiPost<unknown>(
    `/v1/phi/datasets/${encodeURIComponent(datasetId)}/research-notes`,
    body
  ).then((data) => DatasetResearchNotesResponseSchema.parse(data));
}

/**
 * List pipeline jobs run against a dataset (newest first).
 * Optional status filter.
 */
export function getDatasetJobs(
  datasetId: string,
  opts?: { status?: string }
): Promise<DatasetJobsResponse> {
  return apiGet<unknown>(
    `/v1/phi/datasets/${encodeURIComponent(datasetId)}/jobs`,
    opts as Record<string, string | undefined>
  ).then((data) => DatasetJobsResponseSchema.parse(data));
}

/**
 * One-call: signed download URL for the most recent completed scores.csv for this dataset.
 * 404 if no completed pipeline job exists for this dataset.
 */
export function getDatasetScores(datasetId: string): Promise<DatasetScoresResponse> {
  return apiGet<unknown>(
    `/v1/phi/datasets/${encodeURIComponent(datasetId)}/scores`
  ).then((data) => DatasetScoresResponseSchema.parse(data));
}
