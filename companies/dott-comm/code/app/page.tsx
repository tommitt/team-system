import Image from "next/image";
import { CopyPromptButton } from "@/components/CopyPromptButton";
import { CopyConnectorButton } from "@/components/CopyConnectorButton";
import { StartButton } from "@/components/StartButton";
import { CONNECTOR_URL } from "@/lib/prompt";
import { ScrollRevealInit } from "@/components/ScrollRevealInit";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export default function Home() {
  return (
    <>
      <ScrollRevealInit />

      <SiteNav />

      <header className="hero-full">
        <div className="deco" aria-hidden="true" />
        <div className="hero-inner">
          <h1 className="hero-title">
            <span className="line1">Lo studio del futuro grazie a</span>
            <span className="line2 hero-agent">Claude</span>
          </h1>
          <p className="subtitle">
            Un agente che lavora davvero per il tuo studio.
            <br />
            Tu resti sempre al comando.
          </p>

          <div className="hero-cta-wrap">
            <StartButton variant="big" />
          </div>
        </div>
      </header>

      <section className="steps-section" id="installazione">
        <div className="steps-inner">
          <div className="steps-head" data-reveal>
            <span className="steps-kicker mono">come iniziare</span>
            <h2 className="steps-heading">
              Dal primo download alla prima pratica chiusa
            </h2>
          </div>

          <div className="step-row" data-reveal>
            <div className="step-text">
              <span className="step-number">01</span>
              <h3>Scarica l&apos;app Claude</h3>
              <p>
                Se sul tuo computer non c&apos;è ancora, vai su{" "}
                <a
                  href="https://claude.ai/download"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  claude.ai/download
                </a>{" "}
                e installa l&apos;app Claude. Bastano due minuti: crei un
                account con la tua email e sei pronto per iniziare, senza
                bisogno di alcuna competenza tecnica. Se ce l&apos;hai già,
                passa direttamente al punto successivo.
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

          <div className="step-row step-row--reverse" data-reveal>
            <div className="step-text">
              <span className="step-number">02</span>
              <h3>Collega DottComm a Claude</h3>
              <p>
                Apri <strong>+ → Connettori</strong> e scegli{" "}
                <strong>Aggiungi connettore personalizzato</strong>. Incolla
                l&apos;indirizzo di DottComm e accedi con il tuo account nella
                finestra che si apre nel browser. Lo fai una volta sola: da lì
                in poi DottComm è a disposizione in ogni chat.
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
                      width={30}
                      height={30}
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
              <h3>Apri una chat, incolla il prompt e lavora</h3>
              <p>
                Copia il prompt qui sotto, apri una nuova chat e incollalo:
                Claude capisce subito come lavorare per il tuo studio. Da lì in
                poi lavori semplicemente parlando — chiedi, correggi, approvi —
                a una velocità dieci volte superiore a quella a cui sei
                abituato, senza mai perdere il controllo di quello che succede.
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
                  <span className="mock-speed-badge">10×</span>
                  <p className="mock-msg mock-msg--user">
                    Manda la F24 di luglio
                  </p>
                  <p className="mock-msg mock-msg--agent">
                    Fatto, controllata e pronta per l&apos;invio.
                  </p>
                  <p className="mock-msg mock-msg--user">Perfetto, procedi</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-full" id="cta">
        <div className="deco" aria-hidden="true" />
        <div className="cta-inner">
          <h2>Aumenta il tuo studio con l&apos;AI</h2>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
