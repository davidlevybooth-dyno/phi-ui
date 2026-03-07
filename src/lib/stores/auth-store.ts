import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * In-memory only — never persisted.
 * API tokens are security-sensitive. Clerk session tokens expire (~60s cache window).
 * Persisting them would cause stale-token 401s on the next visit.
 */
interface SessionState {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  apiKey: null,
  setApiKey: (key) => set({ apiKey: key }),
}));

/**
 * Persisted user preferences — safe to store across sessions.
 */
interface SettingsState {
  orgId: string;
  userId: string;
  setOrgId: (id: string) => void;
  setUserId: (id: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      orgId: "default-org",
      userId: "default-user",
      setOrgId: (id) => set({ orgId: id }),
      setUserId: (id) => set({ userId: id }),
    }),
    { name: "dyno-settings" }
  )
);

/**
 * Convenience re-export for the API credentials seam.
 * Callers that only need the API key should use useSessionStore directly.
 */
export function getStoredCredentials() {
  return {
    apiKey: useSessionStore.getState().apiKey,
    orgId: useSettingsStore.getState().orgId,
    userId: useSettingsStore.getState().userId,
  };
}
