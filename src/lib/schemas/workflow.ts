import { z } from "zod";

export const NodeSpecSchema = z.object({
  id: z.string(),
  op: z.string(),
  params: z.unknown().optional(),
  retry_policy: z.unknown().optional(),
  map_config: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const EdgeSpecSchema = z.object({
  src: z.string(),
  dst: z.string(),
  condition: z.string().nullable().optional(),
});

export const WorkflowSpecSchema = z.object({
  name: z.string(),
  description: z.string().default(""),
  nodes: z.array(NodeSpecSchema),
  edges: z.array(EdgeSpecSchema),
  version: z.string().default("1.0"),
  expected_artifacts: z.array(z.string()).default([]),
});

export const WorkflowRunStatusSchema = z.object({
  workflow_id: z.string().optional(),
  run_id: z.string().optional(),
  status: z.string(),
  current_stage: z.string().optional(),
  progress: z
    .object({
      percent_complete: z.number(),
      current_step: z.string(),
      eta_seconds: z.number().nullable().optional(),
    })
    .optional(),
  plan: z.record(z.string(), z.unknown()).optional(),
  budget: z.record(z.string(), z.unknown()).optional(),
});

export type WorkflowSpec = z.infer<typeof WorkflowSpecSchema>;
export type WorkflowRunStatus = z.infer<typeof WorkflowRunStatusSchema>;
