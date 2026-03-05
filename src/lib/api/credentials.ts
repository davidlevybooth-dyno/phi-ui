/**
 * Credentials seam — the API client's only dependency on the auth world.
 *
 * The client calls `getApiCredentials()` for every request. The implementation
 * is set once at startup by the auth layer. Tests and storybook can inject a
 * different provider without touching the client or the store.
 */

export interface ApiCredentials {
  apiKey?: string | null;
  orgId: string;
  userId: string;
}

type CredentialsProvider = () => ApiCredentials;

let provider: CredentialsProvider = () => ({
  orgId: "default-org",
  userId: "default-user",
});

export function configureCredentials(fn: CredentialsProvider): void {
  provider = fn;
}

export function getApiCredentials(): ApiCredentials {
  return provider();
}
