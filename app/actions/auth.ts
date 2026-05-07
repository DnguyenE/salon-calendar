"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

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

  const password = String(formData.get("password") ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email." };
  }

  if (!password) {
    return { error: "Enter your password." };
  }

  const supabase = createClient(await cookies());

  try {
    // Authenticate with Supabase Auth FIRST
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return /invalid login credentials/i.test(error.message)
        ? { error: "Invalid email or password." }
        : { error: error.message };
    }
  } catch (err) {
    console.error("[signInWithEmail] failed:", err);

    return {
      error: "Couldn't reach the auth server. Is Supabase running?",
    };
  }

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = createClient(await cookies());

  await supabase.auth.signOut();

  redirect("/login");
}