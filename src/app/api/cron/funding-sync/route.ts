import { isFundingSyncRequestAuthorized } from "@/lib/cron-auth";
import { runFundingPipeline } from "@/lib/funding/orchestrator";
import { prisma } from "@/lib/prisma";

export const maxDuration = 120;

export async function GET(request: Request) {
  if (!(await isFundingSyncRequestAuthorized(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runFundingPipeline(prisma, { includeBackfill: true });
    console.info("Scheduled funding sync completed.", result);
    return Response.json({ data: result });
  } catch (error) {
    console.error("Scheduled funding sync failed.", error);
    return Response.json({ error: "Funding sync failed." }, { status: 502 });
  }
}
