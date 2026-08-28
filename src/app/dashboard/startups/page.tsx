import { StartupExplorer } from "@/components/startup-explorer";
import { getStartups } from "@/lib/startup-data";

export const metadata = { title: "Startups" };

export default async function StartupsPage() {
  const startups = await getStartups();
  return (
    <div>
      <div className="mb-8"><p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Company directory</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">Recently raised</h1><p className="mt-2 text-sm text-muted-foreground">Search tracked public-source reports and inspect the evidence behind each round. This directory is not a complete record of worldwide funding.</p></div>
      <StartupExplorer startups={startups} />
    </div>
  );
}
