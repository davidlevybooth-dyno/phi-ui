/**
 * AuthUser is the application's auth contract.
 * No Clerk (or any vendor) types appear here — all downstream code depends on this.
 *
 * If the auth provider changes, only AuthProvider in auth-context.tsx changes.
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
