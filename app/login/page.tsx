import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SignInForm } from "./SignInForm";

export const metadata = {
  title: "Sign in · Salon Calendar",
};

export default async function LoginPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-1 text-lg font-semibold tracking-tight">
          Sign in
        </h1>
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          Enter your email and password to access your salon account.
        </p>
        <SignInForm />
      </div>
    </div>
  );
}
