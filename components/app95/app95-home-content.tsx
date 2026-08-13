"use client";

import { useState, type ReactNode } from "react";

export type App95HomeProps = {
  user: { name: string; email: string; role: string };
  onNavigate?: (path: string) => void;
};

type Stat = { icon: string; label: string; value: string; unit: string; tip: string };
type Module = { icon: string; name: string; desc: string; path: string };
type Activity = { time: string; module: string; action: string; status: "OK" | "WARN" };

const STATS: Stat[] = [
  { icon: "▤", label: "Total Record Hari Ini", value: "1.248", unit: "records", tip: "Record yang masuk sejak 00:00. Angka demo." },
  { icon: "▦", label: "Output Produksi", value: "12.480", unit: "unit", tip: "Output terverifikasi hari ini. Angka demo." },
  { icon: "▧", label: "UPPH Rata-rata", value: "2,81", unit: "unit/jam", tip: "Unit per Person per Hour. Angka demo." },
  { icon: "▣", label: "Setup Time", value: "96", unit: "menit", tip: "Total waktu setup mesin. Angka demo." },
];

const MODULES: Module[] = [
  { icon: "◉", name: "Analytics", desc: "Grafik & analisis tren produksi", path: "/dashboard" },
  { icon: "▧", name: "Detail Produksi", desc: "Tabel detail per baris produksi", path: "/production-table" },
  { icon: "⌨", name: "Input Data", desc: "Entri & quick entry record", path: "/data-entry/records" },
  { icon: "⇅", name: "Impor/Ekspor", desc: "Transfer data batch", path: "/import" },
  { icon: "☰", name: "Audit Trail", desc: "Jejak aktivitas sistem", path: "/audit" },
  { icon: "⚙", name: "KPI", desc: "Indikator kinerja kunci", path: "/kpi" },
  { icon: "⌂", name: "Pengguna", desc: "Kelola akun & peran", path: "/users" },
  { icon: "◈", name: "Sesi", desc: "Sesi login aktif", path: "/sessions" },
  { icon: "▣", name: "Pengaturan", desc: "Konfigurasi aplikasi", path: "/settings" },
];

const ACTIVITIES: Activity[] = [
  { time: "08:42", module: "Input Data", action: "Tambah record L1_SHIFT_A", status: "OK" },
  { time: "08:37", module: "Detail Produksi", action: "Update output line 02", status: "OK" },
  { time: "08:31", module: "Impor/Ekspor", action: "Impor 240 baris (csv)", status: "OK" },
  { time: "08:15", module: "Audit Trail", action: "Login admin dari 10.0.0.14", status: "OK" },
  { time: "07:58", module: "Input Data", action: "Hapus record duplikat", status: "WARN" },
  { time: "07:44", module: "KPI", action: "Hitung ulang UPPH shift A", status: "OK" },
  { time: "07:20", module: "Sesi", action: "Sesi timeout setelah idle 30 mnt", status: "WARN" },
  { time: "06:59", module: "Pengguna", action: "Ubah peran operator-2", status: "OK" },
];

const TABS = ["Semua", "Produksi", "Sistem"];

export function App95HomeContent(props: App95HomeProps): ReactNode {
  const { user, onNavigate } = props;
  const [tab, setTab] = useState(0);
  const [notif, setNotif] = useState(true);
  const [period, setPeriod] = useState("Hari Ini");

  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const go = (path: string) => onNavigate?.(path);

  return (
    <div className="app95-scroll flex h-full flex-col gap-3 p-3">
      {/* Welcome bar */}
      <div className="app95-panel flex items-center justify-between gap-3 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-lg leading-none" data-tip="Menggunakan akun yang aktif">⌂</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">Selamat datang, {user.name}!</p>
            <p className="truncate text-xs text-[#404040]">{user.email}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="app95-badge" data-tip={`Peran: ${user.role}`}>{user.role}</span>
          <span className="app95-badge" data-tip="Waktu lokal workstation">🕑 {timeStr}</span>
        </div>
      </div>

      <div className="app95-panel flex items-center gap-2 px-3 py-1.5">
        <span className="text-xs leading-none" data-tip="Koneksi workgroup OK">▣</span>
        <p className="text-xs text-[#404040]">
          GAS ELECTRONIC Suite v1.8 · Workgroup: <span className="font-bold text-black">PRODUKSI</span> · {dateStr}
        </p>
        <span className="ml-auto hidden text-xs text-[#404040] sm:inline" data-tip="Bulan ini Anda membuka 4 modul berbeda. Semangat!">demo</span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="app95-card px-3 py-2" data-tip={s.tip}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-wide text-[#404040] uppercase">{s.label}</p>
              <span className="text-base leading-none" data-tip={s.tip}>{s.icon}</span>
            </div>
            <p className="app95-stat my-1 text-2xl font-bold" data-tip={s.tip}>{s.value}</p>
            <p className="text-[10px] text-[#404040]">{s.unit} · demo</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {/* Module grid */}
        <div className="app95-panel lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[#808080] px-3 py-1.5">
            <p className="text-sm font-bold">Modul Aplikasi</p>
            <span className="text-[10px] text-[#404040]">9 modul tersedia</span>
          </div>
          <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3">
            {MODULES.map((m) => (
              <button
                key={m.path}
                type="button"
                className="app95-btn flex h-full flex-col items-start gap-1 px-2 py-2 text-left"
                onClick={() => go(m.path)}
                data-tip={`Buka ${m.name} → ${m.path}`}
              >
                <span className="text-lg leading-none" aria-hidden>{m.icon}</span>
                <span className="text-xs font-bold">{m.name}</span>
                <span className="text-[10px] leading-tight text-[#404040]">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right column: System / Quick Tools */}
        <div className="flex flex-col gap-3">
          <div className="app95-panel">
            <div className="border-b border-[#808080] px-3 py-1.5">
              <p className="text-sm font-bold">Informasi Sistem</p>
            </div>
            <div className="flex flex-col gap-2 p-3">
              <div className="flex justify-between text-xs">
                <span className="text-[#404040]">OS</span>
                <span>GAS OS 98 SE (build 4.10)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#404040]">CPU</span>
                <span>Pentium II 400 MHz</span>
              </div>
              <div className="flex flex-col gap-0.5 text-xs">
                <span className="text-[#404040]">RAM 64 MB</span>
                <div className="app95-progress" role="progressbar" aria-valuenow={62} data-tip="62% RAM terpakai">
                  <div className="w-[62%]" />
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#404040]">Workgroup</span>
                <span>PRODUKSI</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#404040]">Free space</span>
                <span>1.2 GB</span>
              </div>
            </div>
          </div>

          <div className="app95-panel">
            <div className="border-b border-[#808080] px-3 py-1.5">
              <p className="text-sm font-bold">Quick Tools</p>
            </div>
            <div className="app95-tabs mx-3 mt-2" role="tablist">
              {TABS.map((t, i) => (
                <button key={t} type="button" role="tab" aria-selected={tab === i} onClick={() => setTab(i)} data-tip={`Filter ${t}`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 p-3">
              <label className="app95-check flex items-center gap-2 text-xs" data-tip="Bunyikan bunyi bip saat ada WARN">
                <input type="checkbox" checked={notif} onChange={(e) => setNotif(e.target.checked)} />
                Tampilkan notifikasi
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-[#404040]">Periode</span>
                <select className="app95-select" value={period} onChange={(e) => setPeriod(e.target.value)} data-tip="Periode yang dipakai di laporan">
                  {["Hari Ini", "Minggu Ini", "Bulan Ini"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>
              <div className="app95-divider" />
              <button type="button" className="app95-btn app95-btn--primary text-xs" onClick={() => go("/dashboard")} data-tip="Lihat grafik produksi">
                ◉ Buka Analytics
              </button>
              <button
                type="button"
                className="app95-btn text-xs"
                onClick={() => window.alert("Cetak laporan: demo. Print dialog Windows 95 dulu, ya?")}
                data-tip="Belum ada print preview — hanya demo"
              >
                🖨 Cetak Laporan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Activity table */}
      <div className="app95-panel">
        <div className="flex items-center justify-between border-b border-[#808080] px-3 py-1.5">
          <p className="text-sm font-bold">Aktivitas Terbaru</p>
          <span className="text-[10px] text-[#404040]" data-tip="Klik kanan tabel untuk menu konteks (mungkin)">Klik kanan = konteks</span>
        </div>
        <div className="app95-scroll max-h-56 overflow-auto">
          <table className="app95-table w-full">
            <thead>
              <tr>
                <th className="w-16">Waktu</th>
                <th className="w-32">Modul</th>
                <th>Aksi</th>
                <th className="w-20">Status</th>
              </tr>
            </thead>
            <tbody>
              {ACTIVITIES.map((a, i) => (
                <tr key={i} data-tip={a.status === "OK" ? "Aksi berhasil" : "Perlu perhatian — cek log audit"}>
                  <td className="font-mono">{a.time}</td>
                  <td>{a.module}</td>
                  <td>{a.action}</td>
                  <td>
                    <span className={`app95-badge ${a.status === "WARN" ? "app95-badge--warn" : ""}`}>{a.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="px-1 pb-1 text-center text-[10px] text-[#404040]" data-tip="Tidak, benar-benar tidak ada konteks menu di sini">
        Klik kanan tabel untuk menu konteks · Semua angka adalah data demo · GAS ELECTRONIC Suite v1.8
      </footer>
    </div>
  );
}

export default App95HomeContent;
