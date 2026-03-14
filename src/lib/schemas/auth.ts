import { z } from "zod";

export const AuthMeResponseSchema = z.object({
  user_id: z.string(),
  email: z.string().optional(),
  display_name: z.string().nullable().optional(),
  org_id: z.string().nullable().optional(),
  org_name: z.string().nullable().optional(),
});

export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;
