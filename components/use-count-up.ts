"use client";

import { useEffect, useState } from "react";

// Animasi angka naik (count-up) saat nilai muncul — ease-out cubic. Otomatis
// nonaktif saat prefers-reduced-motion (langsung ke nilai akhir).
export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Lewat rAF agar setState tidak sinkron di dalam effect (lint
      // react-hooks/set-state-in-effect); hasil visual tetap: langsung nilai akhir.
      requestAnimationFrame(() => setValue(target));
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
