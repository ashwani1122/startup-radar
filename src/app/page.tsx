import Link from "next/link";
import { ArrowRight, Check, Database, Globe2, MessageSquareText, Radar, ShieldCheck, Sparkles } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { Reveal } from "@/components/reveal";
import { StartupCard } from "@/components/startup-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatFunding } from "@/lib/format";
import { getStartups } from "@/lib/startup-data";

const principles = [
  { icon: ShieldCheck, title: "Every claim has a source", copy: "Funding rounds keep their announcement, filing, or company source attached." },
  { icon: Radar, title: "Small teams surface first", copy: "Early-stage companies are ranked ahead of the same household names." },
  { icon: MessageSquareText, title: "Reach out with context", copy: "Authenticated members send purposeful requests without exposing private founder details." },
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const currentYear = new Date().getUTCFullYear();
  const startups = await getStartups();
  const featured = startups.slice(0, 3);
  const disclosedCapital = startups.reduce((sum, startup) => sum + (startup.latestRound.amountUsd ?? 0), 0);
  const markets = new Set(startups.map((startup) => startup.country).filter(Boolean)).size;

  return (
    <div className="min-h-screen overflow-hidden">
      <PublicHeader />
      <main>
        <section className="relative border-b border-border/70">
          <div className="surface-grid pointer-events-none absolute inset-0 opacity-55" />
          <div className="pointer-events-none absolute left-1/2 top-16 size-64 -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-20 md:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-32">
            <div className="max-w-3xl">
              <Reveal>
                <Badge variant="outline" className="mb-6 gap-1.5 rounded-full bg-background/75 px-3 py-1"><Sparkles className="size-3 text-primary" /> The early signal, not the echo</Badge>
                <h1 className="text-balance text-5xl font-semibold leading-[0.96] tracking-[-0.07em] sm:text-6xl lg:text-[5.25rem]">
                  Discover the startups everyone else will notice <span className="text-primary">later.</span>
                </h1>
              </Reveal>
              <Reveal delay={0.08}>
                <p className="mt-7 max-w-2xl text-balance text-lg leading-7 text-muted-foreground sm:text-xl">
                  Raise turns public funding announcements into useful, source-backed profiles of small teams, founders, and the investors betting on them.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="h-11 px-5"><Link href="/dashboard">Explore recent raises <ArrowRight data-icon="inline-end" /></Link></Button>
                  <Button asChild size="lg" variant="outline" className="h-11 px-5"><Link href="#how-it-works">See how data works</Link></Button>
                </div>
                <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  {['Small teams prioritized', 'Sources attached', 'No paywalled data required'].map((item) => <span className="flex items-center gap-1.5" key={item}><Check className="size-3.5 text-primary" /> {item}</span>)}
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.16} className="lg:pt-5">
              <Card className="relative overflow-hidden border-border/80 bg-card/90 shadow-2xl shadow-black/10">
                <div className="flex items-center justify-between border-b px-5 py-4">
                  <div><p className="text-sm font-medium">Live funding pulse</p><p className="text-xs text-muted-foreground">Small teams · newest first</p></div>
                  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-primary"><span className="size-1.5 animate-pulse rounded-full bg-primary" /> monitoring</span>
                </div>
                <CardContent className="space-y-1 p-2">
                  {featured.map((startup, index) => (
                    <Link key={startup.id} href={`/dashboard/startups/${startup.slug}`} className="group flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-muted/60">
                      <div className="flex min-w-0 items-center gap-3"><span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span><div className="min-w-0"><p className="truncate text-sm font-medium">{startup.name}</p><p className="truncate text-xs text-muted-foreground">{startup.country ?? "Location not reported"} · {startup.latestRound.stage}</p></div></div>
                      <div className="text-right"><p className="font-mono text-sm font-semibold">{formatFunding(startup.latestRound.amountUsd, startup.latestRound.amountDisplay)}</p><p className="text-[10px] text-muted-foreground">source attached</p></div>
                    </Link>
                  ))}
                  {!featured.length ? <div className="px-4 py-10 text-center text-sm text-muted-foreground">The live feed is waiting for its first sync.</div> : null}
                </CardContent>
                <div className="grid grid-cols-3 border-t bg-muted/25 text-center">
                  {[[startups.length.toString(), `${currentYear} reports`], [formatFunding(disclosedCapital), 'disclosed capital'], [markets.toString(), 'known markets']].map(([value, label]) => <div className="border-r px-3 py-4 last:border-r-0" key={label}><p className="font-mono text-sm font-semibold">{value}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p></div>)}
                </div>
              </Card>
            </Reveal>
          </div>
        </section>

        <section id="product" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Recently discovered</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Small teams. Fresh capital. Real context.</h2></div>
            <Button asChild variant="ghost"><Link href="/dashboard">View the full dashboard <ArrowRight /></Link></Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((startup) => <StartupCard key={startup.id} startup={startup} />)}
          </div>
        </section>

        <section id="how-it-works" className="border-y bg-muted/25">
          <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <div><Badge variant="outline">The data loop</Badge><h2 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.05em]">From a public signal to a profile you can act on.</h2><p className="mt-5 leading-7 text-muted-foreground">Raise is designed around provenance. It explains what was found, where it came from, and what still needs verification.</p></div>
              <div className="grid gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-3">
                {[
                  { number: '01', icon: Globe2, title: 'Detect', copy: 'Monitor public announcements and filings across markets.' },
                  { number: '02', icon: Database, title: 'Structure', copy: 'Connect the round to companies, founders, and investors.' },
                  { number: '03', icon: ShieldCheck, title: 'Verify', copy: 'Keep source links, confidence, and corrections visible.' },
                ].map((step) => <div className="bg-card p-6" key={step.number}><div className="flex items-center justify-between"><step.icon className="size-5 text-primary" /><span className="font-mono text-xs text-muted-foreground">{step.number}</span></div><h3 className="mt-12 font-semibold">{step.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{step.copy}</p></div>)}
              </div>
            </div>
          </div>
        </section>

        <section id="principles" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center"><p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Built for trust</p><h2 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.05em]">Know what is known—and what is not.</h2></div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {principles.map((principle) => <Card key={principle.title}><CardContent className="p-6"><div className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary"><principle.icon className="size-5" /></div><h3 className="mt-8 font-semibold">{principle.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{principle.copy}</p></CardContent></Card>)}
          </div>
        </section>

        <section className="px-5 pb-20 lg:px-8 lg:pb-28">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-3xl border bg-card px-7 py-10 sm:flex-row sm:items-center lg:px-12 lg:py-12">
            <div><h2 className="text-3xl font-semibold tracking-[-0.05em]">Get closer to the next breakout.</h2><p className="mt-2 text-muted-foreground">Explore the source-backed startup dashboard.</p></div>
            <Button asChild size="lg"><Link href="/dashboard">Open Raise <ArrowRight /></Link></Button>
          </div>
        </section>
      </main>
      <footer className="border-t"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8"><p>© 2026 Raise. Funding reports link to their public source.</p><p>Automated discovery can miss or misclassify reports; verify before acting.</p></div></footer>
    </div>
  );
}
