"use client";

/** Banner demo XP — menandai halaman yang menampilkan DATA DEMO (mock),
 *  belum terhubung database produksi. Mencegah keputusan operasional
 *  diambil dari angka fiktif tanpa label. */
export default function DemoBanner({ note }: { note?: string }): React.ReactNode {
  return (
    <div
      role="status"
      className="xw-demo-banner"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 10,
        padding: "6px 10px",
        border: "1px solid #d98a2b",
        borderRadius: 0,
        background: "#fff8e1",
        color: "#7a4d00",
        font: "11px Tahoma, Arial, sans-serif",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 14 }}>
        ⚠
      </span>
      <span>
        <strong>DATA DEMO</strong> — halaman ini menampilkan data contoh (mock),
        belum terhubung database. {note ?? ""}
      </span>
    </div>
  );
}
