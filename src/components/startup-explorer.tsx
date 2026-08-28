"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { StartupCard } from "@/components/startup-card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STARTUP_INDUSTRIES } from "@/lib/industries";
import type { StartupView } from "@/lib/types";

export function StartupExplorer({ startups, compact = false }: { startups: StartupView[]; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [industry, setIndustry] = useState("all");
  const [country, setCountry] = useState("all");
  const deferredQuery = useDeferredValue(query);

  const stages = useMemo(() => Array.from(new Set(startups.map((startup) => startup.stage))).toSorted(), [startups]);
  const industries = useMemo(() => Array.from(new Set([
    ...STARTUP_INDUSTRIES,
    ...startups.map((startup) => startup.industry).filter((item): item is string => Boolean(item)),
  ])).toSorted(), [startups]);
  const countries = useMemo(() => Array.from(new Set(startups.map((startup) => startup.country).filter((item): item is string => Boolean(item)))).toSorted(), [startups]);
  const filtered = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    return startups.filter((startup) => {
      const searchable = [startup.name, startup.tagline, startup.industry ?? "", startup.country ?? "", ...startup.tags].join(" ").toLowerCase();
      return (!normalizedQuery || searchable.includes(normalizedQuery))
        && (stage === "all" || startup.stage === stage)
        && (industry === "all" || startup.industry === industry)
        && (country === "all" || startup.country === country);
    });
  }, [country, deferredQuery, industry, stage, startups]);

  return (
    <section aria-labelledby="startup-explorer-title">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-2"><h2 id="startup-explorer-title" className="font-semibold tracking-[-0.025em]">{compact ? "Recently funded" : "Explore startups"}</h2><Badge variant="secondary">{filtered.length}</Badge></div>
        <div className="grid gap-2 sm:grid-cols-2 xl:flex">
          <div className="relative sm:col-span-2 xl:w-64"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, category, country…" className="pl-9" aria-label="Search startups" /></div>
          <Select value={stage} onValueChange={setStage}><SelectTrigger className="w-full xl:w-36"><SlidersHorizontal className="size-3.5" /><SelectValue placeholder="Stage" /></SelectTrigger><SelectContent><SelectItem value="all">All stages</SelectItem>{stages.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
          <Select value={industry} onValueChange={setIndustry}><SelectTrigger className="w-full xl:w-48"><SelectValue placeholder="Category" /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{industries.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
          <Select value={country} onValueChange={setCountry}><SelectTrigger className="w-full xl:w-40"><SelectValue placeholder="Country" /></SelectTrigger><SelectContent><SelectItem value="all">All countries</SelectItem>{countries.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((startup) => <StartupCard key={startup.id} startup={startup} />)}</div>
      ) : (
        <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/20 text-center"><div><Search className="mx-auto size-5 text-muted-foreground" /><p className="mt-3 text-sm font-medium">No startups match these filters</p><p className="mt-1 text-xs text-muted-foreground">Try a broader search or another market.</p></div></div>
      )}
    </section>
  );
}
