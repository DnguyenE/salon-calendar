import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { signOut } from "@/app/actions/auth";
import { AppearanceSection } from "@/src/components/settings/AppearanceSection";
import { RoundRobinSection } from "@/src/components/settings/RoundRobinSection";
import { ServicesSection } from "@/src/components/settings/ServicesSection";
import { StaffSection } from "@/src/components/settings/StaffSection";

export const metadata = {
  title: "Settings · Salon Calendar",
};

function emailDomainOf(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.indexOf("@");
  if (at < 0 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase();
}

export default async function SettingsPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, email, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  const isAdmin = profile.role === "admin";

  const { data: organization } = await supabase
    .from("organizations")
    .select("email_domain")
    .eq("id", profile.organization_id)
    .single();

  const staffEmailDomain =
    organization?.email_domain ??
    emailDomainOf(profile.email ?? user.email ?? null);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <Link
          href="/"
          aria-label="Back to calendar"
          className="inline-flex h-9 items-center gap-1 rounded-md border border-zinc-200 pl-2 pr-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </Link>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Settings
        </h1>

        <form action={signOut} className="ml-auto flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {profile.email ?? user.email}
          </span>
          <button
            type="submit"
            className="inline-flex h-8 items-center rounded-md border border-zinc-200 px-2.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Sign out
          </button>
        </form>
      </header>

      <main className="flex flex-1 justify-center p-6">
        <div className="w-full max-w-2xl space-y-6">
          <AppearanceSection />
          {isAdmin ? (
            <>
              <RoundRobinSection isAdmin />
              <ServicesSection organizationId={profile.organization_id} />
              <StaffSection emailDomain={staffEmailDomain} />
            </>
          ) : (
            <div className="rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              Only admins can manage round-robin order, services, and staff.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
