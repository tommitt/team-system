import { describe, it, expect } from "vitest";
import {
  calcolaDetrazioneSanitarie,
  valutaVoce,
  type VoceSpesa,
} from "../detrazioni-sanitarie";

/** Costruttore comodo: voce detraibile, tracciabilità soddisfatta, non in precompilata. */
function voce(over: Partial<VoceSpesa> & { importo: number; rigo: VoceSpesa["rigo"] }): VoceSpesa {
  return {
    detraibile: true,
    tracciabilitaRichiesta: false,
    pagamentoTracciabile: true,
    inPrecompilata: false,
    ...over,
  };
}

describe("valutaVoce", () => {
  it("include una spesa generica detraibile", () => {
    const v = valutaVoce(voce({ importo: 100, rigo: "E1c2" }), 0);
    expect(v.esito).toBe("inclusa");
  });

  it("scarta una voce non detraibile", () => {
    const v = valutaVoce(voce({ importo: 30, rigo: "E1c2", detraibile: false }), 0);
    expect(v.esito).toBe("esclusa_non_detraibile");
  });

  it("scarta una prestazione privata pagata in contanti (tracciabilità)", () => {
    const v = valutaVoce(
      voce({
        importo: 200,
        rigo: "E1c2",
        tracciabilitaRichiesta: true,
        pagamentoTracciabile: false,
      }),
      0,
    );
    expect(v.esito).toBe("esclusa_tracciabilita");
  });

  it("un farmaco in contanti resta detraibile (esente da tracciabilità)", () => {
    const v = valutaVoce(
      voce({
        importo: 20,
        rigo: "E1c2",
        tracciabilitaRichiesta: false, // farmaco: esente
        pagamentoTracciabile: false,
      }),
      0,
    );
    expect(v.esito).toBe("inclusa");
  });

  it("non conteggia una voce eliminata rispetto al precompilato", () => {
    const v = valutaVoce(
      voce({ importo: 100, rigo: "E1c2", inPrecompilata: true, azione: "eliminata" }),
      0,
    );
    expect(v.esito).toBe("esclusa_eliminata");
  });
});

describe("calcolaDetrazioneSanitarie", () => {
  it("somma i subtotali per rigo e applica franchigia + 19% su E1", () => {
    const r = calcolaDetrazioneSanitarie([
      voce({ importo: 500, rigo: "E1c2" }),
      voce({ importo: 300, rigo: "E1c2" }),
    ]);
    expect(r.subtotali.E1c2).toBe(800);
    expect(r.totaleIncluso).toBe(800);
    // 19% × (800 − 129,11) = 19% × 670,89 = 127,4691 → 127,47
    expect(r.detrazioneStima).toBe(127.47);
  });

  it("la franchigia azzera la detrazione sotto €129,11 di spesa E1", () => {
    const r = calcolaDetrazioneSanitarie([voce({ importo: 100, rigo: "E1c2" })]);
    expect(r.detrazioneStima).toBe(0);
  });

  it("applica UNA sola franchigia al pool E1 + E2 (non separata)", () => {
    // E1c2 = 50, E2 = 200 → base pool = 250; 19% × (250 − 129,11) = 22,9691 → 22,97
    const r = calcolaDetrazioneSanitarie([
      voce({ importo: 50, rigo: "E1c2" }),
      voce({ importo: 200, rigo: "E2" }),
    ]);
    expect(r.subtotali.E1c2).toBe(50);
    expect(r.subtotali.E2).toBe(200);
    expect(r.detrazioneStima).toBe(22.97);
    // Somma del dettaglio = stima (nessuna doppia franchigia).
    expect(
      r.dettaglioDetrazione.E1c2 + r.dettaglioDetrazione.E2,
    ).toBeCloseTo(22.97, 2);
  });

  it("E25 è deduzione: non entra nella detrazione 19%, riportata a parte", () => {
    const r = calcolaDetrazioneSanitarie([
      voce({ importo: 300, rigo: "E25" }),
      voce({ importo: 500, rigo: "E1c2" }),
    ]);
    expect(r.deduzioneE25).toBe(300);
    expect(r.subtotali.E25).toBe(300);
    // La detrazione è solo su E1c2: 19% × (500 − 129,11) = 70,47
    expect(r.detrazioneStima).toBe(70.47);
    // E25 fuori dal totale detraibile.
    expect(r.totaleIncluso).toBe(500);
    expect(r.avvisi.some((a) => a.includes("E25"))).toBe(true);
  });

  it("scorpora l'importo rimborsato (non detraibile)", () => {
    const r = calcolaDetrazioneSanitarie([
      voce({ importo: 300, rigo: "E1c2", rimborso: 100 }),
    ]);
    expect(r.subtotali.E1c2).toBe(200); // 300 − 100 rimborso
    expect(r.totaleRimborsato).toBe(100);
  });

  it("E3 (disabili) è detraibile al 19% senza franchigia", () => {
    const r = calcolaDetrazioneSanitarie([voce({ importo: 100, rigo: "E3" })]);
    expect(r.dettaglioDetrazione.E3).toBe(19);
    // La franchigia non tocca E3: la detrazione è piena.
    expect(r.detrazioneStima).toBe(19);
  });

  it("applica il tetto del rigo E4 (€18.075,99) e avvisa", () => {
    const r = calcolaDetrazioneSanitarie([voce({ importo: 20000, rigo: "E4" })]);
    expect(r.subtotali.E4).toBe(20000);
    // detrazione sul tetto: 19% × 18.075,99 = 3.434,4381 → 3.434,44
    expect(r.dettaglioDetrazione.E4).toBe(3434.44);
    expect(r.avvisi.some((a) => a.includes("E4"))).toBe(true);
  });

  it("scarta le voci non detraibili e per tracciabilità, con riepilogo scarti", () => {
    const r = calcolaDetrazioneSanitarie([
      voce({ importo: 500, rigo: "E1c2" }),
      voce({ importo: 40, rigo: "E1c2", detraibile: false }),
      voce({
        importo: 200,
        rigo: "E1c2",
        tracciabilitaRichiesta: true,
        pagamentoTracciabile: false,
      }),
    ]);
    expect(r.subtotali.E1c2).toBe(500);
    expect(r.scarti.nonDetraibili.conteggio).toBe(1);
    expect(r.scarti.nonDetraibili.importo).toBe(40);
    expect(r.scarti.tracciabilita.conteggio).toBe(1);
    expect(r.scarti.tracciabilita.importo).toBe(200);
  });

  it("segnala la rateizzabilità sopra €15.493,71 (E1+E2+E3)", () => {
    const r = calcolaDetrazioneSanitarie([voce({ importo: 16000, rigo: "E1c2" })]);
    expect(r.rateizzabile).toBe(true);
    expect(r.quotaAnnua).toBeCloseTo(r.detrazioneStima / 4, 2);
    expect(r.avvisi.some((a) => a.includes("rateizzabile"))).toBe(true);
  });

  it("non è rateizzabile sotto la soglia", () => {
    const r = calcolaDetrazioneSanitarie([voce({ importo: 5000, rigo: "E1c2" })]);
    expect(r.rateizzabile).toBe(false);
    expect(r.quotaAnnua).toBeUndefined();
  });

  it("segnala il possibile doppio conteggio col Sistema TS", () => {
    const r = calcolaDetrazioneSanitarie([
      voce({ importo: 100, rigo: "E1c2", inPrecompilata: true, azione: "aggiunta" }),
    ]);
    expect(r.avvisi.some((a) => a.includes("doppio conteggio"))).toBe(true);
  });

  it("traccia il totale documentazione-a-rischio (aggiunte/modificate)", () => {
    const r = calcolaDetrazioneSanitarie([
      voce({ importo: 200, rigo: "E1c2", inPrecompilata: true, azione: "confermata" }),
      voce({ importo: 150, rigo: "E1c2", azione: "aggiunta" }),
      voce({ importo: 100, rigo: "E1c2", inPrecompilata: true, azione: "modificata" }),
    ]);
    // Solo aggiunta + modificata: 150 + 100 = 250; la confermata non è a rischio.
    expect(r.totaleDocumentazioneARischio).toBe(250);
  });
});
