import Link from "next/link";

export const metadata = {
  title: "Settings · Salon Calendar",
};

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
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
      </header>

      <main className="flex flex-1 items-start justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="rounded-md border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Nothing here yet
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Settings controls will live here.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
