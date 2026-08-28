import { XMLParser } from "fast-xml-parser";
import { FundingSourceKind } from "@/generated/prisma/client";
import { hasFundingLanguage } from "@/lib/funding/news-parser";
import type { DiscoveredCandidate, SourceAdapter } from "@/lib/funding/types";
import { asArray, asText, canonicalUrl, fetchText, stableId } from "@/lib/funding/utils";

type FeedConfig = {
  key: string;
  label: string;
  url: string;
  kind: FundingSourceKind;
};

const DEFAULT_FEEDS: FeedConfig[] = [
  {
    key: "globenewswire-financing",
    label: "GlobeNewswire financing agreements",
    url: "https://www.globenewswire.com/RssFeed/subjectcode/17-Financing%20Agreements/feedTitle/GlobeNewswire%20-%20Financing%20Agreements",
    kind: FundingSourceKind.PRESS_RELEASE,
  },
  {
    key: "globenewswire-press-releases",
    label: "GlobeNewswire press releases",
    url: "https://www.globenewswire.com/RssFeed/subjectcode/72-Press%20Releases/feedTitle/GlobeNewswire%20-%20Press%20Releases",
    kind: FundingSourceKind.PRESS_RELEASE,
  },
];

function configuredFeeds() {
  const raw = process.env.FUNDING_RSS_FEEDS;
  if (!raw) return DEFAULT_FEEDS;
  try {
    const parsed = JSON.parse(raw) as Array<Partial<FeedConfig> & { kind?: string }>;
    const additions = parsed.flatMap((feed): FeedConfig[] => {
      if (!feed.key || !feed.label || !feed.url) return [];
      if (!Object.values(FundingSourceKind).includes(feed.kind as FundingSourceKind)) return [];
      return [{ key: feed.key, label: feed.label, url: feed.url, kind: feed.kind as FundingSourceKind }];
    });
    return [...DEFAULT_FEEDS, ...additions];
  } catch {
    return DEFAULT_FEEDS;
  }
}

function linkValue(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return linkValue(value.find((item) => item && typeof item === "object" && (item as Record<string, unknown>)["@_rel"] !== "self") ?? value[0]);
  if (value && typeof value === "object") return asText((value as Record<string, unknown>)["@_href"] ?? (value as Record<string, unknown>)["#text"]);
  return undefined;
}

function parseFeed(xml: string, feed: FeedConfig): DiscoveredCandidate[] {
  const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, trimValues: true });
  const document = parser.parse(xml) as Record<string, unknown>;
  const rss = document.rss as { channel?: { item?: unknown } } | undefined;
  const atom = document.feed as { entry?: unknown } | undefined;
  const entries = rss?.channel ? asArray(rss.channel.item) : asArray(atom?.entry);

  return entries.flatMap((raw): DiscoveredCandidate[] => {
    if (!raw || typeof raw !== "object") return [];
    const entry = raw as Record<string, unknown>;
    const title = asText(entry.title);
    const urlValue = linkValue(entry.link);
    if (!title || !urlValue || !hasFundingLanguage(title)) return [];
    let url: string;
    try {
      url = canonicalUrl(urlValue);
    } catch {
      return [];
    }
    const dateText = asText(entry.pubDate ?? entry.published ?? entry.updated ?? entry.date);
    const parsedDate = dateText ? new Date(dateText) : new Date();
    const publishedAt = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    const guid = asText(entry.guid ?? entry.id) ?? url;
    return [{
      provider: feed.label,
      sourceKind: feed.kind,
      externalId: stableId(feed.key, guid),
      title,
      sourceUrl: url,
      publishedAt,
      payload: {
        type: "news",
        article: { url, title, publishedAt: publishedAt.toISOString() },
        sourceType: feed.kind === FundingSourceKind.PRESS_RELEASE ? "Public press release feed" : "Official public RSS/Atom feed",
        feedKey: feed.key,
      },
    }];
  });
}

export function publicFeedAdapter(): SourceAdapter {
  return {
    key: "public-feeds",
    label: "Official and public funding feeds",
    kind: FundingSourceKind.RSS,
    configured: true,
    async discover({ now }) {
      const feeds = configuredFeeds();
      const results = await Promise.allSettled(feeds.map(async (feed) => parseFeed(await fetchText(feed.url, {
        timeoutMs: 15_000,
        headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml", "User-Agent": "RaiseFundingRadar/2.0" },
      }), feed)));
      const discovered = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
      const failures = results.flatMap((result, index) => result.status === "rejected" ? [`${feeds[index].label}: ${result.reason instanceof Error ? result.reason.message : "failed"}`] : []);
      if (failures.length === feeds.length) throw new Error(failures.join("; "));
      return {
        discovered,
        nextCursor: { checkedAt: now.toISOString() },
        note: failures.length ? `Partial feed failures: ${failures.join("; ")}` : `${feeds.length} feeds checked`,
      };
    },
  };
}
