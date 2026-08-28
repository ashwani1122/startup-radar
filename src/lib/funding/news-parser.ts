import { CompanyStage } from "@/generated/prisma/client";
import type { NormalizedFundingSignal } from "@/lib/funding/types";
import { canonicalUrl, slugify, sourceDomain } from "@/lib/funding/utils";

export type NewsArticle = {
  url: string;
  title: string;
  publishedAt: Date;
  domain?: string;
  language?: string;
};

export function inferStage(title: string) {
  if (/\bpre[ -]?seed\b|\bpresemilla\b|\bpré[- ]?amorçage\b/i.test(title)) return CompanyStage.PRE_SEED;
  if (/\bseries\s+a\b|\bserie\s+a\b|\bsérie\s+a\b/i.test(title)) return CompanyStage.SERIES_A;
  if (/\bseries\s+b\b|\bserie\s+b\b|\bsérie\s+b\b/i.test(title)) return CompanyStage.SERIES_B;
  if (/\bseries\s+c\b|\bserie\s+c\b|\bsérie\s+c\b/i.test(title)) return CompanyStage.SERIES_C;
  if (/\bseries\s+[d-z]\b|\bgrowth\b/i.test(title)) return CompanyStage.GROWTH;
  if (/\bseed\b|\bsemilla\b|\bamorçage\b|\bsemente\b/i.test(title)) return CompanyStage.SEED;
  return CompanyStage.UNKNOWN;
}

export function inferIndustry(title: string) {
  const values: Array<[RegExp, string]> = [
    [/\b(web3|blockchain|crypto(?:currency)?|defi|decentralized|tokenization)\b/i, "Web3 & Blockchain"],
    [/\b(semiconductors?|chips?|hardware|electronics|sensors?|internet of things|iot)\b/i, "Hardware & Semiconductors"],
    [/\b(data science|data platform|analytics|database|business intelligence|big data)\b/i, "Data & Analytics"],
    [/\b(devtools?|developer tools?|api platform|cloud infrastructure|observability)\b/i, "Developer Tools"],
    [/\b(cybersecurity|cyber security|identity security|fraud detection|security platform)\b/i, "Cybersecurity"],
    [/\b(insurtech|insurance)\b/i, "Insurtech"],
    [/\b(fintech|banking|lending|payments?|wealthtech)\b/i, "Fintech"],
    [/\b(biotech|biotechnology|therapeutics?|drug discovery|life sciences?)\b/i, "Biotech"],
    [/\b(healthtech|healthcare|medical|clinic|digital health|patient)\b/i, "Healthtech"],
    [/\b(climate|carbon|clean energy|battery|solar|sustainability)\b/i, "Climate & Energy"],
    [/\b(robotics?|automation|autonomous systems?)\b/i, "Robotics & Automation"],
    [/\b(space|satellite|aerospace)\b/i, "Space Technology"],
    [/\b(edtech|education|learning platform)\b/i, "Education"],
    [/\b(e-?commerce|retailtech|shopping)\b/i, "Commerce & Retail"],
    [/\b(proptech|real estate|property technology)\b/i, "Real Estate & Proptech"],
    [/\b(agritech|agriculture|foodtech|restaurant)\b/i, "Agriculture & Food"],
    [/\b(mobility|automotive|electric vehicles?|ev charging)\b/i, "Mobility & Automotive"],
    [/\b(logistics|supply chain|freight|shipping)\b/i, "Logistics & Supply Chain"],
    [/\b(gaming|games?|esports)\b/i, "Gaming"],
    [/\b(media|creator economy|streaming|entertainment|live events?)\b/i, "Media & Creator Economy"],
    [/\b(hrtech|human resources|workforce|recruiting)\b/i, "HR & Future of Work"],
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
  const match = value.match(/(?:US\$|USD\s*|R\$|\$|€|£|₹)\s*\d+(?:[.,]\d+)?\s*(?:K|M|B|BN|million|millones?|milhões?|milliards?|billion|crore|lakh)?/i);
  if (!match) return { amountUsd: null, amountDisplay: null, currency: "USD" };

  const amountDisplay = match[0].replace(/\s+/g, " ").trim();
  const currency = /R\$/.test(amountDisplay) ? "BRL" : /€/.test(amountDisplay) ? "EUR" : /£/.test(amountDisplay) ? "GBP" : /₹/.test(amountDisplay) ? "INR" : "USD";
  if (currency !== "USD") return { amountUsd: null, amountDisplay, currency };
  const numeric = Number(amountDisplay.replace(/(?:US\$|USD|\$)/gi, "").replace(/,/g, "").match(/\d+(?:\.\d+)?/)?.[0]);
  if (!Number.isFinite(numeric)) return { amountUsd: null, amountDisplay, currency };
  const multiplier = /(?:\bbn\b|billion|milliards?|\d\s*b\b)/i.test(amountDisplay)
    ? 1_000_000_000
    : /(?:million|millones?|milhões?|\d\s*m\b)/i.test(amountDisplay)
      ? 1_000_000
      : /(?:crore)/i.test(amountDisplay)
        ? 10_000_000
        : /(?:lakh)/i.test(amountDisplay)
          ? 100_000
          : /(?:\d\s*k\b)/i.test(amountDisplay)
            ? 1_000
            : 1;
  const converted = Math.round(numeric * multiplier);
  return { amountUsd: converted <= 2_000_000_000 ? converted : null, amountDisplay, currency };
}

const VERB_PATTERN = /\b(raises?|raised|secures?|secured|closes?|closed|lands?|landed|bags?|bagged|nabs?|nabbed|receives?|received|gets?|got|wins?|won|recauda|recaudó|capta|captó|levanta|levantó|cierra|cerró|obtiene|obtuvo|lève|levée|boucle|obtient|sécurise|sammelt|sichert|schließt|fecha|recebe)\b/i;

export function hasFundingLanguage(value: string) {
  return /(funding|financing|investment|capital|seed|series\s+[a-z]|financiación|inversión|ronda|levée de fonds|tour de table|finanzierungsrunde|investimento|rodada)/i.test(value)
    && (VERB_PATTERN.test(value) || /\b(funding round|finanzierungsrunde|ronda de financiación|levée de fonds|rodada de investimento)\b/i.test(value));
}

export function parseNewsFundingSignal(article: NewsArticle, provider: string, sourceType: string): NormalizedFundingSignal | null {
  const title = article.title.replace(/\s+/g, " ").trim();
  const verb = VERB_PATTERN.exec(title);
  if (verb?.index === undefined) return null;

  const beforeVerb = title.slice(0, verb.index);
  if (/\b(talks?|seeks?|plans?|aims?|could|may|busca|planea|pourrait|plant)\b/i.test(beforeVerb)) return null;
  let companyName = beforeVerb
    .replace(/^(?:exclusive|breaking|report)\s*[:|-]\s*/i, "")
    .replace(/^(?:PR Newswire|GlobeNewswire|Business Wire)\s*[-:|]\s*/i, "")
    .replace(/^IPO\s*-\s*bound\s+/i, "")
    .replace(/^(?:(?:african|american|british|european|indian|nigerian|swedish|dutch|spanish|french|german|brazilian)\s+)?(?:(?:ai|fintech|healthtech|climate|defense|robotics)\s+)?startup\s+/i, "")
    .split(/\s+[|:]\s+/).at(-1)?.trim()
    .replace(/^["'“”]|["'“”]$/g, "") ?? "";

  companyName = companyName.replace(/\s+-\s+$/, "").trim();
  if (companyName.length < 2 || companyName.length > 80 || companyName.split(/\s+/).length > 9) return null;
  if (/\b(fund|funding round|venture capital firm|vc firm|bank|government|university|college)\b/i.test(companyName)) return null;
  if (/^(how|why|what|this|the latest)$/i.test(companyName)) return null;

  const rest = title.slice(verb.index + verb[0].length);
  const stage = inferStage(title);
  const amount = parseAmount(rest);
  if (!hasFundingLanguage(title)) return null;
  if (/\bvaluation\b/i.test(rest) && !/\b(round|funding|financing)\b/i.test(rest)) return null;
  if (stage === CompanyStage.UNKNOWN && /\b(acquir(?:e|es|ed|ing)|acquisition|credit facility|debt|loan|refinancing)\b/i.test(rest)) return null;

  const sourceUrl = canonicalUrl(article.url);
  const leadInvestor = (
    title.match(/\bled by\s+([^,.;]+?)(?=\s+(?:with|and)\s+participation|$)/i)?.[1]
    ?? title.match(/\bfunding from\s+([^,.;]+?)(?=$|\s+(?:with|and)\s+)/i)?.[1]
  )?.trim();

  return {
    companyName,
    slug: slugify(companyName),
    title,
    sourceUrl,
    sourceDomain: article.domain ?? sourceDomain(sourceUrl),
    sourceProvider: provider,
    sourceType,
    announcedAt: article.publishedAt,
    stage,
    amountUsd: amount.amountUsd,
    amountDisplay: amount.amountDisplay,
    currency: amount.currency,
    industry: inferIndustry(title),
    leadInvestor: leadInvestor && leadInvestor.length <= 80 ? leadInvestor : undefined,
    sourceConfidence: amount.amountDisplay && stage !== CompanyStage.UNKNOWN ? 82 : 70,
    longDescription: "This profile was created automatically from a public funding report. Details not stated by the cited source are left unfilled.",
  };
}
