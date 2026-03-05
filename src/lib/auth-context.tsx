"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthUser } from "@/lib/auth/types";
import { firebaseAuthService } from "@/lib/auth/firebase-provider";
import { useSessionStore, useSettingsStore, getStoredCredentials } from "@/lib/stores/auth-store";
import { configureCredentials } from "@/lib/api/credentials";

// Wire the credentials seam once at module load time.
// The API client reads live from stores; no re-configuration needed on sign-in.
configureCredentials(getStoredCredentials);

// To swap auth backends: change this one import.
const authService = firebaseAuthService;

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { setApiKey } = useSessionStore();
  const { setUserId } = useSettingsStore();

  useEffect(() => {
    return authService.onAuthStateChanged(async (authUser) => {
      setUser(authUser);
      if (authUser) {
        // Temporary: use the ID token as the API key until /api/v1/auth/me is ready.
        // See docs/backend-api-gaps.md — API Key Management endpoint.
        const idToken = await authUser.getIdToken();
        setApiKey(idToken);
        setUserId(authUser.uid);
      } else {
        setApiKey(null);
      }
      setLoading(false);
    });
  }, [setApiKey, setUserId]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle: authService.signInWithGoogle.bind(authService),
        signInWithEmail: authService.signInWithEmail.bind(authService),
        registerWithEmail: authService.registerWithEmail.bind(authService),
        signOut: async () => {
          await authService.signOut();
          setApiKey(null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
