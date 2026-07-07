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
// Il prompt fa PRIMA un auto-controllo: se gli strumenti DottComm non ci sono
// (connettore non aggiunto, accesso non completato o connettore disattivato),
// Claude deve fermarsi e guidare l'utente invece di fingere di lavorare senza
// strumenti — così un utente non tecnico non riceve risposte fiscali inventate.
export const AGENT_PROMPT =
  "Prima di tutto verifica di avere davvero accesso agli strumenti del " +
  "connettore DottComm. Se NON li vedi — connettore non ancora aggiunto, accesso " +
  "non completato o connettore disattivato — non fingere di poter lavorare e non " +
  "inventare nulla: fermati, dimmelo con chiarezza e guidami ad attivarlo. Apri " +
  "+ → Connettori → Aggiungi connettore personalizzato, incolla l'indirizzo " +
  CONNECTOR_URL +
  ", accedi con il mio account DottComm e assicurati che il connettore risulti " +
  "attivo; poi apri una nuova chat e reincolla questo prompt.\n\n" +
  "Quando invece gli strumenti DottComm sono disponibili, agisci come " +
  "l'assistente digitale del mio studio di Dottore Commercialista: usali per " +
  "aiutarmi con dichiarazioni fiscali, bilanci d'esercizio, F24, fatturazione " +
  "elettronica, comunicazioni con l'Agenzia delle Entrate e lo scadenzario " +
  "clienti.";
