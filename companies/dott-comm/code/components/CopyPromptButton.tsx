"use client";

import { useEffect, useRef, useState } from "react";
import { AGENT_PROMPT } from "@/lib/prompt";

const DEFAULT_LABEL = "Copia il prompt e incollalo su Claude";
const NAV_LABEL = "Copia il prompt";
const COPIED_LABEL = "Copiato. Incolla ora.";

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

export function CopyPromptButton({ variant }: { variant: "nav" | "big" }) {
  const defaultLabel = variant === "nav" ? NAV_LABEL : DEFAULT_LABEL;
  const [label, setLabel] = useState(defaultLabel);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleClick() {
    const done = () => {
      setLabel(COPIED_LABEL);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setLabel(defaultLabel), 1900);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(AGENT_PROMPT).then(done, () => {
        fallbackCopy(AGENT_PROMPT);
        done();
      });
    } else {
      fallbackCopy(AGENT_PROMPT);
      done();
    }
  }

  return (
    <button
      className={`cta-btn ${variant === "big" ? "cta-btn--big" : "cta-btn--nav"}`}
      type="button"
      onClick={handleClick}
    >
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="9" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
        <path d="M3 9.5V3.6C3 3.27 3.27 3 3.6 3h5.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
