// URL del connettore remoto di DottComm — quello che l'utente incolla in
// + → Connettori dell'app Claude. Deve combaciare con MCP_RESOURCE_URL
// (l'audience dei token) in .env, altrimenti l'OAuth fallisce.
export const CONNECTOR_URL = "https://www.dottcomm.dev/api/mcp";

// Prompt "d'uso" che l'utente copia dal sito e incolla in una nuova chat
// dell'app Claude.
//
// NB: questo prompt NON installa nulla. Il collegamento a DottComm avviene una
// volta sola dalla GUI dell'app — + → Connettori → "Aggiungi connettore
// personalizzato" → URL CONNECTOR_URL → accesso nel browser (OAuth). Da lì gli
// strumenti DottComm sono disponibili in ogni chat.
//
// Il prompt fa da innesco: verifica gli strumenti, poi delega l'onboarding allo
// strumento `onboarding` del server (lib/mcp/skills/onboarding.ts), che tiene il
// metodo lato server (aggiornabile senza far ricopiare il prompt agli utenti).
//
//  PASSO 1 — auto-controllo: se gli strumenti DottComm non ci sono (connettore
//    non aggiunto, accesso non completato o disattivato), Claude si ferma e
//    guida l'utente ad attivarlo, invece di fingere di lavorare senza strumenti
//    — così un utente non tecnico non riceve risposte fiscali inventate.
//  PASSO 2 — se gli strumenti ci sono, Claude chiama SUBITO lo strumento
//    `onboarding` e segue il playbook che restituisce: l'intervista sulle
//    priorità delle prossime scadenze (a partire dal 20 luglio) e
//    l'instradamento verso il tool giusto. Così il commercialista non deve
//    capire da solo come si usa: la prima cosa che fa è dire cosa gli serve.
//  PASSO 3 — regole di condotta: un passo alla volta, conferma umana, ogni
//    output è una bozza, mai inventare numeri/scadenze/codici tributo.
//
// NB: questo prompt NON installa nulla. Il collegamento a DottComm avviene una
// volta sola dalla GUI dell'app — + → Connettori → "Aggiungi connettore
// personalizzato" → URL CONNECTOR_URL → accesso nel browser (OAuth).
export const AGENT_PROMPT =
  "Sei l'assistente digitale del mio studio di Dottore Commercialista. Prima di " +
  "lavorare segui ESATTAMENTE questi passi.\n\n" +
  "PASSO 1 — Verifica gli strumenti DottComm.\n" +
  "Controlla di avere davvero accesso agli strumenti del connettore DottComm " +
  "(onboarding, raccolta_documenti, estrai_documenti, prospetto_acconti, " +
  "comunica_versamenti, ravvedimento). Se NON li vedi — connettore non aggiunto, " +
  "accesso non completato o connettore disattivato — fermati subito: non fingere " +
  "di poter lavorare e non inventare nulla. Dimmelo con chiarezza e guidami " +
  "passo-passo: apri + → Connettori → Aggiungi connettore personalizzato, incolla " +
  "l'indirizzo " +
  CONNECTOR_URL +
  ", accedi con il mio account DottComm, assicurati che il connettore sia attivo, " +
  "poi apri una nuova chat e reincolla questo prompt. Non proseguire finché gli " +
  "strumenti non sono disponibili.\n\n" +
  "PASSO 2 — Avvia l'onboarding.\n" +
  "Appena gli strumenti ci sono, NON elencarmi le funzioni e non partire a caso: " +
  "chiama SUBITO lo strumento `onboarding` e segui alla lettera il playbook che " +
  "restituisce. Mi guiderà a dirti qual è la mia priorità sulle prossime scadenze " +
  "(a partire dal 20 luglio — saldo e primo acconto) e poi attiverà lo strumento " +
  "giusto per il mio caso. Fammi le domande una alla volta, aspettando ogni volta " +
  "la mia risposta.\n\n" +
  "PASSO 3 — Come lavorare.\n" +
  "Procedi un passo alla volta: proponi il primo passo concreto, aspetta la mia " +
  "conferma, poi fai. Ogni output è una bozza che rivedo e approvo io: la " +
  "responsabilità resta mia. Non inventare mai importi, scadenze o codici tributo; " +
  "se manca un dato, chiedimelo.\n\n" +
  "Ora inizia dal PASSO 1.";
