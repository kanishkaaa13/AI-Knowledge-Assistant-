"use client";

import { Activity, Brain, FileText, Zap } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardSummary } from "@/hooks/use-dashboard-summary";

const icons = [Brain, FileText, Zap, Activity];

export default function DashboardPage() {
  const { data, isLoading } = useDashboardSummary();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <section className="glass-panel p-6">
        <p className="text-sm font-medium text-primary">Overview</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">
              {data?.title ?? "AI Knowledge Assistant"}
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              {data?.description ??
                "A responsive dashboard scaffold for knowledge ingestion, retrieval, and AI-driven workflows."}
            </p>
            {user ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Welcome back, <span className="font-medium text-foreground">{user.name}</span>.
              </p>
            ) : null}
          </div>
          <div className="rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
            {isLoading ? "Syncing summary..." : "Backend summary loaded via React Query"}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(data?.stats ?? []).map((stat, index) => {
          const Icon = icons[index % icons.length];
          return (
            <Card key={stat.label}>
              <CardHeader>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className="text-3xl">{stat.value}</CardTitle>
              </CardHeader>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Suggested next steps</CardTitle>
            <CardDescription>
              Expand this scaffold with authentication, ingestion jobs, embeddings, and chat history.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Connect your PostgreSQL database and add alembic migrations.</p>
            <p>Introduce assistant endpoints for search, retrieval, and conversation memory.</p>
            <p>Wire up your preferred LLM provider behind the FastAPI service layer.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Developer notes</CardTitle>
            <CardDescription>
              Shared environment variables and API utilities are ready for local development.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Frontend data fetching uses Axios plus React Query.</p>
            <p>Dark mode is configured with CSS variables and `next-themes`.</p>
            <p>FastAPI exposes starter health and dashboard summary routes.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
