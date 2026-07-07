import Image from "next/image";
import Link from "next/link";
import { CopyPromptButton } from "@/components/CopyPromptButton";

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
        <CopyPromptButton variant="nav" />
      </div>
    </nav>
  );
}
