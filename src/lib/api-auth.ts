import { auth, currentUser } from "@clerk/nextjs/server";

type ApiIdentity = { userId: string; email: string; displayName: string };

export async function getApiIdentity(): Promise<{ identity: ApiIdentity; error?: never } | { identity?: never; error: Response }> {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return { error: Response.json({ error: "Authentication is not configured. Add the Clerk environment variables first." }, { status: 503 }) };
  }

  const { userId } = await auth();
  if (!userId) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) return { error: Response.json({ error: "A verified email address is required." }, { status: 403 }) };

  return {
    identity: {
      userId,
      email,
      displayName: user.fullName ?? user.firstName ?? email.split("@")[0],
    },
  };
}
