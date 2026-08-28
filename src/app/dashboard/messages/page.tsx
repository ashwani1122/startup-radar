import { auth } from "@clerk/nextjs/server";
import { MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { stageLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
  const userId = clerkConfigured ? (await auth()).userId : null;
  const profile = userId ? await prisma.userProfile.findUnique({ where: { clerkUserId: userId } }) : null;
  const messages = profile ? await prisma.founderMessage.findMany({
    where: { senderId: profile.id },
    include: { startup: true, founder: true },
    orderBy: { createdAt: "desc" },
  }) : [];

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Founder outreach</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">Messages</h1>
      <p className="mt-2 text-sm text-muted-foreground">Only requests sent from your authenticated account appear here.</p>
      <Card className="mt-8">
        <CardHeader><CardTitle className="text-sm">Recent requests</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {messages.map((message) => (
            <div className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center" key={message.id}>
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><MessageSquareText className="size-4" /></div>
                <div><p className="text-sm font-medium">{message.subject}</p><p className="mt-1 text-xs text-muted-foreground">To {message.founder?.name ?? "founder"} at {message.startup.name} · {stageLabel(message.intent)}</p></div>
              </div>
              <Badge variant="outline">{stageLabel(message.status)}</Badge>
            </div>
          ))}
          {!messages.length ? (
            <div className="rounded-xl border border-dashed px-5 py-10 text-center">
              <MessageSquareText className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No messages yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Founder messaging appears only when a verified founder accepts requests.</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
