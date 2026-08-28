import type { CompanyStage, FundingSourceKind } from "@/generated/prisma/client";

export type DiscoveredCandidate = {
  provider: string;
  sourceKind: FundingSourceKind;
  externalId: string;
  title?: string;
  sourceUrl: string;
  publishedAt?: Date;
  payload: Record<string, unknown>;
};

export type SourceDiscovery = {
  discovered: DiscoveredCandidate[];
  nextCursor?: Record<string, unknown>;
  note?: string;
};

export type SourceAdapter = {
  key: string;
  label: string;
  kind: FundingSourceKind;
  configured: boolean;
  configurationNote?: string;
  discover: (context: {
    cursor?: Record<string, unknown>;
    now: Date;
  }) => Promise<SourceDiscovery>;
};

export type NormalizedFundingSignal = {
  companyName: string;
  slug: string;
  title: string;
  sourceUrl: string;
  sourceDomain: string;
  sourceProvider: string;
  sourceType: string;
  announcedAt: Date;
  stage: CompanyStage;
  amountUsd: number | null;
  amountDisplay: string | null;
  currency: string;
  industry?: string;
  country?: string;
  headquarters?: string;
  website?: string;
  leadInvestor?: string;
  sourceConfidence: number;
  longDescription: string;
};
