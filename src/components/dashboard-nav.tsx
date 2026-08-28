"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Building2, LayoutDashboard, Menu, MessageSquareText, Settings2 } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/startups", label: "Startups", icon: Building2 },
  { href: "/dashboard/saved", label: "Saved", icon: Bookmark },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquareText },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1" aria-label="Dashboard navigation">
      {navItems.map((item) => {
        const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate} className={cn("focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors", active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground")}>
            <item.icon className={cn("size-4", active && "text-primary")} />{item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DesktopDashboardNav() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r bg-sidebar lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b px-5"><BrandMark /></div>
      <div className="flex-1 px-3 py-5"><NavLinks /></div>
      <div className="border-t p-3">
        <Link href="/dashboard/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"><Settings2 className="size-4" /> Settings</Link>
        <p className="px-3 pt-4 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Source-backed startup intelligence</p>
      </div>
    </aside>
  );
}

export function MobileDashboardNav() {
  return (
    <Sheet>
      <SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation"><Menu /></Button></SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-5 py-4 text-left"><SheetTitle><BrandMark /></SheetTitle><SheetDescription className="sr-only">Dashboard navigation</SheetDescription></SheetHeader>
        <div className="p-3"><NavLinks /></div>
      </SheetContent>
    </Sheet>
  );
}
