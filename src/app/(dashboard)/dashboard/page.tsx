"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
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
import { useAuth } from "@/lib/auth-context";

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  loading?: boolean;
}) {
  return (
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
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ["jobs", "recent"],
    queryFn: () => listJobs({ page: 1, page_size: 5 }),
  });

  const recentJobs = (jobsData?.jobs ?? []) as Record<string, unknown>[];

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {user?.displayName ? `Welcome back, ${user.displayName.split(" ")[0]}` : "Dashboard"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Protein binder scoring and filtering — grounded by experiment.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total jobs"
          value={jobsData?.total_count ?? "—"}
          icon={Briefcase}
          loading={isLoading}
        />
        <StatCard
          label="Running"
          value={jobsData?.total_running ?? "—"}
          icon={Loader2}
          loading={isLoading}
        />
        <StatCard
          label="Completed"
          value={jobsData?.total_completed ?? "—"}
          icon={CheckCircle2}
          loading={isLoading}
        />
        <StatCard
          label="Failed"
          value={jobsData?.total_failed ?? "—"}
          icon={XCircle}
          loading={isLoading}
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4" />
            <h2 className="text-sm font-medium">Start with the agent</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Describe your protein design goal in natural language. The agent will
            plan and execute the right scoring pipeline.
          </p>
          <Button asChild size="sm" className="w-fit gap-1.5">
            <Link href="/dashboard/agent">
              Open agent
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </Card>
        <Card className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Activity className="size-4" />
            <h2 className="text-sm font-medium">Submit a job directly</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Use the API or the jobs interface to submit individual scoring runs
            for AlphaFold2, ESMFold, ProteinMPNN, and more.
          </p>
          <Button asChild size="sm" variant="outline" className="w-fit gap-1.5">
            <Link href="/dashboard/jobs">
              View jobs
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </Card>
      </div>

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
          ) : recentJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Briefcase className="size-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No jobs yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Submit your first scoring job to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {recentJobs.map((job) => {
                const jobId = (job.job_id ?? job.id ?? "") as string;
                const createdAt = job.created_at as string | undefined;
                return (
                  <Link
                    key={jobId}
                    href={`/dashboard/jobs/${jobId}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {(job.job_type as string) ?? "Job"}
                      </p>
                      {createdAt && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="size-3" />
                          {formatDistanceToNow(new Date(createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      )}
                    </div>
                    <JobStatusBadge status={job.status as string} />
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
