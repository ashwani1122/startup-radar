"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SaveStartupButton({ startupId, disabled = false }: { startupId: string; disabled?: boolean }) {
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggleSaved() {
    startTransition(async () => {
      const response = await fetch("/api/saved", { method: saved ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startupId }) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(result.error ?? "Could not update saved startups.");
        return;
      }
      setSaved((current) => !current);
      toast.success(saved ? "Removed from saved startups." : "Startup saved.");
    });
  }

  return <Button type="button" variant="outline" onClick={toggleSaved} disabled={disabled || pending} aria-pressed={saved}><Bookmark className={cn(saved && "fill-current text-primary")} /> {saved ? "Saved" : "Save"}</Button>;
}
