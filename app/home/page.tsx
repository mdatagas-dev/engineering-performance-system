"use client";

import { usePathname, useRouter } from "next/navigation";
import App95Shell, { type App95NavItem } from "@/components/app95/app95-shell";
import App95HomeContent from "@/components/app95/app95-home-content";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { clearMockSession } from "@/lib/mocks/accounts";

export default function HomePage() {
  const session = useSessionGuard();
  const router = useRouter();
  const pathname = usePathname();

  if (!session) {
    return (
      <div className="app95-boot" role="status" aria-live="polite">
        <div className="app95-boot__panel">
          <div className="app95-boot__sub">Memeriksa sesi...</div>
          <div className="app95-progress app95-progress--boot" role="progressbar" aria-label="Memeriksa sesi">
            <div className="app95-progress__bar" />
          </div>
        </div>
      </div>
    );
  }

  const onNavigate = (path: string) => router.push(path);
  const onLogout = () => {
    clearMockSession();
    router.replace("/login");
  };

  const navItems: App95NavItem[] = [
    { id: "dashboard", label: "Analytics", icon: "app", active: pathname === "/dashboard", onClick: () => onNavigate("/dashboard") },
    { id: "production-table", label: "Detail", icon: "file", active: pathname === "/production-table", onClick: () => onNavigate("/production-table") },
    { id: "data-entry", label: "Input Data", icon: "folder", active: pathname.startsWith("/data-entry"), onClick: () => onNavigate("/data-entry/records") },
    { id: "import", label: "Impor/Ekspor", icon: "folder", active: pathname === "/import", onClick: () => onNavigate("/import") },
    { id: "audit", label: "Audit", icon: "file", active: pathname === "/audit", onClick: () => onNavigate("/audit") },
    { id: "kpi", label: "KPI", icon: "file", active: pathname === "/kpi", onClick: () => onNavigate("/kpi") },
    { id: "users", label: "Pengguna", icon: "file", active: pathname === "/users", onClick: () => onNavigate("/users") },
    { id: "sessions", label: "Sesi", icon: "key", active: pathname === "/sessions", onClick: () => onNavigate("/sessions") },
    { id: "settings", label: "Pengaturan", icon: "gear", active: pathname === "/settings", onClick: () => onNavigate("/settings") },
  ];

  const menu = [
    { label: "File", items: ["Keluar"] },
    { label: "Edit", items: ["Salin", "Tempel"] },
    { label: "View", items: ["Refresh"] },
    { label: "Help", items: ["Tentang"] },
  ];

  const toolbar = [
    { label: "Analytics", icon: "app", action: () => onNavigate("/dashboard") },
    { label: "Cetak", icon: "file" },
    { label: "Keluar", icon: "key", action: onLogout },
  ];

  const status = [
    { label: "Siap", value: "OK" },
    { label: "Record", value: "1.248" },
  ];

  return (
    <App95Shell
      title="GAS ELECTRONIC Suite"
      icon="▦"
      menu={menu}
      toolbar={toolbar}
      navItems={navItems}
      status={status}
      userLabel={session.user.email}
      onLogout={onLogout}
    >
      <App95HomeContent
        user={{ name: session.user.name, email: session.user.email, role: session.user.role.name }}
        onNavigate={onNavigate}
      />
    </App95Shell>
  );
}
