import { describe, expect, it } from "vitest";
import {
  bozzaPropostaIncarico,
  faqPersonalizzate,
  livelloStabileOrganizzazione,
  pianoDiPartenza,
  raccomandaVeicolo,
} from "../ingresso-italia";

describe("livelloStabileOrganizzazione", () => {
  it("operazioni/ufficio/agente → S.O. sì", () => {
    expect(livelloStabileOrganizzazione({ attivita: "operazioni" })).toBe("si");
    expect(livelloStabileOrganizzazione({ presenzaFisica: "ufficio" })).toBe("si");
    expect(livelloStabileOrganizzazione({ concludeContrattiInItalia: true })).toBe("si");
  });
  it("magazzino/personale → probabile; niente → no", () => {
    expect(livelloStabileOrganizzazione({ presenzaFisica: "magazzino" })).toBe("probabile");
    expect(livelloStabileOrganizzazione({ assumeraPersonale: true })).toBe("probabile");
    expect(livelloStabileOrganizzazione({ attivita: "solo_vendite", presenzaFisica: "nessuna" })).toBe("no");
  });
});

describe("raccomandaVeicolo", () => {
  it("sole vendite senza PE → posizione IVA, con flag rappresentante fiscale", () => {
    const r = raccomandaVeicolo({ attivita: "solo_vendite", presenzaFisica: "nessuna" });
    expect(r.principale).toBe("posizione_iva");
    expect(r.bandiere.join(" ")).toContain("identificazione diretta");
  });

  it("sola promozione → ufficio di rappresentanza, con limite non-commerciale", () => {
    const r = raccomandaVeicolo({ attivita: "promozione" });
    expect(r.principale).toBe("ufficio_rappresentanza");
    expect(r.bandiere.join(" ")).toContain("occulta");
  });

  it("operazioni stabili → S.r.l. di default", () => {
    const r = raccomandaVeicolo({ attivita: "operazioni", orizzonte: "stabile" });
    expect(r.principale).toBe("srl");
  });

  it("progetto singolo, accetta responsabilità del parent, no resp. limitata → branch", () => {
    const r = raccomandaVeicolo({
      attivita: "operazioni",
      orizzonte: "test",
      vuoleResponsabilitaLimitata: false,
      residenzaFounder: "usa",
    });
    expect(r.principale).toBe("branch");
    expect(r.bandiere.join(" ")).toContain("scudo di responsabilità");
  });

  it("founder in Italia → S.r.l. + bandiera esterovestizione", () => {
    const r = raccomandaVeicolo({
      attivita: "operazioni",
      orizzonte: "test",
      vuoleResponsabilitaLimitata: false, // non basta: founderItalia forza la S.r.l.
      residenzaFounder: "italia",
    });
    expect(r.principale).toBe("srl");
    expect(r.bandiere.join(" ")).toContain("esterovestizione");
  });

  it("holding/IP → S.r.l.", () => {
    expect(raccomandaVeicolo({ attivita: "holding_ip" }).principale).toBe("srl");
  });

  it("dividendi verso il parent → flag ritenuta 5%/15% sulla S.r.l.", () => {
    const r = raccomandaVeicolo({ attivita: "operazioni", distribuiraUtili: true });
    expect(r.principale).toBe("srl");
    expect(r.bandiere.join(" ")).toContain("5%");
  });
});

describe("output di supporto", () => {
  it("faq, piano e proposta rispondono al veicolo", () => {
    const faq = faqPersonalizzate("posizione_iva", { attivita: "solo_vendite" });
    expect(faq.some((q) => /imposte sui redditi/i.test(q.domanda))).toBe(true);
    const piano = pianoDiPartenza("posizione_iva", {});
    expect(piano.join(" ")).toContain("rappresentante fiscale");
    const proposta = bozzaPropostaIncarico("srl", { usEntity: "Acme Inc." });
    expect(proposta.join(" ")).toContain("Acme Inc.");
    expect(proposta.join(" ")).toContain("adeguata verifica");
  });

  it("il piano S.r.l. instrada al tool di costituzione", () => {
    expect(pianoDiPartenza("srl", {}).join(" ")).toContain("costituzione_controllata_usa");
  });
});
