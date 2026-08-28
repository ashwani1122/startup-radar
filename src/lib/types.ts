export type FounderView = {
  id: string;
  name: string;
  role: string;
  bio: string;
  location: string;
  linkedInUrl?: string;
  openToMessages: boolean;
  responseTime?: string;
};

export type InvestorView = {
  id: string;
  name: string;
  type: string;
  isLead: boolean;
};

export type FundingRoundView = {
  id: string;
  stage: string;
  amountUsd: number | null;
  amountDisplay?: string;
  currency: string;
  announcedAt: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceType: string;
  sourceDomain?: string;
  sourceProvider: string;
  verified: boolean;
  investors: InvestorView[];
};

export type StartupView = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  website?: string;
  headquarters?: string;
  country?: string;
  foundedYear?: number;
  employeeCount?: number;
  stage: string;
  industry?: string;
  tags: string[];
  logoText: string;
  accent: string;
  verified: boolean;
  isFeatured: boolean;
  sourceConfidence: number;
  indexedAt: string;
  founders: FounderView[];
  latestRound: FundingRoundView;
};

export type StartupFilters = {
  query?: string;
  stage?: string;
  country?: string;
  industry?: string;
};
