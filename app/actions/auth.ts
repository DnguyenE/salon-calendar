"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

// DEV-ONLY: replace with magic-link/OTP before prod.
const DEV_PASSWORD = "password";

export interface SignInState {
  error?: string;
}

export async function signInWithEmail(
  _prev: SignInState | undefined,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email." };
  }

  const supabase = createClient(await cookies());
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: DEV_PASSWORD,
    });
    if (error) {
      return /invalid login credentials/i.test(error.message)
        ? { error: "No profile found for that email." }
        : { error: error.message };
    }
  } catch (err) {
    console.error("[signInWithEmail] failed:", err);
    return { error: "Couldn't reach the auth server. Is Supabase running?" };
  }

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = createClient(await cookies());
  await supabase.auth.signOut();
  redirect("/login");
}
