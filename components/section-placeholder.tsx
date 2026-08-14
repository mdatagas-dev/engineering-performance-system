"use client";

import Link from "next/link";

type SectionPlaceholderProps = {
  section: string;
  path: string;
};

export default function SectionPlaceholder({ section, path }: SectionPlaceholderProps) {
  return (
    <main className="xsp-main">
      <section className="xw-panel xsp-panel">
        <header className="xsp-panel__header">
          <h1 className="xw-panel__title xsp-panel__title">
            MAIN NAVIGATION &gt; {section}
            <span className="xsp-panel__breadcrumb">{path}</span>
          </h1>
        </header>
        <div className="xsp-panel__body">
          <p className="xsp-panel__message">
            Modul {section} belum tersedia — halaman ini adalah placeholder. Modul akan diisi pada
            pengembangan berikutnya.
          </p>
          <Link href="/dashboard" className="xsp-panel__back">
            &larr; Kembali ke Dashboard
          </Link>
        </div>
      </section>
      <style jsx>{`
        .xsp-main {
          display: flex;
          flex: 1;
          flex-direction: column;
          min-height: 0;
          overflow-y: auto;
          padding: 16px;
        }
        .xsp-panel {
          max-width: 720px;
        }
        .xsp-panel__title {
          font-size: 12px;
          line-height: 1.5;
        }
        .xsp-panel__breadcrumb {
          margin-left: 8px;
          padding-left: 8px;
          border-left: 1px solid rgba(255, 255, 255, 0.4);
          font-size: 11px;
          font-weight: normal;
          color: #d0e0ff;
        }
        .xsp-panel__body {
          padding: 16px;
        }
        .xsp-panel__message {
          margin: 0;
          font-size: 12px;
          line-height: 1.6;
          color: #333333;
        }
        .xsp-panel__back {
          display: inline-block;
          margin-top: 16px;
          font-size: 12px;
          color: var(--xw-blue, #0a246a);
          text-decoration: underline;
        }
        .xsp-panel__back:hover {
          color: var(--xw-blue-deep, #1e5bbf);
        }
      `}</style>
    </main>
  );
}
