import { describe, expect, it } from "vitest";
import {
  avvisoCopertura,
  avvisoTemporaleRisultato,
  citazione,
  formattaCopertura,
  pagine,
  vigenza,
} from "../format";
import type { Risultato } from "../search";

const base: Risultato = {
  chunkId: 1,
  documentoId: "d",
  fonte: "prassi_ade",
  tipo: "circolare",
  estremi: "Circolare 24/E del 02/08/2023",
  titolo: "Crediti d'imposta",
  urlOrigine: "https://esempio/circolare.pdf",
  percorso: "Circolare 24/E del 02/08/2023 > 1.1 Crediti d'imposta",
  testo: "Il credito spetta…",
  seq: 3,
  paginaDa: 4,
  paginaA: 6,
  annoImposta: null,
  vigenzaDa: null,
  vigenzaA: null,
  notaRedazionale: null,
  score: 0.5,
};

describe("citazione", () => {
  it("porta estremi, sezione, pagine e URL — tutto ciò che serve a verificare", () => {
    const c = citazione(base);
    expect(c).toContain("Circolare 24/E del 02/08/2023");
    expect(c).toContain("1.1 Crediti d'imposta");
    expect(c).toContain("pp. 4-6");
    expect(c).toContain("https://esempio/circolare.pdf");
  });

  it("non ripete gli estremi già presenti in testa al percorso", () => {
    expect(citazione(base).match(/Circolare 24\/E/g)).toHaveLength(1);
  });
});

describe("pagine", () => {
  it("singola, intervallo, o assente", () => {
    expect(pagine({ paginaDa: 4, paginaA: 4 })).toBe("p. 4");
    expect(pagine({ paginaDa: 4, paginaA: 6 })).toBe("pp. 4-6");
    expect(pagine({ paginaDa: 4, paginaA: null })).toBe("p. 4");
    expect(pagine({ paginaDa: null, paginaA: null })).toBeNull();
  });
});

describe("avvisoTemporaleRisultato", () => {
  it("tace quando non è stato chiesto un anno d'imposta", () => {
    expect(avvisoTemporaleRisultato(base, undefined)).toBeNull();
  });

  it("avverte quando il documento è di un altro anno d'imposta", () => {
    const r = { ...base, annoImposta: 2023 };
    expect(avvisoTemporaleRisultato(r, 2026)).toContain("anno d'imposta 2023");
  });

  it("tace quando l'anno combacia", () => {
    expect(avvisoTemporaleRisultato({ ...base, annoImposta: 2026 }, 2026)).toBeNull();
  });

  it("avverte su testo non più vigente nell'anno chiesto", () => {
    const r = { ...base, vigenzaA: "2023-12-31" };
    expect(avvisoTemporaleRisultato(r, 2026)).toContain("non più vigente");
  });

  it("avverte su testo non ancora vigente nell'anno chiesto", () => {
    const r = { ...base, vigenzaDa: "2027-01-01" };
    expect(avvisoTemporaleRisultato(r, 2026)).toContain("non ancora vigente");
  });

  it("tace quando l'anno chiesto cade dentro la vigenza", () => {
    const r = { ...base, vigenzaDa: "2024-01-01", vigenzaA: "2027-12-31" };
    expect(avvisoTemporaleRisultato(r, 2026)).toBeNull();
  });
});

describe("avvisoCopertura", () => {
  it("avverte quando la domanda supera l'anno più recente in corpus", () => {
    const a = avvisoCopertura(2026, 2025);
    expect(a).toContain("COPERTURA INSUFFICIENTE");
    expect(a).toContain("2026");
    expect(a).toContain("2025");
  });

  it("tace quando il corpus copre l'anno chiesto", () => {
    expect(avvisoCopertura(2025, 2025)).toBeNull();
    expect(avvisoCopertura(2024, 2025)).toBeNull();
  });

  it("tace quando non c'è un anno chiesto o il corpus è vuoto", () => {
    expect(avvisoCopertura(undefined, 2025)).toBeNull();
    expect(avvisoCopertura(2026, null)).toBeNull();
  });
});

describe("vigenza", () => {
  it("descrive gli estremi aperti e chiusi", () => {
    expect(vigenza({ vigenzaDa: "2024-01-01", vigenzaA: null })).toBe(
      "in vigore dal 2024-01-01",
    );
    expect(vigenza({ vigenzaDa: null, vigenzaA: "2023-12-31" })).toBe(
      "in vigore fino al 2023-12-31",
    );
    expect(vigenza({ vigenzaDa: null, vigenzaA: null })).toBeNull();
  });
});

describe("formattaCopertura", () => {
  it("elenca documenti e anno massimo per fonte", () => {
    const testo = formattaCopertura([
      {
        fonte: "prassi_ade",
        documenti: 3,
        annoMax: null,
        ultimaPubblicazione: "2023-08-29",
        ultimaIngestione: null,
      },
    ]);
    expect(testo).toContain("Prassi Agenzia delle Entrate");
    expect(testo).toContain("3 doc.");
    expect(testo).toContain("2023-08-29");
  });

  it("dice esplicitamente quando il corpus è vuoto", () => {
    expect(formattaCopertura([])).toContain("Corpus vuoto");
  });
});
