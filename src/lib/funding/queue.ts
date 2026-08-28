import { createHash } from "node:crypto";
import { CompanyStage, FundingCandidateStatus, InvestorType, type FundingCandidate, type Prisma, type PrismaClient } from "@/generated/prisma/client";
import { parseNewsFundingSignal, type NewsArticle } from "@/lib/funding/news-parser";
import { parseSecFormD } from "@/lib/funding/sources/sec-edgar";
import type { DiscoveredCandidate, NormalizedFundingSignal } from "@/lib/funding/types";

const MAX_ATTEMPTS = 5;
const ACCENTS = ["cyan", "violet", "emerald", "amber", "rose", "blue"];

function logoText(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function accentFor(name: string) {
  const value = createHash("sha256").update(name).digest()[0] ?? 0;
  return ACCENTS[value % ACCENTS.length];
}

function investorType(name: string) {
  if (/accelerator|plug and play|y combinator|techstars/i.test(name)) return InvestorType.ACCELERATOR;
  if (/ventures?|capital|partners/i.test(name)) return InvestorType.VENTURE_CAPITAL;
  return InvestorType.CORPORATE;
}

export async function enqueueFundingCandidates(db: PrismaClient, candidates: DiscoveredCandidate[]) {
  if (!candidates.length) return 0;
  const result = await db.fundingCandidate.createMany({
    data: candidates.map((candidate) => ({
      provider: candidate.provider,
      sourceKind: candidate.sourceKind,
      externalId: candidate.externalId,
      title: candidate.title,
      sourceUrl: candidate.sourceUrl,
      publishedAt: candidate.publishedAt,
      payload: JSON.parse(JSON.stringify(candidate.payload)) as Prisma.InputJsonObject,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

async function normalizeCandidate(candidate: FundingCandidate): Promise<NormalizedFundingSignal | null> {
  if (!candidate.payload || typeof candidate.payload !== "object" || Array.isArray(candidate.payload)) return null;
  const payload = candidate.payload as Record<string, unknown>;
  if (payload.type === "sec-form-d") return parseSecFormD(payload, candidate.provider);
  if (payload.type !== "news" || !payload.article || typeof payload.article !== "object" || Array.isArray(payload.article)) return null;
  const raw = payload.article as Record<string, unknown>;
  const publishedAt = new Date(String(raw.publishedAt ?? candidate.publishedAt ?? ""));
  if (!raw.url || !raw.title || Number.isNaN(publishedAt.getTime())) return null;
  const article: NewsArticle = {
    url: String(raw.url),
    title: String(raw.title),
    publishedAt,
    domain: typeof raw.domain === "string" ? raw.domain : undefined,
    language: typeof raw.language === "string" ? raw.language : undefined,
  };
  return parseNewsFundingSignal(article, candidate.provider, typeof payload.sourceType === "string" ? payload.sourceType : "Public source feed");
}

async function importSignal(db: PrismaClient, candidate: FundingCandidate, signal: NormalizedFundingSignal) {
  const existingRound = await db.fundingRound.findFirst({
    where: { OR: [{ externalId: candidate.externalId }, { sourceUrl: signal.sourceUrl }] },
    select: { id: true },
  });
  if (existingRound) return { roundId: existingRound.id, imported: false };

  const stageText = signal.stage === CompanyStage.UNKNOWN ? "startup" : signal.stage.toLowerCase().replaceAll("_", "-");
  const tagline = signal.amountDisplay
    ? `${signal.companyName} announced ${signal.amountDisplay} ${stageText} funding.`
    : `${signal.companyName} announced a ${stageText} funding event.`;
  const tags = [signal.industry, signal.sourceType].filter((tag): tag is string => Boolean(tag));
  const startup = await db.startup.upsert({
    where: { slug: signal.slug },
    create: {
      slug: signal.slug,
      name: signal.companyName,
      tagline,
      description: signal.title,
      longDescription: signal.longDescription,
      website: signal.website,
      headquarters: signal.headquarters,
      country: signal.country,
      stage: signal.stage,
      industry: signal.industry,
      tags,
      logoText: logoText(signal.companyName),
      accent: accentFor(signal.companyName),
      verified: false,
      sourceConfidence: signal.sourceConfidence,
    },
    update: {
      name: signal.companyName,
      tagline,
      description: signal.title,
      longDescription: signal.longDescription,
      website: signal.website,
      headquarters: signal.headquarters,
      country: signal.country,
      ...(signal.stage !== CompanyStage.UNKNOWN ? { stage: signal.stage } : {}),
      industry: signal.industry,
      tags,
      sourceConfidence: signal.sourceConfidence,
    },
  });

  const duplicate = await db.fundingRound.findFirst({
    where: {
      startupId: startup.id,
      announcedAt: {
        gte: new Date(signal.announcedAt.getTime() - 4 * 24 * 60 * 60 * 1000),
        lte: new Date(signal.announcedAt.getTime() + 4 * 24 * 60 * 60 * 1000),
      },
      ...(signal.amountUsd !== null ? { amountUsd: signal.amountUsd } : { stage: signal.stage }),
    },
    select: { id: true },
  });
  if (duplicate) return { roundId: duplicate.id, imported: false };

  const round = await db.fundingRound.create({
    data: {
      startupId: startup.id,
      stage: signal.stage,
      amountUsd: signal.amountUsd,
      amountDisplay: signal.amountDisplay,
      currency: signal.currency,
      announcedAt: signal.announcedAt,
      sourceTitle: signal.title,
      sourceUrl: signal.sourceUrl,
      sourceType: signal.sourceType,
      sourceDomain: signal.sourceDomain,
      sourceProvider: signal.sourceProvider,
      externalId: candidate.externalId,
      verified: false,
      participants: signal.leadInvestor ? {
        create: [{
          isLead: true,
          investor: {
            connectOrCreate: {
              where: { name: signal.leadInvestor },
              create: { name: signal.leadInvestor, type: investorType(signal.leadInvestor) },
            },
          },
        }],
      } : undefined,
    },
    select: { id: true },
  });
  return { roundId: round.id, imported: true };
}

async function recoverStaleCandidates(db: PrismaClient) {
  return db.fundingCandidate.updateMany({
    where: { status: FundingCandidateStatus.PROCESSING, lockedAt: { lt: new Date(Date.now() - 10 * 60 * 1000) } },
    data: { status: FundingCandidateStatus.RETRY, lockedAt: null, nextAttemptAt: new Date() },
  });
}

async function claimCandidate(db: PrismaClient) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const candidate = await db.fundingCandidate.findFirst({
      where: {
        status: { in: [FundingCandidateStatus.PENDING, FundingCandidateStatus.RETRY] },
        nextAttemptAt: { lte: new Date() },
        attempts: { lt: MAX_ATTEMPTS },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "asc" }],
    });
    if (!candidate) return null;
    const claimed = await db.fundingCandidate.updateMany({
      where: { id: candidate.id, status: candidate.status, lockedAt: candidate.lockedAt },
      data: { status: FundingCandidateStatus.PROCESSING, lockedAt: new Date(), attempts: { increment: 1 } },
    });
    if (claimed.count) return db.fundingCandidate.findUnique({ where: { id: candidate.id } });
  }
  return null;
}

function retryAt(attempts: number) {
  const delays = [1, 5, 30, 120, 360];
  const minutes = delays[Math.min(Math.max(attempts - 1, 0), delays.length - 1)];
  return new Date(Date.now() + minutes * 60 * 1000);
}

export async function processFundingQueue(db: PrismaClient, limit = 24) {
  const recovered = await recoverStaleCandidates(db);
  const result = { claimed: 0, imported: 0, duplicates: 0, rejected: 0, retried: 0, dead: 0, recovered: recovered.count };
  for (let index = 0; index < limit; index += 1) {
    const candidate = await claimCandidate(db);
    if (!candidate) break;
    result.claimed += 1;
    try {
      const signal = await normalizeCandidate(candidate);
      const currentYearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
      if (!signal || !signal.slug || signal.announcedAt < currentYearStart) {
        await db.fundingCandidate.update({
          where: { id: candidate.id },
          data: { status: FundingCandidateStatus.REJECTED, processedAt: new Date(), lockedAt: null, lastError: "Not a current-year startup funding signal." },
        });
        result.rejected += 1;
        continue;
      }
      const imported = await importSignal(db, candidate, signal);
      await db.fundingCandidate.update({
        where: { id: candidate.id },
        data: { status: FundingCandidateStatus.SUCCEEDED, processedAt: new Date(), lockedAt: null, lastError: null, fundingRoundId: imported.roundId },
      });
      if (imported.imported) result.imported += 1;
      else result.duplicates += 1;
    } catch (error) {
      const message = (error instanceof Error ? error.message : "Unknown candidate processing error").slice(0, 4_000);
      const dead = candidate.attempts >= MAX_ATTEMPTS;
      await db.fundingCandidate.update({
        where: { id: candidate.id },
        data: {
          status: dead ? FundingCandidateStatus.DEAD : FundingCandidateStatus.RETRY,
          nextAttemptAt: dead ? candidate.nextAttemptAt : retryAt(candidate.attempts),
          lockedAt: null,
          lastError: message,
          processedAt: dead ? new Date() : null,
        },
      });
      if (dead) result.dead += 1;
      else result.retried += 1;
    }
  }
  return result;
}
