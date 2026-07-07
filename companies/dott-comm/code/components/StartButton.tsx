"use client";

/**
 * Primary CTA: scrolls to the installation steps (`#installazione`) instead of
 * copying anything. The actual copy-the-prompt action lives in step 03.
 *
 * We scroll the element directly on every click so repeat clicks keep working
 * (a plain hash link is a no-op once the URL already carries the hash). On the
 * legal pages the element isn't present, so we fall back to navigating to
 * `/#installazione`.
 */
export function StartButton({ variant }: { variant: "nav" | "big" }) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = document.getElementById("installazione");
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <a
      className={`cta-btn ${variant === "big" ? "cta-btn--big" : "cta-btn--nav"}`}
      href="/#installazione"
      onClick={handleClick}
    >
      <span>Inizia ora</span>
      {variant === "big" && (
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 3v9m0 0 3.5-3.6M8 12 4.5 8.4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </a>
  );
}
