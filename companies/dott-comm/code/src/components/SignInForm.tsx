"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

/**
 * Client sign-in form: email magic link only (no passwords, no external IdP).
 * Replaces WorkOS AuthKit's hosted login. `callbackURL` is where Better Auth
 * returns the browser after a successful sign-in.
 */
export function SignInForm({ callbackURL }: { callbackURL: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    const { error } = await authClient.signIn.magicLink({ email, callbackURL });
    setStatus(error ? "error" : "sent");
  }

  if (status === "sent") {
    return (
      <div className="billing-card">
        <p className="billing-lede">
          Ti abbiamo inviato un link di accesso a <strong>{email}</strong>.
          Controlla la posta (anche lo spam) e clicca per entrare.
        </p>
      </div>
    );
  }

  return (
    <div className="billing-card">
      <form className="billing-cta-form" onSubmit={sendMagicLink}>
        <input
          type="email"
          required
          placeholder="nome@studio.it"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="billing-input"
          autoComplete="email"
        />
        <button
          type="submit"
          className="cta-btn cta-btn--big"
          disabled={status === "sending"}
        >
          {status === "sending" ? "Invio in corso…" : "Inviami il link"}
        </button>
        {status === "error" && (
          <span className="billing-note">
            Qualcosa è andato storto. Riprova tra poco.
          </span>
        )}
      </form>
    </div>
  );
}
