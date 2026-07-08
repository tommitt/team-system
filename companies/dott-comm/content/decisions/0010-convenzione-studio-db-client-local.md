# 0010 — La convenzione `studio/`: lo stato dello studio come file markdown client-local

- **Status:** accepted
- **Date:** 2026-07-07
- **Owner:** ttassi
- **Extends:** [ADR 0003](0003-track-a-stateless-client-local-state.md) (stato client-local, zero dati fiscali server-side)

## Context

ADR 0003 ha stabilito che il server MCP non persiste mai dati fiscali dello
studio: lo stato vive nei file dello studio, gestiti dal client (Claude Code).
Finché i tool erano single-client la convenzione poteva restare implicita
("tienilo in un file"). Con i loop in forma **campagna** (L1/L2 sul
portafoglio), lo scadenzario derivato (`scadenze_cliente`) e i futuri watchdog
(W2/W3), serve una convenzione **esplicita e condivisa**: senza uno schema
comune, ogni sessione inventerebbe il suo formato e lo stato non si
accumulerebbe tra sessioni — né sarebbe leggibile dal professionista.

Il brainstorm [test-della-giornata](../brainstorms/test-della-giornata-valore-quotidiano.md)
ha inoltre fissato il corollario: la "magia" percepita (sapere cosa è arrivato,
riprendere una campagna) deve venire dal client che legge i file dello studio,
non da stato server-side.

## Decision

Lo stato operativo dello studio vive in una cartella **`studio/`** nella
workspace del cliente, in **markdown** (tabelle), mantenuta dal client secondo
il prompt MCP **`convenzione_studio_db`** (ungated, in `src/lib/mcp/prompts.ts`):

- `studio/clienti.md` — anagrafica con gli attributi che alimentano
  `scadenze_cliente` e le campagne (`Cliente | Regime | Forma | IVA | Sostituto | INPS art/comm | Immobili | Note`).
- `studio/scadenzario.md` — la matrice cliente × adempimento × scadenza ×
  assegnatario × stato; alimentata da `scadenze_cliente` e `triage_atto`.
- `studio/raccolta/<campagna>.md` — stato delle campagne di raccolta documenti.
- `studio/versamenti/<scadenza>.md` — tracking inviata/confermata delle
  comunicazioni di versamento.

Regole: date assolute (YYYY-MM-DD), una riga per item aggiornata in place (è
l'audit trail dello studio), lettura dello stato prima di riprendere una
campagna, derivazione di `documenti_presenti` dalla scansione della cartella
documenti quando possibile.

Perché markdown e non JSON/CSV: il professionista deve poterlo leggere e
correggere senza strumenti; le tabelle markdown sono robuste da parsare per il
client; il diff in un eventuale repo dello studio resta leggibile.

## Consequences

- I tool restano puri (ADR 0003 confermato): ricevono lo stato come argomenti e
  restituiscono istruzioni di aggiornamento dei file — il server non vede mai i
  contenuti di `studio/`.
- Ogni nuova capability con stato (watchdog W2/W3, campagne future) deve
  dichiarare nel proprio output QUALE file `studio/` aggiornare, e il prompt
  `convenzione_studio_db` va esteso di conseguenza: è lui la source of truth
  dello schema.
- La convenzione è v0: va **validata al gate G-pilota** (uno studio reale che
  la usa per una campagna intera). Se emergono trigger concreti (watchdog
  always-on, client senza filesystem, multi-utente live) la migrazione a stato
  server-side resta la strada prevista da ADR 0003.
- Limite noto: niente lock/concorrenza — due sessioni parallele sullo stesso
  file possono confliggere; accettabile per lo studio piccolo, da rivedere col
  multi-utente.
