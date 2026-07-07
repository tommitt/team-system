"use client";

import { useEffect, useRef, useState } from "react";
import { CONNECTOR_URL } from "@/lib/prompt";

function fallbackCopy(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch {
    // no clipboard support left to fall back to
  }
  document.body.removeChild(ta);
}

/**
 * Shows the connector URL as a field with a copy icon on the right; the icon
 * turns into a tick for ~1.9s after a successful copy.
 */
export function CopyConnectorButton() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleClick() {
    const done = () => {
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 1900);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(CONNECTOR_URL).then(done, () => {
        fallbackCopy(CONNECTOR_URL);
        done();
      });
    } else {
      fallbackCopy(CONNECTOR_URL);
      done();
    }
  }

  return (
    <button
      className={`url-copy-field${copied ? " is-copied" : ""}`}
      type="button"
      onClick={handleClick}
      aria-label={copied ? "URL copiato" : "Copia l'URL del connettore"}
    >
      <span className="url-copy-text">{CONNECTOR_URL}</span>
      <span className="url-copy-icon" aria-hidden="true">
        {copied ? (
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" fill="none">
            <rect x="4" y="4" width="9" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
            <path d="M3 9.5V3.6C3 3.27 3.27 3 3.6 3h5.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        )}
      </span>
    </button>
  );
}
