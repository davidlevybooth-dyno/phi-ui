import { apiGet } from "./client";

export interface Tool {
  id: string;
  name: string;
  description?: string;
  category?: string;
  parameters?: Record<string, unknown>;
}

export async function listTools(category?: string): Promise<Tool[]> {
  const data = await apiGet<unknown>("/v1/phi/tools/", category ? { category } : undefined);
  if (Array.isArray(data)) return data as Tool[];
  const wrapped = data as { tools?: Tool[]; items?: Tool[] };
  return wrapped.tools ?? wrapped.items ?? [];
}

export async function getTool(toolId: string): Promise<Tool> {
  return apiGet<Tool>(`/v1/phi/tools/${toolId}`);
}

export async function listToolCategories(): Promise<Record<string, string[]>> {
  return apiGet<Record<string, string[]>>("/v1/phi/tools/categories/");
}
