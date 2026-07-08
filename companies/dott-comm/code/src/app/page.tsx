import Image from "next/image";
import { CopyPromptButton } from "@/components/CopyPromptButton";
import { CopyConnectorButton } from "@/components/CopyConnectorButton";
import { ScrollLink } from "@/components/ScrollLink";
import { FaqAccordion } from "@/components/FaqAccordion";
import { CONNECTOR_URL } from "@/lib/prompt";
import { ScrollRevealInit } from "@/components/ScrollRevealInit";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

const USE_CASES = [
  {
    n: "01",
    title: "F24 e acconti",
    body: "Saldo, acconti e piano di rate calcolati, con i codici tributo giusti. A te resta firmare.",
  },
  {
    n: "02",
    title: "Solleciti ai clienti",
    body: "I documenti mancanti richiesti al posto tuo, con il tono giusto. Basta rincorrere.",
  },
  {
    n: "03",
    title: "Scadenzario cliente",
    body: "Chi deve pagare cosa, e quando. Derivato dai dati del cliente, con i festivi già gestiti.",
  },
  {
    n: "04",
    title: "Atti e cartelle",
    body: "Termini perentori, sospensione feriale e opzioni di difesa, calcolati dalla data di notifica.",
  },
  {
    n: "05",
    title: "Ravvedimento operoso",
    body: "Sanzione ridotta e interessi al giorno per i versamenti tardivi. Il conto esatto in un attimo.",
  },
  {
    n: "06",
    title: "Lettura documenti",
    body: "Fatture, visure e cartelle: dati letti, normalizzati e controllati. Le righe dubbie te le segnala.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "La preparazione degli F24 mi portava via i sabati mattina. Ora la rivedo in dieci minuti.",
    initials: "MB",
    variant: "violet",
    name: "Marco Bellini",
    role: "Studio Bellini · Bergamo",
  },
  {
    quote:
      "Arrivavo in studio alle sei per estrarre le spese dei clienti dagli scontrini. Ora quel lavoro lo trovo già fatto.",
    initials: "CD",
    variant: "claude",
    name: "Chiara De Santis",
    role: "Commercialista · Bologna",
  },
  {
    quote:
      "I solleciti ai clienti li odiavo. Ora partono da soli e io controllo soltanto.",
    initials: "LF",
    variant: "mint",
    name: "Luca Ferraro",
    role: "Studio Ferraro & Associati · Torino",
  },
];

const Arrow = ({ up = false }: { up?: boolean }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    width="18"
    height="18"
    aria-hidden="true"
    style={up ? { transform: "rotate(180deg)" } : undefined}
  >
    <path
      d="M8 3v9m0 0 3.5-3.6M8 12 4.5 8.4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function Home() {
  return (
    <>
      <ScrollRevealInit />

      <SiteNav />

      {/* ---------- HERO ---------- */}
      <header id="top" className="hero">
        <div className="deco deco--hero" aria-hidden="true" />
        <div className="hero-grid">
          <div>
            <h1 className="hero-title">
              L’estensione di <span className="accent">Claude</span> per i{" "}
              Commercialisti.
            </h1>
            <p className="hero-sub">
              Aggiunge a Claude gli strumenti dello studio (F24, solleciti,
              scadenze, ravvedimenti) e prepara il lavoro ripetitivo pronto da
              rivedere. Tu controlli, correggi e approvi.
            </p>
            <div className="hero-actions">
              <ScrollLink
                targetId="installazione"
                href="#installazione"
                className="cta-btn cta-btn--big"
              >
                <span>Inizia ora</span>
                <Arrow />
              </ScrollLink>
              <ScrollLink targetId="usi" href="#usi" className="btn-ghost-dark">
                Come funziona
              </ScrollLink>
            </div>
            <p className="hero-fine">
              Nessuna competenza tecnica · Ogni output è una bozza che approvi
              tu
            </p>
          </div>

          <div className="hero-visual">
            <div className="hero-card">
              <div className="mock-bar">
                <span className="mock-dot" />
                <span className="mock-dot" />
                <span className="mock-dot" />
                <span className="hero-card-tag">
                  <Image src="/claude-logo.svg" alt="" width={13} height={13} />
                  Claude · DottComm
                </span>
              </div>
              <div className="hero-chat">
                <span className="hero-speed">10× più veloce</span>
                <p className="chat-msg chat-msg--user">
                  Prepara gli F24 di luglio per i clienti in regime forfettario
                </p>
                <p className="chat-msg chat-msg--agent">
                  Fatto. 14 deleghe compilate e quadrate, codici tributo
                  verificati. Te le mostro una per una prima dell’invio.
                </p>
                <p className="chat-msg chat-msg--user">Perfetto, procedi</p>
              </div>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-icon">✓</span>
              <div>
                <div className="hero-stat-num">14 deleghe</div>
                <div className="hero-stat-cap">pronte in 40 secondi</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- USE CASES ---------- */}
      <section id="usi" className="section usi">
        <div className="section-inner">
          <div className="usi-head" data-reveal>
            <span className="kicker">il lavoro che ti ruba le giornate</span>
            <h2>
              Le attività che ti rubavano ore, fatte meglio in pochi minuti.
            </h2>
          </div>
          <div className="grid-3" data-reveal>
            {USE_CASES.map((u) => (
              <div className="usi-card" key={u.n}>
                <div className="usi-card-top">
                  <span className="usi-num">{u.n}</span>
                  <span className="usi-pill">ore → minuti</span>
                </div>
                <h3>{u.title}</h3>
                <p>{u.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section id="installazione" className="section steps">
        <div className="section-inner">
          <div className="section-head--center" data-reveal>
            <span className="kicker">come iniziare</span>
            <h2>Dal primo download alla prima pratica chiusa</h2>
          </div>

          <div className="step-row" data-reveal>
            <div className="step-text">
              <span className="step-number">01</span>
              <h3>Scarica l’app Claude</h3>
              <p>
                Se non ce l’hai già, vai su{" "}
                <a
                  href="https://claude.ai/download"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  claude.ai/download
                </a>{" "}
                e installa l’app. Bastano due minuti e un account con la tua
                email: nessuna competenza tecnica.
              </p>
            </div>
            <a
              className="step-visual step-visual-link"
              href="https://claude.ai/download"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="mock-window">
                <div className="mock-bar">
                  <span className="mock-dot" />
                  <span className="mock-dot" />
                  <span className="mock-dot" />
                  <span className="mock-url">claude.ai/download</span>
                </div>
                <div className="mock-download-body">
                  <div className="mock-app-icon">
                    <Image
                      src="/claude-logo.svg"
                      alt="Claude"
                      width={30}
                      height={30}
                    />
                  </div>
                  <div className="mock-progress">
                    <div className="mock-progress-bar" />
                  </div>
                  <span className="mock-caption">Installazione in corso…</span>
                </div>
              </div>
            </a>
          </div>

          <div className="step-row step-row--rev" data-reveal>
            <div className="step-text">
              <span className="step-number">02</span>
              <h3>Collega DottComm a Claude</h3>
              <p>
                Apri <strong>+ → Connettori</strong>, scegli{" "}
                <strong>Aggiungi connettore personalizzato</strong> e incolla
                l’indirizzo qui sotto. Lo fai una volta sola.
              </p>
              <CopyConnectorButton />
            </div>
            <div className="step-visual">
              <div className="mock-window">
                <div className="mock-bar">
                  <span className="mock-dot" />
                  <span className="mock-dot" />
                  <span className="mock-dot" />
                  <span className="mock-url">Impostazioni · Connettori</span>
                </div>
                <div className="mock-connector-body">
                  <div className="mock-app-icon">
                    <Image
                      src="/logo.svg"
                      alt="DottComm"
                      width={34}
                      height={34}
                    />
                  </div>
                  <span className="mock-connector-name">DottComm</span>
                  <span className="mock-connector-url">{CONNECTOR_URL}</span>
                  <span className="mock-connector-btn">Connetti</span>
                </div>
              </div>
            </div>
          </div>

          <div className="step-row" data-reveal>
            <div className="step-text">
              <span className="step-number">03</span>
              <h3>Incolla il prompt e lavora</h3>
              <p>
                Copia il prompt, apri una nuova chat e incollalo: Claude capisce
                subito come lavorare per il tuo studio. Da lì in poi lavori
                parlando: chiedi, correggi, approvi.
              </p>
              <div className="step-cta">
                <CopyPromptButton variant="nav" />
              </div>
            </div>
            <div className="step-visual">
              <div className="mock-window">
                <div className="mock-bar">
                  <span className="mock-dot" />
                  <span className="mock-dot" />
                  <span className="mock-dot" />
                </div>
                <div className="mock-convo">
                  <p className="mock-msg mock-msg--user">
                    Manda la F24 di luglio
                  </p>
                  <p className="mock-msg mock-msg--agent">
                    Fatto, controllata e pronta per l’invio.
                  </p>
                  <p className="mock-msg mock-msg--user">Perfetto, procedi</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- TESTIMONIALS ---------- */}
      <section className="section tst">
        <div className="section-inner">
          <div className="section-head--center" data-reveal>
            <span className="kicker">chi lo usa</span>
            <h2>Commercialisti che hanno smesso di rincorrere le scadenze.</h2>
          </div>
          <div className="grid-3" data-reveal>
            {TESTIMONIALS.map((t) => (
              <figure key={t.name}>
                <blockquote>“{t.quote}”</blockquote>
                <figcaption>
                  <span className={`tst-avatar tst-avatar--${t.variant}`}>
                    {t.initials}
                  </span>
                  <span className="tst-person">
                    <span className="tst-name">{t.name}</span>
                    <span className="tst-role">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- PRICING ---------- */}
      <section id="prezzi" className="section pricing">
        <div className="deco deco--pricing" aria-hidden="true" />
        <div className="section-inner">
          <div className="section-head--center" data-reveal>
            <span className="kicker kicker--mint">prezzi</span>
            <h2 className="on-dark">
              Un prezzo che rientra alla prima pratica.
            </h2>
          </div>
          <div className="price-grid" data-reveal>
            <div className="price-card price-card--dark">
              <div>
                <div className="price-name">Free</div>
                <div className="price-amount">
                  <span className="num">€0</span>
                  <span className="per">/mese</span>
                </div>
                <div className="price-meta">senza carta di credito</div>
              </div>
              <p className="price-desc">
                Tutte le funzioni, con un utilizzo limitato.
              </p>
              <div className="price-features">
                <span>
                  <span className="tick">✓</span> Tutti gli strumenti DottComm
                </span>
                <span>
                  <span className="tick">✓</span> 1 utente
                </span>
                <span>
                  <span className="tick">✓</span> Utilizzo giornaliero limitato
                </span>
                <span>
                  <span className="tick">✓</span> Supporto via email
                </span>
              </div>
              <ScrollLink
                targetId="installazione"
                href="#installazione"
                className="price-cta"
              >
                Inizia gratis
              </ScrollLink>
            </div>

            <div className="price-card price-card--feat">
              <span className="price-badge">Più scelto</span>
              <div>
                <div className="price-name">Premium</div>
                <div className="price-amount">
                  <span className="num">€98</span>
                  <span className="per">/mese</span>
                </div>
                <div className="price-meta">
                  un utente · utilizzo illimitato
                </div>
              </div>
              <p className="price-desc">Per il professionista, senza limiti.</p>
              <div className="price-features">
                <span>
                  <span className="tick">✓</span> Utilizzo illimitato
                </span>
                <span>
                  <span className="tick">✓</span> 1 utente
                </span>
                <span>
                  <span className="tick">✓</span> Tutti gli strumenti DottComm
                </span>
                <span>
                  <span className="tick">✓</span> Supporto prioritario
                </span>
              </div>
              <ScrollLink
                targetId="installazione"
                href="#installazione"
                className="price-cta"
              >
                Inizia ora
              </ScrollLink>
            </div>

            <div className="price-card price-card--dark">
              <div>
                <div className="price-name">Su misura</div>
                <div className="price-amount">
                  <span className="num">Su misura</span>
                </div>
                <div className="price-meta">preventivo dedicato</div>
              </div>
              <p className="price-desc">
                Per studi con più postazioni e uso centralizzato.
              </p>
              <div className="price-features">
                <span>
                  <span className="tick">✓</span> Più postazioni
                </span>
                <span>
                  <span className="tick">✓</span> Uso centralizzato dello studio
                </span>
                <span>
                  <span className="tick">✓</span> SSO e sicurezza avanzata
                </span>
                <span>
                  <span className="tick">✓</span> Referente dedicato e
                  formazione team
                </span>
              </div>
              <a href="mailto:info@dottcomm.dev" className="price-cta">
                Parla con noi
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="section faq">
        <div className="faq-inner">
          <div className="section-head--center" data-reveal>
            <span className="kicker">domande frequenti</span>
            <h2>Quello che i commercialisti ci chiedono.</h2>
          </div>
          <FaqAccordion />
        </div>
      </section>

      {/* ---------- CLOSING CTA ---------- */}
      <section className="closing">
        <div className="deco deco--cta" aria-hidden="true" />
        <div className="closing-inner">
          <Image
            className="closing-logo"
            src="/logo.svg"
            alt="DottComm"
            width={52}
            height={52}
          />
          <h2>Il tempo che risparmi, lo dedichi ai tuoi clienti.</h2>
          <p>
            Collega DottComm oggi. La prima pratica ripetitiva che non farai più
            ti ripaga l’abbonamento.
          </p>
          <ScrollLink
            targetId="installazione"
            href="#installazione"
            className="cta-btn cta-btn--big"
          >
            <span>Inizia ora</span>
            <Arrow up />
          </ScrollLink>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
