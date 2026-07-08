"use client";

import { useState } from "react";

/** Domande frequenti dei commercialisti. Un solo pannello aperto alla volta. */
const FAQ = [
  {
    q: "Cos’è DottComm?",
    a: "Un’estensione per Claude, l’assistente AI di Anthropic, pensata per lo studio del commercialista. Aggiunge a Claude gli strumenti del mestiere (F24 e acconti, scadenze, ravvedimento, atti e cartelle, lettura documenti), così lo usi per il lavoro di tutti i giorni parlando in italiano. Lo stesso connettore funziona allo stesso modo anche in Claude Code e Claude Cowork.",
  },
  {
    q: "Serve competenza tecnica?",
    a: "No. Installi l’app Claude, colleghi DottComm una volta sola dal menu Connettori e incolli un prompt. Da lì lavori parlando in italiano, come scriveresti a un collaboratore.",
  },
  {
    q: "I dati dei miei clienti sono al sicuro?",
    a: "Il collegamento avviene tramite accesso sicuro con il tuo account e i tuoi documenti restano tuoi. DottComm lavora solo sui dati che gli metti a disposizione, quando glielo chiedi.",
  },
  {
    q: "DottComm mi sostituisce?",
    a: "No. Fa la parte ripetitiva e a basso valore, tu mantieni le decisioni. Ogni risultato è una bozza che rivedi e approvi: la responsabilità professionale resta interamente tua.",
  },
  {
    q: "E se sbaglia un numero o una scadenza?",
    a: "DottComm non inventa: se manca un dato lo chiede, e ti mostra sempre cosa ha fatto prima di procedere. Nessun invio parte senza la tua conferma esplicita.",
  },
  {
    q: "Che tipo di attività copre?",
    a: "Il lavoro ricorrente dello studio: F24 e acconti, solleciti ai clienti, scadenzario del cliente, termini di atti e cartelle, ravvedimento operoso, lettura e controllo dei documenti.",
  },
  {
    q: "Posso provarlo prima di decidere?",
    a: "Sì. Colleghi il connettore e provi subito su un caso reale del tuo studio. Se non ti convince, disattivi il connettore in qualsiasi momento.",
  },
];

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="faq-list">
      {FAQ.map((item, i) => {
        const isOpen = open === i;
        return (
          <div className="faq-item" key={item.q} data-open={isOpen}>
            <button
              className="faq-q"
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              {item.q}
              <svg viewBox="0 0 16 16" fill="none" width="18" height="18" aria-hidden="true">
                <path
                  d="M4 6l4 4 4-4"
                  stroke="var(--violet)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {isOpen && <p className="faq-a">{item.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
