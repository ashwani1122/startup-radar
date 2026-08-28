import { z } from "zod";
import { getApiIdentity } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const savedSchema = z.object({ startupId: z.string().min(1) });

async function getOrCreateProfile() {
  const authentication = await getApiIdentity();
  if (authentication.error) return authentication;
  const profile = await prisma.userProfile.upsert({
    where: { clerkUserId: authentication.identity.userId },
    update: { email: authentication.identity.email, displayName: authentication.identity.displayName },
    create: { clerkUserId: authentication.identity.userId, email: authentication.identity.email, displayName: authentication.identity.displayName },
  });
  return { profile };
}

export async function GET() {
  const result = await getOrCreateProfile();
  if ("error" in result) return result.error;
  const saved = await prisma.savedStartup.findMany({ where: { userId: result.profile.id }, include: { startup: true }, orderBy: { createdAt: "desc" } });
  return Response.json({ data: saved });
}

export async function POST(request: Request) {
  const result = await getOrCreateProfile();
  if ("error" in result) return result.error;
  const parsed = savedSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "A startup ID is required." }, { status: 400 });
  const saved = await prisma.savedStartup.upsert({ where: { userId_startupId: { userId: result.profile.id, startupId: parsed.data.startupId } }, update: {}, create: { userId: result.profile.id, startupId: parsed.data.startupId } });
  return Response.json({ data: saved }, { status: 201 });
}

export async function DELETE(request: Request) {
  const result = await getOrCreateProfile();
  if ("error" in result) return result.error;
  const parsed = savedSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "A startup ID is required." }, { status: 400 });
  await prisma.savedStartup.deleteMany({ where: { userId: result.profile.id, startupId: parsed.data.startupId } });
  return Response.json({ success: true });
}
