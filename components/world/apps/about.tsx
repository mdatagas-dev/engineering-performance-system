"use client";

import type { ReactNode } from "react";

type Props = { onClose: () => void };

export function AboutApp({ onClose }: Props): ReactNode {
  return (
    <div className="win95-app win95-about">
      <div className="win95-about__main">
        <div className="win95-about__icon" aria-hidden>
          GE
        </div>
        <div className="win95-about__text">
          <p className="win95-about__name">GAS ELECTRONIC OS</p>
          <p className="win95-about__ver">Version 95.0 (Build 1998)</p>
          <p className="win95-about__copy">© 1998-2026 GAS ELECTRONIC</p>
          <p className="win95-about__line">
            Engineering Production System — THE WORLD. Satu OS yang hidup di
            dalam dunia arsip produksi.
          </p>
          <p className="win95-about__dim">
            Kinerja: khayalan murni. Stabilitas: legendaris.
          </p>
        </div>
      </div>
      <div className="win95-about__actions">
        <button type="button" className="win95-btn" onClick={onClose}>
          OK
        </button>
        <button type="button" className="win95-btn" onClick={() => undefined}>
          System Info…
        </button>
      </div>
    </div>
  );
}
