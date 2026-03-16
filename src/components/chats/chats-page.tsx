"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ClipboardList, Search, MessageSquare, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useChatSessions, type AgentMode } from "@/hooks/use-chat-sessions";
import { cn } from "@/lib/utils";

const MODE_META: Record<AgentMode, { icon: typeof MessageSquare; label: string; color: string }> = {
  plan: { icon: ClipboardList, label: "Plan", color: "text-blue-600" },
  research: { icon: Search, label: "Research", color: "text-purple-600" },
  chat: { icon: MessageSquare, label: "Chat", color: "text-green-600" },
};

export function ChatsPage() {
  const { sessions, deleteSession } = useChatSessions();
  const [query, setQuery] = useState("");

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Conversations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your recent agent sessions, stored locally in this browser.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/agent">
            <Plus className="h-4 w-4 mr-1.5" />
            New conversation
          </Link>
        </Button>
      </div>

      <Input
        placeholder="Search conversations…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {sessions.length === 0
              ? "No conversations yet. Start one from the Agent page."
              : "No conversations match your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((session) => {
            const { icon: Icon, label, color } = MODE_META[session.mode];
            return (
              <div
                key={session.id}
                className="group flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted",
                    color
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <Link
                  href="/dashboard/agent"
                  className="flex-1 min-w-0"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium truncate">{session.title}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">
                      {label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{session.messages.length} messages</span>
                    <span>·</span>
                    <span>
                      {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </Link>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    deleteSession(session.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
