"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {
  Briefcase,
  MessageSquare,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Activity,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { JobStatusBadge } from "@/components/shared/job-status-badge";
import { listJobs } from "@/lib/api/jobs";
import { listDatasets } from "@/lib/api/upload";
import { getJobTypeDisplayLabel, getDatasetIdFromJob } from "@/lib/schemas/job";
import { useAuth } from "@/lib/auth-context";
import type { Job } from "@/lib/schemas/job";

const statVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: "easeOut" as const, delay: i * 0.08 },
  }),
};

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  index,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  loading?: boolean;
  index: number;
}) {
  return (
    <motion.div custom={index} variants={statVariants} initial="hidden" animate="visible">
      <Card className="p-5 flex items-center gap-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4" />
        </div>
        <div>
          {loading ? (
            <Skeleton className="h-6 w-12 mb-1" />
          ) : (
            <p className="text-2xl font-semibold leading-none">{value}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </Card>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ["jobs", "recent"],
    queryFn: () => listJobs({ page: 1, page_size: 15 }),
  });

  const { data: datasetsData, isLoading: loadingDatasets } = useQuery({
    queryKey: ["datasets", "recent"],
    queryFn: () => listDatasets({ page: 1, page_size: 5 }),
  });

  const recentJobs = (jobsData?.jobs ?? []) as Job[];
  const recentPipelineRuns = recentJobs.filter((j) => j.job_type === "design_pipeline").slice(0, 5);
  const recentJobsDisplay = recentJobs.slice(0, 5);
  const recentDatasets = datasetsData?.datasets ?? [];

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {user?.displayName ? `Welcome back, ${user.displayName.split(" ")[0]}` : "Dashboard"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload binder sequences, run scoring models, apply metric filters, and download ranked candidates.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard index={0} label="Total jobs" value={jobsData?.total_count ?? "—"} icon={Briefcase} loading={isLoading} />
        <StatCard index={1} label="Running" value={jobsData?.total_running ?? "—"} icon={Loader2} loading={isLoading} />
        <StatCard index={2} label="Completed" value={jobsData?.total_completed ?? "—"} icon={CheckCircle2} loading={isLoading} />
        <StatCard index={3} label="Failed" value={jobsData?.total_failed ?? "—"} icon={XCircle} loading={isLoading} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="p-5 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4" />
            <h2 className="text-sm font-medium">Design with the agent</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Describe your target and constraints in plain language. The agent selects
            models, runs scoring, and surfaces the highest-confidence binders.
          </p>
          <Button asChild size="sm" className="w-fit gap-1.5">
            <Link href="/dashboard/agent">
              Open agent
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </Card>
        <Card className="p-5 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
          <div className="flex items-center gap-2">
            <Activity className="size-4" />
            <h2 className="text-sm font-medium">Submit a scoring job</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Upload a FASTA or PDB and run ESMFold, AlphaFold2, ProteinMPNN, or
            Boltz directly — no agent required.
          </p>
          <Button asChild size="sm" variant="outline" className="w-fit gap-1.5">
            <Link href="/dashboard/jobs">
              Browse jobs
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </Card>
      </div>

      {/* Recent datasets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">Recent datasets</h2>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
            <Link href="/dashboard/datasets">
              View all
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>
        <Card className="overflow-hidden">
          {loadingDatasets ? (
            <div className="divide-y">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentDatasets.length === 0 ? (
            <div className="py-8 px-4 text-center text-sm text-muted-foreground">
              No datasets yet. Upload files or use the CLI to create one.
            </div>
          ) : (
            <div className="divide-y">
              {recentDatasets.map((d) => (
                <Link
                  key={d.dataset_id}
                  href={`/dashboard/datasets/${d.dataset_id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{d.name ?? d.dataset_id.slice(0, 12)}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {d.dataset_id.slice(0, 16)}… · {d.file_type ?? "—"} · {d.status}
                    </p>
                  </div>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent design pipeline runs */}
      {recentPipelineRuns.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Recent design pipeline runs</h2>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link href="/dashboard/jobs">
                View all
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          </div>
          <Card className="overflow-hidden">
            <div className="divide-y">
              {recentPipelineRuns.map((job) => (
                <div
                  key={job.job_id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      <Link href={`/dashboard/jobs/${job.job_id}`} className="hover:underline">
                        {job.job_id.slice(0, 8)}…
                      </Link>
                      {job.run_id && (
                        <>
                          {" · "}
                          <Link
                            href={`/dashboard/results/${job.run_id}`}
                            className="text-primary hover:underline text-xs"
                          >
                            Results
                          </Link>
                        </>
                      )}
                    </p>
                    {job.created_at && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="size-3" />
                        {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <JobStatusBadge status={job.status} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Recent jobs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">Recent jobs</h2>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
            <Link href="/dashboard/jobs">
              View all
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>

        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="divide-y">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentJobsDisplay.length === 0 ? (
            <div className="py-12" aria-hidden />
          ) : (
            <div className="divide-y">
              {recentJobsDisplay.map((job) => {
                const datasetId = getDatasetIdFromJob(job);
                return (
                  <Link
                    key={job.job_id}
                    href={`/dashboard/jobs/${job.job_id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {getJobTypeDisplayLabel(job.job_type)}
                        {job.run_id && (
                          <>
                            {" · "}
                            <Link
                              href={`/dashboard/results/${job.run_id}`}
                              className="text-primary hover:underline text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Results
                            </Link>
                          </>
                        )}
                        {datasetId && (
                          <>
                            {" · "}
                            <Link
                              href={`/dashboard/datasets/${datasetId}`}
                              className="text-primary hover:underline text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Dataset
                            </Link>
                          </>
                        )}
                      </p>
                      {job.created_at && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="size-3" />
                          {formatDistanceToNow(new Date(job.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      )}
                    </div>
                    <JobStatusBadge status={job.status} />
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
