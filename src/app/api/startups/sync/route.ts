import { getApiIdentity } from "@/lib/api-auth";
import { runFundingPipeline } from "@/lib/funding/orchestrator";
import { prisma } from "@/lib/prisma";

export const maxDuration = 120;

export async function POST() {
  const authentication = await getApiIdentity();
  if (authentication.error) return authentication.error;

  try {
    const result = await runFundingPipeline(prisma, { includeBackfill: false });
    return Response.json({ data: result });
  } catch (error) {
    console.error("Authenticated funding sync failed.", error);
    return Response.json({ error: "The public funding source could not be reached. Try again later." }, { status: 502 });
  }
}
