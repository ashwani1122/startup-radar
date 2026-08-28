import { SyncStatus, type FundingSourceState, type Prisma, type PrismaClient } from "@/generated/prisma/client";
import { enqueueFundingCandidates, processFundingQueue } from "@/lib/funding/queue";
import { gdeltBackfillAdapter, gdeltLiveAdapter } from "@/lib/funding/sources/gdelt";
import { publicFeedAdapter } from "@/lib/funding/sources/rss";
import { secBackfillAdapter, secLiveAdapter } from "@/lib/funding/sources/sec-edgar";
import type { SourceAdapter } from "@/lib/funding/types";

function cursorValue(state: FundingSourceState | null) {
  return state?.cursor && typeof state.cursor === "object" && !Array.isArray(state.cursor)
    ? state.cursor as Record<string, unknown>
    : undefined;
}

async function runAdapter(db: PrismaClient, adapter: SourceAdapter, now: Date) {
  const state = await db.fundingSourceState.upsert({
    where: { key: adapter.key },
    create: {
      key: adapter.key,
      label: adapter.label,
      kind: adapter.kind,
      enabled: adapter.configured,
      lastError: adapter.configurationNote,
    },
    update: {
      label: adapter.label,
      kind: adapter.kind,
      enabled: adapter.configured,
      ...(!adapter.configured ? { lastError: adapter.configurationNote } : {}),
    },
  });
  if (!adapter.configured) return { key: adapter.key, status: "disabled" as const, discovered: 0, queued: 0, note: adapter.configurationNote };

  const sync = await db.fundingSync.create({ data: { provider: adapter.key, status: SyncStatus.RUNNING } });
  await db.fundingSourceState.update({ where: { key: adapter.key }, data: { lastAttemptAt: now } });
  try {
    const discovery = await adapter.discover({ cursor: cursorValue(state), now });
    const queued = await enqueueFundingCandidates(db, discovery.discovered);
    await Promise.all([
      db.fundingSync.update({
        where: { id: sync.id },
        data: { status: SyncStatus.SUCCEEDED, discovered: discovery.discovered.length, accepted: queued, completedAt: new Date() },
      }),
      db.fundingSourceState.update({
        where: { key: adapter.key },
        data: {
          cursor: discovery.nextCursor as Prisma.InputJsonObject | undefined,
          lastStatus: SyncStatus.SUCCEEDED,
          lastSuccessAt: new Date(),
          lastError: discovery.note,
          discovered: { increment: discovery.discovered.length },
          queued: { increment: queued },
        },
      }),
    ]);
    return { key: adapter.key, status: "succeeded" as const, discovered: discovery.discovered.length, queued, note: discovery.note };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown source error";
    await Promise.all([
      db.fundingSync.update({ where: { id: sync.id }, data: { status: SyncStatus.FAILED, error: message, completedAt: new Date() } }),
      db.fundingSourceState.update({ where: { key: adapter.key }, data: { lastStatus: SyncStatus.FAILED, lastError: message } }),
    ]);
    console.error(`Funding source ${adapter.key} failed.`, error);
    return { key: adapter.key, status: "failed" as const, discovered: 0, queued: 0, note: message };
  }
}

async function runAdapters(db: PrismaClient, adapters: SourceAdapter[]) {
  const now = new Date();
  return Promise.all(adapters.map((adapter) => runAdapter(db, adapter, now)));
}

async function recoverInterruptedSyncs(db: PrismaClient) {
  return db.fundingSync.updateMany({
    where: { status: SyncStatus.RUNNING, startedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } },
    data: { status: SyncStatus.FAILED, error: "The source run ended before completion.", completedAt: new Date() },
  });
}

export async function runFundingPipeline(db: PrismaClient, options: { includeBackfill?: boolean; queueLimit?: number } = {}) {
  await recoverInterruptedSyncs(db);
  const adapters = [gdeltLiveAdapter(), publicFeedAdapter(), secLiveAdapter()];
  if (options.includeBackfill !== false) adapters.push(gdeltBackfillAdapter(), secBackfillAdapter());
  const sources = await runAdapters(db, adapters);
  const queue = await processFundingQueue(db, options.queueLimit ?? 10);
  return { sources, queue };
}

export async function runHistoricalFundingPipeline(db: PrismaClient) {
  await recoverInterruptedSyncs(db);
  const sources = await runAdapters(db, [gdeltBackfillAdapter(), secBackfillAdapter()]);
  const queue = await processFundingQueue(db, 16);
  return { sources, queue };
}
