"use client";

import { useState } from "react";

/**
 * OAuth 2.1 consent screen for MCP clients (shown during the Dynamic Client
 * Registration authorize flow). Better Auth redirects here with `consent_code`,
 * `client_id`, and `scope` query params once the user is signed in; on decision
 * we POST to the Better Auth consent endpoint, which returns the `redirectURI`
 * back to the MCP client (with an auth code on accept, an error on deny).
 */
export function ConsentForm({
  clientId,
  scopes,
  consentCode,
}: {
  clientId: string;
  scopes: string[];
  consentCode: string;
}) {
  const [busy, setBusy] = useState(false);

  async function decide(accept: boolean) {
    setBusy(true);
    const res = await fetch("/api/auth/oauth2/consent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accept, consent_code: consentCode }),
      credentials: "include",
    });
    const data: { redirectURI?: string } = await res.json().catch(() => ({}));
    if (data.redirectURI) {
      window.location.href = data.redirectURI;
      return;
    }
    setBusy(false);
  }

  return (
    <div className="billing-card">
      <p className="billing-lede">
        L&apos;applicazione <strong>{clientId}</strong> chiede di accedere al tuo
        account DottComm per usare gli strumenti a tuo nome.
      </p>
      {scopes.length > 0 && (
        <ul className="consent-scopes">
          {scopes.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
      <div className="billing-cta-form">
        <button
          type="button"
          className="cta-btn cta-btn--big"
          onClick={() => decide(true)}
          disabled={busy}
        >
          {busy ? "Attendere…" : "Autorizza"}
        </button>
        <button
          type="button"
          className="billing-note consent-deny"
          onClick={() => decide(false)}
          disabled={busy}
        >
          Annulla
        </button>
      </div>
    </div>
  );
}
