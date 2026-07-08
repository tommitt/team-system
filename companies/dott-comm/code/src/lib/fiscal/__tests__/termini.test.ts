import { describe, expect, it } from "vitest";
import {
  aggiungiGiorni,
  giornoSettimana,
  inFinestraAnnuale,
  isFestivo,
  pasqua,
  scadenzaConSospensioni,
  slittaSeFestivo,
} from "../calendario";
import { calcolaTermini } from "../termini";

describe("calendario", () => {
  it("aggiunge giorni attraverso i confini di mese e anno", () => {
    expect(aggiungiGiorni("2026-01-31", 1)).toBe("2026-02-01");
    expect(aggiungiGiorni("2026-12-31", 1)).toBe("2027-01-01");
    expect(aggiungiGiorni("2024-02-28", 1)).toBe("2024-02-29"); // bisestile
  });

  it("calcola la Pasqua (Meeus/Butcher)", () => {
    expect(pasqua(2026)).toBe("2026-04-05");
    expect(pasqua(2025)).toBe("2025-04-20");
    expect(pasqua(2027)).toBe("2027-03-28");
  });

  it("riconosce festivi: domeniche, feste nazionali, Pasquetta", () => {
    expect(isFestivo("2026-07-12")).toBe(true); // domenica
    expect(isFestivo("2026-08-15")).toBe(true); // Ferragosto
    expect(isFestivo("2026-04-06")).toBe(true); // Pasquetta 2026
    expect(isFestivo("2026-07-13")).toBe(false); // lunedì feriale
  });

  it("slitta i termini che cadono di sabato/festivo al primo lavorativo", () => {
    // 2026-08-15 (Ferragosto) è sabato; domenica 16 → lunedì 17.
    expect(slittaSeFestivo("2026-08-15")).toBe("2026-08-17");
    expect(slittaSeFestivo("2026-07-18")).toBe("2026-07-20"); // sabato → lunedì
    expect(slittaSeFestivo("2026-07-15")).toBe("2026-07-15"); // mercoledì resta
  });

  it("valuta le finestre annuali MM-DD", () => {
    const feriale = { inizio: "08-01", fine: "08-31" };
    expect(inFinestraAnnuale("2026-08-01", feriale)).toBe(true);
    expect(inFinestraAnnuale("2026-08-31", feriale)).toBe(true);
    expect(inFinestraAnnuale("2026-09-01", feriale)).toBe(false);
  });

  it("conta i giorni escludendo il dies a quo e saltando le sospensioni", () => {
    // Senza sospensioni: 30 gg da 2026-03-01 → 2026-03-31.
    expect(scadenzaConSospensioni("2026-03-01", 30)).toBe("2026-03-31");
    // Con sospensione feriale: 60 gg da 2026-07-10; i 31 giorni di agosto
    // non contano → matura il 2026-10-09 (invece dell'8/9).
    expect(
      scadenzaConSospensioni("2026-07-10", 60, [
        { inizio: "08-01", fine: "08-31" },
      ]),
    ).toBe("2026-10-09");
  });
});

describe("calcolaTermini", () => {
  it("avviso bonario: 30 gg con sospensione estiva 1/8–4/9", () => {
    // Notifica 2026-07-20: senza sospensione maturerebbe il 19/8; la finestra
    // 1/8–4/9 sospende il conteggio → 11 gg consumati a luglio (21–31), i
    // restanti 19 dal 5/9 → matura il 23/9 (mercoledì, nessuno slittamento).
    const t = calcolaTermini({
      tipo: "avviso_bonario",
      dataNotifica: "2026-07-20",
    });
    const pagamento = t.termini.find((x) => x.chiave === "pagamento_agevolato");
    expect(pagamento?.scadenza).toBe("2026-09-23");
    expect(pagamento?.perentorio).toBe(true);
  });

  it("avviso bonario telematico all'intermediario: 60 gg", () => {
    const t = calcolaTermini({
      tipo: "avviso_bonario",
      dataNotifica: "2026-03-02",
      telematicoIntermediario: true,
    });
    // 60 gg da 2026-03-02 → 2026-05-01 (festa del lavoro, venerdì) → sab/dom → 4/5.
    expect(t.termini[0].scadenza).toBe("2026-05-04");
  });

  it("accertamento: ricorso 60 gg con sospensione feriale", () => {
    const t = calcolaTermini({
      tipo: "avviso_accertamento",
      dataNotifica: "2026-07-10",
    });
    const ricorso = t.termini.find((x) => x.chiave === "ricorso");
    expect(ricorso?.scadenza).toBe("2026-10-09");
    expect(ricorso?.sospensioni).toHaveLength(1);
  });

  it("accertamento con adesione: +90 gg cumulati con la feriale", () => {
    const t = calcolaTermini({
      tipo: "avviso_accertamento",
      dataNotifica: "2026-07-10",
      conAdesione: true,
    });
    const conAdesione = t.termini.find(
      (x) => x.chiave === "ricorso_con_adesione",
    );
    // 150 gg utili da 2026-07-10 saltando agosto: 21 (luglio 11–31) + 30
    // (settembre) + 31 (ottobre) + 30 (novembre) + 31 (dicembre) = 143 → +7 a
    // gennaio 2027 → matura giovedì 2027-01-07 (nessuno slittamento).
    expect(conAdesione?.scadenza).toBe("2027-01-07");
  });

  it("cartella: pagamento 60 gg senza feriale, ricorso 60 gg con feriale", () => {
    const t = calcolaTermini({
      tipo: "cartella_pagamento",
      dataNotifica: "2026-07-10",
    });
    const pagamento = t.termini.find((x) => x.chiave === "pagamento");
    const ricorso = t.termini.find((x) => x.chiave === "ricorso");
    // Pagamento: 60 gg civili → 2026-09-08 (martedì).
    expect(pagamento?.scadenza).toBe("2026-09-08");
    // Ricorso: agosto sospeso → 2026-10-09.
    expect(ricorso?.scadenza).toBe("2026-10-09");
  });

  it("intimazione: 5 gg con slittamento festivo", () => {
    // Notifica martedì 2026-07-14 → matura domenica 19/7 → lunedì 20/7.
    const t = calcolaTermini({
      tipo: "intimazione_pagamento",
      dataNotifica: "2026-07-14",
    });
    expect(t.termini[0].scadenza).toBe("2026-07-20");
  });

  it("ogni tipo di atto produce almeno un termine e un'opzione", () => {
    const tipi = [
      "avviso_bonario",
      "controllo_formale",
      "avviso_accertamento",
      "cartella_pagamento",
      "intimazione_pagamento",
      "preavviso_fermo",
    ] as const;
    for (const tipo of tipi) {
      const t = calcolaTermini({ tipo, dataNotifica: "2026-02-02" });
      expect(t.termini.length).toBeGreaterThan(0);
      expect(t.opzioni.length).toBeGreaterThan(0);
    }
  });
});

describe("giornoSettimana", () => {
  it("è coerente con il calendario reale", () => {
    expect(giornoSettimana("2026-07-20")).toBe(1); // lunedì
    expect(giornoSettimana("2026-07-19")).toBe(0); // domenica
  });
});
