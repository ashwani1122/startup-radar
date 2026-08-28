import { FundingCandidateStatus, FundingSourceKind, SyncStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const SOURCE_DETAILS = [
  { key: "gdelt-live", label: "Global news monitor", scope: "Four-hour rolling checks across English and multilingual funding queries.", kind: FundingSourceKind.NEWS },
  { key: "gdelt-backfill", label: "Global news backfill", scope: "Current-year news is scanned in bounded 12-hour windows to avoid result truncation.", kind: FundingSourceKind.NEWS },
  { key: "sec-form-d-live", label: "SEC Form D live", scope: "Latest U.S. exempt-offering filings; excludes obvious pooled investment funds.", kind: FundingSourceKind.SEC_FORM_D },
  { key: "sec-form-d-backfill", label: "SEC Form D backfill", scope: "Official SEC daily indexes from January 1 of the current year.", kind: FundingSourceKind.SEC_FORM_D },
  { key: "public-feeds", label: "Public funding feeds", scope: "GlobeNewswire financing and press-release feeds, plus configured company, VC, accelerator, and directory RSS/Atom feeds.", kind: FundingSourceKind.RSS },
] as const;

const PROCESSED_STATUSES = new Set<FundingCandidateStatus>([
  FundingCandidateStatus.SUCCEEDED,
  FundingCandidateStatus.REJECTED,
  FundingCandidateStatus.DEAD,
]);

export async function getFundingCoverage() {
  const [states, queueGroups] = await Promise.all([
    prisma.fundingSourceState.findMany(),
    prisma.fundingCandidate.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const stateByKey = new Map(states.map((state) => [state.key, state]));
  const queued = queueGroups.reduce((sum, group) => group.status === FundingCandidateStatus.PENDING || group.status === FundingCandidateStatus.RETRY || group.status === FundingCandidateStatus.PROCESSING ? sum + group._count._all : sum, 0);
  const processed = queueGroups.reduce(
    (sum, group) => PROCESSED_STATUSES.has(group.status)
      ? sum + group._count._all
      : sum,
    0,
  );

  return {
    label: "Expanding public-source coverage",
    disclaimer: "Not a complete record of worldwide funding. Reports appear only when a monitored public source exposes enough evidence to identify a funding event.",
    queued,
    processed,
    sources: SOURCE_DETAILS.map((source) => {
      const state = stateByKey.get(source.key);
      return {
        ...source,
        status: !state?.enabled ? "configuration-required" : state.lastStatus === SyncStatus.FAILED ? "degraded" : state.lastStatus === SyncStatus.SUCCEEDED ? "active" : "starting",
        lastSuccessAt: state?.lastSuccessAt?.toISOString(),
        note: state?.lastError ?? undefined,
        discovered: state?.discovered ?? 0,
        queued: state?.queued ?? 0,
      };
    }),
  };
}
