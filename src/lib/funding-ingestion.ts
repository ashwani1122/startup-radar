import { createHash } from "node:crypto";
import { get as httpsGet } from "node:https";
import { z } from "zod";
import { CompanyStage, InvestorType, SyncStatus, type PrismaClient } from "@/generated/prisma/client";

const GDELT_PROVIDER = "GDELT DOC 2.0";
const SYNC_COOLDOWN_MS = 15 * 60 * 1000;
const LEGACY_DEMO_SLUGS = ["luma-grid", "pactnote", "kivu-health", "faro-robotics", "sunu-pay", "mira-materials"];
const ACCENTS = ["cyan", "violet", "emerald", "amber", "rose", "blue"];
const DEFAULT_FUNDING_QUERY = '("startup funding" OR "seed funding" OR "raises funding" OR "secures funding" OR "funding round") sourcelang:english';

export const HISTORICAL_FUNDING_QUERIES = [
  { key: "startup-funding", query: '"startup funding" sourcelang:english' },
  { key: "funding-round", query: '"funding round" sourcelang:english' },
  { key: "raises-million", query: '"raises million" sourcelang:english' },
  { key: "secures-million", query: '"secures million" sourcelang:english' },
  { key: "raises-seed", query: '"raises seed" sourcelang:english' },
  { key: "raises-series-a", query: '"raises Series A" sourcelang:english' },
  { key: "raises-series-b", query: '"raises Series B" sourcelang:english' },
  { key: "closes-seed", query: '"closes seed round" sourcelang:english' },
] as const;

const gdeltResponseSchema = z.object({
  articles: z.array(z.object({
    url: z.string().url(),
    title: z.string().min(3),
    seendate: z.string(),
    domain: z.string().optional(),
  })),
});

type FundingSignal = {
  companyName: string;
  slug: string;
  title: string;
  sourceUrl: string;
  sourceDomain: string;
  announcedAt: Date;
  stage: CompanyStage;
  amountUsd: number | null;
  amountDisplay: string | null;
  currency: string;
  industry?: string;
  leadInvestor?: string;
};

type SyncOptions = {
  force?: boolean;
  startDate?: Date;
  endDate?: Date;
  syncProvider?: string;
  query?: string;
  maxRecords?: number;
};

export type FundingSyncResult = {
  discovered: number;
  accepted: number;
  imported: number;
  removedDemoRecords: number;
  removedRejectedRecords: number;
  skippedByCooldown: boolean;
};

function stableId(prefix: string, value: string) {
  return `${prefix}:${createHash("sha256").update(value).digest("hex")}`;
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

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

function canonicalUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|ref$|source$|campaign$)/i.test(key)) url.searchParams.delete(key);
  }
  return url.toString();
}

function parseGdeltDate(value: string) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) return null;
  const result = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`);
  return Number.isNaN(result.getTime()) ? null : result;
}

function inferStage(title: string) {
  if (/\bpre[ -]?seed\b/i.test(title)) return CompanyStage.PRE_SEED;
  if (/\bseries\s+a\b/i.test(title)) return CompanyStage.SERIES_A;
  if (/\bseries\s+b\b/i.test(title)) return CompanyStage.SERIES_B;
  if (/\bseries\s+c\b/i.test(title)) return CompanyStage.SERIES_C;
  if (/\bseries\s+[d-z]\b/i.test(title)) return CompanyStage.GROWTH;
  if (/\bseed\b/i.test(title)) return CompanyStage.SEED;
  if (/\bgrowth\b/i.test(title)) return CompanyStage.GROWTH;
  return CompanyStage.UNKNOWN;
}

function inferIndustry(title: string) {
  const values: Array<[RegExp, string]> = [
    [/\b(web3|blockchain|crypto(?:currency)?|defi|decentralized|tokenization)\b/i, "Web3 & Blockchain"],
    [/\b(semiconductors?|chips?|hardware|electronics|sensors?|internet of things|iot)\b/i, "Hardware & Semiconductors"],
    [/\b(data science|data platform|analytics|database|business intelligence|big data)\b/i, "Data & Analytics"],
    [/\b(devtools?|developer tools?|api platform|cloud infrastructure|observability)\b/i, "Developer Tools"],
    [/\b(cybersecurity|cyber security|identity security|fraud detection|security detection|security platform|security)\b/i, "Cybersecurity"],
    [/\b(insurtech|insurance)\b/i, "Insurtech"],
    [/\b(fintech|banking|lending|payments?|wealthtech)\b/i, "Fintech"],
    [/\b(biotech|biotechnology|therapeutics?|drug discovery|life sciences?)\b/i, "Biotech"],
    [/\b(healthtech|healthcare|medical|clinic|digital health|health systems?|patient intake)\b/i, "Healthtech"],
    [/\b(climate|carbon|clean energy|battery|solar|sustainability)\b/i, "Climate & Energy"],
    [/\b(robotics?|automation|autonomous systems?)\b/i, "Robotics & Automation"],
    [/\b(space|satellite|aerospace)\b/i, "Space Technology"],
    [/\b(edtech|education|learning platform)\b/i, "Education"],
    [/\b(e-?commerce|retailtech|shopping)\b/i, "Commerce & Retail"],
    [/\b(proptech|real estate|property technology)\b/i, "Real Estate & Proptech"],
    [/\b(agritech|agriculture|foodtech|food technology|qsr|restaurant)\b/i, "Agriculture & Food"],
    [/\b(mobility|automotive|electric vehicles?|ev charging)\b/i, "Mobility & Automotive"],
    [/\b(logistics|supply chain|freight|shipping)\b/i, "Logistics & Supply Chain"],
    [/\b(gaming|games?|esports|casino)\b/i, "Gaming"],
    [/\b(media|creator economy|streaming|entertainment|live events?)\b/i, "Media & Creator Economy"],
    [/\b(hrtech|human resources|workforce|future of work|recruiting)\b/i, "HR & Future of Work"],
    [/\b(legaltech|legal technology|compliance)\b/i, "Legal & Compliance"],
    [/\b(traveltech|travel|hospitality|hotel)\b/i, "Travel & Hospitality"],
    [/\b(defen[cs]e|military|dual-use)\b/i, "Defense Technology"],
    [/\b(telecom|telecommunications|5g|connectivity|networking)\b/i, "Telecommunications"],
    [/\b(quantum)\b/i, "Quantum Computing"],
    [/\b(construction|contech|building technology)\b/i, "Construction Technology"],
    [/\b(manufacturing|industrial technology|industry 4\.0)\b/i, "Industrial & Manufacturing"],
    [/\b(saas|software as a service|enterprise software)\b/i, "SaaS"],
    [/\b(ai|artificial intelligence|machine learning|generative ai|large language model|llm)\b/i, "Artificial Intelligence"],
    [/\b(marketplace|consumer app|consumer technology)\b/i, "Consumer & Marketplace"],
  ];
  return values.find(([pattern]) => pattern.test(title))?.[1];
}

function parseAmount(value: string) {
  const match = value.match(/(?:US\$|USD\s*|\$|\u20ac|\u00a3|\u20b9)\s*\d+(?:[.,]\d+)?\s*(?:K|M|B|BN|million|billion|crore|lakh)?/i);
  if (!match) return { amountUsd: null, amountDisplay: null, currency: "USD" };

  const amountDisplay = match[0].replace(/\s+/g, " ").trim();
  const currency = /\u20ac/.test(amountDisplay) ? "EUR" : /\u00a3/.test(amountDisplay) ? "GBP" : /\u20b9/.test(amountDisplay) ? "INR" : "USD";
  if (currency !== "USD") return { amountUsd: null, amountDisplay, currency };

  const numeric = Number(amountDisplay.replace(/(?:US\$|USD|\$)/gi, "").replace(/,/g, "").match(/\d+(?:\.\d+)?/)?.[0]);
  if (!Number.isFinite(numeric)) return { amountUsd: null, amountDisplay, currency };
  const multiplier = /(?:\bbn\b|billion|\d\s*b\b)/i.test(amountDisplay)
    ? 1_000_000_000
    : /(?:million|\d\s*m\b)/i.test(amountDisplay)
      ? 1_000_000
      : /(?:\d\s*k\b)/i.test(amountDisplay)
        ? 1_000
        : 1;
  return { amountUsd: Math.round(numeric * multiplier), amountDisplay, currency };
}

function parseFundingSignal(article: z.infer<typeof gdeltResponseSchema>["articles"][number]): FundingSignal | null {
  const title = article.title.replace(/\s+/g, " ").trim();
  const verb = /\b(raises?|raised|secures?|secured|closes?|closed|lands?|landed|bags?|bagged|nabs?|nabbed|receives?|received|gets?|got|wins?|won)\b/i.exec(title);
  if (verb?.index === undefined) return null;

  const beforeVerb = title.slice(0, verb.index);
  if (/\b(talks?|seeks?|plans?|aims?|could|may)\b/i.test(beforeVerb)) return null;

  let companyName = beforeVerb
    .replace(/^(?:exclusive|breaking|report)\s*[:|-]\s*/i, "")
    .replace(/^(?:IT News Online|PR Newswire|GlobeNewswire|Business Wire)\s*[-:|]\s*/i, "")
    .replace(/^IPO\s*-\s*bound\s+/i, "")
    .replace(/^(?:(?:african|american|british|european|indian|nigerian|swedish|dutch)\s+)?(?:(?:ai|fintech|healthtech|climate|defense|robotics)\s+)?startup\s+/i, "")
    .replace(/^(?:live events platform|qsr chain)\s+/i, "")
    .split(/\s+[|:]\s+/).at(-1)?.trim()
    .replace(/^["'\u201c\u201d]|["'\u201c\u201d]$/g, "") ?? "";

  companyName = companyName.replace(/\s+-\s+$/, "").trim();
  if (companyName.length < 2 || companyName.length > 80 || companyName.split(/\s+/).length > 9) return null;
  if (/\b(fund|funding round|venture capital firm|vc firm|holdings?|bank|government|university|college)\b/i.test(companyName)) return null;
  if (/^(how|why|what|this|the latest)$/i.test(companyName)) return null;

  const rest = title.slice(verb.index + verb[0].length);
  const stage = inferStage(title);
  const amount = parseAmount(rest);
  const explicitFundingContext = /\b(funding|financing|investment|round|capital)\b/i.test(rest);
  const hasFundingContext = stage !== CompanyStage.UNKNOWN || explicitFundingContext;
  if (!hasFundingContext || (!amount.amountDisplay && !/\bundisclosed\b/i.test(rest) && !explicitFundingContext)) return null;
  if (/\bvaluation\b/i.test(rest) && !/\b(round|funding|financing)\b/i.test(rest)) return null;
  if (stage === CompanyStage.UNKNOWN && /\b(acquir(?:e|es|ed|ing)|acquisition|assets?|credit facility|debt|loan|refinancing)\b/i.test(rest)) return null;

  const announcedAt = parseGdeltDate(article.seendate);
  if (!announcedAt) return null;
  const sourceUrl = canonicalUrl(article.url);
  const sourceDomain = article.domain ?? new URL(sourceUrl).hostname.replace(/^www\./, "");
  const leadInvestor = (
    title.match(/\bled by\s+([^,.;]+?)(?=\s+(?:with|and)\s+participation|$)/i)?.[1]
    ?? title.match(/\bfunding from\s+([^,.;]+?)(?=$|\s+(?:with|and)\s+)/i)?.[1]
    ?? title.match(/\bin\s+([A-Z][\w&.' -]{1,60}?)\s*-\s*led\s+series\b/)?.[1]
  )?.trim();

  return {
    companyName,
    slug: slugify(companyName),
    title,
    sourceUrl,
    sourceDomain,
    announcedAt,
    stage,
    amountUsd: amount.amountUsd,
    amountDisplay: amount.amountDisplay,
    currency: amount.currency,
    industry: inferIndustry(title),
    leadInvestor: leadInvestor && leadInvestor.length <= 80 ? leadInvestor : undefined,
  };
}

export async function removeDemoStartups(db: PrismaClient) {
  const result = await db.startup.deleteMany({ where: { slug: { in: LEGACY_DEMO_SLUGS } } });
  await db.investor.deleteMany({ where: { rounds: { none: {} } } });
  return result.count;
}

async function removeRejectedGdeltRecords(db: PrismaClient) {
  const rounds = await db.fundingRound.findMany({
    where: { sourceProvider: GDELT_PROVIDER },
    select: { id: true, startupId: true, sourceUrl: true, sourceTitle: true, sourceDomain: true, announcedAt: true },
  });
  const parsed = rounds.map((round) => {
    const timestamp = round.announcedAt.toISOString().replace(/[-:.]/g, "");
    const seendate = `${timestamp.slice(0, 8)}T${timestamp.slice(9, 15)}Z`;
    const signal = parseFundingSignal({ url: round.sourceUrl, title: round.sourceTitle, domain: round.sourceDomain ?? undefined, seendate });
    return { round, signal };
  });
  const rejectedIds = parsed.flatMap(({ round, signal }) => signal ? [] : [round.id]);

  const removed = rejectedIds.length
    ? await db.fundingRound.deleteMany({ where: { id: { in: rejectedIds } } })
    : { count: 0 };

  for (const { round, signal } of parsed) {
    if (!signal) continue;
    const current = await db.startup.findUnique({ where: { id: round.startupId } });
    if (!current) continue;
    const canonical = await db.startup.findUnique({ where: { slug: signal.slug } });
    if (canonical && canonical.id !== current.id) {
      const duplicate = await db.fundingRound.findFirst({
        where: {
          id: { not: round.id },
          startupId: canonical.id,
          stage: signal.stage,
          announcedAt: {
            gte: new Date(signal.announcedAt.getTime() - 4 * 24 * 60 * 60 * 1000),
            lte: new Date(signal.announcedAt.getTime() + 4 * 24 * 60 * 60 * 1000),
          },
          ...(signal.amountUsd !== null ? { amountUsd: signal.amountUsd } : {}),
        },
      });
      if (duplicate) await db.fundingRound.delete({ where: { id: round.id } });
      else await db.fundingRound.update({ where: { id: round.id }, data: { startupId: canonical.id, stage: signal.stage } });
      continue;
    }

    const stageText = signal.stage === CompanyStage.UNKNOWN ? "startup" : signal.stage.toLowerCase().replaceAll("_", "-");
    await db.startup.update({
      where: { id: current.id },
      data: {
        slug: signal.slug,
        name: signal.companyName,
        tagline: `${signal.companyName} announced ${signal.amountDisplay ?? "undisclosed"} ${stageText} funding.`,
        description: signal.title,
        stage: signal.stage,
        industry: signal.industry,
        tags: [signal.industry, "Public funding report"].filter((tag): tag is string => Boolean(tag)),
        logoText: logoText(signal.companyName),
      },
    });
    await db.fundingRound.update({ where: { id: round.id }, data: { stage: signal.stage } });
  }

  await db.startup.deleteMany({ where: { rounds: { none: {} }, savedBy: { none: {} }, messages: { none: {} } } });
  await db.investor.deleteMany({ where: { rounds: { none: {} } } });
  return removed.count;
}

async function recoverStaleFundingSyncs(db: PrismaClient) {
  return db.fundingSync.updateMany({
    where: { status: SyncStatus.RUNNING, startedAt: { lt: new Date(Date.now() - 10 * 60 * 1000) } },
    data: { status: SyncStatus.FAILED, error: "The sync ended before it could report a result.", completedAt: new Date() },
  });
}

export async function reviewStoredFunding(db: PrismaClient) {
  const recoveredSyncs = await recoverStaleFundingSyncs(db);
  return {
    recoveredSyncs: recoveredSyncs.count,
    removedDemoRecords: await removeDemoStartups(db),
    removedRejectedRecords: await removeRejectedGdeltRecords(db),
  };
}

function gdeltDate(value: Date) {
  return value.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
}

export async function fetchGdeltArticles(options: SyncOptions = {}) {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", options.query ?? DEFAULT_FUNDING_QUERY);
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("maxrecords", String(options.maxRecords ?? 50));
  url.searchParams.set("sort", "datedesc");
  url.searchParams.set("format", "json");
  if (options.startDate && options.endDate) {
    url.searchParams.set("startdatetime", gdeltDate(options.startDate));
    url.searchParams.set("enddatetime", gdeltDate(options.endDate));
  } else {
    url.searchParams.set("timespan", "2d");
  }

  const { status, text } = await new Promise<{ status: number; text: string }>((resolve, reject) => {
    const request = httpsGet(url, {
      family: 4,
      headers: { Accept: "application/json", "User-Agent": "RaiseFundingRadar/1.0" },
      timeout: 50_000,
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => {
        clearTimeout(deadline);
        resolve({ status: response.statusCode ?? 500, text: Buffer.concat(chunks).toString("utf8") });
      });
    });
    const deadline = setTimeout(() => request.destroy(new Error("GDELT request timed out.")), 45_000);
    request.on("timeout", () => request.destroy(new Error("GDELT request timed out.")));
    request.on("error", (error) => {
      clearTimeout(deadline);
      reject(error);
    });
  });
  if (status < 200 || status >= 300) throw new Error(`GDELT request failed with ${status}.`);

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`GDELT returned a non-JSON response: ${text.slice(0, 160)}`);
  }
  return gdeltResponseSchema.parse(payload).articles;
}

async function importGdeltSignal(db: PrismaClient, signal: FundingSignal) {
  if (!signal.slug) return false;
  const externalId = stableId("gdelt", signal.sourceUrl);
  const existingRound = await db.fundingRound.findFirst({ where: { OR: [{ externalId }, { sourceUrl: signal.sourceUrl }] } });
  if (existingRound) return false;

  const stageText = signal.stage === CompanyStage.UNKNOWN ? "startup" : signal.stage.toLowerCase().replaceAll("_", "-");
  const tagline = `${signal.companyName} announced ${signal.amountDisplay ?? "undisclosed"} ${stageText} funding.`;
  const tags = [signal.industry, "Public funding report"].filter((tag): tag is string => Boolean(tag));
  const startup = await db.startup.upsert({
    where: { slug: signal.slug },
    create: {
      slug: signal.slug,
      name: signal.companyName,
      tagline,
      description: signal.title,
      longDescription: "This profile was created automatically from a public funding report indexed by GDELT. Details not stated by the cited report are left unfilled.",
      stage: signal.stage,
      industry: signal.industry,
      tags,
      logoText: logoText(signal.companyName),
      accent: accentFor(signal.companyName),
      verified: false,
      sourceConfidence: signal.amountDisplay && signal.stage !== CompanyStage.UNKNOWN ? 82 : 70,
    },
    update: {
      name: signal.companyName,
      tagline,
      description: signal.title,
      stage: signal.stage,
      industry: signal.industry,
      tags,
      sourceConfidence: signal.amountDisplay && signal.stage !== CompanyStage.UNKNOWN ? 82 : 70,
    },
  });

  const windowStart = new Date(signal.announcedAt.getTime() - 4 * 24 * 60 * 60 * 1000);
  const windowEnd = new Date(signal.announcedAt.getTime() + 4 * 24 * 60 * 60 * 1000);
  const duplicate = await db.fundingRound.findFirst({
    where: {
      startupId: startup.id,
      stage: signal.stage,
      announcedAt: { gte: windowStart, lte: windowEnd },
      ...(signal.amountUsd !== null ? { amountUsd: signal.amountUsd } : {}),
    },
  });
  if (duplicate) return false;

  await db.fundingRound.create({
    data: {
      startupId: startup.id,
      stage: signal.stage,
      amountUsd: signal.amountUsd,
      amountDisplay: signal.amountDisplay,
      currency: signal.currency,
      announcedAt: signal.announcedAt,
      sourceTitle: signal.title,
      sourceUrl: signal.sourceUrl,
      sourceType: "Public news report via GDELT",
      sourceDomain: signal.sourceDomain,
      sourceProvider: GDELT_PROVIDER,
      externalId,
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
  });
  return true;
}

export async function syncPublicFunding(db: PrismaClient, options: SyncOptions = {}): Promise<FundingSyncResult> {
  const syncProvider = options.syncProvider ?? GDELT_PROVIDER;
  await recoverStaleFundingSyncs(db);
  const removedDemoRecords = await removeDemoStartups(db);
  const removedRejectedRecords = 0;
  const latestSync = await db.fundingSync.findFirst({ where: { provider: syncProvider }, orderBy: { startedAt: "desc" } });
  if (!options.force && latestSync && Date.now() - latestSync.startedAt.getTime() < SYNC_COOLDOWN_MS) {
    return { discovered: latestSync.discovered, accepted: latestSync.accepted, imported: 0, removedDemoRecords, removedRejectedRecords, skippedByCooldown: true };
  }

  const sync = await db.fundingSync.create({ data: { provider: syncProvider, status: SyncStatus.RUNNING } });
  try {
    const articles = await fetchGdeltArticles(options);
    const seen = new Set<string>();
    const oldestAllowed = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
    const signals = articles.flatMap((article) => {
      const signal = parseFundingSignal(article);
      if (!signal || signal.announcedAt < oldestAllowed || seen.has(signal.sourceUrl)) return [];
      seen.add(signal.sourceUrl);
      return [signal];
    });

    let imported = 0;
    for (const signal of signals) {
      if (await importGdeltSignal(db, signal)) imported += 1;
    }

    await db.fundingSync.update({
      where: { id: sync.id },
      data: { status: SyncStatus.SUCCEEDED, discovered: articles.length, accepted: signals.length, imported, completedAt: new Date() },
    });
    return { discovered: articles.length, accepted: signals.length, imported, removedDemoRecords, removedRejectedRecords, skippedByCooldown: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown funding sync error";
    try {
      await db.fundingSync.update({ where: { id: sync.id }, data: { status: SyncStatus.FAILED, error: message, completedAt: new Date() } });
    } catch (statusError) {
      console.error("Unable to persist the failed funding-sync status.", statusError);
    }
    throw error;
  }
}

export async function syncNextHistoricalSlice(db: PrismaClient) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const currentQuarter = Math.floor(now.getUTCMonth() / 3);

  for (let quarter = 0; quarter <= currentQuarter; quarter += 1) {
    const startDate = new Date(Date.UTC(year, quarter * 3, 1));
    const quarterEnd = new Date(Date.UTC(year, quarter * 3 + 3, 1));
    const endDate = quarterEnd < now ? quarterEnd : now;

    for (const search of HISTORICAL_FUNDING_QUERIES) {
      const window = `${year}-Q${quarter + 1}:${search.key}`;
      const syncProvider = `${GDELT_PROVIDER}:backfill:${window}`;
      const completed = await db.fundingSync.findFirst({ where: { provider: syncProvider, status: SyncStatus.SUCCEEDED } });
      if (!completed) {
        return {
          complete: false,
          window,
          result: await syncPublicFunding(db, { force: true, startDate, endDate, syncProvider, query: search.query, maxRecords: 40 }),
        };
      }
    }
  }

  return { complete: true, window: null, result: null };
}
