import { z } from "zod";

export const ProtocolResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  intent_signature: z.record(z.string(), z.unknown()),
  protocol_template: z.record(z.string(), z.unknown()),
  source_workflow_id: z.string().nullable(),
  parent_protocol_id: z.string().nullable(),
  version: z.number(),
  visibility: z.string(),
  tags: z.array(z.string()),
  is_starred: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ProtocolListResponseSchema = z.object({
  protocols: z.array(ProtocolResponseSchema).optional(),
  items: z.array(ProtocolResponseSchema).optional(),
});

export type ProtocolResponse = z.infer<typeof ProtocolResponseSchema>;
