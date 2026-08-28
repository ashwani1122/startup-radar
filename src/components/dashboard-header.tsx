"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell, Search } from "lucide-react";
import { MobileDashboardNav } from "@/components/dashboard-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function DashboardHeader({ clerkConfigured }: { clerkConfigured: boolean }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/85 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-2"><MobileDashboardNav /><p className="hidden text-sm text-muted-foreground sm:block">Your early-stage funding radar</p></div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Search"><Search /></Button>
        <Button variant="ghost" size="icon" aria-label="Notifications"><Bell /></Button>
        <ThemeToggle />
        {clerkConfigured ? <UserButton /> : <span className="ml-1 rounded-full border bg-muted px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">demo</span>}
      </div>
    </header>
  );
}
