"use client";

import { useState } from "react";
import { APIKeys } from "@clerk/nextjs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useSettingsStore } from "@/lib/stores/auth-store";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user } = useAuth();
  const { orgId, userId, setOrgId, setUserId } = useSettingsStore();
  const [editingOrg, setEditingOrg] = useState(orgId);
  const [editingUser, setEditingUser] = useState(userId);

  const saveOrgSettings = () => {
    setOrgId(editingOrg);
    setUserId(editingUser);
    toast.success("Settings saved");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your API keys and organization settings.
        </p>
      </div>

      {/* Account */}
      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-medium">Account</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Name</p>
            <p>{user?.displayName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Email</p>
            <p>{user?.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">User ID</p>
            <p className="font-mono text-xs">{user?.uid ?? "—"}</p>
          </div>
        </div>
      </Card>

      {/* API Keys — Clerk component. Enable in Clerk Dashboard → Configure → API Keys. */}
      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-sm font-medium">API keys</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Long-lived keys for CLI usage, CI pipelines, and Phi Skills. Keys are
            immediately revocable and never expire unless you set an expiry.
          </p>
        </div>

        <APIKeys />

      </Card>

      {/* Org settings */}
      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-medium">Organization settings</h2>
        <p className="text-xs text-muted-foreground">
          Sent as X-Organization-ID and X-User-ID on every request. Synced from GET
          /auth/me when you sign in; override here if needed.
        </p>
        <Separator />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="org-id" className="text-xs">
              Organization ID
            </Label>
            <Input
              id="org-id"
              value={editingOrg}
              onChange={(e) => setEditingOrg(e.target.value)}
              className="text-sm font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-id" className="text-xs">
              User ID
            </Label>
            <Input
              id="user-id"
              value={editingUser}
              onChange={(e) => setEditingUser(e.target.value)}
              className="text-sm font-mono"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={saveOrgSettings}>
            Save
          </Button>
        </div>
      </Card>
    </div>
  );
}
