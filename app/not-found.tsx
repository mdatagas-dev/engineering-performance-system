import Link from "next/link";

export default function NotFound() {
  return (
    <div className="nf-root">
      <div className="gate-dialog nf-dialog" role="alertdialog" aria-labelledby="nf-title">
        <div className="gate-titlebar">
          <span className="gate-titlebar__icon" aria-hidden="true">
            ⚠
          </span>
          <span id="nf-title">File not found</span>
        </div>
        <div className="gate-dialog__body">
          <div className="gate-row">
            <span className="nf-warn" aria-hidden="true">
              ⚠
            </span>
            <div>
              <p className="nf-code">404 — FILE NOT FOUND</p>
              <p className="gate-msg">The page you requested does not exist on this computer.</p>
            </div>
          </div>
          <div className="gate-actions">
            <Link href="/" className="gate-btn gate-btn--default gate-btn-link" title="Kembali ke desktop">
              OK
            </Link>
          </div>
          <p className="nf-alt">
            <Link href="/login">Buka Access Terminal</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
