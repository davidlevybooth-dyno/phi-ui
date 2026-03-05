import { apiGet, apiPost } from "./client";
import { WorkflowRunStatusSchema, type WorkflowRunStatus } from "@/lib/schemas/workflow";

export interface PlanWorkflowRequest {
  prompt: string;
  protocol_id?: string;
  disable_auto_recommendations?: boolean;
  auto_publish?: boolean;
  execute_immediately?: boolean;
}

export interface PlanExecuteRequest {
  query: string;
  planContext?: string;
  protocolId: string;
  protocolAdjustments?: Record<string, unknown>;
  targetPdbId?: string;
  targetChain?: string;
  targetGcsUri?: string;
  executeImmediately?: boolean;
  context?: Record<string, unknown>;
}

export async function planWorkflow(request: PlanWorkflowRequest) {
  return apiPost<Record<string, unknown>>("/api/v1/workflows/plan", request);
}

export async function planAndExecute(request: PlanExecuteRequest) {
  return apiPost<Record<string, unknown>>("/api/v1/workflows/plan/execute", request);
}

export async function executeWorkflow(workflowId: string, inputs?: Record<string, unknown>) {
  return apiPost<Record<string, unknown>>(`/api/v1/workflows/${workflowId}/execute`, {
    inputs,
  });
}

export async function getWorkflowRunStatus(
  workflowId: string,
  runId: string
): Promise<WorkflowRunStatus> {
  const data = await apiGet<unknown>(
    `/api/v1/workflows/${workflowId}/runs/${runId}/status`
  );
  return WorkflowRunStatusSchema.parse(data);
}

export async function listWorkflows(opts?: {
  status?: string;
  limit?: number;
  offset?: number;
  include_runs?: boolean;
}) {
  return apiGet<Record<string, unknown>>("/api/v1/workflows/", opts as Record<string, string | number | boolean | undefined>);
}

export async function getWorkflow(workflowId: string, includeRuns = true) {
  return apiGet<Record<string, unknown>>(`/api/v1/workflows/${workflowId}`, {
    include_runs: includeRuns,
  });
}
