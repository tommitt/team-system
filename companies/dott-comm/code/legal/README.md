# Legal — copy for the Privacy Policy & Terms

This folder holds the **source copy** for DottComm's two legal pages, as plain
Markdown you can review and edit on its own. The pages are **already built into
the Next.js app** and rendered from this copy.

| Doc (source of truth) | Live route | Page component |
| --- | --- | --- |
| [`privacy-policy.md`](./privacy-policy.md) — Informativa sulla Privacy | `/privacy` | `app/privacy/page.tsx` |
| [`terms-and-conditions.md`](./terms-and-conditions.md) — Termini e Condizioni | `/termini` | `app/termini/page.tsx` |

Both pages are linked from the site footer (`components/SiteFooter.tsx`), so they
show on every page just like on any other website.

## For whoever deploys the site

Nothing extra to build — the routes and footer links already exist. Two things to
remember when you ship to prod:

1. **These pages must go live before you turn on Stripe.** Stripe requires a
   publicly reachable Privacy Policy and Terms & Conditions before it will accept
   payments. After deploy, verify `https://<domain>/privacy` and
   `https://<domain>/termini` both load.
2. **Register the two URLs in Stripe** (account / business settings) once live.

## Notes

- The Markdown here is the **single source of truth** for the legal text. If you
  change a doc, update the matching page component (`app/privacy/page.tsx` or
  `app/termini/page.tsx`) so the two never drift apart, and keep the
  "Ultimo aggiornamento" date in sync in both places.
- The only contact reference in both docs is **info@dottcomm.dev** — please keep
  it that way and don't add other addresses, phone numbers or identifiers.
