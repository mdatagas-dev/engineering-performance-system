// Mock data untuk halaman Support (Document Center, Training Modul,
// Announcement) — frontend-first, backend API belum ada. Data statis
// dibekukan agar tidak termutasi, pola sama seperti lib/mocks/dashboard.ts.

export type DocumentType = "SOP" | "WI" | "FORM" | "DRAWING";

export type SupportDocument = {
  name: string;
  type: DocumentType;
  version: string;
  owner: string;
  lastUpdate: string;
};

export type TrainingCategory = "SAFETY" | "PROCESS" | "QUALITY";

export type TrainingStatus = "AVAILABLE" | "IN PROGRESS" | "ARCHIVED";

export type Training = {
  code: string;
  title: string;
  category: TrainingCategory;
  durationMinutes: number;
  status: TrainingStatus;
  lastUpdate: string;
};

export type Announcement = {
  id: string;
  title: string;
  date: string;
  author: string;
  pinned: boolean;
  content: string;
};

export const DOCUMENT_TYPES: readonly DocumentType[] = ["SOP", "WI", "FORM", "DRAWING"];

export const TRAINING_CATEGORIES: readonly TrainingCategory[] = ["SAFETY", "PROCESS", "QUALITY"];

export const TRAINING_STATUSES: readonly TrainingStatus[] = [
  "AVAILABLE",
  "IN PROGRESS",
  "ARCHIVED",
];

export const documents: readonly SupportDocument[] = Object.freeze([
  Object.freeze({
    name: "SOP Produksi AC AN-05CDG",
    type: "SOP",
    version: "3.2",
    owner: "Dept. Produksi",
    lastUpdate: "2026-08-02",
  }),
  Object.freeze({
    name: "SOP Keselamatan Kerja Area Produksi",
    type: "SOP",
    version: "5.0",
    owner: "Dept. HSE",
    lastUpdate: "2026-07-30",
  }),
  Object.freeze({
    name: "SOP Inspeksi Incoming Material",
    type: "SOP",
    version: "2.1",
    owner: "Dept. Quality",
    lastUpdate: "2026-07-14",
  }),
  Object.freeze({
    name: "WI Pengujian Kebocoran Gas",
    type: "WI",
    version: "2.1",
    owner: "Dept. Quality",
    lastUpdate: "2026-08-06",
  }),
  Object.freeze({
    name: "WI Kalibrasi Torque Wrench",
    type: "WI",
    version: "1.4",
    owner: "Dept. Maintenance",
    lastUpdate: "2026-07-22",
  }),
  Object.freeze({
    name: "WI Setup Mesin Press",
    type: "WI",
    version: "1.8",
    owner: "Dept. Produksi",
    lastUpdate: "2026-07-11",
  }),
  Object.freeze({
    name: "FORM Inspeksi Akhir (FQC)",
    type: "FORM",
    version: "4.0",
    owner: "Dept. Quality",
    lastUpdate: "2026-08-10",
  }),
  Object.freeze({
    name: "FORM Checklist Startup Mesin",
    type: "FORM",
    version: "2.3",
    owner: "Dept. Produksi",
    lastUpdate: "2026-07-18",
  }),
  Object.freeze({
    name: "FORM Laporan Downtime Harian",
    type: "FORM",
    version: "1.2",
    owner: "Dept. Maintenance",
    lastUpdate: "2026-08-04",
  }),
  Object.freeze({
    name: "DWG AN-05CDG Frame Assembly",
    type: "DRAWING",
    version: "1.2",
    owner: "Dept. Engineering",
    lastUpdate: "2026-08-05",
  }),
  Object.freeze({
    name: "DWG AN-12CDG Panel Listrik",
    type: "DRAWING",
    version: "1.0",
    owner: "Dept. Engineering",
    lastUpdate: "2026-08-08",
  }),
  Object.freeze({
    name: "DWG Layout Lantai Produksi",
    type: "DRAWING",
    version: "0.9",
    owner: "Dept. Engineering",
    lastUpdate: "2026-07-20",
  }),
]);

export const trainings: readonly Training[] = Object.freeze([
  Object.freeze({
    code: "TR-001",
    title: "Keselamatan Kerja Mesin Press",
    category: "SAFETY",
    durationMinutes: 120,
    status: "AVAILABLE",
    lastUpdate: "2026-08-01",
  }),
  Object.freeze({
    code: "TR-002",
    title: "Penggunaan APD di Area Produksi",
    category: "SAFETY",
    durationMinutes: 60,
    status: "IN PROGRESS",
    lastUpdate: "2026-08-10",
  }),
  Object.freeze({
    code: "TR-003",
    title: "Prosedur Changeover Line AN",
    category: "PROCESS",
    durationMinutes: 90,
    status: "AVAILABLE",
    lastUpdate: "2026-07-25",
  }),
  Object.freeze({
    code: "TR-004",
    title: "Pengendalian Kualitas Statistik (SPC)",
    category: "QUALITY",
    durationMinutes: 180,
    status: "AVAILABLE",
    lastUpdate: "2026-07-28",
  }),
  Object.freeze({
    code: "TR-005",
    title: "Penanganan Material Berbahaya",
    category: "SAFETY",
    durationMinutes: 150,
    status: "ARCHIVED",
    lastUpdate: "2026-06-20",
  }),
  Object.freeze({
    code: "TR-006",
    title: "Dasar Pneumatik untuk Maintenance",
    category: "PROCESS",
    durationMinutes: 240,
    status: "IN PROGRESS",
    lastUpdate: "2026-08-12",
  }),
  Object.freeze({
    code: "TR-007",
    title: "Inspeksi Visual dan Dimensi",
    category: "QUALITY",
    durationMinutes: 120,
    status: "AVAILABLE",
    lastUpdate: "2026-08-03",
  }),
  Object.freeze({
    code: "TR-008",
    title: "Prosedur Tanggap Darurat Kebakaran",
    category: "SAFETY",
    durationMinutes: 60,
    status: "ARCHIVED",
    lastUpdate: "2026-05-15",
  }),
]);

export const announcements: readonly Announcement[] = Object.freeze([
  Object.freeze({
    id: "ANN-001",
    title: "Pemadaman Listrik Terjadwal Area Produksi",
    date: "2026-08-14",
    author: "Fasilitas & Maintenance",
    pinned: true,
    content:
      "Akan dilakukan pemadaman listrik terjadwal di area produksi pada Sabtu, 22 Agustus 2026 pukul 08.00 - 16.00 WIB untuk perawatan gardu induk.\n\nSeluruh mesin harus dimatikan sesuai prosedur shutdown dan area wajib ditinggalkan dalam kondisi aman. Koordinator line mohon memastikan checklist shutdown diisi lengkap sebelum jam 07.45.",
  }),
  Object.freeze({
    id: "ANN-002",
    title: "Pembaruan SOP Keselamatan Kerja (Revisi 5.0)",
    date: "2026-08-11",
    author: "Dept. HSE",
    pinned: true,
    content:
      "SOP Keselamatan Kerja Area Produksi telah diperbarui ke revisi 5.0 dan tersedia di Document Center.\n\nPerubahan utama: penambahan prosedur LOTO (Lockout Tagout) dan kewajiban penggunaan helm standar di area material handling. Semua karyawan diminta membaca dan menandatangani formulir pemahaman sebelum tanggal 25 Agustus 2026.",
  }),
  Object.freeze({
    id: "ANN-003",
    title: "Libur Nasional dan Cuti Bersama 17 Agustus 2026",
    date: "2026-08-06",
    author: "HRD",
    pinned: false,
    content:
      "Bertepatan dengan Hari Kemerdekaan RI, seluruh karyawan diliburkan pada Senin, 17 Agustus 2026.\n\nJadwal shift kembali normal pada Selasa, 18 Agustus 2026. Bagi bagian yang bertugas piket, mohon konfirmasi daftar personel ke HRD paling lambat 14 Agustus 2026.",
  }),
  Object.freeze({
    id: "ANN-004",
    title: "Pelatihan Keselamatan Wajib Bulan Agustus",
    date: "2026-08-04",
    author: "Dept. HSE",
    pinned: false,
    content:
      "Pendaftaran pelatihan \"Keselamatan Kerja Mesin Press\" (TR-001) dibuka hingga 20 Agustus 2026.\n\nPelatihan dilaksanakan dua sesi, peserta diwajibkan hadir minimal 90% dari durasi untuk mendapat sertifikat. Detail jadwal tersedia di halaman Training Modul.",
  }),
  Object.freeze({
    id: "ANN-005",
    title: "Pemeliharaan Preventif Mesin Line 3",
    date: "2026-07-29",
    author: "Dept. Maintenance",
    pinned: false,
    content:
      "Mulai pekan pertama Agustus 2026, Line 3 akan dijadwalkan pemeliharaan preventif setiap hari Sabtu.\n\nProduksi dialihkan sementara ke Line 4 dan Line 5. Koordinator produksi diminta menyesuaikan rencana output harian dan melaporkan hambatan ke Dept. Maintenance.",
  }),
]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  return DATE_RE.test(value);
}
