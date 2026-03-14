import { apiGet } from "./client";
import {
  ArtifactListResponseSchema,
  ArtifactResponseSchema,
  AssetListResponseSchema,
  DownloadURLResponseSchema,
  RunAssetsResponseSchema,
  RunResultsResponseSchema,
  type ArtifactListResponse,
  type ArtifactResponse,
  type AssetListResponse,
  type DownloadURLResponse,
  type RunAssetsResponse,
  type RunResultsResponse,
} from "@/lib/schemas/asset";

export type { RunResultsResponse };
import {
  DEFAULT_SCORES_PAGE_SIZE,
  MAX_SCORES_CSV_BYTES,
  type ScoresCsvRow,
} from "@/lib/schemas/scores-csv";
import { parseCsvLine, recordToScoresCsvRow } from "@/lib/schemas/scores-csv";

export async function getRunArtifacts(runId: string): Promise<ArtifactListResponse> {
  const data = await apiGet<unknown>(`/v1/phi/runs/${runId}/artifacts`);
  return ArtifactListResponseSchema.parse(data);
}

export async function getArtifact(artifactId: string): Promise<ArtifactResponse> {
  const data = await apiGet<unknown>(`/v1/phi/artifacts/${artifactId}`);
  return ArtifactResponseSchema.parse(data);
}

export async function getDownloadUrl(
  artifactId: string,
  expiresIn = 3600
): Promise<DownloadURLResponse> {
  const data = await apiGet<unknown>(`/v1/phi/artifacts/${artifactId}/download`, {
    expires_in: expiresIn,
  });
  return DownloadURLResponseSchema.parse(data);
}

export async function getRunAssets(runId: string): Promise<RunAssetsResponse> {
  const data = await apiGet<unknown>(`/v1/phi/runs/${runId}/assets`);
  return RunAssetsResponseSchema.parse(data);
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
): Promise<AssetListResponse> {
  const data = await apiGet<unknown>(
    `/v1/phi/asset-groups/${assetGroupId}/assets`,
    opts as Record<string, string | undefined>
  );
  return AssetListResponseSchema.parse(data);
}

export async function getRunResults(
  runId: string,
  includeArtifacts = true
): Promise<RunResultsResponse> {
  const data = await apiGet<unknown>(`/v1/phi/runs/${runId}/results`, {
    include_artifacts: includeArtifacts,
  });
  return RunResultsResponseSchema.parse(data);
}

/** @deprecated Use getRunResults */
export async function getWorkflowResults(runId: string, includeArtifacts = true) {
  return getRunResults(runId, includeArtifacts);
}

const SCORES_ARTIFACT_TYPES = ["scores_csv", "scores"] as const;

/** True if artifact_type looks like a scores CSV (e.g. scores_csv, scores, design_scores). */
function isScoresArtifactType(artifactType: string): boolean {
  const t = artifactType?.toLowerCase() ?? "";
  if (SCORES_ARTIFACT_TYPES.includes(t as (typeof SCORES_ARTIFACT_TYPES)[number]))
    return true;
  return t.includes("score") && (t.endsWith("csv") || t.includes("scores"));
}

export type ScoresCsvPageResult = {
  rows: ScoresCsvRow[];
  totalCount: number;
  /** True if the CSV was truncated at MAX_SCORES_CSV_BYTES — totalCount may be understated. */
  truncated: boolean;
};

/**
 * Resolve a download URL for the run's scores CSV from run results.
 * Prefer artifact_files entry with scores-like type; fallback to workflow_artifacts.scores_download_url.
 */
async function getScoresCsvDownloadUrl(
  results: Awaited<ReturnType<typeof getRunResults>>
): Promise<string | null> {
  const files = results.artifact_files ?? [];
  const scoresFile = files.find((f) => isScoresArtifactType(f.artifact_type ?? ""));
  if (scoresFile) {
    const { download_url } = await getDownloadUrl(scoresFile.artifact_id);
    return download_url;
  }
  const scoresUrl = results.workflow_artifacts?.scores_download_url;
  if (scoresUrl && scoresUrl.startsWith("https://")) return scoresUrl;
  return null;
}

/**
 * Stream the scores CSV and return one page of rows plus total count.
 * Enforces a byte limit to avoid OOM; never holds the full file in memory.
 * Uses artifact_files (scores-like artifact_type) or workflow_artifacts.scores_download_url.
 */
export async function fetchScoresCsvPage(
  runId: string,
  page: number,
  pageSize: number = DEFAULT_SCORES_PAGE_SIZE
): Promise<ScoresCsvPageResult> {
  const results = await getRunResults(runId, true);
  const downloadUrl = await getScoresCsvDownloadUrl(results);
  if (!downloadUrl) return { rows: [], totalCount: 0, truncated: false };
  const res = await fetch(downloadUrl);
  if (!res.ok || !res.body) return { rows: [], totalCount: 0, truncated: false };
  return streamScoresCsvPage(res.body, page, pageSize);
}

/**
 * Fetch one page of scores from a signed download URL (e.g. from GET dataset/scores or job/scores).
 * Streams the response to respect MAX_SCORES_CSV_BYTES.
 */
export async function fetchScoresCsvPageFromUrl(
  downloadUrl: string,
  page: number,
  pageSize: number = DEFAULT_SCORES_PAGE_SIZE
): Promise<ScoresCsvPageResult> {
  const res = await fetch(downloadUrl);
  if (!res.ok || !res.body) return { rows: [], totalCount: 0, truncated: false };
  return streamScoresCsvPage(res.body, page, pageSize);
}

/**
 * Read a ReadableStream of CSV bytes and return the requested page of rows and total count.
 * Stops after MAX_SCORES_CSV_BYTES to prevent OOM.
 */
async function streamScoresCsvPage(
  body: ReadableStream<Uint8Array>,
  page: number,
  pageSize: number
): Promise<ScoresCsvPageResult> {
  const skip = (Math.max(1, page) - 1) * pageSize;
  let totalBytes = 0;
  let truncated = false;
  let buffer = "";
  let header: string[] | null = null;
  let totalCount = 0;
  const rows: ScoresCsvRow[] = [];
  const decoder = new TextDecoder();
  const reader = body.getReader();

  const processLines = (lines: string[]): void => {
    for (const line of lines) {
      if (!line.trim()) continue;
      if (header === null) {
        header = line.split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
        continue;
      }
      totalCount++;
      const values = parseCsvLine(line);
      if (totalCount <= skip) continue;
      if (rows.length < pageSize) {
        rows.push(recordToScoresCsvRow(header, values));
      }
    }
  };

  const flushBuffer = (final: boolean): void => {
    const lines = buffer.split(/\r?\n/);
    if (!final && lines.length > 0 && !/[\r\n]$/.test(buffer)) {
      buffer = lines.pop() ?? "";
    } else {
      buffer = "";
    }
    processLines(lines);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (value) {
        totalBytes += value.length;
        if (totalBytes > MAX_SCORES_CSV_BYTES) {
          truncated = true;
          break;
        }
        buffer += decoder.decode(value, { stream: !done });
      }
      flushBuffer(done);
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
  if (buffer.trim()) flushBuffer(true);
  return { rows, totalCount, truncated };
}

/**
 * Fetch the first page of scores for a run. Prefer fetchScoresCsvPage for paginated UI.
 */
export async function fetchScoresCsvForRun(runId: string): Promise<ScoresCsvRow[]> {
  const { rows } = await fetchScoresCsvPage(runId, 1, DEFAULT_SCORES_PAGE_SIZE);
  return rows;
}

