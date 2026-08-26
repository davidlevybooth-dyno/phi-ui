"use client";

import { UserProfile } from "@clerk/nextjs";

/**
 * Settings page — renders Clerk's full account management UI.
 *
 * The catch-all route ([[...rest]]) is required so that Clerk's internal
 * path-based navigation (switching between Profile, Security, etc. tabs)
 * can update the URL without hitting a 404.
 *
 * Keys are minted user-scoped. Clerk gates organization-scoped keys behind
 * org:sys_api_keys:manage, which org:member does not hold, so scoping them to
 * the organization here locks out most of the org. phi-api resolves the
 * organization from Clerk membership instead — see _resolve_org_id.
 */
export default function SettingsPage() {
  return (
    <div className="flex justify-center">
      <UserProfile routing="path" path="/dashboard/settings" />
    </div>
  );
}
