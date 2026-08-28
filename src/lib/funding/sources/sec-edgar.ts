import { XMLParser } from "fast-xml-parser";
import { CompanyStage, FundingSourceKind } from "@/generated/prisma/client";
import type { DiscoveredCandidate, NormalizedFundingSignal, SourceAdapter } from "@/lib/funding/types";
import { asArray, asText, fetchText, slugify, stableId } from "@/lib/funding/utils";

const SEC_PROVIDER = "SEC EDGAR Form D";
const SEC_BASE = "https://www.sec.gov";

function secUserAgent() {
  return process.env.SEC_USER_AGENT?.trim();
}

function secHeaders() {
  const userAgent = secUserAgent();
  if (!userAgent) throw new Error("SEC_USER_AGENT must contain an application name and contact email.");
  return { Accept: "application/atom+xml, application/xml, text/plain", "User-Agent": userAgent };
}

function toDate(value: unknown, fallback: Date) {
  const text = asText(value);
  if (!text) return fallback;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function secQuarter(value: Date) {
  return Math.floor(value.getUTCMonth() / 3) + 1;
}

function filingCandidatesFromIndex(text: string) {
  return text.split(/\r?\n/).flatMap((line): DiscoveredCandidate[] => {
    const [cik, companyName, formType, filedAtText, filename] = line.split("|");
    if (formType !== "D" || !cik || !companyName || !filedAtText || !filename) return [];
    const sourceUrl = `${SEC_BASE}/Archives/${filename}`;
    const filedAt = new Date(`${filedAtText}T12:00:00Z`);
    return [{
      provider: SEC_PROVIDER,
      sourceKind: FundingSourceKind.SEC_FORM_D,
      externalId: stableId("sec-form-d", filename),
      title: `SEC Form D — ${companyName}`,
      sourceUrl,
      publishedAt: filedAt,
      payload: { type: "sec-form-d", sourceUrl, companyName, cik, filedAt: filedAt.toISOString() },
    }];
  });
}

export function secBackfillAdapter(): SourceAdapter {
  const configured = Boolean(secUserAgent());
  return {
    key: "sec-form-d-backfill",
    label: "SEC Form D current-year index",
    kind: FundingSourceKind.SEC_FORM_D,
    configured,
    configurationNote: configured ? undefined : "Set SEC_USER_AGENT to an application name and monitored contact email.",
    async discover({ cursor, now }) {
      const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      const parsedCursor = typeof cursor?.date === "string" ? new Date(`${cursor.date}T00:00:00Z`) : yearStart;
      const date = Number.isNaN(parsedCursor.getTime()) || parsedCursor < yearStart ? yearStart : parsedCursor;
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      if (date >= today) return { discovered: [], nextCursor: { date: dateKey(today), complete: true }, note: "SEC daily-index backfill caught up" };

      const compact = dateKey(date).replaceAll("-", "");
      const url = `${SEC_BASE}/Archives/edgar/daily-index/${date.getUTCFullYear()}/QTR${secQuarter(date)}/master.${compact}.idx`;
      const response = await fetch(url, { headers: secHeaders(), signal: AbortSignal.timeout(18_000), cache: "no-store" });
      const nextDate = addDays(date, 1);
      if (response.status === 404) return { discovered: [], nextCursor: { date: dateKey(nextDate) }, note: `${dateKey(date)} has no SEC filing index` };
      if (!response.ok) throw new Error(`SEC daily index returned ${response.status}.`);
      const discovered = filingCandidatesFromIndex(await response.text());
      return { discovered, nextCursor: { date: dateKey(nextDate) }, note: `${dateKey(date)}; ${discovered.length} initial Form D filings` };
    },
  };
}
function atomLink(value: unknown) {
  return asArray(value).map((link) => link && typeof link === "object" ? asText((link as Record<string, unknown>)["@_href"]) : asText(link)).find(Boolean);
}

export function secLiveAdapter(): SourceAdapter {
  const configured = Boolean(secUserAgent());
  return {
    key: "sec-form-d-live",
    label: "SEC Form D latest filings",
    kind: FundingSourceKind.SEC_FORM_D,
    configured,
    configurationNote: configured ? undefined : "Set SEC_USER_AGENT to an application name and monitored contact email.",
    async discover({ now }) {
      const url = new URL(`${SEC_BASE}/cgi-bin/browse-edgar`);
      url.searchParams.set("action", "getcurrent");
      url.searchParams.set("type", "D");
      url.searchParams.set("owner", "include");
      url.searchParams.set("count", "100");
      url.searchParams.set("output", "atom");
      const xml = await fetchText(url.toString(), { headers: secHeaders(), timeoutMs: 18_000 });
      const parsed = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, trimValues: true }).parse(xml) as { feed?: { entry?: unknown } };
      const discovered = asArray(parsed.feed?.entry).flatMap((raw): DiscoveredCandidate[] => {
        if (!raw || typeof raw !== "object") return [];
        const entry = raw as Record<string, unknown>;
        const title = asText(entry.title);
        const indexUrl = atomLink(entry.link);
        if (!title || !indexUrl) return [];
        const companyName = title.replace(/^D\s*-\s*/i, "").replace(/\s*\(.*$/, "").trim();
        const sourceUrl = indexUrl.replace(/-index\.html(?:\?.*)?$/i, ".txt");
        const publishedAt = toDate(entry.updated, now);
        const external = asText(entry.id) ?? sourceUrl;
        return [{
          provider: SEC_PROVIDER,
          sourceKind: FundingSourceKind.SEC_FORM_D,
          externalId: stableId("sec-form-d", external),
          title: `SEC Form D — ${companyName}`,
          sourceUrl,
          publishedAt,
          payload: { type: "sec-form-d", sourceUrl, companyName, filedAt: publishedAt.toISOString() },
        }];
      });
      return { discovered, nextCursor: { checkedAt: now.toISOString() }, note: `${discovered.length} latest Form D filings` };
    },
  };
}

function nested(record: unknown, ...keys: string[]) {
  let value: unknown = record;
  for (const key of keys) {
    if (!value || typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

function numericAmount(value: unknown) {
  const text = asText(value)?.replace(/[$,]/g, "");
  if (!text || !/^\d+(?:\.\d+)?$/.test(text)) return null;
  const amount = Math.round(Number(text));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function secIndustry(value: string | undefined) {
  if (!value) return undefined;
  const mapping: Array<[RegExp, string]> = [
    [/technology|computers?/i, "SaaS"],
    [/biotechnology/i, "Biotech"],
    [/health care/i, "Healthtech"],
    [/energy conservation|electric utilities|oil and gas/i, "Climate & Energy"],
    [/restaurants?|agriculture/i, "Agriculture & Food"],
    [/retailing/i, "Commerce & Retail"],
    [/business services/i, "B2B Services"],
    [/telecommunications/i, "Telecommunications"],
  ];
  return mapping.find(([pattern]) => pattern.test(value))?.[1] ?? value;
}

function isLikelyOperatingCompany(companyName: string, industry: string | undefined) {
  if (/pooled investment fund/i.test(industry ?? "")) return false;
  if (/\b(fund|capital partners|opportunity fund|real estate fund)\b/i.test(companyName)) return false;
  return true;
}

const US_STATE_CODES = new Set(["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"]);

export async function parseSecFormD(payload: Record<string, unknown>, provider: string): Promise<NormalizedFundingSignal | null> {
  const url = asText(payload.sourceUrl);
  const filedAt = toDate(payload.filedAt, new Date());
  if (!url) return null;
  const filing = await fetchText(url, { headers: secHeaders(), timeoutMs: 20_000 });
  const match = filing.match(/<XML>\s*(<edgarSubmission[\s\S]*?<\/edgarSubmission>)\s*<\/XML>/i)
    ?? filing.match(/(<edgarSubmission[\s\S]*?<\/edgarSubmission>)/i);
  if (!match?.[1]) return null;
  const document = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, trimValues: true, parseTagValue: false }).parse(match[1]) as { edgarSubmission?: Record<string, unknown> };
  const submission = document.edgarSubmission;
  if (!submission) return null;
  const amendment = asText(nested(submission, "offeringData", "typeOfFiling", "newOrAmendment", "isAmendment"));
  if (amendment === "true" || amendment === "1") return null;

  const issuer = nested(submission, "primaryIssuer") as Record<string, unknown> | undefined;
  const companyName = asText(issuer?.entityName) ?? asText(payload.companyName);
  if (!companyName) return null;
  const industryText = asText(nested(submission, "offeringData", "industryGroup", "industryGroupType"));
  if (!isLikelyOperatingCompany(companyName, industryText)) return null;

  const firstSale = nested(submission, "offeringData", "typeOfFiling", "dateOfFirstSale", "value");
  const announcedAt = toDate(firstSale, filedAt);
  const sold = numericAmount(nested(submission, "offeringData", "offeringSalesAmounts", "totalAmountSold"));
  const amountUsd = sold !== null && sold <= 2_000_000_000 ? sold : null;
  const amountDisplay = sold ? `$${sold.toLocaleString("en-US")} sold` : null;
  const address = issuer?.issuerAddress as Record<string, unknown> | undefined;
  const city = asText(address?.city);
  const region = asText(address?.stateOrCountry);
  const country = region && US_STATE_CODES.has(region.toUpperCase()) ? "United States" : asText(address?.stateOrCountryDescription) ?? region;
  const headquarters = [city, region].filter(Boolean).join(", ") || undefined;
  const industry = secIndustry(industryText);

  return {
    companyName,
    slug: slugify(companyName),
    title: `SEC Form D — ${companyName}`,
    sourceUrl: url,
    sourceDomain: "sec.gov",
    sourceProvider: provider,
    sourceType: "Official SEC Form D public filing",
    announcedAt,
    stage: CompanyStage.UNKNOWN,
    amountUsd,
    amountDisplay,
    currency: "USD",
    industry,
    country,
    headquarters,
    sourceConfidence: sold ? 90 : 82,
    longDescription: "This profile is based on an official SEC Form D notice of an exempt securities offering. Form D is self-reported, does not prove that the issuer is a startup, and does not publicly identify every investor.",
  };
}
