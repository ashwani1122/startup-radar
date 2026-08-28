import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { DesktopDashboardNav } from "@/components/dashboard-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
  if (clerkConfigured) {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");
  }
  return (
    <div className="min-h-screen bg-background">
      <DesktopDashboardNav />
      <div className="lg:pl-60">
        <DashboardHeader clerkConfigured={clerkConfigured} />
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
