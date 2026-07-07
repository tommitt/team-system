---
title: Guida utente — collegarsi all'MCP di Dott. Comm.
status: draft
owner: ttassi
updated: 2026-07-06
tags: [mcp, guida-utente, onboarding, installazione, auth, workos]
---

# Guida utente — collegarsi all'MCP di Dott. Comm.

> **Bozza / scaffold.** Punto di raccolta per la documentazione rivolta agli
> utenti (i commercialisti e i loro studi). URL, nome prodotto, schermate e
> passaggi di login sono **placeholder** finché il prodotto non è pubblicato.
> La parte tecnica per gli sviluppatori sta in
> [mcp-auth-setup.md](./mcp-auth-setup.md); la decisione di architettura in
> [ADR 0001](../decisions/0001-mcp-in-nextjs-app-workos-auth.md).

## Cos'è

Dott. Comm. espone un **server MCP**: una raccolta di skill e tool che il tuo
assistente AI (Claude, Cursor, ChatGPT e altri host compatibili con MCP) può
usare per aiutarti nel lavoro di studio. Ogni output è una **bozza da rivedere**:
la responsabilità professionale resta tua.

## Cosa ti serve

- Un **host MCP** (es. Claude Desktop, Cursor, o un altro client che supporti il
  transport *Streamable HTTP*).
- Un **account Dott. Comm.** per l'accesso _(placeholder — vedi "Autenticazione")_.

## Come collegarsi

1. Apri le impostazioni MCP del tuo host.
2. Aggiungi un nuovo server con questo URL:

   ```
   https://<dominio-prodotto>/api/mcp      ← placeholder, URL definitivo da confermare
   ```

   Esempio di configurazione (formato tipo Cursor `.cursor/mcp.json`):

   ```json
   {
     "mcpServers": {
       "dott-comm": { "url": "https://<dominio-prodotto>/api/mcp" }
     }
   }
   ```

3. Al primo utilizzo l'host ti chiederà di **accedere** (vedi sotto). Completato
   il login, le skill e i tool compaiono nella lista degli strumenti dell'host.

## Autenticazione — con cosa accedi

L'accesso è gestito tramite **WorkOS AuthKit** (l'infrastruttura di login del
prodotto). In pratica:

- L'host MCP ti reindirizza alla pagina di **login di Dott. Comm.**
- Accedi con le **credenziali del tuo account** _(metodi esatti — email/password,
  SSO, Google… — da definire in fase di configurazione WorkOS)_.
- Autorizzato l'accesso, l'host riceve un token e può usare gli strumenti a tuo
  nome. Non devi copiare o gestire manualmente nessuna chiave.

> Nota: durante lo sviluppo il server può girare **senza autenticazione**; in
> produzione l'accesso richiede sempre il login.

## Cosa puoi fare (in arrivo)

Le capability reali arriveranno dal
[catalogo skills & tools](../brainstorms/catalogo-skills-tools.md). Oggi il
server espone solo strumenti **placeholder** (`placeholder_skill_*`,
`placeholder_tool_*`) che non fanno lavoro reale — servono a verificare la
connessione.

## Da completare in questa guida

- URL e nome prodotto definitivi.
- Metodi di login effettivi (configurazione WorkOS: email, SSO, ecc.).
- Screenshot dei passaggi per gli host più usati (Claude, Cursor).
- Elenco delle skill/tool disponibili al lancio, con esempi d'uso.
- FAQ: privacy dei dati dello studio, cosa vede l'AI, come revocare l'accesso.
