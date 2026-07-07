import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Informativa sulla Privacy | DottComm",
  description:
    "Come DottComm raccoglie e tratta i dati personali degli utenti, nel rispetto del GDPR.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteNav />
      <main className="legal-main">
        <article className="legal">
          <span className="mono legal-updated">Ultimo aggiornamento: 6 luglio 2026</span>
          <h1>Informativa sulla Privacy</h1>

          <p className="legal-intro">
            La presente informativa descrive come DottComm (&quot;DottComm&quot;, &quot;noi&quot;)
            raccoglie e tratta i dati personali degli utenti che visitano il sito e utilizzano i
            nostri servizi. Teniamo alla tua privacy e trattiamo i tuoi dati nel rispetto del
            Regolamento (UE) 2016/679 (&quot;GDPR&quot;) e della normativa italiana applicabile.
          </p>
          <p>
            Per qualsiasi domanda su questa informativa o sul trattamento dei tuoi dati puoi
            scriverci in qualunque momento a{" "}
            <a href="mailto:info@dottcomm.dev">info@dottcomm.dev</a>.
          </p>

          <h2>1. Chi è il titolare del trattamento</h2>
          <p>
            Il titolare del trattamento dei dati è DottComm, contattabile all&apos;indirizzo{" "}
            <a href="mailto:info@dottcomm.dev">info@dottcomm.dev</a>. È a questo indirizzo che puoi
            rivolgerti per esercitare i tuoi diritti o ricevere chiarimenti.
          </p>

          <h2>2. Quali dati raccogliamo</h2>
          <p>Raccogliamo solo i dati che ci servono per farti usare il servizio e per farlo funzionare bene:</p>
          <ul>
            <li>
              <strong>Dati che ci fornisci tu.</strong> Nome, indirizzo email e le informazioni che
              inserisci quando crei un account, ci contatti o compili un modulo.
            </li>
            <li>
              <strong>Dati di pagamento.</strong> Quando sottoscrivi un piano a pagamento, i dati
              della carta e di fatturazione vengono raccolti e trattati direttamente dal nostro
              fornitore di pagamenti (Stripe). DottComm non memorizza mai i numeri completi della tua
              carta sui propri sistemi.
            </li>
            <li>
              <strong>Dati di utilizzo.</strong> Informazioni tecniche su come usi il sito e il
              servizio, come indirizzo IP, tipo di browser, pagine visitate e data e ora
              dell&apos;accesso.
            </li>
            <li>
              <strong>Cookie e tecnologie simili.</strong> Vedi la sezione dedicata più sotto.
            </li>
          </ul>

          <h2>3. Perché trattiamo i tuoi dati e su quale base</h2>
          <p>Trattiamo i tuoi dati per le seguenti finalità:</p>
          <div className="legal-table-wrap">
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Finalità</th>
                  <th>Base giuridica</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Creare e gestire il tuo account e fornirti il servizio</td>
                  <td>Esecuzione del contratto</td>
                </tr>
                <tr>
                  <td>Gestire pagamenti, abbonamenti e fatturazione</td>
                  <td>Esecuzione del contratto / obblighi di legge</td>
                </tr>
                <tr>
                  <td>Rispondere alle tue richieste di assistenza</td>
                  <td>Esecuzione del contratto / legittimo interesse</td>
                </tr>
                <tr>
                  <td>Migliorare, mettere in sicurezza e mantenere efficiente il servizio</td>
                  <td>Legittimo interesse</td>
                </tr>
                <tr>
                  <td>Adempiere agli obblighi contabili e fiscali di legge</td>
                  <td>Obbligo legale</td>
                </tr>
                <tr>
                  <td>Inviarti comunicazioni di servizio</td>
                  <td>Esecuzione del contratto</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Ti invieremo comunicazioni promozionali solo se avrai dato il tuo consenso, che potrai
            revocare in ogni momento.
          </p>

          <h2>4. Con chi condividiamo i dati</h2>
          <p>
            Non vendiamo i tuoi dati. Li condividiamo solo con fornitori che ci aiutano a far
            funzionare il servizio, ciascuno per quanto strettamente necessario e nel rispetto della
            normativa:
          </p>
          <ul>
            <li><strong>Fornitori di pagamento</strong> (Stripe), per gestire in sicurezza i pagamenti.</li>
            <li><strong>Fornitori di hosting e infrastruttura</strong>, che ospitano il sito e i dati.</li>
            <li>
              <strong>Fornitori di tecnologie di intelligenza artificiale</strong>, quando il servizio
              elabora le tue richieste tramite un assistente AI.
            </li>
            <li><strong>Autorità o soggetti terzi</strong>, quando siamo tenuti a farlo per legge.</li>
          </ul>
          <p>
            Alcuni di questi fornitori possono trattare dati al di fuori dell&apos;Unione Europea. In
            questi casi ci assicuriamo che il trasferimento avvenga con adeguate garanzie, come le
            clausole contrattuali standard approvate dalla Commissione Europea.
          </p>

          <h2>5. Per quanto tempo conserviamo i dati</h2>
          <p>
            Conserviamo i tuoi dati per il tempo necessario a fornirti il servizio e finché hai un
            account attivo. Dopo la chiusura dell&apos;account cancelliamo o rendiamo anonimi i tuoi
            dati, salvo quelli che siamo tenuti a conservare per legge (ad esempio i documenti
            contabili e fiscali, per i termini previsti dalla normativa).
          </p>

          <h2>6. I tuoi diritti</h2>
          <p>In qualsiasi momento hai il diritto di:</p>
          <ul>
            <li>accedere ai tuoi dati e chiederne una copia;</li>
            <li>chiederne la rettifica o l&apos;aggiornamento;</li>
            <li>chiederne la cancellazione;</li>
            <li>limitarne od opporti al trattamento;</li>
            <li>ricevere i tuoi dati in un formato portabile;</li>
            <li>
              revocare un consenso già prestato, senza che ciò pregiudichi la liceità del trattamento
              precedente.
            </li>
          </ul>
          <p>
            Per esercitare uno di questi diritti scrivici a{" "}
            <a href="mailto:info@dottcomm.dev">info@dottcomm.dev</a>: ti risponderemo nel più breve
            tempo possibile. Hai inoltre il diritto di presentare reclamo all&apos;autorità di
            controllo competente (in Italia, il Garante per la protezione dei dati personali).
          </p>

          <h2>7. Cookie</h2>
          <p>
            Usiamo i cookie tecnici necessari a far funzionare il sito e a mantenere la tua sessione.
            Se utilizziamo cookie di analisi o di altro tipo che richiedono il tuo consenso, te lo
            chiederemo tramite un apposito banner e potrai gestire le tue preferenze in qualsiasi
            momento. Puoi anche bloccare o cancellare i cookie dalle impostazioni del tuo browser,
            tenendo presente che alcune funzioni del sito potrebbero non funzionare correttamente.
          </p>

          <h2>8. Sicurezza</h2>
          <p>
            Adottiamo misure tecniche e organizzative ragionevoli per proteggere i tuoi dati da
            perdite, accessi non autorizzati e usi impropri. Nessun sistema è però sicuro al 100%: se
            dovessimo rilevare una violazione che ti riguarda, agiremo nei termini e nei modi previsti
            dalla legge.
          </p>

          <h2>9. Modifiche a questa informativa</h2>
          <p>
            Possiamo aggiornare questa informativa di tanto in tanto. Quando lo faremo, aggiorneremo
            la data in cima alla pagina e, se le modifiche sono rilevanti, te ne daremo comunicazione.
            Ti invitiamo a rileggerla periodicamente.
          </p>

          <h2>10. Contatti</h2>
          <p>
            Per qualsiasi domanda su questa informativa o sul trattamento dei tuoi dati personali,
            scrivici a <a href="mailto:info@dottcomm.dev">info@dottcomm.dev</a>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
