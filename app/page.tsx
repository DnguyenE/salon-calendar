import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ProfileRole } from "@/src/types";
import { createClient } from "@/utils/supabase/server";
import { CalendarApp } from "@/src/components/CalendarApp";

export default async function Home() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const viewerRole: ProfileRole = profile.role === "admin" ? "admin" : "staff";
  const { data: organization } = await supabase
    .from("organizations")
    .select("name, timezone")
    .eq("id", profile.organization_id)
    .single();
  const orgName = organization?.name ?? "Salon Calendar";
  const timezone = organization?.timezone ?? "UTC";

  return (
    <CalendarApp
      viewerRole={viewerRole}
      orgName={orgName}
      timezone={timezone}
    />
  );
}
