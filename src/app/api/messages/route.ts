import { z } from "zod";
import { MessageIntent } from "@/generated/prisma/client";
import { getApiIdentity } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const messageSchema = z.object({
  startupId: z.string().min(1),
  founderId: z.string().min(1),
  subject: z.string().trim().min(4).max(100),
  body: z.string().trim().min(30).max(1200),
  intent: z.enum(MessageIntent),
});

export async function GET() {
  const authentication = await getApiIdentity();
  if (authentication.error) return authentication.error;
  const profile = await prisma.userProfile.findUnique({ where: { clerkUserId: authentication.identity.userId } });
  if (!profile) return Response.json({ data: [] });
  const messages = await prisma.founderMessage.findMany({ where: { senderId: profile.id }, include: { startup: true, founder: true }, orderBy: { createdAt: "desc" } });
  return Response.json({ data: messages });
}

export async function POST(request: Request) {
  const authentication = await getApiIdentity();
  if (authentication.error) return authentication.error;
  const parsed = messageSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Check the recipient, subject, and message context." }, { status: 400 });

  const founder = await prisma.founder.findFirst({ where: { id: parsed.data.founderId, startupId: parsed.data.startupId, openToMessages: true } });
  if (!founder) return Response.json({ error: "This founder is not currently accepting messages." }, { status: 409 });

  const profile = await prisma.userProfile.upsert({
    where: { clerkUserId: authentication.identity.userId },
    update: { email: authentication.identity.email, displayName: authentication.identity.displayName },
    create: { clerkUserId: authentication.identity.userId, email: authentication.identity.email, displayName: authentication.identity.displayName },
  });
  const message = await prisma.founderMessage.create({ data: { ...parsed.data, senderId: profile.id } });
  return Response.json({ data: message }, { status: 201 });
}
