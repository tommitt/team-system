import { describe, expect, it } from "vitest";
import {
  adempimentiApplicabili,
  derivaScadenzario,
  type AttributiCliente,
} from "../adempimenti";

const forfettario: AttributiCliente = {
  regime: "forfettario",
  forma: "professionista",
};

const impresaOrdinaria: AttributiCliente = {
  regime: "ordinaria",
  forma: "societa_capitali",
  sostitutoImposta: true,
};

describe("adempimentiApplicabili", () => {
  it("forfettario: niente IVA, niente LIPE, sì redditi e acconti", () => {
    const adempimenti = adempimentiApplicabili(forfettario);
    expect(adempimenti).toContain("Saldo imposte + 1° acconto");
    expect(adempimenti).toContain("Dichiarazione dei redditi (trasmissione)");
    expect(adempimenti.join()).not.toMatch(/IVA|LIPE/);
  });

  it("società di capitali ordinaria con ritenute: il set completo", () => {
    const adempimenti = adempimentiApplicabili(impresaOrdinaria);
    expect(adempimenti).toContain("Liquidazione e versamento IVA mensile");
    expect(adempimenti).toContain("Comunicazione liquidazioni periodiche IVA (LIPE)");
    expect(adempimenti).toContain("Certificazione Unica (CU)");
    expect(adempimenti).toContain("Modello 770");
    expect(adempimenti).toContain("Approvazione bilancio (assemblea entro 120 gg)");
    expect(adempimenti).toContain("Diritto camerale annuale");
  });

  it("periodicità IVA esplicita batte il default del regime", () => {
    const trimestrale = adempimentiApplicabili({
      ...impresaOrdinaria,
      ivaPeriodicita: "trimestrale",
    });
    expect(trimestrale).toContain("Liquidazione e versamento IVA trimestrale");
    expect(trimestrale).not.toContain("Liquidazione e versamento IVA mensile");
  });
});

describe("derivaScadenzario", () => {
  it("filtra sull'intervallo e ordina per data", () => {
    const occ = derivaScadenzario({
      attributi: impresaOrdinaria,
      da: "2026-03-01",
      a: "2026-04-30",
    });
    expect(occ.length).toBeGreaterThan(0);
    for (const o of occ) {
      expect(o.scadenza >= "2026-03-01" && o.scadenza <= "2026-04-30").toBe(true);
    }
    const date = occ.map((o) => o.scadenza);
    expect([...date].sort()).toEqual(date);
    // Marzo: CU + saldo IVA trim? no (mensile) — ma IVA mensile del 16/3 e 16/4 ci sono.
    expect(occ.some((o) => o.adempimento.includes("Certificazione Unica"))).toBe(true);
    expect(occ.some((o) => o.adempimento.includes("Approvazione bilancio"))).toBe(true);
  });

  it("applica lo slittamento festivo alle ricorrenze", () => {
    // 16/5/2027 è domenica → l'IVA mensile di maggio 2027 slitta al 17/5.
    const occ = derivaScadenzario({
      attributi: { regime: "ordinaria", forma: "ditta_individuale" },
      da: "2027-05-01",
      a: "2027-05-31",
    });
    const iva = occ.find((o) => o.adempimento.includes("IVA mensile"));
    expect(iva?.scadenza).toBe("2027-05-17");
  });

  it("forfettario con immobili e INPS: solo le sue scadenze", () => {
    const occ = derivaScadenzario({
      attributi: {
        ...forfettario,
        forma: "ditta_individuale",
        immobili: true,
        inpsArtigianiCommercianti: true,
      },
      da: "2026-06-01",
      a: "2026-06-30",
    });
    const nomi = occ.map((o) => o.adempimento);
    expect(nomi).toContain("IMU");
    expect(nomi).toContain("Saldo imposte + 1° acconto");
    expect(nomi).toContain("Diritto camerale annuale");
    expect(nomi.join()).not.toMatch(/IVA/);
  });

  it("copre intervalli a cavallo d'anno", () => {
    const occ = derivaScadenzario({
      attributi: impresaOrdinaria,
      da: "2026-12-01",
      a: "2027-01-31",
    });
    expect(occ.some((o) => o.adempimento === "Acconto IVA")).toBe(true); // 27/12/2026
    expect(occ.some((o) => o.scadenza.startsWith("2027-01"))).toBe(true); // IVA 16/1/2027
  });

  it("rifiuta intervalli invertiti", () => {
    expect(() =>
      derivaScadenzario({ attributi: forfettario, da: "2026-07-01", a: "2026-06-01" }),
    ).toThrow(/invertito/);
  });
});
