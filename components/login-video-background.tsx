"use client";

import { useEffect, useRef, useState } from "react";

// Video background login dengan loop SEAMLESS via crossfade dua video.
// Video 12s tidak periodik eksak (partikel bergerak kontinu) — jump di titik
// sambung loop disamarkan dengan memudarkan video aktif ke video cadangan yang
// di-seek ke posisi senilai, lalu reset yang lama. Hasil: perpindahan halus
// tanpa lompatan visual.
//
// Sinkronisasi: video aktif di-seek maju; saat mendekati akhir (CROSSFADE_AT)
// video cadangan di-seek ke posisi OFFSET dan fade-in. Ketika video aktif
// selesai, di-reset ke 0 & disembunyikan; cadangan kini aktif — siklus ulang.

const CROSSFADE_AT = 10.5; // detik: mulai fade sebelum akhir (12s)
const FADE_MS = 1200; // durasi transisi opacity
const OFFSET = 9; // posisi video cadangan saat fade (≈ t - OFFSET)

export default function LoginVideoBackground() {
  const refA = useRef<HTMLVideoElement | null>(null);
  const refB = useRef<HTMLVideoElement | null>(null);
  const [showA, setShowA] = useState(true);
  const fading = useRef(false);

  useEffect(() => {
    const a = refA.current;
    const b = refB.current;
    if (!a || !b) return;

    const onTime = (active: HTMLVideoElement, idle: HTMLVideoElement) => {
      if (active.currentTime >= CROSSFADE_AT && !fading.current) {
        fading.current = true;
        const idleAt = Math.max(0.05, active.currentTime - OFFSET);
        try {
          idle.currentTime = idleAt;
        } catch {
          /* seek kadang tertahan — abaikan */
        }
        void idle.play().catch(() => undefined);
        // Video cadangan (idle) yang jadi terlihat.
        setShowA(active === b);
        // Setelah fade selesai, reset video lama (sudah tak terlihat).
        window.setTimeout(() => {
          const oldVideo = active === a ? a : b;
          const nextVideo = active === a ? b : a;
          oldVideo.pause();
          oldVideo.currentTime = 0;
          fading.current = false;
          void nextVideo.play().catch(() => undefined);
        }, FADE_MS + 150);
      }
    };

    a.addEventListener("timeupdate", () => onTime(a, b));
    b.addEventListener("timeupdate", () => onTime(b, a));
    return () => {
      a.removeEventListener("timeupdate", () => onTime(a, b));
      b.removeEventListener("timeupdate", () => onTime(b, a));
    };
  }, []);

  const base =
    "absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms]";

  return (
    <>
      <video
        ref={refA}
        className={`${base} ${showA ? "opacity-100" : "opacity-0"}`}
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src="/videos/login-bg.mp4" type="video/mp4" />
      </video>
      <video
        ref={refB}
        className={`${base} ${showA ? "opacity-0" : "opacity-100"}`}
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src="/videos/login-bg.mp4" type="video/mp4" />
      </video>
    </>
  );
}
