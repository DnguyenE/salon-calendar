"use server";

import bcrypt from "bcryptjs";
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
    // Query the database for the admin user
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, password_hash, organization_id")
      .eq("email", email)
      .single();

    if (profileError || !profile) {
      return { error: "Invalid email or password." };
    }

    if (!profile.password_hash) {
      return { error: "Account not properly configured. Contact support." };
    }

    // Verify the password against the stored hash
    const passwordValid = await bcrypt.compare(password, profile.password_hash);
    if (!passwordValid) {
      return { error: "Invalid email or password." };
    }

    // Password verified - now sign in via Supabase
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
    return { error: "Couldn't reach the auth server. Is Supabase running?" };
  }

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = createClient(await cookies());
  await supabase.auth.signOut();
  redirect("/login");
}
