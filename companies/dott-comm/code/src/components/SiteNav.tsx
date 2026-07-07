import Image from "next/image";
import Link from "next/link";
import { StartButton } from "@/components/StartButton";
import { ScrollLink } from "@/components/ScrollLink";

/** Shared top nav used by the home page and the legal pages. */
export function SiteNav() {
  return (
    <nav>
      <div className="nav-inner">
        <Link className="logo" href="/">
          <Image src="/logo.svg" alt="DottComm" width={27} height={27} priority />
          <span className="logo-word">
            Dott<b>Comm</b>
          </span>
        </Link>
        <div className="nav-links">
          <ScrollLink targetId="usi" href="/#usi" className="nav-link">
            Cosa fa
          </ScrollLink>
          <ScrollLink targetId="prezzi" href="/#prezzi" className="nav-link">
            Prezzi
          </ScrollLink>
          <StartButton variant="nav" />
        </div>
      </div>
    </nav>
  );
}
