import * as React from "react";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return <div className="h-screen overflow-hidden bg-background">{children}</div>;
}
