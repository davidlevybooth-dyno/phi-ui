import { apiGet } from "./client";
import { AuthMeResponseSchema, type AuthMeResponse } from "@/lib/schemas/auth";

export function getAuthMe(): Promise<AuthMeResponse> {
  return apiGet<unknown>("/v1/phi/auth/me").then((data) =>
    AuthMeResponseSchema.parse(data)
  );
}
