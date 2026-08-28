import { Bookmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Saved startups" };

export default function SavedPage() {
  return <div><p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Your shortlist</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">Saved startups</h1><Card className="mt-8 border-dashed bg-muted/15"><CardContent className="grid min-h-72 place-items-center p-8 text-center"><div><div className="mx-auto grid size-11 place-items-center rounded-xl bg-muted"><Bookmark className="size-5 text-muted-foreground" /></div><h2 className="mt-4 font-semibold">Your shortlist is empty</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Save promising companies from their profile. They will appear here after Clerk authentication is configured.</p></div></CardContent></Card></div>;
}
