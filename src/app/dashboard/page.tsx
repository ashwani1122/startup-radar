import { Clock3, Database, DollarSign, Globe2 } from "lucide-react";
import { StartupExplorer } from "@/components/startup-explorer";
import { SyncFundingButton } from "@/components/sync-funding-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatFunding } from "@/lib/format";
import { getStartups } from "@/lib/startup-data";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const currentYear = new Date().getUTCFullYear();
  const startups = await getStartups();
  const knownAmounts = startups.map((startup) => startup.latestRound.amountUsd).filter((amount): amount is number => amount !== null);
  const totalRaised = knownAmounts.reduce((sum, amount) => sum + amount, 0);
  const countries = new Set(startups.map((startup) => startup.country).filter(Boolean)).size;
  const latestIndexedAt = startups.reduce((latest, startup) => Math.max(latest, new Date(startup.indexedAt).getTime()), 0);
  const indexedLabel = latestIndexedAt
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(latestIndexedAt))
    : "Waiting for first source sync";

  const stats = [
    { label: "Funding reports", value: startups.length.toString(), context: `${currentYear} only`, icon: Database },
    { label: "Disclosed capital", value: formatFunding(totalRaised), context: `${knownAmounts.length} rounds report USD`, icon: DollarSign },
    { label: "Known markets", value: countries.toString(), context: "Only source-reported locations", icon: Globe2 },
    { label: "Data window", value: currentYear.toString(), context: "Resets automatically each January", icon: Clock3 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Funding radar</p>
            <Badge variant="outline" className="gap-1.5 font-mono text-[9px]"><span className="size-1.5 animate-pulse rounded-full bg-primary" /> Live public data</Badge>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Recently funded teams, from real sources.</h1>
          <p className="mt-2 text-sm text-muted-foreground">Automatically indexed funding reports with the original article attached.</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <SyncFundingButton />
          <p className="text-xs text-muted-foreground">Last database update: {indexedLabel}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card/70">
            <CardContent className="p-5">
              <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{stat.label}</p><stat.icon className="size-4 text-muted-foreground" /></div>
              <p className="mt-4 text-2xl font-semibold tracking-[-0.05em]">{stat.value}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{stat.context}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <StartupExplorer startups={startups} compact />
    </div>
  );
}
