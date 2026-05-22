"use client";

import Link from "next/link";
import { BrainCircuit, LayoutDashboard, MessageSquareText, Settings } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, active: true },
  { href: "#", label: "Knowledge Base", icon: BrainCircuit, active: false },
  { href: "#", label: "Conversations", icon: MessageSquareText, active: false },
  { href: "#", label: "Settings", icon: Settings, active: false }
];

export function AppSidebar() {
  const { logoutUser, user } = useAuth();

  return (
    <aside className="glass-panel flex w-full flex-col gap-6 p-5 lg:min-h-[calc(100vh-2rem)] lg:w-72">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Workspace</p>
        <h2 className="mt-1 text-2xl font-semibold">Assistant Console</h2>
        {user ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.name}</span>
          </p>
        ) : null}
      </div>

      <div className="rounded-3xl bg-primary/10 p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium">System status</span>
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
            Ready
          </Badge>
        </div>
        <p className="mt-3 text-muted-foreground">
          Connected to your API workspace and ready for knowledge ingestion.
        </p>
      </div>

      <nav className="space-y-2">
        {navigation.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={label}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto rounded-3xl border border-border/60 p-4">
        <p className="text-sm font-medium">Session</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Secure JWT cookies keep your session active across refresh cycles.
        </p>
        <Button className="mt-4 w-full" variant="secondary" onClick={() => void logoutUser()}>
          Log out
        </Button>
      </div>
    </aside>
  );
}
