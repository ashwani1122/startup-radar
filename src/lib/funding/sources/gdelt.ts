import { FundingSourceKind } from "@/generated/prisma/client";
import { hasFundingLanguage } from "@/lib/funding/news-parser";
import type { DiscoveredCandidate, SourceAdapter } from "@/lib/funding/types";
import { canonicalUrl, stableId } from "@/lib/funding/utils";
import { z } from "zod";

const GDELT_PROVIDER = "GDELT DOC 2.0";
const GDELT_PROFILES = [
  {
    key: "english-global",
    query: '("raises funding" OR "raised funding" OR "secures funding" OR "seed round" OR "Series A" OR "pre-seed funding") sourcelang:english',
  },
  {
    key: "english-emerging-markets",
    query: '("raises funding" OR "raised funding" OR "secures funding" OR "seed round") (startup OR fintech OR healthtech OR SaaS) sourcelang:english',
  },
  {
    key: "spanish",
    query: '("ronda de financiación" OR "recauda inversión" OR "capta inversión" OR "cierra ronda") sourcelang:spanish',
  },
  {
    key: "french",
    query: '("levée de fonds" OR "tour de table" OR "lève des fonds" OR "boucle un tour") sourcelang:french',
  },
  {
    key: "german",
    query: '("Finanzierungsrunde" OR "sammelt Kapital" OR "sichert Finanzierung") sourcelang:german',
  },
  {
    key: "portuguese",
    query: '("rodada de investimento" OR "capta investimento" OR "fecha rodada") sourcelang:portuguese',
  },
] as const;

const responseSchema = z.object({
  articles: z.array(z.object({
    url: z.string().url(),
    title: z.string().min(3),
    seendate: z.string(),
    domain: z.string().optional(),
    language: z.string().optional(),
  })).default([]),
});

function gdeltDate(value: Date) {
  return value.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
}

function parseGdeltDate(value: string) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) return null;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function fetchArticles(query: string, startDate: Date, endDate: Date, maxRecords: number) {
  let text: string | undefined;
  let lastError: unknown;
  for (const origin of ["https://api.gdeltproject.org", "http://api.gdeltproject.org"]) {
    const url = new URL("/api/v2/doc/doc", origin);
    url.searchParams.set("query", query);
    url.searchParams.set("mode", "artlist");
    url.searchParams.set("maxrecords", String(maxRecords));
    url.searchParams.set("sort", "datedesc");
    url.searchParams.set("format", "json");
    url.searchParams.set("startdatetime", gdeltDate(startDate));
    url.searchParams.set("enddatetime", gdeltDate(endDate));
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "RaiseFundingRadar/2.0" },
        signal: AbortSignal.timeout(22_000),
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`GDELT returned ${response.status}.`);
      text = await response.text();
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (text === undefined) throw lastError instanceof Error ? lastError : new Error("GDELT could not be reached.");
  try {
    return responseSchema.parse(JSON.parse(text)).articles;
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`GDELT returned non-JSON content: ${text.slice(0, 120)}`);
    throw error;
  }
}

function toCandidates(articles: Awaited<ReturnType<typeof fetchArticles>>) {
  return articles.flatMap((article): DiscoveredCandidate[] => {
    const publishedAt = parseGdeltDate(article.seendate);
    // GDELT searches the full article body. Keep the durable queue focused on
    // reports whose headline itself states a funding event.
    if (!publishedAt || !hasFundingLanguage(article.title)) return [];
    const url = canonicalUrl(article.url);
    return [{
      provider: GDELT_PROVIDER,
      sourceKind: FundingSourceKind.NEWS,
      externalId: stableId("gdelt", url),
      title: article.title,
      sourceUrl: url,
      publishedAt,
      payload: {
        type: "news",
        article: { url, title: article.title, publishedAt: publishedAt.toISOString(), domain: article.domain, language: article.language },
        sourceType: "Public news report via GDELT",
      },
    }];
  });
}

export function gdeltLiveAdapter(): SourceAdapter {
  return {
    key: "gdelt-live",
    label: "GDELT global news",
    kind: FundingSourceKind.NEWS,
    configured: true,
    async discover({ cursor, now }) {
      const profileIndex = typeof cursor?.profileIndex === "number" ? cursor.profileIndex % GDELT_PROFILES.length : 0;
      const profile = GDELT_PROFILES[profileIndex];
      const articles = await fetchArticles(profile.query, new Date(now.getTime() - 4 * 60 * 60 * 1000), now, 100);
      return {
        discovered: toCandidates(articles),
        nextCursor: { profileIndex: (profileIndex + 1) % GDELT_PROFILES.length, profile: profile.key, checkedAt: now.toISOString() },
        note: `${profile.key}; rolling four-hour window`,
      };
    },
  };
}

export function gdeltBackfillAdapter(): SourceAdapter {
  return {
    key: "gdelt-backfill",
    label: "GDELT current-year backfill",
    kind: FundingSourceKind.NEWS,
    configured: true,
    async discover({ cursor, now }) {
      const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      const cursorStart = typeof cursor?.windowStart === "string" ? new Date(cursor.windowStart) : yearStart;
      const windowStart = Number.isNaN(cursorStart.getTime()) || cursorStart < yearStart ? yearStart : cursorStart;
      if (windowStart >= now) return { discovered: [], nextCursor: { windowStart: now.toISOString(), profileIndex: 0, complete: true }, note: "Current-year backfill caught up" };

      const profileIndex = typeof cursor?.profileIndex === "number" ? cursor.profileIndex % GDELT_PROFILES.length : 0;
      const profile = GDELT_PROFILES[profileIndex];
      const windowEnd = new Date(Math.min(windowStart.getTime() + 12 * 60 * 60 * 1000, now.getTime()));
      const articles = await fetchArticles(profile.query, windowStart, windowEnd, 250);
      const nextProfile = profileIndex + 1;
      const advanceWindow = nextProfile >= GDELT_PROFILES.length;
      return {
        discovered: toCandidates(articles),
        nextCursor: {
          windowStart: (advanceWindow ? windowEnd : windowStart).toISOString(),
          profileIndex: advanceWindow ? 0 : nextProfile,
          profile: profile.key,
        },
        note: `${profile.key}; ${windowStart.toISOString()} to ${windowEnd.toISOString()}`,
      };
    },
  };
}
