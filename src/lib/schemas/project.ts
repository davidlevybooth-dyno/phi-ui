import { z } from "zod";

export const ProjectSchema = z.object({
  id: z.string().optional(),
  project_id: z.string().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  status: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  team_id: z.string().optional(),
  owner_id: z.string().optional(),
});

export const AssetGroupSchema = z.object({
  id: z.string().optional(),
  asset_group_id: z.string().optional(),
  project_id: z.string().optional(),
  run_id: z.string().optional(),
  name: z.string().optional(),
  created_at: z.string().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;
export type AssetGroup = z.infer<typeof AssetGroupSchema>;
