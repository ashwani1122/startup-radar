import { stageLabel } from "@/lib/format";
import type { StartupFilters, StartupView } from "@/lib/types";

function matchesFilters(startup: StartupView, filters: StartupFilters) {
  const query = filters.query?.trim().toLowerCase();
  const searchable = [startup.name, startup.tagline, startup.description, startup.country ?? "", startup.industry ?? "", ...startup.tags].join(" ").toLowerCase();
  return (!query || searchable.includes(query)) && (!filters.stage || filters.stage === "all" || startup.stage === filters.stage) && (!filters.country || filters.country === "all" || startup.country === filters.country) && (!filters.industry || filters.industry === "all" || startup.industry === filters.industry);
}

function prioritizeSmallStartups(startups: StartupView[]) {
  return startups.toSorted((a, b) => {
    const aSmall = a.employeeCount === undefined ? 1 : a.employeeCount <= 25 ? 2 : 0;
    const bSmall = b.employeeCount === undefined ? 1 : b.employeeCount <= 25 ? 2 : 0;
    if (aSmall !== bSmall) return bSmall - aSmall;
    return new Date(b.latestRound.announcedAt).getTime() - new Date(a.latestRound.announcedAt).getTime();
  });
}

async function getDatabaseStartups(): Promise<StartupView[]> {
  const { prisma } = await import("@/lib/prisma");
  const currentYearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const records = await prisma.startup.findMany({
    where: { rounds: { some: { announcedAt: { gte: currentYearStart } } } },
    include: {
      founders: { orderBy: { createdAt: "asc" } },
      rounds: {
        where: { announcedAt: { gte: currentYearStart } },
        orderBy: { announcedAt: "desc" },
        take: 1,
        include: { participants: { include: { investor: true } } },
      },
    },
    orderBy: [{ employeeCount: "asc" }, { updatedAt: "desc" }],
  });

  return records.flatMap((record) => {
    const round = record.rounds[0];
    if (!round) return [];
    return [{
      id: record.id,
      slug: record.slug,
      name: record.name,
      tagline: record.tagline,
      description: record.description,
      longDescription: record.longDescription,
      website: record.website ?? undefined,
      headquarters: record.headquarters ?? undefined,
      country: record.country ?? undefined,
      foundedYear: record.foundedYear ?? undefined,
      employeeCount: record.employeeCount ?? undefined,
      stage: stageLabel(record.stage),
      industry: record.industry ?? undefined,
      tags: record.tags,
      logoText: record.logoText,
      accent: record.accent,
      verified: record.verified,
      isFeatured: record.isFeatured,
      sourceConfidence: record.sourceConfidence,
      indexedAt: record.updatedAt.toISOString(),
      founders: record.founders.map((founder) => ({
        id: founder.id,
        name: founder.name,
        role: founder.role,
        bio: founder.bio,
        location: founder.location,
        linkedInUrl: founder.linkedInUrl ?? undefined,
        openToMessages: founder.openToMessages,
        responseTime: founder.responseTime ?? undefined,
      })),
      latestRound: {
        id: round.id,
        stage: stageLabel(round.stage),
        amountUsd: round.amountUsd,
        amountDisplay: round.amountDisplay ?? undefined,
        currency: round.currency,
        announcedAt: round.announcedAt.toISOString(),
        sourceTitle: round.sourceTitle,
        sourceUrl: round.sourceUrl,
        sourceType: round.sourceType,
        sourceDomain: round.sourceDomain ?? undefined,
        sourceProvider: round.sourceProvider,
        verified: round.verified,
        investors: round.participants.map((participant) => ({
          id: participant.investor.id,
          name: participant.investor.name,
          type: stageLabel(participant.investor.type),
          isLead: participant.isLead,
        })),
      },
    } satisfies StartupView];
  });
}

async function allStartups() {
  if (!process.env.DATABASE_URL) return [];
  try {
    const records = await getDatabaseStartups();
    return records;
  } catch (error) {
    console.error("Unable to load source-backed startup data from PostgreSQL.", error);
    return [];
  }
}

export async function getStartups(filters: StartupFilters = {}) {
  return prioritizeSmallStartups((await allStartups()).filter((startup) => matchesFilters(startup, filters)));
}

export async function getStartupBySlug(slug: string) {
  return (await allStartups()).find((startup) => startup.slug === slug) ?? null;
}

export async function getStartupById(id: string) {
  return (await allStartups()).find((startup) => startup.id === id) ?? null;
}
