import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { ArrowLeft, KeyRound } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Create account" };

export default function SignUpPage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <div className="absolute left-6 top-6"><BrandMark /></div>
      {configured ? <SignUp /> : (
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-3 grid size-10 place-items-center rounded-xl bg-primary/15 text-primary"><KeyRound /></div>
            <CardTitle>Clerk setup is the final auth step</CardTitle>
            <CardDescription>Add your free Clerk keys and enable Google to activate account creation. Until then, the product is available in preview mode.</CardDescription>
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
