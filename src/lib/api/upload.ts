import { apiGet, apiPost } from "./client";
import type {
  AuthMeResponse,
  UploadUrlRequest,
  UploadUrlResponse,
  IngestSession,
  Dataset,
  DatasetListResponse,
} from "@/lib/schemas/upload";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export function getAuthMe(): Promise<AuthMeResponse> {
  return apiGet<AuthMeResponse>("/api/v1/auth/me");
}

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
  return apiPost<UploadUrlResponse>("/api/v1/files/upload-url", req);
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
  return apiPost<IngestSession>("/api/v1/ingest_sessions", body);
}

export function getIngestSessionUploadUrls(
  sessionId: string,
  files: string[]
): Promise<{ urls: Array<{ file: string; url: string }> }> {
  return apiPost(`/api/v1/ingest_sessions/${sessionId}/upload_urls`, { files });
}

export function finalizeIngestSession(
  sessionId: string
): Promise<{ session_id: string; status: string }> {
  return apiPost(`/api/v1/ingest_sessions/${sessionId}/finalize`, {});
}

export function getIngestSession(sessionId: string): Promise<IngestSession> {
  return apiGet<IngestSession>(`/api/v1/ingest_sessions/${sessionId}`);
}

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

export function listDatasets(params?: {
  page?: number;
  page_size?: number;
}): Promise<DatasetListResponse> {
  return apiGet<DatasetListResponse>("/api/v1/datasets", params);
}

export function getDataset(datasetId: string): Promise<Dataset> {
  return apiGet<Dataset>(`/api/v1/datasets/${datasetId}`);
}
