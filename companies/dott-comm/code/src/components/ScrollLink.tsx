"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Link that smooth-scrolls to an in-page target (e.g. the install steps or the
 * use-cases grid). We scroll the element directly on every click so repeat
 * clicks keep working — a plain hash link is a no-op once the URL already
 * carries that hash. When the target isn't on the current page (e.g. a footer
 * link on a legal page), we let the `<Link>` navigate to `href` instead.
 */
export function ScrollLink({
  targetId,
  href,
  className,
  children,
}: {
  targetId: string;
  href: string;
  className?: string;
  children: ReactNode;
}) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = document.getElementById(targetId);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <Link className={className} href={href} onClick={handleClick}>
      {children}
    </Link>
  );
}
