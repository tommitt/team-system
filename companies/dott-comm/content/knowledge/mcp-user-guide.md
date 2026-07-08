---
title: Guida utente — collegarsi all'MCP di Dott. Comm.
status: draft
owner: ttassi
updated: 2026-07-07
tags: [mcp, guida-utente, onboarding, installazione, auth, workos, connettori]
---

# Guida utente — collegarsi all'MCP di Dott. Comm.

> **Bozza.** Il flusso di collegamento qui sotto è quello **reale** implementato
> dal sito ([code/](../../code/)); mancano ancora screenshot e i metodi di login
> definitivi. La scelta di distribuzione (connettore GUI, non prompt né
> deep-link) è in [ADR 0004](../decisions/0004-onboarding-claude-connector-gui.md);
> la parte tecnica per gli sviluppatori in [mcp-auth-setup.md](./mcp-auth-setup.md);
> l'architettura in [ADR 0001](../decisions/0001-mcp-in-nextjs-app-workos-auth.md).

## Cos'è

Dott. Comm. espone un **server MCP**: una raccolta di skill e tool che il tuo
assistente AI (Claude, Cursor, ChatGPT e altri host compatibili con MCP) può
usare per aiutarti nel lavoro di studio. Ogni output è una **bozza da rivedere**:
la responsabilità professionale resta tua.

## Cosa ti serve

- L'**app desktop di Claude** (claude.ai/download) con un account.
- Un **account Dott. Comm.** per l'accesso (vedi "Autenticazione").

Il pubblico target è **non tecnico**: nessun terminale, nessun file di config.
DottComm si aggiunge come **connettore** dalla GUI dell'app. (Altri host MCP —
Cursor, ecc. — restano possibili ma non sono la via supportata per gli studi.)

## Come collegarsi (app desktop Claude)

L'onboarding sono **due azioni separate**: prima colleghi il connettore *una
volta sola*, poi lo usi in ogni chat incollando il prompt. Vedi
[ADR 0004](../decisions/0004-onboarding-claude-connector-gui.md). **Nessun prompt
installa il connettore**, e non esiste un pulsante web "Add to Claude" per i
connettori remoti personalizzati.

1. **Aggiungi il connettore (una volta sola):**
   **+ → Connettori → Aggiungi connettore personalizzato**, poi incolla l'URL:

   ```
   https://www.dottcomm.dev/api/mcp
   ```

   (deve combaciare con `MCP_RESOURCE_URL` in `.env`, altrimenti l'OAuth fallisce)

2. **Accedi** nella finestra del browser che si apre (vedi "Autenticazione").
   Da qui in poi gli strumenti DottComm sono disponibili in **ogni chat**.
3. **Usa DottComm:** apri una chat, incolla il **prompt d'uso** copiato dal sito
   (`AGENT_PROMPT`) e lavora parlando. Il prompt fa **prima un auto-controllo**:
   se gli strumenti DottComm non risultano attivi, Claude si ferma, te lo dice e
   ti guida a ricollegare il connettore, **senza inventare risposte fiscali**.

## Autenticazione — con cosa accedi

L'accesso è gestito tramite **WorkOS AuthKit** (l'infrastruttura di login del
prodotto). In pratica:

- Aggiunto il connettore, Claude ti reindirizza alla pagina di **login di
  Dott. Comm.** nel browser.
- Accedi con le **credenziali del tuo account** _(metodi esatti — email/password,
  SSO, Google… — da definire in fase di configurazione WorkOS)_.
- Autorizzato l'accesso, l'app riceve un token e può usare gli strumenti a tuo
  nome. Non devi copiare o gestire manualmente nessuna chiave.

> Nota: durante lo sviluppo il server può girare **senza autenticazione**
> (`MCP_REQUIRE_AUTH=false`); in produzione l'accesso richiede sempre il login.
> ⚠️ Oggi il tenant AuthKit è ancora **staging** — va spostato in produzione
> prima del lancio (vedi follow-up in [ADR 0004](../decisions/0004-onboarding-claude-connector-gui.md)).

## Cosa puoi fare

Il server espone le prime capability reali (ogni output è una **bozza** da far
verificare al professionista; roadmap nel
[catalogo skills & tools](../brainstorms/catalogo-skills-tools.md)):

- `onboarding` — il punto d'ingresso guidato.
- `prospetto_acconti` — saldo + acconti del 20/7 (20/8 +0,80%), storico vs
  previsionale con riga di rischio, piano rate con codici F24.
- `estrai_documenti` — normalizza/valida dati estratti da documenti (date e
  importi italiani, check digit P.IVA/CF).
- `ravvedimento` — sanzioni ridotte e interessi per versamenti tardivi.
- `triage_atto` — termini perentori e opzioni di un atto notificato (avviso
  bonario, accertamento, cartella, ...), con sospensioni e slittamenti.
- `scadenze_cliente` — lo scadenzario derivato dagli attributi del cliente.
- `raccolta_documenti` / `comunica_versamenti` — campagne sul portafoglio:
  solleciti documenti mirati e comunicazioni di versamento, con lo stato nei
  file `studio/` dello studio (prompt `convenzione_studio_db`,
  [ADR 0010](../decisions/0010-convenzione-studio-db-client-local.md)).

## Da completare in questa guida

- Screenshot dei passaggi nell'app desktop (+ → Connettori → Aggiungi…, login).
- Metodi di login effettivi (configurazione WorkOS: email, SSO, ecc.) e passaggio
  del tenant AuthKit da staging a produzione.
- Elenco delle skill/tool disponibili al lancio, con esempi d'uso.
- FAQ: privacy dei dati dello studio, cosa vede l'AI, come revocare l'accesso
  (rimuovendo il connettore).
