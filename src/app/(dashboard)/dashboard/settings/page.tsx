"use client";

import { useState } from "react";
import { Copy, Check, RefreshCw, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";
import { useSessionStore, useSettingsStore } from "@/lib/stores/auth-store";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user } = useAuth();
  const { apiKey, setApiKey } = useSessionStore();
  const { orgId, userId, setOrgId, setUserId } = useSettingsStore();
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingOrg, setEditingOrg] = useState(orgId);
  const [editingUser, setEditingUser] = useState(userId);

  const maskedKey = apiKey
    ? apiKey.slice(0, 8) + "•".repeat(Math.min(32, apiKey.length - 8)) + apiKey.slice(-4)
    : "";

  const copyKey = async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const refreshIdToken = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      setApiKey(token);
      toast.success("Token refreshed");
    } catch {
      toast.error("Failed to refresh token");
    }
  };

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
          Manage your API credentials and organization settings.
        </p>
      </div>

      {/* Profile */}
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
            <p className="text-xs text-muted-foreground mb-0.5">UID</p>
            <p className="font-mono text-xs">{user?.uid ?? "—"}</p>
          </div>
        </div>
      </Card>

      {/* API Key */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">API key</h2>
          <Badge variant="secondary" className="text-xs">Firebase ID Token</Badge>
        </div>

        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription className="text-xs">
            Your API key is your Firebase ID token. It expires after 1 hour — use
            &ldquo;Refresh&rdquo; to get a new one. Permanent API key management will be available
            once the backend auth endpoint is deployed.
          </AlertDescription>
        </Alert>

        <div className="space-y-1.5">
          <Label className="text-xs">Key</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={showKey ? (apiKey ?? "") : maskedKey}
              className="font-mono text-xs flex-1"
              placeholder="No key — sign in to generate"
            />
            <Button
              size="icon"
              variant="outline"
              className="size-9 shrink-0"
              onClick={() => setShowKey((v) => !v)}
              disabled={!apiKey}
            >
              {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="size-9 shrink-0"
              onClick={copyKey}
              disabled={!apiKey}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="size-9 shrink-0"
              onClick={refreshIdToken}
              disabled={!user}
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="pt-1">
          <p className="text-xs text-muted-foreground mb-2">Usage in curl</p>
          <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto leading-relaxed">
            <code>{`curl -X POST https://design.dynotx.com/api/v1/jobs/ \\
  -H "x-api-key: ${apiKey ? apiKey.slice(0, 12) + "..." : "YOUR_API_KEY"}" \\
  -H "Content-Type: application/json" \\
  -d '{ "job_type": "esmfold", "params": { ... } }'`}</code>
          </pre>
        </div>
      </Card>

      {/* Org settings */}
      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-medium">Organization settings</h2>
        <p className="text-xs text-muted-foreground">
          These values are sent as headers with every API request. They will be
          replaced by proper org management once the auth endpoint is available.
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

      {/* Environment variable reference */}
      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-medium">Local environment setup</h2>
        <p className="text-xs text-muted-foreground">
          For use with Claude Code skills or local scripts:
        </p>
        <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto leading-relaxed">
          <code>{`export DYNO_PHI_API_KEY="${apiKey ? apiKey.slice(0, 12) + "..." : "your-api-key"}"
export DYNO_PHI_ORG_ID="${orgId}"
export DYNO_PHI_BASE_URL="https://design.dynotx.com/api/v1"`}</code>
        </pre>
      </Card>
    </div>
  );
}
