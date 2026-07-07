import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/** Shared nav + footer chrome for the billing pages (/upgrade, /account). */
export function BillingShell({ children }: { children: ReactNode }) {
  return (
    <>
      <nav>
        <div className="nav-inner">
          <Link className="logo" href="/">
            <Image src="/logo.svg" alt="DottComm" width={27} height={27} priority />
            <span className="logo-word">
              Dott<b>Comm</b>
            </span>
          </Link>
        </div>
      </nav>

      <main className="billing-main">
        <div className="billing-inner">{children}</div>
      </main>

      <footer>
        <div className="footer-inner">
          <div className="footer-meta">
            <span>© 2026 DottComm</span>
            <a href="mailto:info@dottcomm.dev">info@dottcomm.dev</a>
          </div>
        </div>
      </footer>
    </>
  );
}
