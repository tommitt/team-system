import Image from "next/image";
import Link from "next/link";
import { ScrollLink } from "@/components/ScrollLink";

/** Shared footer. Legal links live here so they show on every page. */
export function SiteFooter() {
  return (
    <footer>
      <div className="footer-inner">
        <Link className="logo" href="/">
          <Image src="/logo.svg" alt="DottComm" width={26} height={26} />
          <span className="logo-word">
            Dott<b>Comm</b>
          </span>
        </Link>
        <nav className="footer-links" aria-label="Navigazione footer">
          <ScrollLink targetId="usi" href="/#usi">Cosa fa</ScrollLink>
          <ScrollLink targetId="prezzi" href="/#prezzi">Prezzi</ScrollLink>
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
