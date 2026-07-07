import Link from "next/link";

/** Shared footer. Legal links live here so they show on every page. */
export function SiteFooter() {
  return (
    <footer>
      <div className="footer-inner">
        <nav className="footer-links" aria-label="Note legali">
          <Link href="/privacy">Privacy</Link>
          <Link href="/termini">Termini e Condizioni</Link>
        </nav>
        <div className="footer-meta">
          <span>© 2026 DottComm</span>
          <a href="mailto:info@dottcomm.dev">info@dottcomm.dev</a>
        </div>
      </div>
    </footer>
  );
}
