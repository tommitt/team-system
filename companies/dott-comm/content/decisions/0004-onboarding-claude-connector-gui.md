---
title: Onboarding via il connettore GUI dell'app Claude (non prompt, non deep-link)
status: accepted
date: 2026-07-07
deciders: [ttassi]
supersedes:
superseded-by:
tags: [onboarding, mcp, connettori, claude-desktop, distribuzione, ux]
---

# 0004. Onboarding via il connettore GUI dell'app Claude (non prompt, non deep-link)

## Context

Gli utenti di DottComm sono **commercialisti italiani non tecnici** che usano
l'**app desktop di Claude**. Il sito ([code/](../../code/)) aveva un flusso
"copia il prompt e incollalo" e la domanda era: quel prompt può far sì che
Claude **installi da solo** il server MCP di DottComm?

Vincoli emersi dalla ricerca (docs ufficiali Anthropic + guida Claude Code):

- Il server MCP di DottComm è **remoto, Streamable HTTP, con OAuth 2.1**
  (WorkOS AuthKit, discovery RFC 9728). Vedi [ADR 0001](0001-mcp-in-nextjs-app-workos-auth.md).
- L'app desktop aggiunge server remoti solo dalla **GUI Connettori**; il file
  `claude_desktop_config.json` è un meccanismo *separato* per server locali.
- L'eventuale Claude Code integrato (scheda Code) usa un **archivio di config
  diverso** dai Connettori della chat: un `claude mcp add` lì non rende gli
  strumenti visibili nella chat normale dell'app.
- L'OAuth nel browser e il caricamento degli strumenti **non sono automatizzabili
  da un prompt**: richiedono un'azione umana.

## Decision

L'onboarding di DottComm si fa in **due azioni separate**, entrambe dalla GUI
dell'app Claude — **nessun prompt installa nulla**:

1. **Installazione (una volta sola):** l'utente aggiunge DottComm come
   *connettore personalizzato* — **+ → Connettori → Aggiungi connettore
   personalizzato** → incolla l'URL (`CONNECTOR_URL` in
   [lib/prompt.ts](../../code/lib/prompt.ts)) → accede nel browser (OAuth). Il
   sito offre un pulsante **"Copia URL connettore"** accanto a queste istruzioni.
2. **Uso (ogni volta):** l'utente copia il **prompt d'uso** dal sito e lo incolla
   in una **chat normale**. Il prompt fa **prima un auto-controllo**: se gli
   strumenti DottComm non ci sono, Claude si ferma, lo dice e guida l'utente a
   collegare il connettore, **senza inventare risposte fiscali**.

`CONNECTOR_URL` e `MCP_RESOURCE_URL` (audience dei token) devono **combaciare**,
altrimenti l'OAuth fallisce.

## Alternatives considered

- **Prompt che esegue `claude mcp add` (auto-install da CLI)** — scartato: è
  solo per la CLI di Claude Code; anche nella scheda Code dell'app finisce in un
  archivio separato dalla chat, e richiede comunque OAuth manuale + riavvio.
  Superficie sbagliata per un utente non tecnico.
- **Pulsante web "Add to Claude" / deep-link one-click** — **non esiste** per i
  connettori remoti personalizzati (verificato sui docs Anthropic). L'unico
  one-click è dentro Claude, per i connettori della **Directory**, che richiede
  submission + review Anthropic e un tenant AuthKit di produzione.
- **Bundle `.mcpb` (Desktop Extension) scaricabile** — pensato per server MCP
  **locali** (processo node/python), richiede Node sulla macchina. Non adatto a
  un server remoto OAuth.

## Consequences

- **Positive:** flusso point-and-click, nessun terminale; una volta collegato,
  DottComm è disponibile in ogni chat dell'app; il prompt con auto-controllo
  evita il fallimento peggiore (Claude che "aiuta" senza strumenti, inventando).
- **Trade-offs / negative:** due passi manuali (incolla URL, login browser) non
  automatizzabili dal sito; l'auto-controllo si appoggia alla tool-awareness del
  modello (forte ma non garanzia assoluta); va mantenuto l'invariante
  `CONNECTOR_URL == MCP_RESOURCE_URL`.
- **Follow-ups:**
  - Sostituire il tenant AuthKit **staging** (`sensible-coral-42-staging.authkit.app`)
    con uno di produzione prima del lancio.
  - Valutare la **submission alla Connectors Directory** per il vero one-click.
  - Aggiornata [mcp-user-guide.md](../knowledge/mcp-user-guide.md) con il flusso
    concreto; mancano ancora screenshot e i metodi di login definitivi.
