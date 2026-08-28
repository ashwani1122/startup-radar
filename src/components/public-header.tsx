import Link from "next/link";
import { AuthActions } from "@/components/auth-actions";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

export function PublicHeader() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <BrandMark />
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex" aria-label="Primary navigation">
          <Link href="#product" className="transition-colors hover:text-foreground">Product</Link>
          <Link href="#how-it-works" className="transition-colors hover:text-foreground">How it works</Link>
          <Link href="#principles" className="transition-colors hover:text-foreground">Data principles</Link>
        </nav>
        <div className="flex items-center gap-1.5"><ThemeToggle /><AuthActions configured={clerkConfigured} /></div>
      </div>
    </header>
  );
}
