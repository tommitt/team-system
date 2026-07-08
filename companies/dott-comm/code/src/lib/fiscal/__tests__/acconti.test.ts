import { describe, it, expect } from "vitest";
import { calcolaAcconto, valutaPrevisionale } from "../acconti";

describe("calcolaAcconto", () => {
  it("non è dovuto sotto €51,65", () => {
    const r = calcolaAcconto({ base: 50, regime: "ordinario" });
    expect(r.dovuto).toBe(false);
    expect(r.modalita).toBe("non_dovuto");
  });

  it("unica soluzione a novembre sotto €257,52", () => {
    const r = calcolaAcconto({ base: 200, regime: "ordinario" });
    expect(r.modalita).toBe("unica_soluzione");
    expect(r.prima?.importo).toBe(200);
    expect(r.prima?.scadenza).toBe("2026-11-30");
    expect(r.seconda).toBeUndefined();
  });

  it("split 40/60 per il regime ordinario sopra soglia", () => {
    const r = calcolaAcconto({ base: 1000, regime: "ordinario" });
    expect(r.modalita).toBe("due_rate");
    expect(r.split).toBe("40/60");
    expect(r.prima?.importo).toBe(400);
    expect(r.prima?.scadenza).toBe("2026-07-20");
    expect(r.seconda?.importo).toBe(600);
    expect(r.seconda?.scadenza).toBe("2026-11-30");
  });

  it("split 50/50 per i soggetti ISA e forfettari", () => {
    for (const regime of ["isa", "forfettario", "vantaggio"] as const) {
      const r = calcolaAcconto({ base: 1000, regime });
      expect(r.split).toBe("50/50");
      expect(r.prima?.importo).toBe(500);
      expect(r.seconda?.importo).toBe(500);
    }
  });

  it("soglia rateizzo ISA/forfettari: €206, non €257,52", () => {
    // €230 per un ISA → due rate (sopra €206); per un ordinario → unica soluzione.
    const isa = calcolaAcconto({ base: 230, regime: "isa" });
    expect(isa.modalita).toBe("due_rate");
    const ordinario = calcolaAcconto({ base: 230, regime: "ordinario" });
    expect(ordinario.modalita).toBe("unica_soluzione");
  });

  it("la somma delle rate è sempre pari al totale, anche con arrotondamenti", () => {
    const r = calcolaAcconto({ base: 1001, regime: "isa" });
    expect((r.prima?.importo ?? 0) + (r.seconda?.importo ?? 0)).toBe(r.totale);
  });
});

describe("valutaPrevisionale", () => {
  it("segnala il rischio quando il previsionale scende sotto la soglia", () => {
    const r = valutaPrevisionale({
      accontoStorico: 1000,
      accontoPrevisionale: 500,
      impostaFinaleStimata: 700,
    });
    expect(r.accontoRichiestoSuStima).toBe(700);
    expect(r.sogliaRischio).toBe(560); // 700 × 0,80
    expect(r.aRischio).toBe(true);
    expect(r.scopertoStimato).toBe(200);
    expect(r.sanzionePotenziale).toBe(50); // 200 × 25%
    expect(r.risparmioVsStorico).toBe(500);
  });

  it("non segnala rischio quando il previsionale resta sopra la soglia", () => {
    const r = valutaPrevisionale({
      accontoStorico: 1000,
      accontoPrevisionale: 600,
      impostaFinaleStimata: 700,
    });
    expect(r.aRischio).toBe(false);
    expect(r.scopertoStimato).toBe(100);
  });
});
