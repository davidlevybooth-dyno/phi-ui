import { apiGet, apiPost, apiDelete } from "./client";
import { ProtocolResponseSchema, type ProtocolResponse } from "@/lib/schemas/protocol";

export async function listProtocols(opts?: {
  visibility?: string;
  tags?: string;
  starred?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ items?: ProtocolResponse[]; protocols?: ProtocolResponse[] }> {
  return apiGet<{ items?: ProtocolResponse[]; protocols?: ProtocolResponse[] }>(
    "/v1/phi/protocols",
    opts as Record<string, string | number | boolean | undefined>
  );
}

export async function getProtocol(protocolId: string): Promise<ProtocolResponse> {
  const data = await apiGet<unknown>(`/v1/phi/protocols/${protocolId}`);
  return ProtocolResponseSchema.parse(data);
}

export async function recommendProtocols(userPrompt: string, forceRefresh = false) {
  return apiPost<Record<string, unknown>>("/v1/phi/protocols/recommend", {
    user_prompt: userPrompt,
    force_refresh: forceRefresh,
  });
}

export async function starProtocol(protocolId: string) {
  return apiPost<Record<string, unknown>>(`/v1/phi/protocols/${protocolId}/star`);
}

export async function unstarProtocol(protocolId: string) {
  return apiDelete<Record<string, unknown>>(`/v1/phi/protocols/${protocolId}/star`);
}

export async function forkProtocol(protocolId: string, newName?: string): Promise<ProtocolResponse> {
  const data = await apiPost<unknown>(`/v1/phi/protocols/${protocolId}/fork`, { new_name: newName });
  return ProtocolResponseSchema.parse(data);
}
