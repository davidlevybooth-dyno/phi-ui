"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useUser, useAuth as useClerkAuth, useClerk } from "@clerk/nextjs";
import type { AuthUser } from "@/lib/auth/types";
import { useSessionStore, useSettingsStore, getStoredCredentials } from "@/lib/stores/auth-store";
import { configureCredentials } from "@/lib/api/credentials";
import { getAuthMe } from "@/lib/api/auth";

// Wire the credentials seam at module load. Every API call reads live from stores.
configureCredentials(getStoredCredentials);

// To swap auth providers: change the hooks used in AuthProvider below.
// All downstream code (components, hooks, pages) depends only on AuthContextValue.

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(clerkUser: NonNullable<ReturnType<typeof useUser>["user"]>): AuthUser {
  return {
    uid: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
    displayName: clerkUser.fullName,
    photoURL: clerkUser.imageUrl,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { getToken } = useClerkAuth();
  const { signOut: clerkSignOut } = useClerk();
  const { setApiKey } = useSessionStore();
  const { setUserId, setOrgId } = useSettingsStore();

  useEffect(() => {
    if (!isSignedIn || !clerkUser) {
      setApiKey(null);
      return;
    }

    setUserId(clerkUser.id);

    // Refresh the Clerk session JWT and sync org/user identity from the backend.
    //
    // BACKEND REQUIREMENT: the API server must verify Clerk JWTs sent as x-api-key
    // against its JWKS endpoint. If the backend reports a signing key mismatch
    // (401 "Unable to find a signing key in JWKS"), it means the backend's cached
    // JWKS is stale. Fix: set CLERK_JWKS_URL on the backend to:
    //   https://clerk.design.dynotx.com/.well-known/jwks.json
    // or force a JWKS cache refresh. This is a backend configuration issue.
    //
    // On 401 we stop the polling interval to avoid flooding backend logs.
    // On 404 (endpoint not yet deployed) we keep refreshing the JWT only.
    let stopped = false;

    const refresh = async () => {
      const token = await getToken();
      setApiKey(token);
      try {
        const me = await getAuthMe();
        if (me.org_id) setOrgId(me.org_id);
        setUserId(me.user_id);
      } catch (err) {
        const status = (err as { status?: number })?.status;
        if (status === 401) {
          // JWKS mismatch — backend config issue. Stop polling to avoid log spam.
          // The JWT is still stored so other endpoints (with fallback auth) work.
          stopped = true;
        }
        // 404 = endpoint not yet deployed; keep refreshing JWT silently.
      }
    };

    refresh();
    const interval = setInterval(() => {
      if (!stopped) refresh();
    }, 55_000);
    return () => clearInterval(interval);
  }, [isSignedIn, clerkUser, getToken, setApiKey, setUserId, setOrgId]);

  const user = isLoaded && clerkUser ? toAuthUser(clerkUser) : null;

  const signOut = async () => {
    setApiKey(null);
    await clerkSignOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading: !isLoaded, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
