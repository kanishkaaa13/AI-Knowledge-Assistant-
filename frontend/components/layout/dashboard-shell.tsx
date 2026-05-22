import * as React from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:flex-row lg:px-8">
      <AppSidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
