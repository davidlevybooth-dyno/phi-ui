"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useUser, useAuth as useClerkAuth, useClerk } from "@clerk/nextjs";
import type { AuthUser } from "@/lib/auth/types";
import { useSessionStore, useSettingsStore, getStoredCredentials } from "@/lib/stores/auth-store";
import { configureCredentials } from "@/lib/api/credentials";

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
  const { setUserId } = useSettingsStore();

  useEffect(() => {
    if (!isSignedIn || !clerkUser) {
      setApiKey(null);
      return;
    }

    setUserId(clerkUser.id);

    // Store a fresh Clerk session token in the credential store so the API client
    // can read it synchronously. Clerk caches tokens for ~60s, so we refresh
    // every 55s to ensure the stored token never expires between refreshes.
    const refresh = async () => {
      const token = await getToken();
      setApiKey(token);
    };

    refresh();
    const interval = setInterval(refresh, 55_000);
    return () => clearInterval(interval);
  }, [isSignedIn, clerkUser, getToken, setApiKey, setUserId]);

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
