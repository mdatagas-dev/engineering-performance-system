"use client";

import { useState } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { announcements } from "@/lib/mocks/support";
import DemoBanner from "@/components/demo-banner";


export default function AnnouncementPage() {
  const session = useSessionGuard("dashboard.view");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  if (!session) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  const sorted = [...announcements].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.date < b.date ? 1 : -1;
  });

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <main className="xps-page">

      <DemoBanner note="Data berasal dari lib/mocks/support.ts." />
      <section className="xw-panel">
        <h2 className="xw-panel__title">Announcement</h2>
        <div className="xps-pad">
          {sorted.map((a) => {
            const open = expanded.has(a.id);
            return (
              <article key={a.id} className={`xps-item${a.pinned ? " xps-item-pinned" : ""}`}>
                <div className="xps-head">
                  {a.pinned && <span className="xps-pin">PIN</span>}
                  <h3 className="xps-title">{a.title}</h3>
                </div>
                <div className="xps-meta">
                  {a.author} | {a.date}
                </div>
                {open && <p className="xps-content">{a.content}</p>}
                <button className="xps-toggle" onClick={() => toggle(a.id)}>
                  {open ? "Sembunyikan Isi" : "Perlihatkan Isi"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <style jsx>{`
        .xps-page {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-family: Tahoma, "Segoe UI", Arial, sans-serif;
          font-size: 11px;
          color: #1a1a1a;
        }
        .xps-pad {
          padding: 8px;
        }
        .xps-item {
          border: 1px solid #a7a7a7;
          background: #fff;
          padding: 6px 8px;
          margin-bottom: 8px;
        }
        .xps-item-pinned {
          border-color: #6f94d6;
        }
        .xps-head {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .xps-pin {
          display: inline-block;
          padding: 0 5px;
          border: 1px solid #c8a13a;
          background: #ffdf80;
          color: #4d3800;
          font-size: 9px;
          font-weight: bold;
          letter-spacing: 0.04em;
        }
        .xps-title {
          margin: 0;
          font-size: 12px;
          font-weight: bold;
          color: #0a246a;
        }
        .xps-meta {
          margin-top: 2px;
          color: #555;
        }
        .xps-content {
          margin: 6px 0 4px;
          white-space: pre-line;
          line-height: 1.5;
        }
        .xps-toggle {
          margin-top: 4px;
          border: 1px solid #7f9db9;
          background: linear-gradient(to bottom, #f5f4ee, #d8d5cb);
          color: inherit;
          font-family: inherit;
          font-size: 11px;
          padding: 1px 8px;
          cursor: pointer;
        }
        .xps-toggle:hover {
          background: #fff;
        }
        .xps-toggle:active {
          box-shadow: inset 1px 1px 0 #9c9c9c;
        }
      `}</style>
    </main>
  );
}
