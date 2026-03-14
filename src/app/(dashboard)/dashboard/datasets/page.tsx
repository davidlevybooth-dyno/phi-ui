"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowRight, Database } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listDatasets } from "@/lib/api/upload";
import { useAuth } from "@/lib/auth-context";
import type { DatasetListResponse } from "@/lib/schemas/upload";

export default function DatasetsPage() {
  const { user, loading: authLoading } = useAuth();
  const authReady = !authLoading && !!user;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["datasets"],
    queryFn: () => listDatasets({ page: 1, page_size: 50 }),
    enabled: authReady,
  });

  const list = (data as DatasetListResponse | undefined);
  const datasets = list?.datasets ?? [];
  const total = list?.total_count ?? list?.total ?? datasets.length;
  const errorMessage =
    error instanceof Error ? error.message : "Failed to load datasets.";

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Datasets</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Uploaded input data for design pipelines. Create datasets via upload or CLI.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-destructive font-medium">Failed to load datasets</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">{errorMessage}</p>
        </Card>
      ) : datasets.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Database className="size-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No datasets yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload files or use the CLI to create a dataset, then run design pipelines from here.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Dataset ID</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Files</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasets.map((d) => (
                  <TableRow key={d.dataset_id}>
                    <TableCell className="font-mono text-xs">
                      {d.dataset_id.slice(0, 12)}…
                    </TableCell>
                    <TableCell className="text-sm">{d.name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{d.artifact_count ?? "—"}</TableCell>
                    <TableCell className="text-xs">{d.status}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(d.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/datasets/${d.dataset_id}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Open
                        <ArrowRight className="size-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {total > datasets.length && (
            <div className="px-4 py-2 border-t text-xs text-muted-foreground">
              Showing {datasets.length} of {total}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
