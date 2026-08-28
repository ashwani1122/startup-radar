import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, ExternalLink, Globe2, MapPin, ShieldCheck, Users } from "lucide-react";
import { FounderMessageDialog } from "@/components/founder-message-dialog";
import { SaveStartupButton } from "@/components/save-startup-button";
import { StartupLogo } from "@/components/startup-logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatFunding } from "@/lib/format";
import { getStartupBySlug } from "@/lib/startup-data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const startup = await getStartupBySlug(slug);
  return { title: startup?.name ?? "Startup" };
}

export default async function StartupDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const startup = await getStartupBySlug(slug);
  if (!startup) notFound();
  const authConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
  const leadInvestor = startup.latestRound.investors.find((investor) => investor.isLead);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground"><Link href="/dashboard/startups"><ArrowLeft /> Back to startups</Link></Button>

      <section className="rounded-2xl border bg-card/70 p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
          <div className="flex items-start gap-4 sm:gap-5">
            <StartupLogo text={startup.logoText} accent={startup.accent} className="size-14 rounded-2xl text-sm sm:size-16" />
            <div>
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-semibold tracking-[-0.055em] sm:text-4xl">{startup.name}</h1>{startup.verified ? <Badge variant="outline" className="gap-1 text-primary"><CheckCircle2 className="size-3" /> Verified</Badge> : <Badge variant="outline">Reported</Badge>}</div>
              <p className="mt-2 max-w-2xl text-balance text-muted-foreground">{startup.tagline}</p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><MapPin className="size-3.5" /> {startup.headquarters ?? "Location not reported"}</span><span className="flex items-center gap-1.5"><Users className="size-3.5" /> {startup.employeeCount ? `${startup.employeeCount} people` : "Team not reported"}</span><span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" /> {startup.foundedYear ? `Founded ${startup.foundedYear}` : "Founded year not reported"}</span></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2"><SaveStartupButton startupId={startup.id} disabled={!authConfigured} />{startup.website ? <Button asChild><a href={startup.website} target="_blank" rel="noreferrer">Visit website <ExternalLink data-icon="inline-end" /></a></Button> : null}</div>
        </div>
      </section>

      {!authConfigured ? <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground"><strong className="text-foreground">Preview mode:</strong> add Clerk keys to activate saving, authenticated APIs, and founder messaging.</div> : null}

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="round">Funding round</TabsTrigger><TabsTrigger value="people">People</TabsTrigger></TabsList>
        <TabsContent value="overview">
          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <Card><CardHeader><CardTitle>What {startup.name} is building</CardTitle><CardDescription>{startup.description}</CardDescription></CardHeader><CardContent><p className="text-sm leading-7 text-muted-foreground">{startup.longDescription}</p><div className="mt-6 flex flex-wrap gap-2">{startup.tags.map((tag) => <Badge variant="secondary" key={tag}>{tag}</Badge>)}</div></CardContent></Card>
            <div className="space-y-5">
              <Card><CardHeader><CardTitle className="text-sm">Latest raise</CardTitle></CardHeader><CardContent><p className="text-4xl font-semibold tracking-[-0.065em]">{formatFunding(startup.latestRound.amountUsd, startup.latestRound.amountDisplay)}</p><div className="mt-3 flex items-center justify-between text-xs"><Badge>{startup.latestRound.stage}</Badge><span className="text-muted-foreground">Lead investor: {leadInvestor?.name ?? "Not reported"}</span></div></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm">Company facts</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">{[[Globe2, 'Market', startup.country ?? 'Not reported'], [BriefcaseBusiness, 'Industry', startup.industry ?? 'Not reported'], [Users, 'Team', startup.employeeCount ? `${startup.employeeCount} people` : 'Not reported']].map(([Icon, label, value]) => { const FactIcon = Icon as typeof Globe2; return <div className="flex items-center justify-between gap-3" key={String(label)}><span className="flex items-center gap-2 text-muted-foreground"><FactIcon className="size-3.5" />{String(label)}</span><span>{String(value)}</span></div>; })}</CardContent></Card>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="round">
          <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
            <Card><CardHeader><div className="flex items-start justify-between gap-5"><div><CardTitle>{startup.latestRound.stage} round</CardTitle><CardDescription>Reported {new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(startup.latestRound.announcedAt))}</CardDescription></div><p className="text-3xl font-semibold tracking-[-0.06em]">{formatFunding(startup.latestRound.amountUsd, startup.latestRound.amountDisplay)}</p></div></CardHeader><CardContent><Separator className="mb-5" /><div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="text-sm font-medium">Automatically indexed public report</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Verify the linked article before relying on the company, amount, date, or investor details.</p></div></div><a href={startup.latestRound.sourceUrl} target="_blank" rel="noreferrer" className="mt-5 flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-muted/40"><div><p className="text-sm font-medium">{startup.latestRound.sourceTitle}</p><p className="mt-1 text-xs text-muted-foreground">{startup.latestRound.sourceDomain ?? startup.latestRound.sourceProvider} · {startup.latestRound.sourceType}</p></div><ArrowUpRight className="size-4 text-muted-foreground" /></a></CardContent></Card>
            <Card><CardHeader><CardTitle>Investors</CardTitle><CardDescription>Participants named in the indexed report.</CardDescription></CardHeader><CardContent className="space-y-2">{startup.latestRound.investors.map((investor) => <div className="flex items-center justify-between rounded-xl border px-4 py-3" key={investor.id}><div><p className="text-sm font-medium">{investor.name}</p><p className="text-xs text-muted-foreground">{investor.type}</p></div>{investor.isLead ? <Badge variant="secondary">Lead</Badge> : null}</div>)}{!startup.latestRound.investors.length ? <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No investor was clearly named in the indexed report.</p> : null}</CardContent></Card>
          </div>
        </TabsContent>
        <TabsContent value="people">
          <div className="grid gap-4 lg:grid-cols-2">{startup.founders.map((founder) => <Card key={founder.id}><CardContent className="p-6"><div className="flex items-start gap-4"><Avatar className="size-12"><AvatarFallback>{founder.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">{founder.name}</h3><p className="text-xs text-muted-foreground">{founder.role}</p></div>{founder.openToMessages ? <Badge variant="outline" className="text-primary">Open to messages</Badge> : null}</div><p className="mt-4 text-sm leading-6 text-muted-foreground">{founder.bio}</p><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className="flex items-center gap-1.5 text-xs text-muted-foreground">{founder.responseTime ? <><Clock3 className="size-3.5" /> {founder.responseTime}</> : founder.location}</span>{founder.openToMessages ? <FounderMessageDialog startupId={startup.id} startupName={startup.name} founderId={founder.id} founderName={founder.name} disabled={!authConfigured} /> : <Button disabled variant="outline">Not accepting messages</Button>}</div></div></div></CardContent></Card>)}{!startup.founders.length ? <Card className="lg:col-span-2"><CardContent className="p-8 text-center"><p className="text-sm font-medium">Founder details were not reported</p><p className="mt-1 text-xs text-muted-foreground">Raise does not guess people or contact details from an ambiguous article.</p></CardContent></Card> : null}</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
