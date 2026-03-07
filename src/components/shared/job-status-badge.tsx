import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@/lib/schemas/job";

const statusConfig: Record<JobStatus, { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  submitted: { label: "Submitted", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  running:   { label: "Running",   className: "bg-blue-100 text-blue-800 border-blue-200" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800 border-green-200" },
  failed:    { label: "Failed",    className: "bg-red-100 text-red-800 border-red-200" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

export function JobStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as JobStatus] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <Badge variant="outline" className={cn("font-normal", config.className)}>
      {config.label}
    </Badge>
  );
}
