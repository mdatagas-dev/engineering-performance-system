"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearMockSession, loadMockSession } from "@/lib/mocks/accounts";
import { isSessionExpired, type MockSession } from "@/lib/mocks/session";
import { canAccess } from "@/lib/auth/menu";

// Guard sesi shared untuk halaman ber-auth: cek di mount + berkala.
// Sesi absen → /login; kedaluwarsa → hapus sesi + /login?expired=1 (pesan di halaman login).
// Permission opsional: user tanpa permission itu (dan bukan SUPER_ADMIN) → /.
const CHECK_INTERVAL_MS = 30_000;

export function useSessionGuard(permission?: string): MockSession | null {
  const router = useRouter();
  const [session, setSession] = useState<MockSession | null>(null);

  useEffect(() => {
    let done = false;

    const check = () => {
      if (done) return;
      const s = loadMockSession();
      if (!s) {
        done = true;
        router.replace("/login");
        return;
      }
      if (isSessionExpired(s)) {
        done = true;
        clearMockSession();
        router.replace("/login?expired=1");
        return;
      }
      if (permission && !canAccess(s.user, permission)) {
        done = true;
        router.replace("/home");
        return;
      }
      setSession((prev) => prev ?? s);
    };

    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      done = true;
      clearInterval(id);
    };
  }, [router, permission]);

  return session;
}
