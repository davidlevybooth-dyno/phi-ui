"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getProject, listAssetGroups } from "@/lib/api/projects";
import { format } from "date-fns";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id),
  });

  const { data: assetGroups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["asset-groups", id],
    queryFn: () => listAssetGroups(id),
    enabled: !!project,
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="size-3" />
          Projects
        </Link>
        {loadingProject ? (
          <Skeleton className="h-7 w-48" />
        ) : (
          <h1 className="text-xl font-semibold">{project?.name}</h1>
        )}
        {project?.description && (
          <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
        )}
      </div>

      <div>
        <h2 className="text-sm font-medium mb-3">Run groups</h2>
        {loadingGroups ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : assetGroups.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-10 text-center">
            <FolderOpen className="size-6 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No run groups yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Submit jobs with this project ID to populate results here.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {assetGroups.map((group) => {
              const groupId = group.id ?? group.asset_group_id ?? "";
              const runId = group.run_id;
              return (
                <Link
                  key={groupId}
                  href={runId ? `/dashboard/results/${runId}` : "#"}
                >
                  <Card className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {group.name ?? `Run ${groupId.slice(0, 8)}…`}
                        </p>
                        {group.created_at && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(group.created_at), "PPp")}
                          </p>
                        )}
                      </div>
                      {runId && (
                        <span className="font-mono text-xs text-muted-foreground">
                          {runId.slice(0, 8)}…
                        </span>
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
