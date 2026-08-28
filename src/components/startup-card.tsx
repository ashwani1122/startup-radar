import Link from "next/link";
import { ArrowUpRight, CalendarDays, CheckCircle2, Clock3, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { StartupLogo } from "@/components/startup-logo";
import { formatDateTime, formatFunding } from "@/lib/format";
import type { StartupView } from "@/lib/types";

export function StartupCard({ startup, href }: { startup: StartupView; href?: string }) {
  return (
    <Card className="group relative h-full overflow-hidden border-border/80 bg-card/80 transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_18px_60px_-36px_var(--primary)]">
      <Link href={href ?? `/dashboard/startups/${startup.slug}`} className="absolute inset-0 z-10 rounded-xl" aria-label={`View ${startup.name}`} />
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <StartupLogo text={startup.logoText} accent={startup.accent} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-semibold tracking-[-0.025em]">{startup.name}</h3>
              {startup.verified ? <CheckCircle2 className="size-3.5 shrink-0 text-primary" aria-label="Verified" /> : null}
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" /> {startup.headquarters ?? "Location not reported"}</p>
          </div>
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{startup.tagline}</p>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Latest round</p>
            <p className="mt-1 text-2xl font-semibold tracking-[-0.055em]">{formatFunding(startup.latestRound.amountUsd, startup.latestRound.amountDisplay)}</p>
          </div>
          <Badge variant="secondary">{startup.latestRound.stage}</Badge>
        </div>
        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/35 p-3 text-xs">
          <div className="flex items-start justify-between gap-3">
            <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
              <CalendarDays className="size-3.5" /> Funding announced
            </span>
            <time dateTime={startup.latestRound.announcedAt} className="text-right font-medium text-foreground">
              {formatDateTime(startup.latestRound.announcedAt)}
            </time>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
              <Clock3 className="size-3.5" /> Added to Raise
            </span>
            <time dateTime={startup.indexedAt} className="text-right font-medium text-foreground">
              {formatDateTime(startup.indexedAt)}
            </time>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between border-t border-border/70 pt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><Users className="size-3.5" /> {startup.employeeCount ? `${startup.employeeCount} people` : "Team not reported"}</span>
        <span>{startup.industry ?? "Industry not reported"}</span>
      </CardFooter>
    </Card>
  );
}
