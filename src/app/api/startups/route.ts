import { getApiIdentity } from "@/lib/api-auth";
import { getStartups } from "@/lib/startup-data";

export async function GET(request: Request) {
  const authentication = await getApiIdentity();
  if (authentication.error) return authentication.error;
  const url = new URL(request.url);
  const startups = await getStartups({
    query: url.searchParams.get("q") ?? undefined,
    stage: url.searchParams.get("stage") ?? undefined,
    country: url.searchParams.get("country") ?? undefined,
    industry: url.searchParams.get("industry") ?? undefined,
  });
  return Response.json({ data: startups });
}
