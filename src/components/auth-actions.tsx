"use client";

import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AuthActions({ configured }: { configured: boolean }) {
  if (!configured) {
    return (
      <Button asChild size="sm">
        <Link href="/dashboard">Open demo <ArrowRight data-icon="inline-end" /></Link>
      </Button>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href="/sign-in">Sign in</Link></Button>
        <Button asChild size="sm"><Link href="/sign-up">Get started <ArrowRight data-icon="inline-end" /></Link></Button>
      </Show>
      <Show when="signed-in">
        <Button asChild size="sm"><Link href="/dashboard">Open dashboard</Link></Button>
        <UserButton />
      </Show>
    </>
  );
}
