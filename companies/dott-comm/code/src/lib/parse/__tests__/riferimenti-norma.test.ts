import { describe, expect, it } from "vitest";
import {
  chiaveArticolo,
  formattaRiferimento,
  normalizzaRiferimento,
  urnDi,
  ATTI,
} from "../riferimenti-norma";

describe("normalizzaRiferimento", () => {
  it("collassa tutte le grafie dello stesso articolo sulla forma canonica", () => {
    const grafie = [
      "art. 51 TUIR",
      "articolo 51 del Testo unico",
      "art. 51 del D.P.R. 22 dicembre 1986, n. 917",
      "art. 51 DPR 917/1986",
      "art. 51 DPR 917/86",
    ];
    for (const g of grafie) {
      expect(normalizzaRiferimento(g)?.riferimento, g).toBe("DPR 917/1986, art. 51");
    }
  });

  it("cattura il comma quando c'è", () => {
    expect(normalizzaRiferimento("art. 17, comma 6, DPR 633/72")?.riferimento).toBe(
      "DPR 633/1972, art. 17, c. 6",
    );
    expect(normalizzaRiferimento("art. 17 c. 6 del decreto IVA")?.riferimento).toBe(
      "DPR 633/1972, art. 17, c. 6",
    );
  });

  it("normalizza i suffissi degli articoli", () => {
    expect(normalizzaRiferimento("art. 6-bis L. 212/2000")?.riferimento).toBe(
      "L. 212/2000, art. 6-bis",
    );
    expect(normalizzaRiferimento("articolo 6 bis dello statuto del contribuente")?.riferimento).toBe(
      "L. 212/2000, art. 6-bis",
    );
  });

  it("riconosce l'atto anche senza articolo", () => {
    expect(normalizzaRiferimento("D.Lgs. 546/1992")?.riferimento).toBe("D.Lgs. 546/1992");
  });

  it("espande l'anno a due cifre secondo il secolo giusto", () => {
    expect(normalizzaRiferimento("DPR 633/72")?.anno).toBe(1972);
    expect(normalizzaRiferimento("D.Lgs. 13/24")?.anno).toBe(2024);
  });

  it("riconosce atti fuori registro, senza inventarne l'URN", () => {
    const r = normalizzaRiferimento("art. 3 del D.Lgs. 999/2099");
    expect(r?.riferimento).toBe("D.Lgs. 999/2099, art. 3");
    expect(r?.urn).toBeNull(); // un URN inventato sarebbe un link rotto
  });

  it("restituisce null quando non c'è un atto riconoscibile", () => {
    expect(normalizzaRiferimento("art. 51")).toBeNull();
    expect(normalizzaRiferimento("il medesimo articolo")).toBeNull();
    expect(normalizzaRiferimento("")).toBeNull();
  });
});

describe("chiaveArticolo / formattaRiferimento", () => {
  const base = { sigla: "DPR", numero: 917, anno: 1986, articolo: "51" };

  it("la chiave ignora il comma: è la granularità del reverse-lookup", () => {
    expect(chiaveArticolo(base)).toBe("DPR 917/1986, art. 51");
    expect(formattaRiferimento({ ...base, comma: "2" })).toBe(
      "DPR 917/1986, art. 51, c. 2",
    );
    expect(formattaRiferimento({ ...base, comma: "2" })).toContain(chiaveArticolo(base));
  });
});

describe("urnDi", () => {
  it("compone l'URN Normattiva dell'articolo", () => {
    const tuir = ATTI.find((a) => a.numero === 917)!;
    expect(urnDi(tuir, "51")).toBe(
      "urn:nir:stato:decreto.del.presidente.della.repubblica:1986-12-22;917~art51",
    );
    expect(urnDi(tuir, "6-bis")).toContain("~art6bis");
    expect(urnDi(tuir, null)).not.toContain("~art");
  });
});
