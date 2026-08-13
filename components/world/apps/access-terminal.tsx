"use client";

import { useRef, useState, type ReactNode } from "react";
import Win95Icon from "../win95-icons";

type Props = { onLogin: () => void };

export function AccessTerminalApp({ onLogin }: Props): ReactNode {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [tip, setTip] = useState(false);
  const userRef = useRef<HTMLInputElement | null>(null);

  const submit = () => {
    if (!user.trim() || !pass.trim()) {
      setErr("Nama pengguna dan sandi wajib diisi.");
      userRef.current?.focus();
      return;
    }
    setErr(null);
    onLogin();
  };

  return (
    <div className="win95-app win95-login">
      <div className="win95-login__icon" aria-hidden>
        <Win95Icon name="access-terminal" size={48} />
      </div>
      <div className="win95-login__title">
        <p className="win95-login__name">Welcome to THE WORLD</p>
        <p className="win95-login__sub">GAS ELECTRONIC OS · akses ke dunia dalam</p>
      </div>
      <div className="win95-login__form">
        <label className="win95-login__field">
          <span className="win95-login__label">User name:</span>
          <input
            ref={userRef}
            className="win95-login__input"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            autoFocus
            autoComplete="off"
            aria-label="Nama pengguna"
          />
        </label>
        <label className="win95-login__field">
          <span className="win95-login__label">Password:</span>
          <input
            type="password"
            className="win95-login__input"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            autoComplete="off"
            aria-label="Sandi"
          />
        </label>
        {err && <p className="win95-login__err">{err}</p>}
        <div className="win95-login__actions">
          <button type="button" className="win95-btn" onClick={submit}>
            OK
          </button>
          <button type="button" className="win95-btn" onClick={() => undefined}>
            Cancel
          </button>
        </div>
      </div>
      <div className="win95-login__hintwrap">
        <button
          type="button"
          className="win95-login__hint"
          onClick={() => setTip((t) => !t)}
          title="Membuka pengelola tugas…"
        >
          Tekan Ctrl+Alt+Del untuk memulai
        </button>
        {tip && (
          <div className="win95-login__tooltip" role="note">
            Pengelola tugas tidak mau dibuka. 😉 Username apa pun boleh — dunia menilai dari tindakan, bukan nama. Rahasia sesungguhnya: konami code, atau klik logo GAS ELECTRONIC 3×.
          </div>
        )}
      </div>
    </div>
  );
}
