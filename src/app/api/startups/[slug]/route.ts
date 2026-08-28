import { getApiIdentity } from "@/lib/api-auth";
import { getStartupBySlug } from "@/lib/startup-data";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const authentication = await getApiIdentity();
  if (authentication.error) return authentication.error;
  const { slug } = await params;
  const startup = await getStartupBySlug(slug);
  if (!startup) return Response.json({ error: "Startup not found" }, { status: 404 });
  return Response.json({ data: startup });
}
