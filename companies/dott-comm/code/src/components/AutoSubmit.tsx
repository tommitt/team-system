"use client";

import { useEffect, useRef } from "react";

/**
 * Submits the enclosing form as soon as it mounts. Client-side on purpose:
 * link-preview bots don't run JS, so a prefetched URL never triggers the
 * form's action (e.g. creating a Stripe Checkout session on /upgrade).
 */
export function AutoSubmit() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    ref.current?.closest("form")?.requestSubmit();
  }, []);

  return <span ref={ref} hidden />;
}
