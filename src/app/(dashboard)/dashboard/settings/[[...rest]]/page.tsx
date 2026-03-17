"use client";

import { UserProfile } from "@clerk/nextjs";

/**
 * Settings page — renders Clerk's full account management UI.
 *
 * The catch-all route ([[...rest]]) is required so that Clerk's internal
 * path-based navigation (switching between Profile, Security, etc. tabs)
 * can update the URL without hitting a 404.
 */
export default function SettingsPage() {
  return (
    <div className="flex justify-center">
      <UserProfile routing="path" path="/dashboard/settings" />
    </div>
  );
}
