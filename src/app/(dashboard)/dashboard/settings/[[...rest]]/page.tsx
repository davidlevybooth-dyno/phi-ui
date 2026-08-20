"use client";

import { APIKeys, UserProfile } from "@clerk/nextjs";
import { KeyRound } from "lucide-react";
import { ActiveOrgGate } from "@/components/shared/active-org-gate";

/**
 * Settings page — renders Clerk's full account management UI.
 *
 * The catch-all route ([[...rest]]) is required so that Clerk's internal
 * path-based navigation (switching between Profile, Security, etc. tabs)
 * can update the URL without hitting a 404.
 *
 * Clerk's built-in API Keys tab is user-scoped (subject user_…). It is hidden
 * in favor of a custom page that issues organization-scoped keys, which the
 * phi-api backend authorizes on.
 */
export default function SettingsPage() {
  return (
    <div className="flex justify-center">
      <UserProfile routing="path" path="/dashboard/settings" apiKeysProps={{ hide: true }}>
        <UserProfile.Page
          label="API keys"
          labelIcon={<KeyRound className="size-4" />}
          url="api-keys"
        >
          <ActiveOrgGate>
            <APIKeys />
          </ActiveOrgGate>
        </UserProfile.Page>
      </UserProfile>
    </div>
  );
}
