import { isFundingSyncRequestAuthorized } from "@/lib/cron-auth";
import { syncPublicFunding } from "@/lib/funding-ingestion";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!(await isFundingSyncRequestAuthorized(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncPublicFunding(prisma);
    console.info("Scheduled funding sync completed.", result);
    return Response.json({ data: result });
  } catch (error) {
    console.error("Scheduled funding sync failed.", error);
    return Response.json({ error: "Funding sync failed." }, { status: 502 });
  }
}
