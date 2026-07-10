import { describe, expect, it } from "vitest";
import { estraiCitazioni } from "../lib/citazioni";

const riferimenti = (testo: string) =>
  estraiCitazioni(testo).map((c) => c.riferimento).sort();

describe("estraiCitazioni", () => {
  it("estrae articolo + atto dalla prosa della prassi", () => {
    const testo =
      "Ai sensi dell'articolo 51, comma 2, del Testo unico delle imposte sui redditi, " +
      "approvato con d.P.R. 22 dicembre 1986, n. 917, i fringe benefit concorrono…";
    expect(riferimenti(testo)).toContain("DPR 917/1986, art. 51, c. 2");
  });

  it("lega l'articolo all'atto che lo segue, non a uno qualsiasi del chunk", () => {
    const testo =
      "l'art. 17, comma 6, del DPR 633/1972 e l'art. 13 del D.Lgs. 471/1997";
    expect(riferimenti(testo)).toEqual([
      "D.Lgs. 471/1997, art. 13",
      "DPR 633/1972, art. 17, c. 6",
    ]);
  });

  it("scarta le citazioni ellittiche invece di indovinare l'atto", () => {
    // Indovinare l'atto qui corromperebbe il grafo: è lavoro del pass LLM.
    expect(riferimenti("ai sensi del medesimo articolo 51 sopra citato")).toEqual([]);
  });

  it("riconosce un atto citato senza articolo", () => {
    expect(riferimenti("come previsto dal DPR 633/1972")).toEqual(["DPR 633/1972"]);
  });

  it("non duplica un atto nudo già consumato da una citazione con articolo", () => {
    expect(riferimenti("l'art. 51 del DPR 917/1986")).toEqual([
      "DPR 917/1986, art. 51",
    ]);
  });

  it("deduplica le citazioni ripetute nello stesso chunk", () => {
    const testo = "art. 51 TUIR … poi ancora art. 51 TUIR … e infine art. 51 TUIR";
    expect(riferimenti(testo)).toEqual(["DPR 917/1986, art. 51"]);
  });

  it("normalizza i suffissi", () => {
    expect(riferimenti("l'articolo 6-bis della legge 212/2000")).toEqual([
      "L. 212/2000, art. 6-bis",
    ]);
  });

  it("marca tutto come regex e porta il testo grezzo", () => {
    const [c] = estraiCitazioni("ai sensi dell'art. 51 TUIR");
    expect(c.metodo).toBe("regex");
    expect(c.testoGrezzo).toContain("art. 51");
    expect(c.urn).toContain("~art51");
  });
});
