import Image from "next/image";
import { AgentReel } from "@/components/AgentReel";
import { CopyPromptButton } from "@/components/CopyPromptButton";
import { ScrollRevealInit } from "@/components/ScrollRevealInit";

export default function Home() {
  return (
    <>
      <ScrollRevealInit />

      <nav>
        <div className="nav-inner">
          <a className="logo" href="#">
            <Image src="/logo.svg" alt="DottComm" width={27} height={27} />
            <span className="logo-word">
              Dott<b>Comm</b>
            </span>
          </a>
          <CopyPromptButton variant="nav" />
        </div>
      </nav>

      <div className="stage-wrap">
        <div className="stage">
          <div className="stage-content">
            <header className="hero">
              <h1 className="hero-title">
                <span className="line1">Lo studio del futuro grazie a</span>
                <AgentReel />
              </h1>
              <p className="subtitle">
                Un agente che lavora davvero per il tuo studio.
                <br />
                Tu resti sempre al comando.
              </p>

              <div className="hero-cta-wrap">
                <CopyPromptButton variant="big" />
                <p className="hero-caption">Poi fa tutto da solo.</p>
              </div>
            </header>
          </div>
        </div>
      </div>

      <section className="flow-section">
        <div className="flow-inner">
          <p className="flow-kicker mono" data-reveal>
            capisce, esegue, verifica
          </p>
          <div className="flow">
            <div className="flow-step" data-reveal>
              <span className="k mono">01</span>
              <h3>Capisce</h3>
              <p>Ti chiede e capisce i tuoi processi insieme a te</p>
            </div>
            <div className="flow-step" data-reveal>
              <span className="k mono">02</span>
              <h3>Esegue</h3>
              <p>Lavora dentro l&apos;agente che usi già, senza nulla da installare</p>
            </div>
            <div className="flow-step" data-reveal>
              <span className="k mono">03</span>
              <h3>Verifica</h3>
              <p>Ti mostra cosa ha fatto, prima di andare avanti</p>
            </div>
          </div>
        </div>
      </section>

      <div className="closing-wrap">
        <div className="stage">
          <div className="stage-content">
            <section className="closing-pad" id="cta">
              <h2>Aumenta il tuo studio con l&apos;AI</h2>
              <CopyPromptButton variant="big" />
            </section>
          </div>
        </div>
      </div>

      <footer>
        <div className="footer-inner">
          <div className="footer-meta">
            <span>© 2026 DottComm</span>
            <a href="mailto:info@dottcomm.dev">info@dottcomm.dev</a>
          </div>
        </div>
      </footer>
    </>
  );
}
