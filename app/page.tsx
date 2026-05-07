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
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const viewerRole: ProfileRole = profile.role === "admin" ? "admin" : "staff";

  return <CalendarApp viewerRole={viewerRole} />;
}
