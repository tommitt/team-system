"use client";

import { useEffect, useRef } from "react";

const WORDS = [
  { text: "Claude Code", color: "#d97757" },
  { text: "Codex", color: "#2f6df6" },
  { text: "Hermes", color: "#c9a227" },
  { text: "OpenClaw", color: "#e5484d" },
];

export function AgentReel() {
  const reelRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const reel = reelRef.current;
    const track = trackRef.current;
    if (!reel || !track) return;

    function sizeReel() {
      let widest = 0;
      track!.querySelectorAll<HTMLElement>(".reel-item").forEach((el) => {
        widest = Math.max(widest, el.getBoundingClientRect().width);
      });
      reel!.style.width = `${Math.ceil(widest) + 10}px`;
    }

    if (document.fonts?.ready) {
      document.fonts.ready.then(sizeReel);
    }
    const sizeTimers = [setTimeout(sizeReel, 400), setTimeout(sizeReel, 1200)];

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0;
    let stepTimeout: ReturnType<typeof setTimeout> | null = null;

    function step() {
      i++;
      track!.classList.add("spinning");
      track!.style.transform = `translateY(-${i * 1.08}em)`;

      if (i === WORDS.length) {
        stepTimeout = setTimeout(() => {
          track!.style.transition = "none";
          i = 0;
          track!.style.transform = "translateY(0em)";
          void track!.offsetHeight;
          track!.style.transition = "";
          track!.classList.remove("spinning");
        }, 640);
      } else {
        stepTimeout = setTimeout(() => track!.classList.remove("spinning"), 640);
      }
    }

    window.addEventListener("resize", sizeReel);
    sizeReel();

    let interval: ReturnType<typeof setInterval> | null = null;
    if (!reduceMotion) interval = setInterval(step, 2000);

    return () => {
      window.removeEventListener("resize", sizeReel);
      sizeTimers.forEach(clearTimeout);
      if (stepTimeout) clearTimeout(stepTimeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <span className="line2 reel" ref={reelRef} aria-label="Claude Code, Codex, Hermes, OpenClaw">
      <span className="reel-track" ref={trackRef}>
        {[...WORDS, WORDS[0]].map((w, idx) => (
          <span className="reel-item" key={idx} style={{ color: w.color }}>
            {w.text}
          </span>
        ))}
      </span>
    </span>
  );
}
