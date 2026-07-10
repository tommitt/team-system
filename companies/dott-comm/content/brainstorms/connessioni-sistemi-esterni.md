---
title: Connessioni verso sistemi esterni — connettori Claude vs integrazioni ospitate
status: draft
owner: ttassi
updated: 2026-07-08
tags: [mcp, connettori, integrazioni, auth, gdpr, pec, gestionali, esplorazione]
---

# Connessioni verso sistemi esterni — connettori Claude vs integrazioni ospitate

> Brainstorm — exploratory, not a decision. When this resolves, capture the
> outcome as an ADR in `decisions/` and fold it into `knowledge/`.

## Problem / question

Gli utenti di DottComm avranno bisogno di collegare Claude a sistemi esterni —
email, Google Drive, calendario, PEC, gestionali. Come li connettiamo perché
l'esperienza in Claude sia il più seamless possibile? Le opzioni sul tavolo:

- **A. Integrazione ospitata da noi** — raggiungiamo le API di terzi (o
  ospitiamo i loro MCP) dal nostro server; gestiamo noi l'auth e i token.
- **B. Connettori Claude dell'utente** — l'utente collega Gmail/Drive/Calendar
  (first-party) o connettori della Directory nel *suo* account Claude; i nostri
  prompt/skill guidano il collegamento e compongono i tool in-context.
- **C. MCP locali client-side** — per studi pilota su Claude Code: MCP open
  source eseguiti in locale con credenziali locali (mai sui nostri server).
- **D. Secondo connettore custom ospitato da noi** — quando dobbiamo davvero
  detenere credenziali di terzi, lo spediamo come connettore remoto separato
  sotto il nostro stack auth (Better Auth, [ADR 0012](../decisions/0012-mcp-auth-better-auth-self-hosted.md)),
  con la stessa UX di installazione di DottComm (incolla URL → OAuth).

## Leaning toward

**Default = B (connettori Claude dell'utente) per i sistemi commodity; A/D solo
per le superfici italiane che nessun connettore coprirà mai, ciascuna dietro una
propria ADR quando un pilota la richiede; C come ponte per i piloti su Claude
Code.**

La regola di decisione proposta: **costruiamo/ospitiamo un'integrazione solo se
(a) non esiste — né plausibilmente esisterà — un connettore nella Directory, e
(b) la capability è sul critical path di un pilota.** Estende il principio di
[ADR 0003](../decisions/0003-track-a-stateless-client-local-state.md): non solo
i *dati* dello studio restano dello studio — anche le sue *credenziali* restano
con lo studio (nel suo account Claude o sulla sua macchina).

## Perché NON ospitare noi email/Drive (opzione A per i commodity)

1. **Rompe ADR 0003.** Detenere token OAuth che aprono l'intera mailbox e il
   file store dello studio è la versione massimale della PII che abbiamo deciso
   di non toccare: da "non vediamo mai dati fiscali" a "siamo data processor
   del canale più sensibile dello studio".
2. **Frizione esterna pura** (il criterio di prioritizzazione di questa
   company): gli scope Gmail sono *restricted scopes* Google → verifica app +
   **CASA security assessment annuale** (Tier 2 ~$500–1.000/anno, rinnovo ogni
   12 mesi) prima dell'accesso broad. Anthropic ha già pagato questo costo per
   noi con i connettori first-party.
3. **UX duplicata:** l'utente farebbe OAuth su DottComm *e poi di nuovo* su
   Google attraverso di noi, per una capability che Claude gli offre nativa.

## Perché B combacia con l'architettura esistente

- I connettori first-party **Gmail, Calendar e Drive sono GA** (da ~feb 2026)
  per tutti gli utenti Claude e Claude Desktop; la Connectors Directory ha 400+
  app. Auth, token storage, CASA e ruolo GDPR li porta Anthropic.
- **Il modello di composizione è già il nostro:** i tool sono funzioni pure
  (ADR 0003), Claude è la colla che legge/scrive lo stato `studio/`
  ([ADR 0010](../decisions/0010-convenzione-studio-db-client-local.md)). Con i
  connettori, Claude porta l'estratto conto da Drive o il thread email
  *in-context*, alimenta i nostri tool, e smista l'output tramite il Gmail
  dell'utente. Il nostro server continua a non vedere nulla.
- **Il pattern di onboarding si estende verbatim:** l'auto-check di
  [ADR 0004](../decisions/0004-onboarding-claude-connector-gui.md) generalizza —
  ogni skill/prompt dichiara i suoi *connettori richiesti e opzionali* ("per
  questa campagna serve Gmail collegato → Connettori → Gmail") e degrada con
  grazia (bozze come file se l'email non è collegata). Convenzione piccola e
  cheap, come `convenzione_studio_db`.

### Limiti noti della corsia B (da tenere d'occhio)

- **Soffitti di capability che non controlliamo:** a metà 2026 il connettore
  Gmail *crea bozze ma non invia*; Drive è *read-only*. Per il nostro
  posizionamento ("ogni output è una bozza, decide il professionista") è quasi
  un feature — ma è una dipendenza da ri-verificare prima di codificare un
  flusso di campagna sopra.
- **I watchdog always-on non possono usare i connettori dell'utente** (nessun
  accesso server-side alla sua sessione Claude). Già gestito: ADR 0003 gata lo
  stato server-side dietro trigger dedicati.
- Su piani Team/Enterprise i connettori vanno abilitati da un admin
  dell'organizzazione — punto da coprire nella guida utente.

## Mappa per superficie

| Superficie | Corsia | Note |
|---|---|---|
| Email (Gmail), Drive, Calendar | **B** — connettori first-party | Zero costo per noi; prompt con auto-check + guida al collegamento |
| Outlook/altro nella Directory | **B** — Directory (400+ app) | Verificare copertura caso per caso |
| **PEC** (Aruba, Legalmail…) | **C ora, D forse poi** | Il gap a più alto valore: canale a valore legale (inbox naturale di `triage_atto`, watchdog W1); nessun connettore first-party plausibile. Esiste [`mcp-aruba-email`](https://github.com/jackfioru92/mcp-aruba-email) (IMAP/SMTP locale, credenziali locali) — ok per piloti Claude Code, non per l'utente desktop non tecnico (ADR 0004: gli MCP locali richiedono Node + config). Un "DottComm PEC bridge" ospitato (D) significherebbe detenere credenziali di corrispondenza a valore legale → ADR dedicata e pesante. Partire con C nel pilota, lasciare che l'uso reale giustifichi D. |
| **Gestionali** (Fatture in Cloud primo) | **C ora, D/Directory poi** | Vedi [gestionali-mercato-e-api](gestionali-mercato-e-api.md): API pubblica + token personale + [MCP open source esistente](https://github.com/aringad/fattureincloud-mcp). MCP locale con token locale per i piloti; connettore multi-tenant ospitato solo dietro ADR. Prima di costruire: verificare se FIC approda da sé nella Directory. |
| **SDI / F&C / Entratel** | Nessuna delle due (per ora) | Nessun terzo si collega senza credenziali da intermediario o deleghe: territorio partnership/compliance, non architettura auth. Parcheggiato. |

## Anti-pattern da evitare

- **MCP server che fa da MCP client** (chaining server-side verso altri MCP):
  reimporta l'intero problema auth/PII dalla porta di servizio, senza guadagno
  UX.
- **Token vault strisciante dentro il server principale:** se e quando serve
  detenere credenziali di terzi, va spedito come connettore remoto *separato*
  (opzione D) — una liability discreta e gated da ADR, non un accumulo.

## Open questions

- Il connettore Gmail first-party ha aggiunto l'invio (non solo bozze)? Drive
  resta read-only? Ri-verificare a ridosso della prima campagna che li usa.
- Fatture in Cloud (o altri gestionali) hanno pubblicato un connettore nella
  Connectors Directory?
- Per la PEC: i provider (Aruba, InfoCert, Namirial) espongono API REST
  ufficiali che eviterebbero IMAP con credenziali piene? App password /
  credenziali scoped disponibili?
- Come si formalizza la convenzione "connettori richiesti/opzionali per skill"
  nei prompt MCP — estensione di `convenzione_studio_db` o prompt dedicato?

## Sources (verificate 2026-07-07)

- [Claude Help Center — Google Workspace connectors](https://support.claude.com/en/articles/10166901-use-google-workspace-connectors)
- [claude.com — Google connections docs](https://claude.com/docs/claude-tag/admins/connections/google)
- [usecarly — Claude+Drive 2026](https://www.usecarly.com/blog/claude-google-drive-integration/) · [Claude+Calendar 2026](https://www.usecarly.com/blog/claude-google-calendar-integration/)
- [Google — restricted scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification) · [DeepStrike — CASA](https://deepstrike.io/blog/google-casa-security-assessment-2025) · [Nylas — Google verification guide](https://developer.nylas.com/docs/provider-guides/google/google-verification-security-assessment-guide/)
- [jackfioru92/mcp-aruba-email](https://github.com/jackfioru92/mcp-aruba-email) · [aringad/fattureincloud-mcp](https://github.com/aringad/fattureincloud-mcp)
