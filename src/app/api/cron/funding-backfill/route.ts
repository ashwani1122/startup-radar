import { isVercelCronRequestAuthorized } from "@/lib/cron-auth";
import { syncNextHistoricalSlice } from "@/lib/funding-ingestion";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isVercelCronRequestAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncNextHistoricalSlice(prisma);
    console.info("Scheduled historical funding sync completed.", result);
    return Response.json({ data: result });
  } catch (error) {
    console.error("Scheduled historical funding sync failed.", error);
    return Response.json({ error: "Historical funding sync failed." }, { status: 502 });
  }
}
