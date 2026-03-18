"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Database, Info, KeyRound, Pencil, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listDatasets, updateDataset } from "@/lib/api/upload";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { safeFormat } from "@/lib/utils/date";
import { toast } from "sonner";
import type { DatasetListResponse } from "@/lib/schemas/upload";

const CLI_CALLOUT_KEY = "dyno-phi:datasets-callout-dismissed";
const CLI_SETUP_KEY = "dyno-phi:cli-setup-dismissed";

/** Icon-only copy button — used inline in tight table cells. */
function CopyIconButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={handleCopy}
      className="ml-1 inline-flex items-center text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      title="Copy ID"
    >
      {copied
        ? <Check className="size-3 text-green-600" />
        : <Copy className="size-3" />}
    </button>
  );
}

/** Inline editable name cell — pencil is always visible as an affordance. */
function InlineName({
  datasetId,
  value,
  onSave,
  saving,
}: {
  datasetId: string;
  value: string | null | undefined;
  onSave: (id: string, name: string) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [value, editing]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== (value ?? "")) onSave(datasetId, trimmed);
  }, [draft, value, datasetId, onSave]);

  const cancel = useCallback(() => {
    setDraft(value ?? "");
    setEditing(false);
  }, [value]);

  function startEditing(e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(true);
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        className="h-7 text-sm max-w-[200px]"
        placeholder="Add a name…"
        disabled={saving}
      />
    );
  }

  return (
    <button
      onClick={startEditing}
      className="group inline-flex items-center gap-1.5 text-left"
      title="Click to rename"
    >
      <span className={value ? "text-sm font-medium" : "text-sm text-muted-foreground italic"}>
        {value || "Unnamed"}
      </span>
      <Pencil className="size-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
    </button>
  );
}

export default function DatasetsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, ready: authReady } = useAuth();

  const [calloutDismissed, setCalloutDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(CLI_CALLOUT_KEY) === "true";
  });
  const [cliSetupDismissed, setCliSetupDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(CLI_SETUP_KEY) === "true";
  });
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["datasets"],
    queryFn: () => listDatasets({ page: 1, page_size: 100 }),
    enabled: authReady,
    refetchInterval: 30_000,
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateDataset(id, { name }),
    onMutate: ({ id }) => setRenamingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      toast.success("Dataset renamed");
    },
    onError: () => toast.error("Failed to rename dataset — the API may not support this yet"),
    onSettled: () => setRenamingId(null),
  });

  const list = (data as DatasetListResponse | undefined);
  const datasets = list?.datasets ?? [];
  const total = list?.total_count ?? list?.total ?? datasets.length;
  const is401 = error instanceof ApiError && error.status === 401;
  const errorMessage =
    error instanceof Error ? error.message : "Failed to load datasets.";

  function dismissCallout() {
    localStorage.setItem(CLI_CALLOUT_KEY, "true");
    setCalloutDismissed(true);
  }

  function dismissCliSetup() {
    localStorage.setItem(CLI_SETUP_KEY, "true");
    setCliSetupDismissed(true);
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Datasets</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Input data for design pipelines — created here or via the CLI.
        </p>
      </div>

      {/* CLI setup onboarding banner */}
      {!cliSetupDismissed && (
        <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <KeyRound className="size-4 shrink-0 mt-0.5 text-primary/70" />
          <div className="flex-1 leading-relaxed">
            <span className="font-medium">Set up the Phi CLI to run jobs from your terminal.</span>{" "}
            <span className="text-muted-foreground">
              Run{" "}
              <code className="font-mono bg-muted px-1 rounded text-xs">phi login</code>{" "}
              to link the CLI to this account — your datasets and results will appear here automatically.{" "}
              <Link
                href="/dashboard/settings"
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Manage account
              </Link>
            </span>
          </div>
          <button
            onClick={dismissCliSetup}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* CLI / web paradigm callout */}
      {!calloutDismissed && (
        <div className="flex items-start gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          <Info className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
          <div className="flex-1 text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Datasets are shared across CLI and web.</span>{" "}
            Any dataset or job you create via{" "}
            <code className="font-mono bg-muted px-1 rounded text-xs">phi</code>,
            the REST API, or coding agent appears here automatically —
            and datasets created here are accessible from the CLI with the same IDs.
          </div>
          <button
            onClick={dismissCallout}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          {is401 ? (
            <>
              <p className="text-sm font-medium">API authentication not configured</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                The API server returned 401. Your administrator needs to enable Clerk JWT
                validation on the backend before browser sessions can access data.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-destructive font-medium">Failed to load datasets</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">{errorMessage}</p>
            </>
          )}
        </Card>
      ) : datasets.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Database className="size-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No datasets yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload files or run{" "}
            <code className="font-mono bg-muted px-1 rounded">phi upload</code>{" "}
            to create your first dataset.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Dataset ID</TableHead>
                  <TableHead className="text-xs">Files</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasets.map((d) => (
                  <TableRow
                    key={d.dataset_id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => router.push(`/dashboard/datasets/${d.dataset_id}`)}
                  >
                    <TableCell>
                      <InlineName
                        datasetId={d.dataset_id}
                        value={d.name}
                        onSave={(id, name) => renameMutation.mutate({ id, name })}
                        saving={renamingId === d.dataset_id}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                      <span className="inline-flex items-center">
                        {d.dataset_id.slice(0, 12)}…
                        <CopyIconButton text={d.dataset_id} />
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{d.artifact_count ?? "—"}</TableCell>
                    <TableCell className="text-xs">{d.status}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {safeFormat(d.created_at, "MMM d, yyyy")}
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
