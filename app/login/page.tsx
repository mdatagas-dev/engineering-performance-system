"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LoginGate from "@/components/gate/login-gate";
import { getMenuFor } from "@/lib/auth/menu";
import { loadMockSession, saveMockSession } from "@/lib/mocks/accounts";
import { withExpiry } from "@/lib/mocks/session";

export default function LoginPage() {
  const router = useRouter();
  const [initialMessage, setInitialMessage] = useState<string | undefined>(undefined);

  // ?expired=1 di-set guard sesi saat timeout → tampilkan pesan "sesi berakhir".
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInitialMessage(
      new URLSearchParams(window.location.search).has("expired")
        ? "Sesi Anda telah berakhir. Silakan login kembali."
        : undefined
    );
  }, []);

  const handleLogin = async (email: string, password: string, rememberMe: boolean): Promise<string | null> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, rememberMe }),
      });

      if (res.ok) {
        const data = await res.json();
        // Simpan sesi lokal agar guard / konsisten (localStorage = carrier sesi frontend).
        const session = withExpiry(
          {
            user: data.user,
            menu: getMenuFor({ role: data.user.role.name, permissions: data.user.permissions }),
          },
          rememberMe
        );
        saveMockSession(session);
        return null;
      }

      const data = await res.json().catch(() => null);
      return data?.message ?? "Email atau password salah.";
    } catch {
      return "Gagal terhubung ke server. Silakan coba lagi.";
    }
  };

  return (
    <LoginGate
      onLogin={handleLogin}
      onSuccess={() => router.replace("/dashboard")}
      onCancel={() => router.push("/")}
      initialMessage={initialMessage}
      alreadyIn={Boolean(loadMockSession())}
    />
  );
}
