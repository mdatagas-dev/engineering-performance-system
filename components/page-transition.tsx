"use client";

import { usePathname } from "next/navigation";

// Transisi antar halaman (App Router tidak mendukung exit animation tanpa lib):
// saat pathname berubah, konten di-remount dgn key baru → CSS animation
// page-enter (fade + slide halus) jalan tiap navigasi. Menghormati
// prefers-reduced-motion (lihat globals.css).
export default function PageTransition({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter flex min-w-0 flex-1 flex-col">
      {children}
    </div>
  );
}
