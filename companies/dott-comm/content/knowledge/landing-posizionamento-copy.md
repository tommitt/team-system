---
title: Landing — posizionamento e regole di copy
status: active
owner: ttassi
updated: 2026-07-07
tags: [landing, marketing, comms, copy, posizionamento, sito]
---

# Landing — posizionamento e regole di copy

Riferimento vivo per la copy della landing (`code/src/app/page.tsx` +
`code/src/components/FaqAccordion.tsx`). Il codice resta la fonte di verità; qui
sta il *perché* delle scelte, così le sessioni future non le rifanno da capo.

## Posizionamento

DottComm si presenta come **«L'estensione di Claude per i Commercialisti»**, non
come un'app AI generica. La scelta è deliberata: prende in prestito la
credibilità e la familiarità di Claude e spiega il modello d'uso (installi
Claude → colleghi il connettore → lavori parlando). «Claude» è colorato con
l'accent terracotta (`--claude`) nel titolo.

Regole che discendono dal posizionamento:

- **Il claim «estensione» va reso concreto.** L'hero-sub dice esplicitamente
  *«Aggiunge a Claude gli strumenti dello studio…»*; la fine-print rafforza che
  vive dentro Claude. Non lasciare «estensione» come parola vuota.
- **Vocabolario a due livelli, intenzionale:** in marketing è *estensione*, nel
  flusso d'installazione e nelle FAQ è *connettore* (il termine letterale del
  menu di Claude). Coerente, non un errore.
- **Un solo connettore, più superfici.** Lo stesso connettore funziona allo
  stesso modo nell'app Claude, in **Claude Code** e in **Claude Cowork** — detto
  nella FAQ «Cos'è DottComm?». È un MCP remoto, quindi è vero per costruzione.
- La FAQ «Cos'è DottComm?» è aperta di default: la prima cosa che si legge è il
  posizionamento.

## Regola d'oro: la copy riflette gli strumenti reali

**Ogni feature/uso elencato sul sito deve corrispondere a uno strumento MCP
davvero registrato** in `code/src/lib/mcp/tools.ts` — mai funzionalità
aspirazionali. In questa sessione la sezione feature e una FAQ elencavano
*«quadrature e riconciliazioni»* e *«LIPE ed esterometro»*: nessuno dei due esiste
come tool. Sostituiti con capacità reali (atti/cartelle, ravvedimento).

Prima di pubblicare copy di prodotto, controlla l'elenco in `tools.ts`. Gli
strumenti utente-facing oggi (vedi anche
[catalogo-skills-tools](../brainstorms/catalogo-skills-tools.md)):

| Copy sul sito | Tool MCP |
|---|---|
| F24 e acconti | `prospetto_acconti` |
| Solleciti ai clienti | `raccolta_documenti` |
| Scadenzario cliente | `scadenze_cliente` |
| Atti e cartelle | `triage_atto` |
| Ravvedimento operoso | `ravvedimento` |
| Lettura documenti | `estrai_documenti` |

(Non ancora sulla landing ma reale: `comunica_versamenti`.)

## Convenzioni tipografiche IT

- **Niente trattino lungo `—`** nella copy italiana: usa parentesi, virgole o due
  punti. (Vale per il testo utente-facing; commenti e output degli strumenti sono
  fuori scope.)
- Le frecce dei bottoni CTA seguono la direzione dello scroll: hero → freccia giù
  (installazione è sotto); closing CTA → freccia su (installazione è sopra).
  Componente `Arrow` con prop `up` in `page.tsx`.
