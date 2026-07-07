import { describe, it, expect } from "vitest";
import { pianoRate } from "../rateazione";

describe("pianoRate", () => {
  it("genera N rate al giorno 16 dei mesi successivi alla prima", () => {
    const p = pianoRate({
      importoTotale: 1000,
      nRate: 6,
      dataPrimaRata: "2026-07-20",
    });
    expect(p.nRateEffettive).toBe(6);
    expect(p.capato).toBe(false);
    expect(p.rate.map((r) => r.scadenza)).toEqual([
      "2026-07-20",
      "2026-08-16",
      "2026-09-16",
      "2026-10-16",
      "2026-11-16",
      "2026-12-16",
    ]);
  });

  it("la prima rata non porta interessi, le successive sì (crescenti)", () => {
    const p = pianoRate({
      importoTotale: 1200,
      nRate: 4,
      dataPrimaRata: "2026-07-20",
    });
    expect(p.rate[0].interessi).toBe(0);
    expect(p.rate[1].interessi).toBeGreaterThan(0);
    expect(p.rate[2].interessi).toBeGreaterThan(p.rate[1].interessi);
  });

  it("la somma delle quote capitale è pari all'importo totale", () => {
    const p = pianoRate({
      importoTotale: 1000,
      nRate: 6,
      dataPrimaRata: "2026-07-20",
    });
    const sommaCapitale = p.rate.reduce((a, r) => a + r.quotaCapitale, 0);
    expect(Math.round(sommaCapitale * 100) / 100).toBe(1000);
  });

  it("scarta le rate oltre il 16/12 e segnala il cap", () => {
    const p = pianoRate({
      importoTotale: 1000,
      nRate: 7, // la 7ª cadrebbe a gennaio 2027
      dataPrimaRata: "2026-07-20",
    });
    expect(p.nRateRichieste).toBe(7);
    expect(p.nRateEffettive).toBe(6);
    expect(p.capato).toBe(true);
    expect(p.rate[p.rate.length - 1].scadenza <= "2026-12-16").toBe(true);
  });
});
