import { z } from "zod";

export const RunStatusEnum = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const RunProgressSchema = z.object({
  percent_complete: z.number().min(0).max(100),
  current_step: z.string(),
  eta_seconds: z.number().nullable().optional(),
});

export const RunStatusResponseSchema = z.object({
  run_id: z.string(),
  status: RunStatusEnum,
  current_stage: z.string().optional(),
  progress: RunProgressSchema.optional(),
  plan: z.record(z.unknown()).optional(),
  budget: z.record(z.unknown()).optional(),
});

export const CreateRunResponseSchema = z.object({
  run_id: z.string(),
});

export type RunStatusResponse = z.infer<typeof RunStatusResponseSchema>;
export type CreateRunResponse = z.infer<typeof CreateRunResponseSchema>;
