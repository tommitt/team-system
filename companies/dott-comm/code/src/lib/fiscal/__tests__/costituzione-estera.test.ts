import { describe, expect, it } from "vitest";
import {
  CHECKLIST,
  FASI,
  valutaStartupInnovativa,
  vociDellaFase,
} from "../costituzione-estera";

describe("costituzione-estera — checklist", () => {
  it("copre tutte le fasi e ogni voce ha fonte e flag di verifica", () => {
    for (const fase of FASI) {
      expect(vociDellaFase(fase.chiave).length).toBeGreaterThan(0);
    }
    for (const v of CHECKLIST) {
      expect(v.fonte.length).toBeGreaterThan(0);
      expect(["verificato", "da_verificare"]).toContain(v.verifica);
    }
  });

  it("i documenti da apostillare stanno nella fase documenti USA", () => {
    const daApostillare = CHECKLIST.filter((v) => v.documentoDaApostillare);
    expect(daApostillare.length).toBeGreaterThanOrEqual(4);
    for (const v of daApostillare) expect(v.fase).toBe("documenti_usa");
  });
});

describe("valutaStartupInnovativa", () => {
  it("distribuzione utili = esclusione (il caso tipico USA-owned)", () => {
    const e = valutaStartupInnovativa({ distribuiraUtili: true });
    expect(e.ammissibile).toBe(false);
    expect(e.bloccanti.join(" ")).toContain("distribuzione");
  });

  it("consulenza prevalente e operazione straordinaria escludono", () => {
    expect(
      valutaStartupInnovativa({ attivitaPrevalenteConsulenza: true }).ammissibile,
    ).toBe(false);
    expect(
      valutaStartupInnovativa({ daOperazioneStraordinaria: true }).ammissibile,
    ).toBe(false);
  });

  it("oltre 60 mesi dalla costituzione = esclusione anagrafica", () => {
    const e = valutaStartupInnovativa({
      distribuiraUtili: false,
      oggettoInnovativo: true,
      eMpmi: true,
      attivitaPrevalenteConsulenza: false,
      mesiDallaCostituzione: 72,
      criterioInnovazione: "rs",
    });
    expect(e.ammissibile).toBe(false);
    expect(e.bloccanti.join(" ")).toContain("tetto anagrafico");
  });

  it("dati mancanti → da_valutare, non un falso sì", () => {
    const e = valutaStartupInnovativa({ distribuiraUtili: false });
    expect(e.ammissibile).toBe("da_valutare");
    expect(e.daConfermare.length).toBeGreaterThan(0);
  });

  it("tutti i requisiti soddisfatti → ammissibile, proprietà estera non è un ostacolo", () => {
    const e = valutaStartupInnovativa({
      distribuiraUtili: false,
      oggettoInnovativo: true,
      eMpmi: true,
      attivitaPrevalenteConsulenza: false,
      mesiDallaCostituzione: 6,
      daOperazioneStraordinaria: false,
      criterioInnovazione: "privativa",
    });
    expect(e.ammissibile).toBe(true);
    expect(e.bloccanti).toHaveLength(0);
    expect(e.note.join(" ")).toContain("proprietà corporate estera NON è un ostacolo");
    // Nota strutturale: via notarile sempre presente.
    expect(e.note.join(" ")).toContain("NOTARILE");
  });
});
