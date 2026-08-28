import { AlertTriangle, Clock3, Database, DollarSign, Globe2 } from "lucide-react";
import { StartupExplorer } from "@/components/startup-explorer";
import { SyncFundingButton } from "@/components/sync-funding-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatFunding } from "@/lib/format";
import { getFundingCoverage } from "@/lib/funding/coverage";
import { getStartups } from "@/lib/startup-data";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const currentYear = new Date().getUTCFullYear();
  const [startups, coverage] = await Promise.all([getStartups(), getFundingCoverage()]);
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
            <Badge variant="outline" className="gap-1.5 font-mono text-[9px]"><span className="size-1.5 animate-pulse rounded-full bg-primary" /> Public-source monitor</Badge>
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

      <Card className="overflow-hidden border-border/80 bg-card/70">
        <CardContent className="p-0">
          <div className="flex flex-col justify-between gap-4 border-b p-5 sm:flex-row sm:items-start">
            <div className="max-w-3xl">
              <Badge variant="destructive" className="gap-1.5"><AlertTriangle /> Coverage is not complete</Badge>
              <h2 className="mt-3 text-lg font-semibold tracking-[-0.03em]">{coverage.label}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{coverage.disclaimer}</p>
            </div>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border text-center text-xs">
              <div className="bg-card px-4 py-3"><p className="font-mono text-base font-semibold">{coverage.queued}</p><p className="text-muted-foreground">in queue</p></div>
              <div className="bg-card px-4 py-3"><p className="font-mono text-base font-semibold">{coverage.processed}</p><p className="text-muted-foreground">processed</p></div>
            </div>
          </div>
          <div className="grid gap-px bg-border md:grid-cols-2 xl:grid-cols-5">
            {coverage.sources.map((source) => (
              <div className="bg-card p-4" key={source.key}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium">{source.label}</p>
                  <Badge variant={source.status === "degraded" ? "destructive" : source.status === "active" ? "secondary" : "outline"} className="text-[9px]">{source.status}</Badge>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{source.scope}</p>
                <p className="mt-3 font-mono text-[9px] text-muted-foreground">
                  {source.lastSuccessAt ? `Last success ${formatDateTime(source.lastSuccessAt)}` : source.note ?? "Waiting for first check"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <StartupExplorer startups={startups} compact />
    </div>
  );
}
