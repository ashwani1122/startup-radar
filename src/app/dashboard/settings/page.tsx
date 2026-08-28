import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return <div><p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Account</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">Settings</h1><div className="mt-8 grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Authentication</CardTitle><CardDescription>Google sign-in and account identity are managed by Clerk.</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground">Add the Clerk keys in <code className="font-mono text-foreground">.env.local</code> and enable Google in the Clerk dashboard.</CardContent></Card><Card><CardHeader><CardTitle>Data connection</CardTitle><CardDescription>PostgreSQL data is modeled and accessed through Prisma.</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground">The Neon connection is configured locally. Run the database migration and seed commands to provision records.</CardContent></Card></div></div>;
}
