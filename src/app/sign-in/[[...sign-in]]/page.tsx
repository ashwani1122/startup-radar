import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { ArrowLeft, KeyRound } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <div className="absolute left-6 top-6"><BrandMark /></div>
      {configured ? <SignIn /> : (
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-3 grid size-10 place-items-center rounded-xl bg-primary/15 text-primary"><KeyRound /></div>
            <CardTitle>Connect Clerk to enable Google sign-in</CardTitle>
            <CardDescription>The interface is ready. Add the Clerk keys from <code className="font-mono text-foreground">.env.example</code>, then enable Google in Clerk.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild><Link href="/dashboard">Open demo dashboard</Link></Button>
            <Button asChild variant="outline"><Link href="/"><ArrowLeft /> Home</Link></Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
