import Image from "next/image";
import { CopyPromptButton } from "@/components/CopyPromptButton";
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
            <span className="line2 hero-agent">Claude Code</span>
          </h1>
          <p className="subtitle">
            Un agente che lavora davvero per il tuo studio.
            <br />
            Tu resti sempre al comando.
          </p>

          <div className="hero-cta-wrap">
            <CopyPromptButton variant="big" />
          </div>
        </div>
      </header>

      <section className="steps-section">
        <div className="steps-inner">
          <div className="steps-head" data-reveal>
            <span className="steps-kicker mono">come iniziare</span>
            <h2 className="steps-heading">Dal primo download alla prima pratica chiusa</h2>
          </div>

          <div className="step-row" data-reveal>
            <div className="step-text">
              <span className="step-number">01</span>
              <h3>Scarica l&apos;app e crea il tuo account</h3>
              <p>
                Vai su{" "}
                <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">
                  claude.ai/download
                </a>{" "}
                e scarica l&apos;app Claude per il tuo computer, se non
                l&apos;hai già installata. Bastano un paio di minuti: crei un
                account con la tua email e sei pronto per iniziare, senza
                bisogno di alcuna competenza tecnica.
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
                    <Image src="/claude-logo.svg" alt="Claude" width={30} height={30} />
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
              <h3>Apri la scheda Code e incolla il prompt</h3>
              <p>
                Dentro l&apos;app trovi la scheda Code, pensata apposta per
                lavorare con l&apos;AI su attività concrete. Incolla il prompt
                che hai copiato da questa pagina e lascia che Claude legga le
                istruzioni: da lì in poi sa esattamente cosa fare per il tuo
                studio.
              </p>
            </div>
            <div className="step-visual">
              <div className="mock-window">
                <div className="mock-bar">
                  <span className="mock-dot" />
                  <span className="mock-dot" />
                  <span className="mock-dot" />
                </div>
                <div className="mock-app-body">
                  <div className="mock-tabs">
                    <span className="mock-tab">Chat</span>
                    <span className="mock-tab mock-tab--active">Code</span>
                    <span className="mock-tab">Progetti</span>
                  </div>
                  <div className="mock-chat-area">
                    <p className="mock-bubble--pasted">
                      Agisci come l&apos;assistente digitale del mio studio di
                      Dottore Commercialista. Attiva le Skills e gli MCP di
                      DottComm e aiutami con…
                    </p>
                  </div>
                  <div className="mock-input-row">
                    <svg className="mock-clip" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M4 8.5V4a3 3 0 0 1 6 0v6a2 2 0 1 1-4 0V5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    <span className="mock-input-placeholder">Incolla qui il prompt</span>
                    <span className="mock-send">→</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="step-row" data-reveal>
            <div className="step-text">
              <span className="step-number">03</span>
              <h3>Parla con Claude e lavora a velocità dieci volte superiore</h3>
              <p>
                Da questo momento in poi lavori semplicemente parlando: chiedi,
                correggi, approvi. Claude ti aiuta a raggiungere i tuoi
                obiettivi e a rispettare ogni scadenza a una velocità dieci
                volte superiore a quella a cui sei abituato, senza mai perdere
                il controllo di quello che succede.
              </p>
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
                  <p className="mock-msg mock-msg--user">Manda la F24 di luglio</p>
                  <p className="mock-msg mock-msg--agent">Fatto, controllata e pronta per l&apos;invio.</p>
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
          <CopyPromptButton variant="big" />
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
