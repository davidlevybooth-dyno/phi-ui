/**
 * AuthUser and AuthService define the auth contract the rest of the application
 * depends on. No vendor SDK types appear here.
 *
 * Swap the provider in auth-context.tsx to change the auth backend without
 * touching any other file.
 */

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  /** Returns a fresh short-lived bearer token for API requests. */
  getIdToken(): Promise<string>;
}

export interface AuthService {
  /** Subscribe to auth state changes. Returns an unsubscribe function. */
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
  signInWithGoogle(): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<void>;
  registerWithEmail(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}
