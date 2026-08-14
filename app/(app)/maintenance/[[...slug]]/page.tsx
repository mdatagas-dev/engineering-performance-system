"use client";

import { usePathname } from "next/navigation";
import SectionPlaceholder from "@/components/section-placeholder";
import { useSessionGuard } from "@/hooks/use-session-guard";

const SECTION = "Maintenance";

function toPath(raw: string): string {
  const rest = raw.replace(/^\/maintenance\/?/, "");
  if (!rest) return "/";
  return `/${rest
    .split(/[/-]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")}`;
}

export default function MaintenancePage() {
  const session = useSessionGuard("dashboard.view");
  const pathname = usePathname();

  if (!session) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  return <SectionPlaceholder section={SECTION} path={toPath(pathname)} />;
}
