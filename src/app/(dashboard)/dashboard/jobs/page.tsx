"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JobStatusBadge } from "@/components/shared/job-status-badge";
import { listJobs } from "@/lib/api/jobs";

const PAGE_SIZE = 20;

const JOB_TYPES = [
  "all",
  "alphafold",
  "esmfold",
  "proteinmpnn",
  "boltz",
  "chai1",
  "af2rank",
  "esm2",
  "rfdiffusion3",
] as const;

const STATUS_FILTERS = ["all", "pending", "running", "completed", "failed", "cancelled"] as const;

export default function JobsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["jobs", page, statusFilter, typeFilter],
    queryFn: () =>
      listJobs({
        page,
        page_size: PAGE_SIZE,
        status: statusFilter === "all" ? undefined : statusFilter,
        job_type: typeFilter === "all" ? undefined : typeFilter,
      }),
    refetchInterval: 15_000,
  });

  const jobs = (data?.jobs ?? []) as Record<string, unknown>[];
  const totalPages = Math.ceil((data?.total_count ?? 0) / PAGE_SIZE);

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Jobs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data?.total_count ?? "—"} total · {data?.total_running ?? 0} running
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="size-3.5 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {JOB_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="text-xs">
                {t === "all" ? "All types" : t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Job ID</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Created</TableHead>
              <TableHead className="text-xs">Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-sm text-muted-foreground">
                  No jobs found
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => {
                const jobId = (job.job_id ?? job.id ?? "") as string;
                const createdAt = job.created_at as string | undefined;
                const completedAt = job.completed_at as string | undefined;
                const startedAt = job.started_at as string | undefined;
                const durationSec =
                  completedAt && startedAt
                    ? Math.round(
                        (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000
                      )
                    : null;

                return (
                  <TableRow key={jobId} className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">
                      <Link href={`/dashboard/jobs/${jobId}`} className="hover:underline">
                        {jobId.slice(0, 8)}…
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-mono font-normal">
                        {(job.job_type as string) ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <JobStatusBadge status={job.status as string} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {createdAt && (
                        <span title={format(new Date(createdAt), "PPpp")}>
                          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {durationSec != null ? (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {durationSec < 60
                            ? `${durationSec}s`
                            : `${Math.round(durationSec / 60)}m`}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
