import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Termini e Condizioni | DottComm",
  description:
    "I termini e le condizioni che regolano l'utilizzo del sito e dei servizi DottComm.",
};

export default function TerminiPage() {
  return (
    <>
      <SiteNav />
      <main className="legal-main">
        <article className="legal">
          <span className="mono legal-updated">Ultimo aggiornamento: 6 luglio 2026</span>
          <h1>Termini e Condizioni</h1>

          <p className="legal-intro">
            Benvenuto su DottComm. Questi Termini e Condizioni (&quot;Termini&quot;) regolano
            l&apos;utilizzo del sito e dei servizi offerti da DottComm (&quot;DottComm&quot;,
            &quot;noi&quot;). Utilizzando il servizio accetti questi Termini: se non li accetti, ti
            chiediamo di non usare il servizio.
          </p>
          <p>
            Per qualsiasi domanda puoi scriverci a{" "}
            <a href="mailto:info@dottcomm.dev">info@dottcomm.dev</a>.
          </p>

          <h2>1. Il servizio</h2>
          <p>
            DottComm mette a disposizione degli studi di dottori commercialisti e dei loro
            collaboratori una suite di strumenti che, tramite un assistente basato su intelligenza
            artificiale, aiuta ad automatizzare e velocizzare attività ricorrenti dello studio. Il
            servizio è pensato per assisterti nel tuo lavoro, non per sostituirsi al tuo giudizio
            professionale.
          </p>
          <p>
            Ci impegniamo a mantenere il servizio funzionante e a migliorarlo nel tempo. Possiamo
            aggiungere, modificare o sospendere singole funzionalità; se un cambiamento è rilevante
            faremo il possibile per avvisarti in anticipo.
          </p>

          <h2>2. Account</h2>
          <p>
            Per usare alcune funzioni devi creare un account. Ti impegni a fornire informazioni
            corrette e aggiornate e a custodire le tue credenziali: sei responsabile delle attività
            svolte attraverso il tuo account. Se noti un uso non autorizzato, avvisaci subito a{" "}
            <a href="mailto:info@dottcomm.dev">info@dottcomm.dev</a>.
          </p>
          <p>
            Devi avere almeno 18 anni e la capacità di stipulare un contratto vincolante. Se usi il
            servizio per conto di uno studio o di un&apos;azienda, dichiari di avere il potere di
            accettare questi Termini in suo nome.
          </p>

          <h2>3. Prezzi, pagamenti e rinnovi</h2>
          <p>
            Alcune funzioni del servizio sono a pagamento. I prezzi applicabili e le caratteristiche
            di ciascun piano sono indicati al momento della sottoscrizione.
          </p>
          <ul>
            <li>
              <strong>Pagamenti.</strong> I pagamenti sono gestiti in sicurezza tramite il nostro
              fornitore Stripe. Sottoscrivendo un piano autorizzi l&apos;addebito del corrispettivo
              con la modalità di pagamento scelta.
            </li>
            <li>
              <strong>Abbonamenti e rinnovo.</strong> Se il piano è ricorrente, si rinnova
              automaticamente alla scadenza di ciascun periodo, fino a quando non lo disdici.
              L&apos;addebito avviene all&apos;inizio di ogni periodo.
            </li>
            <li>
              <strong>Disdetta.</strong> Puoi disdire il rinnovo in qualsiasi momento: continuerai a
              usare il servizio fino alla fine del periodo già pagato e non ti verranno addebitati i
              periodi successivi.
            </li>
            <li>
              <strong>Variazioni di prezzo.</strong> Possiamo modificare i prezzi: eventuali
              variazioni si applicheranno a partire dal periodo di rinnovo successivo e te ne daremo
              comunicazione con ragionevole anticipo.
            </li>
            <li>
              <strong>Imposte.</strong> I prezzi possono non includere le imposte applicabili, che
              verranno aggiunte ove dovute.
            </li>
          </ul>

          <h2>4. Come usi il servizio</h2>
          <p>Ti impegni a usare il servizio in modo lecito e a non:</p>
          <ul>
            <li>violare leggi, diritti di terzi o questi Termini;</li>
            <li>tentare di accedere senza autorizzazione ai sistemi o ai dati altrui;</li>
            <li>interferire con il funzionamento o la sicurezza del servizio;</li>
            <li>
              usare il servizio per finalità diverse da quelle per cui è stato pensato o in modo da
              danneggiare DottComm o altri utenti.
            </li>
          </ul>
          <p>
            Sei responsabile dei contenuti e dei dati che inserisci nel servizio e ti impegni ad avere
            il diritto di trattarli.
          </p>

          <h2>5. Contenuti generati dall&apos;AI</h2>
          <p>
            Il servizio si avvale di strumenti di intelligenza artificiale per produrre bozze,
            risposte e suggerimenti. Questi risultati sono un supporto al tuo lavoro e possono
            contenere errori o imprecisioni. Restano sempre sotto il tuo controllo: prima di
            utilizzarli, in particolare per adempimenti verso clienti o autorità, sei tenuto a
            verificarli e a validarli con la tua competenza professionale. DottComm non fornisce
            consulenza fiscale, contabile o legale.
          </p>

          <h2>6. Proprietà intellettuale</h2>
          <p>
            Il sito, il software e i relativi contenuti sono di proprietà di DottComm o dei suoi
            licenzianti e sono protetti dalle leggi applicabili. Ti concediamo un diritto d&apos;uso
            personale, limitato, non esclusivo e non trasferibile per utilizzare il servizio secondo
            questi Termini. I dati e i contenuti che inserisci restano tuoi.
          </p>

          <h2>7. Servizi di terze parti</h2>
          <p>
            Il servizio può integrare o rimandare a strumenti di terze parti (ad esempio per i
            pagamenti, l&apos;infrastruttura o le funzioni di AI). L&apos;uso di tali servizi può
            essere soggetto a termini e informative proprie, di cui questi soggetti sono responsabili.
          </p>

          <h2>8. Limitazione di responsabilità</h2>
          <p>
            Il servizio è fornito &quot;così com&apos;è&quot;. Pur impegnandoci a offrirlo con la
            massima cura, non possiamo garantire che sia sempre privo di errori o interruzioni. Nei
            limiti consentiti dalla legge, DottComm non è responsabile per danni indiretti o per la
            perdita di dati, mancati guadagni o decisioni prese sulla base dei risultati prodotti dal
            servizio. Nulla in questi Termini limita le responsabilità che non possono essere escluse
            per legge.
          </p>

          <h2>9. Sospensione e cessazione</h2>
          <p>
            Puoi smettere di usare il servizio e chiudere il tuo account in qualsiasi momento. Possiamo
            sospendere o chiudere l&apos;accesso se violi questi Termini o se è necessario per motivi
            di sicurezza o di legge. Alla cessazione, le clausole che per loro natura devono
            continuare a valere (come quelle su proprietà intellettuale, limitazione di responsabilità
            e legge applicabile) restano in vigore.
          </p>

          <h2>10. Modifiche ai Termini</h2>
          <p>
            Possiamo aggiornare questi Termini di tanto in tanto. Quando lo faremo, aggiorneremo la
            data in cima alla pagina e, se le modifiche sono rilevanti, te ne daremo comunicazione.
            Continuando a usare il servizio dopo l&apos;aggiornamento accetti i nuovi Termini.
          </p>

          <h2>11. Legge applicabile e foro competente</h2>
          <p>
            Questi Termini sono regolati dalla legge italiana. Per le controversie che dovessero
            sorgere sarà competente il foro del luogo in cui ha sede DottComm, fatte salve le
            disposizioni inderogabili di legge a tutela del consumatore.
          </p>

          <h2>12. Contatti</h2>
          <p>
            Per qualsiasi domanda su questi Termini scrivici a{" "}
            <a href="mailto:info@dottcomm.dev">info@dottcomm.dev</a>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
