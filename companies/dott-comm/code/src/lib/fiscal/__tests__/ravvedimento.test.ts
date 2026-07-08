import { describe, it, expect } from "vitest";
import {
  calcolaRavvedimento,
  giorniTra,
  interessiLegaliProRata,
} from "../ravvedimento";

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

  it("usa il tasso legale 2026 (1,60%) dal registro, non un default stantio", () => {
    const r = calcolaRavvedimento({
      importo: 1000,
      dataScadenza: "2026-01-16",
      dataPagamento: "2026-01-26", // 10 giorni, tutti nel 2026
    });
    expect(r.interessiPerAnno).toHaveLength(1);
    expect(r.interessiPerAnno[0].tasso).toBe(0.016);
    expect(r.interessi).toBe(0.44); // 1000 × 0,016 × 10/365
    expect(r.avvertenze).toEqual([]);
  });

  it("interessi pro-rata su ritardo a cavallo d'anno (2% nel 2025, 1,6% nel 2026)", () => {
    const { totale, perAnno } = interessiLegaliProRata({
      importo: 10000,
      dataScadenza: "2025-12-01",
      dataPagamento: "2026-01-31",
    });
    expect(perAnno).toHaveLength(2);
    expect(perAnno[0]).toMatchObject({ anno: 2025, tasso: 0.02, giorni: 30 });
    expect(perAnno[1]).toMatchObject({ anno: 2026, tasso: 0.016, giorni: 31 });
    // 10000×0,02×30/365 = 16,44 + 10000×0,016×31/365 = 13,59 → 30,03
    expect(totale).toBe(30.03);
  });

  it("oltre 1 anno senza schema di atto: lett. b-bis (1/7), con avvertenza sull'atto istruttorio", () => {
    const r = calcolaRavvedimento({
      importo: 1000,
      dataScadenza: "2024-11-30",
      dataPagamento: "2026-07-01", // ben oltre 730 gg non è più un confine
    });
    expect(r.sanzione).toBe(35.71); // 1000 × 3,5714% — nessun tetto a 730 gg
    expect(r.scaglione).toContain("senza tetto");
    expect(r.avvertenze.join(" ")).toContain("atto istruttorio");
  });

  it("schema di atto ricevuto: lett. b-ter (1/6) a prescindere dai giorni", () => {
    const r = calcolaRavvedimento({
      importo: 1000,
      dataScadenza: "2026-01-16",
      dataPagamento: "2026-03-01",
      schemaDiAttoRicevuto: true,
    });
    expect(r.sanzione).toBe(41.67); // 1000 × 4,1667%
    expect(r.scaglione).toContain("schema di atto");
  });

  it("violazione pre-riforma (ante 1/9/2024): avverte che il regime non è modellato", () => {
    const r = calcolaRavvedimento({
      importo: 1000,
      dataScadenza: "2024-06-30",
      dataPagamento: "2024-07-10",
    });
    expect(r.avvertenze.join(" ")).toContain("PRE-RIFORMA");
  });

  it("anno senza tasso verificato nel registro: avvertenza esplicita", () => {
    const r = calcolaRavvedimento({
      importo: 1000,
      dataScadenza: "2024-09-16", // post-riforma, ma tasso 2024 non riverificato
      dataPagamento: "2024-09-26",
    });
    expect(r.interessiPerAnno[0].verificato).toBe(false);
    expect(r.avvertenze.join(" ")).toContain("non verificato");
  });
});
