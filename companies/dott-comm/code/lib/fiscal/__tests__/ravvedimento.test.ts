import { describe, it, expect } from "vitest";
import { calcolaRavvedimento, giorniTra } from "../ravvedimento";

describe("giorniTra", () => {
  it("conta i giorni di calendario tra due date ISO", () => {
    expect(giorniTra("2026-07-20", "2026-07-30")).toBe(10);
    expect(giorniTra("2026-07-20", "2026-07-20")).toBe(0);
  });
});

describe("calcolaRavvedimento", () => {
  it("nessuna sanzione se non c'è ritardo", () => {
    const r = calcolaRavvedimento({
      importo: 1000,
      dataScadenza: "2026-07-20",
      dataPagamento: "2026-07-20",
    });
    expect(r.sanzione).toBe(0);
    expect(r.interessi).toBe(0);
    expect(r.totale).toBe(1000);
  });

  it("ravvedimento sprint entro 14 giorni: sanzione per giorno", () => {
    const r = calcolaRavvedimento({
      importo: 1000,
      dataScadenza: "2026-07-20",
      dataPagamento: "2026-07-30", // 10 giorni
      tassoLegaleAnnuo: 0.02,
    });
    expect(r.giorniRitardo).toBe(10);
    expect(r.sanzione).toBe(8.33); // 1000 × 0,000833 × 10
    expect(r.interessi).toBe(0.55); // 1000 × 0,02 × 10/365
    expect(r.totale).toBe(1008.88);
  });

  it("scaglione entro 30 giorni: percentuale fissa", () => {
    const r = calcolaRavvedimento({
      importo: 1000,
      dataScadenza: "2026-07-20",
      dataPagamento: "2026-08-19", // 30 giorni
    });
    expect(r.giorniRitardo).toBe(30);
    expect(r.sanzione).toBe(12.5); // 1000 × 1,25%
    expect(r.scaglione).toContain("30 giorni");
  });
});
