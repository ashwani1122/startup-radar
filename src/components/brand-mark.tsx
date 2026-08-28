import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("focus-ring inline-flex items-center gap-2 rounded-lg", className)} aria-label="Raise home">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_24px_-8px_var(--primary)]"><ArrowUpRight className="size-4 stroke-[2.4]" /></span>
      {compact ? null : <span className="text-[15px] font-semibold tracking-[-0.03em]">raise</span>}
    </Link>
  );
}
