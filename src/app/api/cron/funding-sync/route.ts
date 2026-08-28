import { syncPublicFunding } from "@/lib/funding-ingestion";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return Response.json({ error: "Cron authentication is not configured." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
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
