import { apiGet, apiPost } from "./client";
import { ProjectSchema, AssetGroupSchema, type Project } from "@/lib/schemas/project";
import { z } from "zod";

export async function createProject(name: string, description?: string): Promise<Project> {
  const data = await apiPost<unknown>("/api/v1/projects", { name, description });
  return ProjectSchema.parse(data);
}

export async function listProjects(status = "active"): Promise<Project[]> {
  const data = await apiGet<unknown>("/api/v1/projects", { status });
  // API may return array or wrapped object
  if (Array.isArray(data)) return z.array(ProjectSchema).parse(data);
  const wrapped = data as { projects?: unknown[]; items?: unknown[] };
  const items = wrapped.projects ?? wrapped.items ?? [];
  return z.array(ProjectSchema).parse(items);
}

export async function getProject(projectId: string): Promise<Project> {
  const data = await apiGet<unknown>(`/api/v1/projects/${projectId}`);
  return ProjectSchema.parse(data);
}

export async function listAssetGroups(projectId: string) {
  const data = await apiGet<unknown>(`/api/v1/projects/${projectId}/asset-groups`);
  if (Array.isArray(data)) return z.array(AssetGroupSchema).parse(data);
  const wrapped = data as { asset_groups?: unknown[]; items?: unknown[] };
  return z.array(AssetGroupSchema).parse(wrapped.asset_groups ?? wrapped.items ?? []);
}
