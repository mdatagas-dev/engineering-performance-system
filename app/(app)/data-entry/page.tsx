"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Halaman indeks Data Entry dipindah ke /data-entry/records.
// Menu sidebar (lib/navigation.ts) menunjuk langsung ke records — redirect.
export default function DataEntryRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/data-entry/records");
  }, [router]);

  return (
    <main className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
      <div className="grid h-full place-items-center">
        <div className="space-y-3 text-center">
          <div className="shimmer h-4 w-56 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Mengalihkan ke Input Manual…</p>
        </div>
      </div>
    </main>
  );
}
