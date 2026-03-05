"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  Download,
  X,
  RefreshCw,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { JobStatusBadge } from "@/components/shared/job-status-badge";
import { getJobStatus, cancelJob, getJobLogStreamUrl } from "@/lib/api/jobs";
import { getRunArtifacts, getDownloadUrl } from "@/lib/api/assets";
import { toast } from "sonner";
import { getApiCredentials } from "@/lib/api/credentials";
import { BASE_URL } from "@/lib/api/client";

interface LogEntry {
  timestamp?: string;
  level?: string;
  message: string;
}

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: jobId } = use(params);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  const { data: job, isLoading, refetch } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJobStatus(jobId, true),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "running" || status === "pending" ? 5000 : false;
    },
  });

  const { data: artifacts } = useQuery({
    queryKey: ["job-artifacts", job?.run_id],
    queryFn: () => getRunArtifacts(job!.run_id),
    enabled: !!job?.run_id && job.status === "completed",
  });

  // Stream logs via SSE
  useEffect(() => {
    if (!job?.job_id) return;
    if (job.status !== "running" && job.status !== "pending") return;

    const { apiKey, orgId } = getApiCredentials();
    // EventSource doesn't support custom headers — use URL params as fallback
    const url = `${BASE_URL}/api/v1/jobs/${jobId}/logs/stream?x_api_key=${apiKey ?? ""}&org_id=${orgId}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const entry: LogEntry = JSON.parse(event.data);
        setLogs((prev) => [...prev.slice(-499), entry]);
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } catch {
        setLogs((prev) => [...prev.slice(-499), { message: event.data }]);
      }
    };

    es.onerror = () => es.close();

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [job?.status, job?.job_id, jobId]);

  const handleCancel = async () => {
    try {
      await cancelJob(jobId);
      toast.success("Job cancelled");
      refetch();
    } catch {
      toast.error("Failed to cancel job");
    }
  };

  const handleDownload = async (artifactId: string, filename: string) => {
    try {
      const { download_url } = await getDownloadUrl(artifactId);
      const a = document.createElement("a");
      a.href = download_url;
      a.download = filename;
      a.click();
    } catch {
      toast.error("Failed to generate download link");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!job) return <p className="text-sm text-muted-foreground">Job not found.</p>;

  const outputFiles = (job.output_files ?? []) as Record<string, unknown>[];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/dashboard/jobs"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="size-3" />
            Jobs
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-mono text-sm font-medium">{jobId.slice(0, 8)}…</h1>
            <JobStatusBadge status={job.status} />
            <Badge variant="outline" className="font-mono text-xs font-normal">
              {(job as unknown as Record<string, unknown>).job_type as string ?? "job"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Run: <span className="font-mono">{job.run_id.slice(0, 12)}…</span>
          </p>
        </div>
        <div className="flex gap-2">
          {(job.status === "running" || job.status === "pending") && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="gap-1.5 text-destructive"
            >
              <X className="size-3.5" />
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Progress */}
      {job.progress && (
        <Card className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{job.progress.current_step}</span>
            <span className="font-medium">{job.progress.percent_complete}%</span>
          </div>
          <Progress value={job.progress.percent_complete} className="h-1.5" />
          {job.progress.eta_seconds && (
            <p className="text-xs text-muted-foreground">
              ETA: ~{Math.round(job.progress.eta_seconds / 60)} min
            </p>
          )}
        </Card>
      )}

      {/* Metadata */}
      <Card className="p-4">
        <h2 className="text-sm font-medium mb-3">Details</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {[
            ["Created", job.created_at && format(new Date(job.created_at), "PPpp")],
            ["Started", job.started_at && format(new Date(job.started_at), "PPpp")],
            ["Completed", job.completed_at && format(new Date(job.completed_at), "PPpp")],
            ["Assets", job.asset_count],
          ]
            .filter(([, v]) => v != null && v !== "")
            .map(([label, value]) => (
              <div key={label as string}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p>{String(value)}</p>
              </div>
            ))}
        </div>
        {job.error && (
          <>
            <Separator className="my-3" />
            <p className="text-sm text-destructive font-mono">{job.error}</p>
          </>
        )}
      </Card>

      {/* Output files */}
      {(outputFiles.length > 0 || (artifacts?.artifacts ?? []).length > 0) && (
        <div>
          <h2 className="text-sm font-medium mb-2">Output files</h2>
          <Card className="divide-y overflow-hidden">
            {artifacts?.artifacts.map((a) => (
              <div
                key={a.artifact_id}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <div className="flex items-center gap-2">
                  <FileText className="size-3.5 text-muted-foreground" />
                  <span className="font-mono text-xs">{a.filename}</span>
                  {a.size_bytes && (
                    <span className="text-xs text-muted-foreground">
                      {(a.size_bytes / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-xs h-7"
                  onClick={() => handleDownload(a.artifact_id, a.filename)}
                >
                  <Download className="size-3" />
                  Download
                </Button>
              </div>
            ))}
              {outputFiles.map((f, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="size-3.5 text-muted-foreground" />
                    <span className="font-mono text-xs">{String(f.filename ?? `file_${i}`)}</span>
                  </div>
                  {f.gcs_url != null && (
                    <Badge variant="outline" className="text-xs font-normal gap-1">
                      <ExternalLink className="size-3" />
                      GCS
                    </Badge>
                  )}
                </div>
              ))}
          </Card>
        </div>
      )}

      {/* Live logs */}
      <div>
        <h2 className="text-sm font-medium mb-2">
          Logs
          {job.status === "running" && (
            <Badge variant="secondary" className="ml-2 text-xs">Live</Badge>
          )}
        </h2>
        <Card className="bg-zinc-950 rounded-lg overflow-hidden">
          <div className="h-64 overflow-y-auto p-3 font-mono text-xs text-zinc-300 leading-relaxed">
            {logs.length === 0 ? (
              <span className="text-zinc-500">
                {job.status === "running"
                  ? "Connecting to log stream…"
                  : "No logs available."}
              </span>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  {log.timestamp && (
                    <span className="text-zinc-600 shrink-0">
                      {format(new Date(log.timestamp), "HH:mm:ss")}
                    </span>
                  )}
                  {log.level && (
                    <span
                      className={
                        log.level === "error"
                          ? "text-red-400 shrink-0"
                          : log.level === "warn"
                          ? "text-yellow-400 shrink-0"
                          : "text-zinc-500 shrink-0"
                      }
                    >
                      [{log.level.toUpperCase()}]
                    </span>
                  )}
                  <span>{log.message}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </Card>
      </div>
    </div>
  );
}
