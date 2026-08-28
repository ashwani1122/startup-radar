"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SyncFundingButton() {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);

  async function syncFunding() {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/startups/sync", { method: "POST" });
      const result = await response.json() as { data?: { imported: number; skippedByCooldown: boolean }; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Funding sync failed.");

      toast.success(result.data?.skippedByCooldown
        ? "The public feed was already checked recently."
        : `${result.data?.imported ?? 0} new funding reports imported.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Funding sync failed.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={syncFunding} disabled={isSyncing}>
      <RefreshCw className={isSyncing ? "animate-spin" : undefined} />
      {isSyncing ? "Checking sources" : "Check for funding"}
    </Button>
  );
}
