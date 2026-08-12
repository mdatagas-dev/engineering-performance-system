"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Halaman lama dipindah ke hub /settings (tab Keamanan & Lockout).
// Menu sidebar (lib/auth/menu.ts) masih menunjuk /settings/security — redirect.
export default function SettingsSecurityRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings");
  }, [router]);

  return (
    <main className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
      <div className="grid h-full place-items-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Mengalihkan ke Pengaturan…</p>
      </div>
    </main>
  );
}
